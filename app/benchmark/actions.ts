"use server";

import { prisma } from "@/lib/prisma";

export async function getNextBenchmarkTask() {
	try {
		// Get all paragraphs that have at least one LLM-generated control
		const paragraphs = await prisma.paragraph.findMany({
			where: {
				controls: {
					some: { guidelineId: null },
				},
				benchmarkResult: null, // Paragraph itself not evaluated yet
			},
			include: {
				controls: {
					where: { guidelineId: null },
					include: {
						benchmarkResult: true,
						paragraphs: {
							include: {
								section: { include: { document: true } },
							},
						},
					},
					orderBy: { id: "asc" },
				},
				section: {
					include: {
						document: true,
					},
				},
			},
			orderBy: [
				{ section: { document: { title: "asc" } } },
				{ section: { marker: "asc" } },
				{ marker: "asc" },
			],
		});

		if (paragraphs.length === 0) {
			return { type: "DONE" as const };
		}

		// Find the first paragraph
		const currentParagraph = paragraphs[0];

		// Fetch ancestors for currentParagraph
		const allParagraphs = await prisma.paragraph.findMany();
		const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));
		const ancestors = [];
		let currentId = currentParagraph.parentParagraphId;
		while (currentId) {
			const parent = paraMap.get(currentId);
			if (parent) {
				ancestors.unshift(parent);
				currentId = parent.parentParagraphId;
			} else {
				break;
			}
		}

		const enrichedParagraph = { ...currentParagraph, ancestors };

		// Check if any LLM controls mapped to this paragraph are unevaluated
		const unevaluatedControl = enrichedParagraph.controls.find(
			(c) => !c.benchmarkResult,
		);

		if (unevaluatedControl) {
			// Enrich all paragraphs of the unevaluated control with ancestors
			const enrichedControlParagraphs = unevaluatedControl.paragraphs.map(
				(p) => {
					const pAncestors = [];
					let pCurrentId = p.parentParagraphId;
					while (pCurrentId) {
						const parent = paraMap.get(pCurrentId);
						if (parent) {
							pAncestors.unshift(parent);
							pCurrentId = parent.parentParagraphId;
						} else {
							break;
						}
					}
					return { ...p, ancestors: pAncestors };
				},
			);

			return {
				type: "CONTROL" as const,
				paragraph: enrichedParagraph,
				control: {
					...unevaluatedControl,
					paragraphs: enrichedControlParagraphs,
				},
			};
		} else {
			return {
				type: "PARAGRAPH" as const,
				paragraph: enrichedParagraph,
				evaluatedControls: enrichedParagraph.controls,
			};
		}
	} catch (error) {
		console.error("Failed to fetch next benchmark task:", error);
		throw new Error("Failed to load benchmark task");
	}
}

export async function getTechnicalControls(paragraphIds?: number[]) {
	try {
		const controls = await prisma.control.findMany({
			where: {
				guidelineId: { not: null },
				...(paragraphIds && paragraphIds.length > 0
					? { paragraphs: { some: { id: { in: paragraphIds } } } }
					: {}),
			},
			include: {
				guideline: true,
			},
			orderBy: [{ guideline: { title: "asc" } }, { title: "asc" }],
		});
		return controls;
	} catch (error) {
		console.error("Failed to fetch technical controls:", error);
		throw new Error("Failed to load technical controls");
	}
}

export async function saveControlBenchmark(data: {
	llmControlId: number;
	coveredControlIds: number[];
	relevantParagraphIds: number[];
	isActionable: boolean;
	isTechnicallyCorrect: boolean;
}) {
	try {
		await prisma.benchmarkResult.create({
			data: {
				llmControlId: data.llmControlId,
				isActionable: data.isActionable,
				isTechnicallyCorrect: data.isTechnicallyCorrect,
				relevantParagraphs: {
					connect: data.relevantParagraphIds.map((id) => ({ id })),
				},
				coveredControls: {
					connect: data.coveredControlIds.map((id) => ({ id })),
				},
			},
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to save control benchmark:", error);
		return { success: false, error: "Failed to save benchmark result" };
	}
}

export async function saveParagraphBenchmark(data: {
	paragraphId: number;
	isComplete: boolean;
	hasRedundancy: boolean;
}) {
	try {
		await prisma.paragraphBenchmark.create({
			data: {
				paragraphId: data.paragraphId,
				isComplete: data.isComplete,
				hasRedundancy: data.hasRedundancy,
			},
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to save paragraph benchmark:", error);
		return { success: false, error: "Failed to save benchmark result" };
	}
}
