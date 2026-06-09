"use server";

import { Ollama } from "ollama";
import { Agent, setGlobalDispatcher } from "undici";
import { prisma } from "@/lib/prisma";
import type { Paragraph } from "../../generated/prisma/client";

// Disable fetch timeout for long-running LLM calls
setGlobalDispatcher(new Agent({ headersTimeout: 0 }));

const ollama = new Ollama({
	host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
});

function enrichControlsWithAncestors<
	C extends { paragraphs: P[] },
	P extends { parentParagraphId: string | null },
>(controls: C[], allParagraphs: Paragraph[]) {
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	return controls.map((control) => {
		return {
			...control,
			paragraphs: control.paragraphs.map((p: P) => {
				const ancestors: Paragraph[] = [];
				let currentId = p.parentParagraphId;
				while (currentId) {
					const parent = paraMap.get(currentId);
					if (parent) {
						ancestors.unshift(parent);
						currentId = parent.parentParagraphId;
					} else {
						break;
					}
				}
				return { ...p, ancestors };
			}),
		};
	});
}

export async function getControls() {
	try {
		const [controls, allParagraphs] = await Promise.all([
			prisma.control.findMany({
				include: {
					paragraphs: {
						include: {
							section: {
								include: {
									document: true,
								},
							},
						},
					},
				},
				orderBy: {
					id: "desc",
				},
			}),
			prisma.paragraph.findMany(),
		]);

		const enrichedControls = enrichControlsWithAncestors(
			controls,
			allParagraphs,
		);

		return { success: true, controls: enrichedControls };
	} catch (error) {
		console.error("Failed to fetch controls:", error);
		return { success: false, error: "Failed to load controls.", controls: [] };
	}
}

export async function createControl(data: {
	title: string;
	text: string;
	paragraphIds: string[];
}) {
	try {
		const control = await prisma.control.create({
			data: {
				title: data.title,
				text: data.text,
				paragraphs: {
					connect: data.paragraphIds.map((id) => ({ id })),
				},
			},
		});
		return { success: true, control };
	} catch (error) {
		console.error("Failed to create control:", error);
		return { success: false, error: "Failed to create control." };
	}
}

export async function getParagraphsForSelection() {
	try {
		const documents = await prisma.document.findMany({
			include: {
				sections: {
					include: {
						paragraphs: {
							orderBy: { marker: "asc" },
						},
					},
					orderBy: { title: "asc" },
				},
			},
			orderBy: { title: "asc" },
		});
		return { success: true, documents };
	} catch (error) {
		console.error("Failed to fetch paragraphs for selection:", error);
		return {
			success: false,
			error: "Failed to load paragraphs.",
			documents: [],
		};
	}
}

export async function getControlsForParagraph(paragraphId: string) {
	try {
		const [controls, allParagraphs] = await Promise.all([
			prisma.control.findMany({
				where: {
					paragraphs: {
						some: { id: paragraphId },
					},
				},
				include: {
					paragraphs: {
						include: {
							section: { include: { document: true } },
						},
					},
				},
				orderBy: { id: "desc" },
			}),
			prisma.paragraph.findMany(),
		]);

		const enrichedControls = enrichControlsWithAncestors(
			controls,
			allParagraphs,
		);

		return { success: true, controls: enrichedControls };
	} catch (error) {
		console.error("Failed to fetch controls for paragraph:", error);
		return { success: false, error: "Failed to load controls.", controls: [] };
	}
}

