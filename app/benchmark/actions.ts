"use server";

import { prisma } from "@/lib/prisma";

export async function getNextBenchmarkTask(
	mode: "CONTROL" | "PARAGRAPH" = "CONTROL",
) {
	const allParagraphs = await prisma.paragraph.findMany();
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	if (mode === "CONTROL") {
		const unevaluatedControl = await prisma.control.findFirst({
			where: {
				guidelineId: null,
				benchmarkResult: null,
				OR: [
					{ generatedForId: null },
					{ generatedFor: { isFewShotExample: false } },
				],
			},
			include: {
				paragraphs: {
					include: {
						section: { include: { document: true } },
					},
				},
			},
			orderBy: { id: "asc" },
		});

		if (!unevaluatedControl) {
			return { type: "DONE" as const };
		}

		const enrichedControlParagraphs = unevaluatedControl.paragraphs.map((p) => {
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
		});

		const primaryParagraph = enrichedControlParagraphs[0] || null;

		return {
			type: "CONTROL" as const,
			paragraph: primaryParagraph,
			control: {
				...unevaluatedControl,
				paragraphs: enrichedControlParagraphs,
			},
		};
	} else {
		const unevaluatedParagraph = await prisma.paragraph.findFirst({
			where: {
				controls: {
					some: {
						guidelineId: null,
						OR: [
							{ generatedForId: null },
							{ generatedFor: { isFewShotExample: false } },
						],
					},
				},
				benchmarkResult: null,
				isFewShotExample: false,
			},
			include: {
				controls: {
					where: {
						guidelineId: null,
						OR: [
							{ generatedForId: null },
							{ generatedFor: { isFewShotExample: false } },
						],
					},
					include: {
						benchmarkResult: true,
					},
					orderBy: { id: "asc" },
				},
				section: {
					include: { document: true },
				},
			},
			orderBy: [
				{ section: { document: { title: "asc" } } },
				{ section: { marker: "asc" } },
				{ marker: "asc" },
			],
		});

		if (!unevaluatedParagraph) {
			return { type: "DONE" as const };
		}

		const ancestors = [];
		let currentId = unevaluatedParagraph.parentParagraphId;
		while (currentId) {
			const parent = paraMap.get(currentId);
			if (parent) {
				ancestors.unshift(parent);
				currentId = parent.parentParagraphId;
			} else {
				break;
			}
		}

		const enrichedParagraph = { ...unevaluatedParagraph, ancestors };

		return {
			type: "PARAGRAPH" as const,
			paragraph: enrichedParagraph,
			evaluatedControls: enrichedParagraph.controls,
		};
	}
}

export async function getTechnicalControls(paragraphIds?: number[]) {
	const controls = await prisma.control.findMany({
		where: {
			guidelineId: { not: null },
			paragraphs: {
				none: { isFewShotExample: true },
			},
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
}

export async function saveControlBenchmark(data: {
	llmControlId: number;
	coveredControlIds: number[];
	relevantParagraphIds: number[];
	isActionable: boolean;
	isTechnicallyCorrect: boolean;
	isMeasurable: boolean;
}) {
	return await prisma.benchmarkResult.create({
		data: {
			llmControlId: data.llmControlId,
			isActionable: data.isActionable,
			isTechnicallyCorrect: data.isTechnicallyCorrect,
			isMeasurable: data.isMeasurable,
			relevantParagraphs: {
				connect: data.relevantParagraphIds.map((id) => ({ id })),
			},
			coveredControls: {
				connect: data.coveredControlIds.map((id) => ({ id })),
			},
		},
	});
}

export async function saveParagraphBenchmark(data: {
	paragraphId: number;
	isComplete: boolean;
	hasRedundancy: boolean;
	hasHallucinations: boolean;
}) {
	return await prisma.paragraphBenchmark.create({
		data: {
			paragraphId: data.paragraphId,
			isComplete: data.isComplete,
			hasRedundancy: data.hasRedundancy,
			hasHallucinations: data.hasHallucinations,
		},
	});
}

export async function getBenchmarkProgress(mode: "CONTROL" | "PARAGRAPH") {
	if (mode === "CONTROL") {
		const whereClause = {
			guidelineId: null,
			OR: [
				{ generatedForId: null },
				{ generatedFor: { isFewShotExample: false } },
			],
		};
		const total = await prisma.control.count({
			where: whereClause,
		});
		const evaluated = await prisma.control.count({
			where: {
				...whereClause,
				benchmarkResult: { isNot: null },
			},
		});
		return { total, evaluated };
	} else {
		const whereClause = {
			controls: {
				some: {
					guidelineId: null,
					OR: [
						{ generatedForId: null },
						{ generatedFor: { isFewShotExample: false } },
					],
				},
			},
			isFewShotExample: false,
		};
		const total = await prisma.paragraph.count({
			where: whereClause,
		});
		const evaluated = await prisma.paragraph.count({
			where: {
				...whereClause,
				benchmarkResult: { isNot: null },
			},
		});
		return { total, evaluated };
	}
}
