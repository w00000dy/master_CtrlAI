"use server";

import { enrichControlsWithAncestors } from "@/lib/controls";
import { generateChat } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

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
		const allParagraphs = await prisma.paragraph.findMany();

		const descendantIds: number[] = [];
		const getDescendants = (parentId: number) => {
			const children = allParagraphs.filter(
				(p) => p.parentParagraphId === parentId,
			);
			for (const child of children) {
				descendantIds.push(child.id);
				getDescendants(child.id);
			}
		};
		getDescendants(paragraphId);

		const allIdsToFetch = [paragraphId, ...descendantIds];

		const controls = await prisma.control.findMany({
			where: {
				paragraphs: {
					some: { id: { in: allIdsToFetch } },
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
		});

		const enrichedControls = enrichControlsWithAncestors(
			controls,
			allParagraphs,
		);

		enrichedControls.sort((a, b) => {
			const aIsDirect = a.paragraphs?.some((p) => p.id === paragraphId);
			const bIsDirect = b.paragraphs?.some((p) => p.id === paragraphId);
			if (aIsDirect && !bIsDirect) return -1;
			if (!aIsDirect && bIsDirect) return 1;
			return 0;
		});

		return { success: true, controls: enrichedControls };
	} catch (error) {
		console.error("Failed to fetch controls for paragraph:", error);
		return { success: false, error: "Failed to load controls.", controls: [] };
	}
}

export async function generateControlsForParagraph(
	paragraphId: number,
	model: string,
	useCoT: boolean = true,
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

		const fewShotParagraphs = await prisma.paragraph.findMany({
			where: { isFewShotExample: true },
			include: {
				section: { include: { document: true } },
				controls: {
					where: { guidelineId: { not: null } },
					include: { guideline: true },
				},
			},
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

		let fewShotExamplesStr = "";
		if (fewShotParagraphs.length > 0) {
			fewShotExamplesStr = fewShotParagraphs
				.map((p) => {
					const pAncestors = [];
					let pCurrentId = p.parentParagraphId;
					while (pCurrentId) {
						const parent = allParagraphs.find((ap) => ap.id === pCurrentId);
						if (parent) {
							pAncestors.unshift(parent);
							pCurrentId = parent.parentParagraphId;
						} else {
							break;
						}
					}
					const pAncestorsStr =
						pAncestors.length > 0
							? pAncestors
									.map((ap) => `  - ${ap.marker ? `${ap.marker} ` : ""}${ap.text}`)
									.join("\n")
							: "  None";

					const pText = `${p.marker ? `${p.marker} ` : ""}${p.text}`;
					const pDoc = `${p.section.document.title} - ${p.section.title}`;
					const pControls = p.controls
						.map(
							(c) =>
								`  - Control: ${c.title}\n    Statement: ${c.statement}${
									c.implementationGuidance
										? `\n    Implementation Guidance: ${c.implementationGuidance}`
										: ""
								}`,
						)
						.join("\n");
					return `Example Paragraph:\nDocument: ${pDoc}\nAncestor Paragraphs:\n${pAncestorsStr}\nText: ${pText}\nExpected Controls:\n${
						pControls || "  None"
					}`;
				})
				.join("\n\n");
		}

		// Find descendants
		const descendants: { p: (typeof allParagraphs)[0]; depth: number }[] = [];
		const getDescendants = (parentId: number, depth: number = 1) => {
			const children = allParagraphs.filter(
				(p) => p.parentParagraphId === parentId,
			);
			for (const child of children) {
				descendants.push({ p: child, depth });
				getDescendants(child.id, depth + 1);
			}
		};
		getDescendants(focusParagraph.id);

		const descendantsStr =
			descendants.length > 0
				? descendants
						.map(
							({ p, depth }) =>
								`${"  ".repeat(depth)}- ${p.marker ? `${p.marker} ` : ""}${p.text}`,
						)
						.join("\n")
				: "No subordinate paragraphs.";

		// Group all paragraphs by Document -> Section
		const grouped: Record<string, Record<string, typeof allParagraphs>> = {};
		for (const p of allParagraphs) {
			if (p.isFewShotExample) continue;
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

		const reasoningField = useCoT
			? `\n      "reasoning": "Step-by-step rationale for why this control is needed, how it fulfills the focus paragraph, how it differs from existing controls, and why it maps to the specified other paragraphs.",`
			: "";

		const jsonSchema = `{
  "controls": [
    {${reasoningField}
      "title": "Short title of the control (e.g. Password Policy)",
      "statement": "Detailed, actionable statement defining the control requirement.",
      "implementationGuidance": "Practical guidance or steps on how to implement this control. If there is no specific guidance to provide, this value MUST be null.",
      "mappedParagraphIds": [focus-paragraph-id, other-paragraph-id-1, other-paragraph-id-2] // MUST BE INTEGERS, NOT STRINGS
    }
  ]
}`;

		const examplesInstruction =
			fewShotParagraphs.length > 0
				? "\n- EXAMPLES: Examples of paragraphs and the expected style/granularity of Controls mapped to them. Use these as a reference for quality and format."
				: "";

		const systemPrompt = `### Instruction ###
You are a compliance and security expert. Your task is to generate actionable, technical implementation controls for a specific legal paragraph.

You will be given:
- FOCUS PARAGRAPH: The paragraph you must write controls for.
- EXISTING CONTROLS: Controls already in the database.${examplesInstruction}
- ALL PARAGRAPHS: A list of all paragraphs in the database with their IDs.

Write as many specific, actionable controls as necessary to completely fulfill the requirements of the FOCUS PARAGRAPH. Do not limit yourself to a specific number, but avoid redundancies and irrelevant points.
For each control, determine if it also helps fulfill any OTHER paragraphs from the ALL PARAGRAPHS list. When mapping to paragraphs, YOU MUST USE THE EXACT ID specified inside the [ID: ...] brackets.
DO NOT generate duplicates or overly similar controls to the EXISTING CONTROLS provided in the context.
Return a JSON object containing a single key "controls" that holds an array of control objects. Each object must strictly follow this structure:
${jsonSchema}
Output ONLY valid JSON. No markdown formatting, no explanations outside the JSON.`;

		const userPrompt = `### Context ###
FOCUS PARAGRAPH ID: ${focusParagraph.id}
DOCUMENT: ${focusParagraph.section.document.title}
SECTION: ${focusParagraph.section.title}
FOCUS PARAGRAPH TEXT: ${focusParagraph.marker ? `${focusParagraph.marker} ` : ""}${focusParagraph.text}

ANCESTOR PARAGRAPHS (Context):
${ancestorsStr}

SUBORDINATE PARAGRAPHS (Context):
${descendantsStr}

EXISTING CONTROLS:
${existingControlsStr}
${fewShotParagraphs.length > 0 ? `\nEXAMPLES:\n${fewShotExamplesStr}\n` : ""}
ALL PARAGRAPHS IN DATABASE:
${allParagraphsStr}
`;

		const response = await generateChat({
			model: model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			format: "json",
		});

		if (!response.success) {
			return { success: false, error: response.error };
		}

		const resultText = response.content;
		let parsedJson: {
			reasoning?: string;
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
	return deleteControls([id]);
}

export async function deleteControls(ids: number[]) {
	try {
		await prisma.control.deleteMany({
			where: {
				id: {
					in: ids,
				},
			},
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to delete controls:", error);
		return { success: false, error: "Failed to delete controls." };
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
