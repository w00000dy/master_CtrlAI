"use server";

import { prisma } from "@/lib/prisma";

export async function getBenchmarkResults() {
	const results = await prisma.benchmarkResult.findMany({
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
