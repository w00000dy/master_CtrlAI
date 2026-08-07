"use server";

import { enrichControlsWithAncestors } from "@/lib/controls";
import { prisma } from "@/lib/prisma";

export async function getGuidelines() {
	return prisma.guideline.findMany({
		include: {
			document: {
				select: { title: true },
			},
			_count: {
				select: { controls: true },
			},
		},
		orderBy: { savedAt: "desc" },
	});
}

export async function getGuidelineById(id: number) {
	const [guideline, allParagraphs] = await Promise.all([
		prisma.guideline.findUnique({
			where: { id },
			include: {
				document: {
					select: { title: true },
				},
				controls: {
					include: {
						paragraphs: {
							include: {
								section: {
									include: { document: true },
								},
							},
						},
					},
				},
			},
		}),
		prisma.paragraph.findMany(),
	]);
	if (!guideline) return null;

	const enrichedControls = enrichControlsWithAncestors(
		guideline.controls,
		allParagraphs,
	);

	return { ...guideline, controls: enrichedControls };
}

export async function deleteGuideline(id: number) {
	return prisma.guideline.delete({ where: { id } });
}

export async function deleteAllGuidelines() {
	return prisma.guideline.deleteMany();
}
