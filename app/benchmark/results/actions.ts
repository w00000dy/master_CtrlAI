"use server";

import { prisma } from "@/lib/prisma";

export async function getControlBenchmarks() {
	const results = await prisma.controlBenchmark.findMany({
		where: {
			llmControl: {
				generatedFor: { isFewShotExample: false },
			},
		},
		include: {
			llmControl: {
				include: {
					paragraphs: {
						select: {
							id: true,
						},
					},
				},
			},
			relevantParagraphs: {
				select: {
					id: true,
				},
			},
			coveredControls: {
				include: {
					guideline: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
	return results;
}

export async function getParagraphBenchmarks() {
	const benchmarks = await prisma.paragraphBenchmark.findMany({
		where: {
			paragraph: {
				isFewShotExample: false,
			},
		},
		include: {
			paragraph: {
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
			createdAt: "desc",
		},
	});
	return benchmarks;
}

export async function getGuidelineBenchmarkStats() {
	const benchmarks = await prisma.controlBenchmark.findMany({
		where: {
			llmControl: {
				generatedFor: { isFewShotExample: false },
			},
		},
		include: {
			llmControl: {
				include: {
					generatedFor: {
						include: {
							controls: {
								where: {
									guidelineId: { not: null },
									paragraphs: {
										none: { isFewShotExample: true },
									},
								},
								select: {
									id: true,
									guidelineId: true,
								},
							},
						},
					},
				},
			},
			coveredControls: {
				where: {
					guidelineId: { not: null },
					paragraphs: {
						none: { isFewShotExample: true },
					},
				},
				select: {
					id: true,
					guidelineId: true,
				},
			},
		},
	});

	const evaluatedTRControlMap = new Map<number, number>();
	const coveredTRControlIds = new Set<number>();

	for (const bm of benchmarks) {
		const genFor = bm.llmControl.generatedFor;
		if (genFor) {
			for (const c of genFor.controls) {
				if (c.guidelineId !== null) {
					evaluatedTRControlMap.set(c.id, c.guidelineId);
				}
			}
		}

		for (const c of bm.coveredControls) {
			if (c.guidelineId !== null) {
				coveredTRControlIds.add(c.id);
			}
		}
	}

	const totalEvaluatedTechnicalControls = evaluatedTRControlMap.size;
	const coveredTechnicalControlsCount = coveredTRControlIds.size;

	const guidelines = await prisma.guideline.findMany({
		include: {
			controls: {
				select: {
					id: true,
				},
			},
		},
		orderBy: {
			title: "asc",
		},
	});

	const guidelineBreakdown = guidelines.map((g) => {
		const totalInGuideline = g.controls.length;
		const evaluatedInGuideline = g.controls.filter((c) =>
			evaluatedTRControlMap.has(c.id),
		).length;
		const coveredInGuideline = g.controls.filter((c) =>
			coveredTRControlIds.has(c.id),
		).length;

		return {
			id: g.id,
			title: g.title,
			totalGuidelineControls: totalInGuideline,
			evaluatedControls: evaluatedInGuideline,
			coveredControls: coveredInGuideline,
			percentage:
				evaluatedInGuideline > 0
					? (coveredInGuideline / evaluatedInGuideline) * 100
					: 0,
		};
	});

	return {
		totalEvaluatedTechnicalControls,
		coveredTechnicalControlsCount,
		coverageScore:
			totalEvaluatedTechnicalControls > 0
				? (coveredTechnicalControlsCount / totalEvaluatedTechnicalControls) *
					100
				: 0,
		guidelines: guidelineBreakdown,
	};
}
