"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function getBenchmarkParagraphs() {
	const allParagraphs = await prisma.paragraph.findMany();
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	const paragraphs = await prisma.paragraph.findMany({
		where: {
			isFewShotExample: false,
			controls: {
				some: {
					guidelineId: null,
					generatedFor: { isFewShotExample: false },
				},
			},
		},
		include: {
			section: {
				include: { document: true },
			},
			controls: {
				where: {
					guidelineId: null,
					generatedFor: { isFewShotExample: false },
				},
				select: {
					id: true,
					controlBenchmark: { select: { id: true } },
				},
			},
		},
		orderBy: [
			{ section: { document: { title: "asc" } } },
			{ section: { marker: "asc" } },
			{ marker: "asc" },
			{ id: "asc" },
		],
	});

	return paragraphs.map((p) => {
		const totalControls = p.controls.length;
		const evaluatedControls = p.controls.filter(
			(c) => c.controlBenchmark !== null,
		).length;

		const ancestorMarkers: string[] = [];
		let currentId = p.parentParagraphId;
		while (currentId) {
			const parent = paraMap.get(currentId);
			if (parent) {
				if (parent.marker) {
					ancestorMarkers.unshift(parent.marker);
				}
				currentId = parent.parentParagraphId;
			} else {
				break;
			}
		}

		return {
			id: p.id,
			marker: p.marker,
			text: p.text,
			sectionTitle: p.section.title,
			sectionMarker: p.section.marker,
			documentTitle: p.section.document.title,
			ancestorMarkers,
			totalControls,
			evaluatedControls,
		};
	});
}

