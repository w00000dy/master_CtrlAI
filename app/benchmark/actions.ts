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
) {
	const allParagraphs = await prisma.paragraph.findMany();
	const paraMap = new Map(allParagraphs.map((p) => [p.id, p]));

	if (mode === "CONTROL") {
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

		const unevaluatedControl = await prisma.control.findFirst({
			where: whereClause,
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
				...unevaluatedControl,
				paragraphs: enrichedControlParagraphs,
			},
		};
	} else {
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

		const unevaluatedParagraph = await prisma.paragraph.findFirst({
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
	return await prisma.controlBenchmark.create({
		data: {
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
