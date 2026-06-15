"use server";

import { enrichControlsWithAncestors } from "@/lib/controls";
import { prisma } from "@/lib/prisma";

export async function getGuidelines() {
	try {
		const guidelines = await prisma.guideline.findMany({
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
		return { success: true, guidelines };
	} catch (error) {
		console.error("Failed to fetch guidelines:", error);
		return { success: false, error: "Failed to load guidelines." };
	}
}

export async function getGuidelineById(id: string) {
	try {
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
		if (!guideline) return { success: false, error: "Guideline not found." };

		const enrichedControls = enrichControlsWithAncestors(
			guideline.controls,
			allParagraphs,
		);

		return {
			success: true,
			guideline: { ...guideline, controls: enrichedControls },
		};
	} catch (error) {
		console.error("Failed to fetch guideline:", error);
		return { success: false, error: "Failed to load guideline." };
	}
}

export async function deleteGuideline(id: string) {
	try {
		await prisma.guideline.delete({ where: { id } });
		return { success: true };
	} catch (error) {
		console.error("Failed to delete guideline:", error);
		return { success: false, error: "Failed to delete guideline." };
	}
}

export async function deleteAllGuidelines() {
	try {
		await prisma.guideline.deleteMany();
		return { success: true };
	} catch (error) {
		console.error("Failed to delete all guidelines:", error);
		return { success: false, error: "Failed to delete all guidelines." };
	}
}
