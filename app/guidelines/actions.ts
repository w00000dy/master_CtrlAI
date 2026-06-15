"use server";

import { prisma } from "@/lib/prisma";

export async function getGuidelines() {
	try {
		const guidelines = await prisma.guideline.findMany({
			include: {
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
		const guideline = await prisma.guideline.findUnique({
			where: { id },
			include: {
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
		});
		if (!guideline) return { success: false, error: "Guideline not found." };
		return { success: true, guideline };
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
