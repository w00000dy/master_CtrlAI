"use server";

import { prisma } from "@/lib/prisma";

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
