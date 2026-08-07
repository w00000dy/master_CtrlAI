"use server";

import { prisma } from "@/lib/prisma";

export async function toggleFewShotExample(
	paragraphId: number,
	isFewShotExample: boolean,
) {
	await prisma.paragraph.update({
		where: { id: paragraphId },
		data: { isFewShotExample },
	});
}
