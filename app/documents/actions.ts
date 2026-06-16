"use server";

import { prisma } from "@/lib/prisma";
import type { Paragraph, ParsedDocument } from "../documents/import/parsePdf";

export async function saveDocument(
	document: ParsedDocument,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
	try {
		return await prisma.$transaction(async (tx) => {
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

			return { success: true, id: doc.id };
		});
	} catch (error) {
		console.error("Failed to save document:", error);
		return { success: false, error: "Failed to save the document." };
	}
}

export async function getDocuments() {
	try {
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

		return {
			success: true,
			documents: documents.map((d) => ({
				...d,
				savedAt: d.savedAt.toISOString(),
			})),
		};
	} catch (error) {
		console.error("Failed to fetch documents:", error);
		return {
			success: false,
			error: "Failed to load documents.",
			documents: [],
		};
	}
}

export async function getDocumentById(id: number) {
	try {
		const document = await prisma.document.findUnique({
			where: { id },
			include: {
				sections: {
					orderBy: { marker: "asc" },
					include: {
						paragraphs: {
							orderBy: { marker: "asc" },
						},
					},
				},
			},
		});

		if (!document) {
			return { success: false, error: "Document not found." };
		}

		return {
			success: true,
			data: {
				id: document.id,
				savedAt: document.savedAt.toISOString(),
				document,
			},
		};
	} catch (error) {
		console.error(`Failed to fetch document ${id}:`, error);
		return { success: false, error: "Document not found." };
	}
}

export async function deleteDocument(id: number) {
	try {
		await prisma.document.delete({
			where: { id },
		});
		return { success: true };
	} catch (error) {
		console.error(`Failed to delete document ${id}:`, error);
		return { success: false, error: "Failed to delete document." };
	}
}

export async function updateDocumentTitle(id: number, newTitle: string) {
	try {
		await prisma.document.update({
			where: { id },
			data: { title: newTitle },
		});
		return { success: true };
	} catch (error) {
		console.error(`Failed to update document title for ${id}:`, error);
		return { success: false, error: "Failed to update document title." };
	}
}
