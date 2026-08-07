"use server";

import { prisma } from "@/lib/prisma";
import type { Paragraph, ParsedDocument } from "../documents/import/parsePdf";

export async function saveDocument(document: ParsedDocument) {
	return prisma.$transaction(async (tx) => {
		const doc = await tx.document.create({
			data: {
				title: document.title,
			},
		});

		for (const section of document.sections) {
			const sec = await tx.section.create({
				data: {
					marker: section.marker || null,
					title: section.title,
					documentId: doc.id,
				},
			});

			// Recursive function to insert paragraphs sequentially
			async function insertParagraphs(
				paragraphs: Paragraph[],
				sectionId: number,
				parentParagraphId: number | null = null,
			) {
				for (const p of paragraphs) {
					const createdP = await tx.paragraph.create({
						data: {
							marker: p.marker || null,
							text: p.text,
							sectionId: sectionId,
							parentParagraphId: parentParagraphId,
						},
					});

					if (p.subParagraphs && p.subParagraphs.length > 0) {
						await insertParagraphs(p.subParagraphs, sectionId, createdP.id);
					}
				}
			}

			if (section.paragraphs) {
				await insertParagraphs(section.paragraphs, sec.id);
			}
		}

		return { id: doc.id };
	});
}

export async function getDocuments() {
	const documents = await prisma.document.findMany({
		orderBy: {
			savedAt: "desc",
		},
		select: {
			id: true,
			title: true,
			savedAt: true,
		},
	});

	return documents.map((d) => ({
		...d,
		savedAt: d.savedAt.toISOString(),
	}));
}

export async function getDocumentById(id: number) {
	const document = await prisma.document.findUnique({
		where: { id },
		include: {
			sections: {
				orderBy: { marker: "asc" },
				include: {
					paragraphs: {
						orderBy: { marker: "asc" },
						include: {
							controls: {
								select: { guidelineId: true },
							},
						},
					},
				},
			},
		},
	});

	if (!document) {
		return null;
	}

	return {
		id: document.id,
		savedAt: document.savedAt.toISOString(),
		document,
	};
}

export async function deleteDocument(id: number) {
	return prisma.document.delete({
		where: { id },
	});
}

export async function updateDocumentTitle(id: number, newTitle: string) {
	return prisma.document.update({
		where: { id },
		data: { title: newTitle },
	});
}
