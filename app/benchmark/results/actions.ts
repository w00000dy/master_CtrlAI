"use server";

import { prisma } from "@/lib/prisma";

export async function getBenchmarkResults() {
	try {
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
		return { success: true, results };
	} catch (error) {
		console.error("Failed to fetch benchmark results:", error);
		return { success: false, error: "Failed to load benchmark results" };
	}
}

export async function getParagraphBenchmarks() {
	try {
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
		return { success: true, benchmarks };
	} catch (error) {
		console.error("Failed to fetch paragraph benchmarks:", error);
		return { success: false, error: "Failed to load paragraph benchmarks" };
	}
}
