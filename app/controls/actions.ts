"use server";

import * as z from "zod";
import { enrichControlsWithAncestors } from "@/lib/controls";
import { generateResponse } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export async function getControls() {
	const [controls, allParagraphs] = await Promise.all([
		prisma.control.findMany({
			include: {
				guideline: true,
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

	const enrichedControls = enrichControlsWithAncestors(controls, allParagraphs);

	return enrichedControls;
}

export async function createControl(data: {
	title: string;
	statement: string;
	implementationGuidance?: string | null;
	paragraphIds: number[];
}) {
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
	return control;
}

export async function getParagraphsForSelection() {
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
	return documents;
}

export async function getControlsForParagraph(paragraphId: number) {
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
			guideline: true,
			paragraphs: {
				include: {
					section: { include: { document: true } },
				},
			},
		},
		orderBy: { id: "desc" },
	});

	const enrichedControls = enrichControlsWithAncestors(controls, allParagraphs);

	enrichedControls.sort((a, b) => {
		const aIsDirect = a.paragraphs?.some((p) => p.id === paragraphId);
		const bIsDirect = b.paragraphs?.some((p) => p.id === paragraphId);
		if (aIsDirect && !bIsDirect) return -1;
		if (!aIsDirect && bIsDirect) return 1;
		return 0;
	});

	return enrichedControls;
}

const generationPromises =
	(
		globalThis as {
			generationPromises?: Map<number, Promise<unknown>>;
		}
	).generationPromises || new Map<number, Promise<unknown>>();
(
	globalThis as {
		generationPromises?: Map<number, Promise<unknown>>;
	}
).generationPromises = generationPromises;

export async function generateControlsForParagraph(
	paragraphId: number,
	model: string,
	useCoT: boolean = true,
	provideExistingControls: boolean = false,
) {
	if (generationPromises.has(paragraphId)) {
		console.log(
			`[RAM-Lock] Re-attaching to ongoing generation for paragraph ${paragraphId}`,
		);
		return await generationPromises.get(paragraphId);
	}

	const promise = (async () => {
		try {
			const focusParagraph = await prisma.paragraph.findUnique({
				where: { id: paragraphId },
				include: {
					section: { include: { document: true } },
					controls: {
						where: { guidelineId: null },
						select: {
							title: true,
							statement: true,
							implementationGuidance: true,
						},
					},
				},
			});

			if (!focusParagraph) {
				throw new Error("Paragraph not found.");
			}

			const existingControls = provideExistingControls
				? await prisma.control.findMany({
						where: {
							guidelineId: null,
							paragraphs: {
								none: { id: paragraphId },
							},
						},
						select: {
							title: true,
							statement: true,
							implementationGuidance: true,
						},
					})
				: [];

			const fewShotParagraphs = await prisma.paragraph.findMany({
				where: { isFewShotExample: true },
				include: {
					section: { include: { document: true } },
					controls: {
						where: { guidelineId: { not: null } },
						include: {
							guideline: true,
							paragraphs: { select: { id: true } },
						},
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

			const paragraphIdStats = await prisma.paragraph.aggregate({
				_min: { id: true },
				_max: { id: true },
			});

			// Formatting context for LLM
			const focusControlsStr =
				focusParagraph.controls.length > 0
					? focusParagraph.controls
							.map(
								(c) =>
									`- ${c.title}: ${c.statement}${c.implementationGuidance ? ` (Implementation Guidance: ${c.implementationGuidance})` : ""}`,
							)
							.join("\n")
					: "No LLM-generated controls currently mapped to this paragraph.";

			const existingControlsStr = provideExistingControls
				? existingControls.length > 0
					? existingControls
							.map(
								(c) =>
									`- ${c.title}: ${c.statement}${c.implementationGuidance ? ` (Implementation Guidance: ${c.implementationGuidance})` : ""}`,
							)
							.join("\n")
					: "No other existing controls in database."
				: "";

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

			const minParagraphId = paragraphIdStats._min.id ?? 1;
			const maxParagraphId = paragraphIdStats._max.id ?? 1;

			const ExampleControlSchema = z.object({
				title: z.string().meta({
					description: "Short title of the control (e.g. Password Policy)",
				}),
				statement: z.string().meta({
					description:
						"Detailed, actionable statement defining the control requirement.",
				}),
				implementationGuidance: z.string().nullish().meta({
					description:
						"Practical guidance or steps on how to implement this control. If there is no specific guidance to provide, this value MUST be null.",
				}),
				mappedParagraphIds: z
					.array(z.int().min(minParagraphId).max(maxParagraphId))
					.min(1)
					.meta({
						description:
							"Array of exact IDs of paragraphs this control helps fulfill. MUST include the FOCUS PARAGRAPH ID.",
					}),
			});

			const ExampleControlsArraySchema = z.array(ExampleControlSchema);

			const BaseControlSchema = useCoT
				? z.object({
						reasoning: z.string().meta({
							description:
								"Step-by-step rationale for why this control is needed, how it fulfills the focus paragraph, how it differs from existing controls, and why it maps to the specified other paragraphs.",
						}),
						...ExampleControlSchema.shape,
					})
				: ExampleControlSchema;

			const ControlSchema = BaseControlSchema.extend({
				mappedParagraphIds: z
					.array(z.int().min(minParagraphId).max(maxParagraphId))
					.min(1)
					.refine((ids) => ids.includes(focusParagraph.id), {
						message: "Must include the focus paragraph ID.",
					})
					.meta({
						description:
							"Array of exact IDs of paragraphs this control helps fulfill. MUST include the FOCUS PARAGRAPH ID.",
					}),
			});

			const ControlsArraySchema = z.array(ControlSchema);

			let fewShotExamplesStr = "";
			if (fewShotParagraphs.length > 0) {
				fewShotExamplesStr = fewShotParagraphs
					.map((p) => {
						const pText = `${p.marker ? `${p.marker} ` : ""}${p.text}`;
						const pDoc = `${p.section.document.title} - ${p.section.title}`;

						const rawControlsObj = p.controls.map((c) => {
							const mappedIds =
								"paragraphs" in c &&
								Array.isArray(c.paragraphs) &&
								c.paragraphs.length > 0
									? (c.paragraphs as { id: number }[]).map((mp) => mp.id)
									: [p.id];
							return {
								title: c.title,
								statement: c.statement,
								implementationGuidance: c.implementationGuidance || null,
								mappedParagraphIds: mappedIds,
							};
						});

						const validatedControls =
							ExampleControlsArraySchema.parse(rawControlsObj);
						const pControlsJson = JSON.stringify(validatedControls, null, 2);

						return `Example Paragraph:\nDocument: ${pDoc}\nText: ${pText}\nExpected Controls (JSON):\n${
							p.controls.length > 0 ? pControlsJson : "[]"
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

			const examplesInstruction =
				fewShotParagraphs.length > 0
					? "\n- EXAMPLES: Examples of paragraphs and the expected style/granularity of Controls mapped to them. Use these as a reference for quality and format."
					: "";

			const otherControlsInstruction = provideExistingControls
				? "\n- OTHER EXISTING CONTROLS IN DATABASE: Other controls already generated in the database."
				: "";

			const systemPrompt = `### Instruction ###
You are a compliance and security expert. Your task is to generate actionable, technical implementation controls for a specific legal paragraph.

DEFINITION OF A CONTROL:
A control is a specific technical, administrative, or physical safeguard, process, or policy put in place to satisfy legal or regulatory requirements. It must be an actionable, clear, and measurable directive that describes exactly what needs to be implemented or enforced.

You will be given:
- DOCUMENT: The title of the legal or regulatory document containing the focus paragraph.
- SECTION: The specific section or chapter title within the document containing the focus paragraph.
- FOCUS PARAGRAPH TEXT: The exact wording of the legal paragraph you must analyze and write controls for.
- FOCUS PARAGRAPH ID: The unique identifier of the paragraph you must write controls for.
- ANCESTOR PARAGRAPHS: Provide broader regulatory context from parent paragraphs. Use them ONLY to understand the overarching purpose and scope of the FOCUS PARAGRAPH TEXT.
- SUBORDINATE PARAGRAPHS: Provide specific details and lower-level requirements. Use them ONLY to understand the boundaries of the FOCUS PARAGRAPH TEXT; do not generate controls for specific details that belong strictly to subordinate paragraphs unless required at the focus level.
- EXISTING CONTROLS FOR FOCUS PARAGRAPH: Controls that are already mapped to this focus paragraph ID.${otherControlsInstruction}${examplesInstruction}
- ALL PARAGRAPHS: A list of all paragraphs in the database with their IDs.

Write as many specific, actionable controls as necessary to completely fulfill the requirements of the FOCUS PARAGRAPH TEXT. Do not limit yourself to a specific number, but avoid redundancies and irrelevant points.
If the EXISTING CONTROLS FOR FOCUS PARAGRAPH already completely and exhaustively fulfill the requirements, or if the FOCUS PARAGRAPH TEXT is purely definitional/informational and requires no technical or administrative safeguards, return an empty array ([]). Do not generate forced or redundant controls.
When providing 'implementationGuidance', focus on concrete technical standards (e.g., TLS 1.3, AES-256), specific architecture patterns, or exact procedural steps rather than generic advice. If there is no specific technical or procedural guidance to provide, omit it or set it to null.
For each control, determine if it also helps fulfill any OTHER paragraphs from the ALL PARAGRAPHS list. When mapping to paragraphs in 'mappedParagraphIds', YOU MUST ALWAYS include the exact FOCUS PARAGRAPH ID itself, along with any additional related IDs from ALL PARAGRAPHS specified inside the [ID: ...] brackets.
DO NOT generate duplicates or overly similar controls to the EXISTING CONTROLS FOR FOCUS PARAGRAPH${provideExistingControls ? " or OTHER EXISTING CONTROLS IN DATABASE provided in the context" : ""}.`;

			const userPrompt = `### Context ###
DOCUMENT: ${focusParagraph.section.document.title}
SECTION: ${focusParagraph.section.title}
FOCUS PARAGRAPH TEXT: ${focusParagraph.marker ? `${focusParagraph.marker} ` : ""}${focusParagraph.text}
FOCUS PARAGRAPH ID: ${focusParagraph.id}

ANCESTOR PARAGRAPHS:
${ancestorsStr}

SUBORDINATE PARAGRAPHS:
${descendantsStr}

EXISTING CONTROLS FOR FOCUS PARAGRAPH:
${focusControlsStr}
${provideExistingControls ? `\nOTHER EXISTING CONTROLS IN DATABASE:\n${existingControlsStr}\n` : ""}${fewShotParagraphs.length > 0 ? `\nEXAMPLES:\n${fewShotExamplesStr}\n` : ""}
ALL PARAGRAPHS IN DATABASE:
${allParagraphsStr}
`;

			const response = await generateResponse({
				model: model,
				prompt: userPrompt,
				systemPrompt: systemPrompt,
				schema: ControlsArraySchema,
			});

			const resultText = response.content;
			const parsedJson = ControlsArraySchema.parse(JSON.parse(resultText));

			const createdControls = [];
			for (const ctrl of parsedJson) {
				const validIds = Array.from(new Set(ctrl.mappedParagraphIds));

				const dbControl = await prisma.control.create({
					data: {
						title: ctrl.title || "Untitled Control",
						statement: ctrl.statement || "",
						implementationGuidance: ctrl.implementationGuidance || null,
						generatedForId: paragraphId,
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

			return createdControls;
		} finally {
			generationPromises.delete(paragraphId);
		}
	})();

	generationPromises.set(paragraphId, promise);
	return await promise;
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
	const control = await prisma.control.update({
		where: { id },
		data: {
			title: data.title,
			statement: data.statement,
			implementationGuidance: data.implementationGuidance,
			...(data.paragraphIds && {
				paragraphs: {
					set: [],
					connect: data.paragraphIds.map((pid) => ({ id: pid })),
				},
			}),
		},
	});
	return control;
}

export async function deleteControl(id: number) {
	return deleteControls([id]);
}

export async function deleteControls(ids: number[]) {
	return prisma.control.deleteMany({
		where: {
			id: {
				in: ids,
			},
		},
	});
}

export async function deleteAllControls() {
	return prisma.control.deleteMany();
}
