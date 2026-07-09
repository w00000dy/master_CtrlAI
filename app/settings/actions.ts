"use server";

import { prisma } from "@/lib/prisma";

export async function getSettingsData() {
	try {
		const documents = await prisma.document.findMany({
			include: {
				sections: {
					include: {
						paragraphs: {
							orderBy: { marker: "asc" },
						},
					},
					orderBy: { title: "asc" },
				},
			},
			orderBy: { title: "asc" },
		});
		return { success: true, documents };
	} catch (error) {
		console.error("Failed to fetch settings data:", error);
		return {
			success: false,
			error: "Failed to load paragraphs.",
			documents: [],
		};
	}
}

export async function toggleFewShotExample(
	paragraphId: number,
	isFewShotExample: boolean,
) {
	try {
		await prisma.paragraph.update({
			where: { id: paragraphId },
			data: { isFewShotExample },
		});
		return { success: true };
	} catch (error) {
		console.error("Failed to toggle few-shot example:", error);
		return { success: false, error: "Failed to update paragraph." };
	}
}
