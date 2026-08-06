"use server";

import yaml from "yaml";
import { prisma } from "@/lib/prisma";

type YamlControl = {
	id: string;
	title?: string;
	statements?: string | string[];
	implementationGuidance?: string;
	cra?: string[];
};

type ParsedYaml = {
	controlGroup?: {
		id?: string;
		title?: string;
		controls?: YamlControl[];
		subgroups?: { controls?: YamlControl[] }[];
	};
	catalog?: {
		title?: string;
		groups?: {
			controls?: YamlControl[];
			subgroups?: { controls?: YamlControl[] }[];
		}[];
	};
};

import type { ParagraphForMapping } from "./mapping";
import { mapCraRefToParagraph } from "./mapping";

export async function importGuidelineYaml(formData: FormData) {
	const file = formData.get("file") as File;
	const documentId = parseInt(formData.get("documentId") as string, 10);

	if (!file) {
		return { success: false, error: "No file uploaded." };
	}

	if (!documentId) {
		return { success: false, error: "No document selected." };
	}

	try {
		const text = await file.text();
		let parsed: ParsedYaml;
		try {
			parsed = yaml.parse(text);
		} catch (e) {
			console.error("YAML Parse Error", e);
			return { success: false, error: "Invalid YAML file format." };
		}

		// Support different root nodes based on BSI schema: controlGroup or catalog
		let controlsData: YamlControl[] = [];
		let guidelineTitle = file.name;

		if (parsed.controlGroup) {
			guidelineTitle =
				parsed.controlGroup.title || parsed.controlGroup.id || file.name;
			if (Array.isArray(parsed.controlGroup.controls)) {
				controlsData = parsed.controlGroup.controls;
			} else if (Array.isArray(parsed.controlGroup.subgroups)) {
				for (const sg of parsed.controlGroup.subgroups) {
					if (Array.isArray(sg.controls)) {
						controlsData.push(...sg.controls);
					}
				}
			}
		} else if (parsed.catalog) {
			guidelineTitle = parsed.catalog.title || file.name;
			if (Array.isArray(parsed.catalog.groups)) {
				for (const g of parsed.catalog.groups) {
					if (Array.isArray(g.controls)) {
						controlsData.push(...g.controls);
					} else if (Array.isArray(g.subgroups)) {
						for (const sg of g.subgroups) {
							if (Array.isArray(sg.controls)) {
								controlsData.push(...sg.controls);
							}
						}
					}
				}
			}
		}

		if (controlsData.length === 0) {
			return { success: false, error: "No controls found in the YAML file." };
		}

		// Create Guideline
		const newGuideline = await prisma.guideline.create({
			data: {
				title: guidelineTitle,
				documentId: documentId,
			},
		});

		// Fetch paragraphs from DB to match against (only for the selected document)
		const allParagraphs = await prisma.paragraph.findMany({
			where: {
				section: {
					documentId: documentId,
				},
			},
			select: {
				id: true,
				marker: true,
				section: {
					select: {
						marker: true,
					},
				},
				parentParagraph: {
					select: {
						marker: true,
					},
				},
			},
		});

		let mappedCount = 0;

		const createdControls = [];

		for (const ctrl of controlsData) {
			const craRefs: string[] = Array.isArray(ctrl.cra) ? ctrl.cra : [];
			const matchedParagraphIds = new Set<number>();

			for (const craRef of craRefs) {
				const matchedId = mapCraRefToParagraph(
					craRef,
					allParagraphs as ParagraphForMapping[],
				);
				if (matchedId !== null) {
					matchedParagraphIds.add(matchedId);
				} else {
					console.warn(
						`Could not map CRA reference "${craRef}" to a paragraph.`,
					);
				}
			}

			if (matchedParagraphIds.size > 0) {
				mappedCount++;
			} else {
				console.warn(
					`Could not map control "${ctrl.title}" (id: ${ctrl.id}) with CRA reference "${craRefs.join(", ")}" to a paragraph in the database for guideline "${guidelineTitle}".`,
				);
			}

			// Statements are usually an array of strings
			const statementText = Array.isArray(ctrl.statements)
				? ctrl.statements.join("\n\n")
				: ctrl.statements || "";

			const newControl = await prisma.control.create({
				data: {
					title: ctrl.title || ctrl.id || "Untitled Control",
					statement: statementText,
					implementationGuidance: ctrl.implementationGuidance || null,
					guidelineId: newGuideline.id,
					paragraphs: {
						connect: Array.from(matchedParagraphIds).map((id) => ({ id })),
					},
				},
				include: {
					paragraphs: true,
				},
			});
			createdControls.push(newControl);
		}

		return {
			success: true,
			guidelineId: newGuideline.id,
			totalCount: createdControls.length,
			mappedCount,
			unmappedCount: createdControls.length - mappedCount,
		};
	} catch (error) {
		console.error("Failed to import YAML", error);
		return {
			success: false,
			error: "An unexpected error occurred during import.",
		};
	}
}