export async function generateControlsForParagraph(
	paragraphId: string,
	model: string,
) {
	try {
		const focusParagraph = await prisma.paragraph.findUnique({
			where: { id: paragraphId },
			include: { section: { include: { document: true } } },
		});

		if (!focusParagraph) {
			return { success: false, error: "Paragraph not found." };
		}

		const existingControls = await prisma.control.findMany({
			select: { title: true, text: true },
		});

		const allParagraphs = await prisma.paragraph.findMany({
			include: { section: { include: { document: true } } },
			orderBy: [
				{ section: { document: { title: "asc" } } },
				{ section: { marker: "asc" } },
				{ marker: "asc" },
			],
		});

		// Formatting context for LLM
		const existingControlsStr =
			existingControls.length > 0
				? existingControls.map((c) => `- ${c.title}: ${c.text}`).join("\n")
				: "No existing controls.";

		// Find ancestors
		const ancestors = [];
		let currentId = focusParagraph.parentParagraphId;
		while (currentId) {
			const parent = allParagraphs.find((p) => p.id === currentId);
			if (parent) {
				ancestors.unshift(parent);
				currentId = parent.parentParagraphId;
			} else {
				break;
			}
		}
		const ancestorsStr =
			ancestors.length > 0
				? ancestors
						.map((p) => `- ${p.marker ? `${p.marker} ` : ""}${p.text}`)
						.join("\n")
				: "No ancestor paragraphs.";

		// Group all paragraphs by Document -> Section
		const grouped: Record<string, Record<string, typeof allParagraphs>> = {};
		for (const p of allParagraphs) {
			const docTitle = p.section.document.title;
			const secTitle = p.section.title;
			if (!grouped[docTitle]) grouped[docTitle] = {};
			if (!grouped[docTitle][secTitle]) grouped[docTitle][secTitle] = [];
			grouped[docTitle][secTitle].push(p);
		}

		let allParagraphsStr = "";

		const docTitles = Object.keys(grouped);
		for (const docTitle of docTitles) {
			allParagraphsStr += `Document: ${docTitle}\n`;
			const secTitles = Object.keys(grouped[docTitle]);
			for (const secTitle of secTitles) {
				allParagraphsStr += `  Section: ${secTitle}\n`;

				const secParas = grouped[docTitle][secTitle];
				const roots = secParas.filter(
					(p) =>
						!p.parentParagraphId ||
						!secParas.some((sp) => sp.id === p.parentParagraphId),
				);

				const childrenMap = new Map<string, typeof allParagraphs>();
				for (const p of secParas) {
					if (p.parentParagraphId) {
						if (!childrenMap.has(p.parentParagraphId))
							childrenMap.set(p.parentParagraphId, []);
						childrenMap.get(p.parentParagraphId)?.push(p);
					}
				}

				const printPara = (p: (typeof allParagraphs)[0], depth: number) => {
					const indent = `    ${"  ".repeat(depth)}`;
					allParagraphsStr += `${indent}- [ID: ${p.id}] ${p.marker ? `${p.marker} ` : ""}${p.text}\n`;
					const children = childrenMap.get(p.id) || [];
					for (const child of children) {
						printPara(child, depth + 1);
					}
				};

				for (const root of roots) {
					printPara(root, 0);
				}
			}
			allParagraphsStr += "\n";
		}

		const systemPrompt = `You are a compliance and security expert. 
Your task is to generate actionable, technical implementation controls for a specific legal paragraph.
You will be given:
1. FOCUS PARAGRAPH: The paragraph you must write controls for.
2. EXISTING CONTROLS: Controls already in the database. DO NOT generate duplicates or overly similar controls.
3. ALL PARAGRAPHS: A list of all paragraphs in the database with their IDs.

Instructions:
- Write 1 to 3 specific, actionable controls that fulfill the requirements of the FOCUS PARAGRAPH.
- For each control, determine if it also helps fulfill any OTHER paragraphs from the ALL PARAGRAPHS list.
- Return a JSON object containing a single key "controls" that holds an array of control objects. Each object must strictly follow this structure:
{
  "controls": [
    {
      "title": "Short title of the control (e.g. Password Policy)",
      "text": "Detailed, actionable implementation instruction.",
      "mappedParagraphIds": ["id1", "id2"] // MUST include the FOCUS PARAGRAPH ID, plus any other relevant paragraph IDs from the ALL PARAGRAPHS list.
    }
  ]
}

Output ONLY valid JSON. No markdown formatting, no explanations outside the JSON.`;

		const userPrompt = `
FOCUS PARAGRAPH (ID: ${focusParagraph.id}):
DOCUMENT: ${focusParagraph.section.document.title}
SECTION: ${focusParagraph.section.title}
ANCESTOR PARAGRAPHS (Context):
${ancestorsStr}
FOCUS PARAGRAPH TEXT: ${focusParagraph.marker ? `${focusParagraph.marker} ` : ""}${focusParagraph.text}

EXISTING CONTROLS:
${existingControlsStr}

ALL PARAGRAPHS IN DATABASE:
${allParagraphsStr}
`;

		console.log(userPrompt);

		const response = await ollama.chat({
			model: model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			format: "json",
		});

		const resultText = response.message.content;
		console.log(resultText);
		const promptTokens = response.prompt_eval_count;
		const evalTokens = response.eval_count;
		console.log(
			`[LLM Usage] Prompt tokens (Context used): ${promptTokens}, Generated tokens: ${evalTokens}`,
		);

		let parsedJson: {
			title?: string;
			text?: string;
			mappedParagraphIds?: string[];
		}[];

		try {
			const rawJson = JSON.parse(resultText);
			if (rawJson && Array.isArray(rawJson.controls)) {
				parsedJson = rawJson.controls;
			} else if (Array.isArray(rawJson)) {
				// Fallback in case it directly returned an array
				parsedJson = rawJson;
			} else {
				throw new Error(
					"Invalid format: Expected an object with a 'controls' array.",
				);
			}
		} catch (error) {
			console.error("Failed to parse JSON from LLM:", resultText, error);
			return { success: false, error: "LLM returned invalid format." };
		}

		const createdControls = [];
		for (const ctrl of parsedJson) {
			const pIds = new Set<string>(
				Array.isArray(ctrl.mappedParagraphIds) ? ctrl.mappedParagraphIds : [],
			);
			pIds.add(focusParagraph.id); // Ensure the focus paragraph is included

			// Filter valid IDs
			const validIds = Array.from(pIds).filter((id) =>
				allParagraphs.some((p) => p.id === id),
			);

			if (validIds.length === 0) continue;

			const dbControl = await prisma.control.create({
				data: {
					title: ctrl.title || "Untitled Control",
					text: ctrl.text || "",
					paragraphs: {
						connect: validIds.map((id) => ({ id })),
					},
				},
				include: {
					paragraphs: {
						include: { section: { include: { document: true } } },
					},
				},
			});
			createdControls.push(dbControl);
		}

		return { success: true, controls: createdControls };
	} catch (error) {
		console.error("Failed to generate controls:", error);
		return {
			success: false,
			error: "An unexpected error occurred during LLM processing.",
		};
	}
}

export async function updateControl(
	id: string,
	data: { title: string; text: string; paragraphIds?: string[] },
) {
	try {
		const control = await prisma.control.update({
			where: { id },
			data: {
				title: data.title,
				text: data.text,
				...(data.paragraphIds && {
					paragraphs: {
						set: [], // clear existing
						connect: data.paragraphIds.map((pid) => ({ id: pid })),
					},
				}),
			},
		});
		return { success: true, control };
	} catch (error) {
		console.error("Failed to update control:", error);
		return { success: false, error: "Failed to update control." };
	}
}

export async function deleteControl(id: string) {
	try {
		await prisma.control.delete({
			where: { id },
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to delete control:", error);
		return { success: false, error: "Failed to delete control." };
	}
}
