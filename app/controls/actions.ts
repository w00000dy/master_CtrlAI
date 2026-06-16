"use server";

import { Ollama } from "ollama";
import { Agent, setGlobalDispatcher } from "undici";
import { prisma } from "@/lib/prisma";

// Disable fetch timeout for long-running LLM calls
setGlobalDispatcher(new Agent({ headersTimeout: 0 }));

const ollama = new Ollama({
	host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
});

import { enrichControlsWithAncestors } from "@/lib/controls";

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
	statement: string;
	implementationGuidance?: string | null;
	paragraphIds: number[];
}) {
	try {
		const control = await prisma.control.create({
			data: {
				title: data.title,
				statement: data.statement,
				implementationGuidance: data.implementationGuidance,
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

export async function getControlsForParagraph(paragraphId: number) {
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
	paragraphId: number,
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
			where: { guidelineId: null },
			select: { title: true, statement: true, implementationGuidance: true },
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
				? existingControls
						.map(
							(c) =>
								`- ${c.title}: ${c.statement}${c.implementationGuidance ? ` (Implementation Guidance: ${c.implementationGuidance})` : ""}`,
						)
						.join("\n")
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

				const childrenMap = new Map<number, typeof allParagraphs>();
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
Write as many specific, actionable controls as necessary to completely fulfill the requirements of the FOCUS PARAGRAPH. Do not limit yourself to a specific number, but avoid redundancies and irrelevant points.
For each control, determine if it also helps fulfill any OTHER paragraphs from the ALL PARAGRAPHS list. When mapping to paragraphs, YOU MUST USE THE EXACT ID specified inside the [ID: ...] brackets.
Return a JSON object containing a single key "controls" that holds an array of control objects. Each object must strictly follow this structure:
{
  "controls": [
    {
      "title": "Short title of the control (e.g. Password Policy)",
      "statement": "Detailed, actionable statement defining the control requirement.",
      "implementationGuidance": "Practical guidance or steps on how to implement this control. If there is no specific guidance to provide, this value MUST be null.",
      "mappedParagraphIds": [focus-paragraph-id, other-paragraph-id-1, other-paragraph-id-2]
    }
  ]
}

Output ONLY valid JSON. No markdown formatting, no explanations outside the JSON.`;

		const userPrompt = `
FOCUS PARAGRAPH ID: ${focusParagraph.id}
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
			statement?: string;
			implementationGuidance?: string;
			mappedParagraphIds?: number[];
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
			const mappedArray = Array.isArray(ctrl.mappedParagraphIds)
				? ctrl.mappedParagraphIds
				: [];
			const pIds = new Set<number>(mappedArray);

			if (!pIds.has(focusParagraph.id)) {
				console.warn(
					`[LLM Mapping Warning] LLM forgot to include the focus paragraph ID for control "${ctrl.title}". Adding it automatically.`,
				);
				pIds.add(focusParagraph.id);
			}

			const invalidIds: number[] = [];
			const validIds = Array.from(pIds).filter((id) => {
				const isValid = allParagraphs.some((p) => p.id === id);
				if (!isValid) {
					invalidIds.push(id);
				}
				return isValid;
			});

			if (invalidIds.length > 0) {
				console.warn(
					`[LLM Mapping Warning] LLM returned invalid paragraph IDs for control "${ctrl.title}":`,
					invalidIds,
				);
			}

			if (validIds.length === 0) continue;

			const dbControl = await prisma.control.create({
				data: {
					title: ctrl.title || "Untitled Control",
					statement: ctrl.statement || "",
					implementationGuidance: ctrl.implementationGuidance || null,
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
	id: number,
	data: {
		title: string;
		statement: string;
		implementationGuidance?: string | null;
		paragraphIds?: number[];
	},
) {
	try {
		const control = await prisma.control.update({
			where: { id },
			data: {
				title: data.title,
				statement: data.statement,
				implementationGuidance: data.implementationGuidance,
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

export async function deleteControl(id: number) {
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

export async function deleteAllControls() {
	try {
		await prisma.control.deleteMany();
		return { success: true };
	} catch (error) {
		console.error("Failed to delete all controls:", error);
		return { success: false, error: "Failed to delete all controls." };
	}
}