export async function getNextBenchmarkTask(
	mode: "CONTROL" | "PARAGRAPH" = "CONTROL",
	paragraphId?: number | null,
	targetControlId?: number | null,
	targetParagraphId?: number | null,
) {
	const allParagraphs = await prisma.paragraph.findMany();
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	if (mode === "CONTROL") {
		let targetControl = null;

		if (targetControlId) {
			targetControl = await prisma.control.findFirst({
				where: { id: targetControlId },
				include: {
					paragraphs: {
						include: {
							section: { include: { document: true } },
						},
					},
					controlBenchmark: {
						include: {
							relevantParagraphs: { select: { id: true } },
							coveredControls: { select: { id: true } },
						},
					},
				},
			});
		}

		if (!targetControl) {
			const whereClause: Prisma.ControlWhereInput = {
				guidelineId: null,
				controlBenchmark: null,
				generatedFor: { isFewShotExample: false },
			};

			if (paragraphId) {
				whereClause.paragraphs = {
					some: { id: paragraphId },
				};
			}

			targetControl = await prisma.control.findFirst({
				where: whereClause,
				include: {
					paragraphs: {
						include: {
							section: { include: { document: true } },
						},
					},
					controlBenchmark: {
						include: {
							relevantParagraphs: { select: { id: true } },
							coveredControls: { select: { id: true } },
						},
					},
				},
				orderBy: { id: "asc" },
			});
		}

		if (!targetControl) {
			return { type: "DONE" as const };
		}

		const enrichedControlParagraphs = targetControl.paragraphs.map((p) => {
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

		const primaryParagraph =
			(paragraphId
				? enrichedControlParagraphs.find((p) => p.id === paragraphId)
				: null) ||
			enrichedControlParagraphs[0] ||
			null;

		return {
			type: "CONTROL" as const,
			paragraph: primaryParagraph,
			control: {
				...targetControl,
				paragraphs: enrichedControlParagraphs,
			},
		};
	} else {
		let targetParagraph = null;

		if (targetParagraphId) {
			targetParagraph = await prisma.paragraph.findFirst({
				where: { id: targetParagraphId },
				include: {
					controls: {
						where: {
							guidelineId: null,
							generatedFor: { isFewShotExample: false },
						},
						include: {
							controlBenchmark: true,
						},
						orderBy: { id: "asc" },
					},
					section: {
						include: { document: true },
					},
					benchmarkResult: true,
				},
			});
		}

		if (!targetParagraph) {
			const whereClause: Prisma.ParagraphWhereInput = {
				controls: {
					some: {
						guidelineId: null,
						generatedFor: { isFewShotExample: false },
					},
				},
				benchmarkResult: null,
				isFewShotExample: false,
			};

			if (paragraphId) {
				whereClause.id = paragraphId;
			}

			targetParagraph = await prisma.paragraph.findFirst({
				where: whereClause,
				include: {
					controls: {
						where: {
							guidelineId: null,
							generatedFor: { isFewShotExample: false },
						},
						include: {
							controlBenchmark: true,
						},
						orderBy: { id: "asc" },
					},
					section: {
						include: { document: true },
					},
					benchmarkResult: true,
				},
				orderBy: [
					{ section: { document: { title: "asc" } } },
					{ section: { marker: "asc" } },
					{ marker: "asc" },
				],
			});
		}

		if (!targetParagraph) {
			return { type: "DONE" as const };
		}

		const ancestors = [];
		let currentId = targetParagraph.parentParagraphId;
		while (currentId) {
			const parent = paraMap.get(currentId);
			if (parent) {
				ancestors.unshift(parent);
				currentId = parent.parentParagraphId;
			} else {
				break;
			}
		}

		const enrichedParagraph = { ...targetParagraph, ancestors };

		return {
			type: "PARAGRAPH" as const,
			paragraph: enrichedParagraph,
			evaluatedControls: enrichedParagraph.controls,
		};
	}
}

export async function getTechnicalControls(paragraphIds: number[]) {
	if (paragraphIds.length === 0) return [];

	const controls = await prisma.control.findMany({
		where: {
			guidelineId: { not: null },
			paragraphs: {
				none: { isFewShotExample: true },
				some: { id: { in: paragraphIds } },
			},
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
	hasNormativeLanguage: boolean;
}) {
	return await prisma.controlBenchmark.upsert({
		where: {
			llmControlId: data.llmControlId,
		},
		create: {
			llmControlId: data.llmControlId,
			isActionable: data.isActionable,
			isTechnicallyCorrect: data.isTechnicallyCorrect,
			isMeasurable: data.isMeasurable,
			hasNormativeLanguage: data.hasNormativeLanguage,
			relevantParagraphs: {
				connect: data.relevantParagraphIds.map((id) => ({ id })),
			},
			coveredControls: {
				connect: data.coveredControlIds.map((id) => ({ id })),
			},
		},
		update: {
			isActionable: data.isActionable,
			isTechnicallyCorrect: data.isTechnicallyCorrect,
			isMeasurable: data.isMeasurable,
			hasNormativeLanguage: data.hasNormativeLanguage,
			relevantParagraphs: {
				set: data.relevantParagraphIds.map((id) => ({ id })),
			},
			coveredControls: {
				set: data.coveredControlIds.map((id) => ({ id })),
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
	return await prisma.paragraphBenchmark.upsert({
		where: {
			paragraphId: data.paragraphId,
		},
		create: {
			paragraphId: data.paragraphId,
			isComplete: data.isComplete,
			hasRedundancy: data.hasRedundancy,
			hasHallucinations: data.hasHallucinations,
		},
		update: {
			isComplete: data.isComplete,
			hasRedundancy: data.hasRedundancy,
			hasHallucinations: data.hasHallucinations,
		},
	});
}

export async function getBenchmarkProgress(
	mode: "CONTROL" | "PARAGRAPH",
	paragraphId?: number | null,
) {
	if (mode === "CONTROL") {
		const whereClause: Prisma.ControlWhereInput = {
			guidelineId: null,
			OR: [
				{ generatedForId: null },
				{ generatedFor: { isFewShotExample: false } },
			],
		};
		if (paragraphId) {
			whereClause.paragraphs = {
				some: { id: paragraphId },
			};
		}
		const total = await prisma.control.count({
			where: whereClause,
		});
		const evaluated = await prisma.control.count({
			where: {
				...whereClause,
				controlBenchmark: { isNot: null },
			},
		});
		return { total, evaluated };
	} else {
		const whereClause: Prisma.ParagraphWhereInput = {
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
		if (paragraphId) {
			whereClause.id = paragraphId;
		}
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
