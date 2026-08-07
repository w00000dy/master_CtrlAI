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
		throw new Error("No file uploaded.");
	}

	if (!documentId) {
		throw new Error("No document selected.");
	}

	const text = await file.text();
	const parsed = yaml.parse(text) as ParsedYaml;

	if (!parsed || (typeof parsed === 'object' && !parsed.controlGroup && !parsed.catalog)) {
		throw new Error("Invalid YAML file: Missing 'controlGroup' or 'catalog' root node.");
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

	const newGuideline = await prisma.guideline.create({
		data: {
			title: guidelineTitle,
			documentId: documentId,
		},
	});

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
				console.warn(`Could not map CRA reference "${craRef}" to a paragraph.`);
			}
		}

		if (matchedParagraphIds.size > 0) {
			mappedCount++;
		} else {
			console.warn(
				`Could not map control "${ctrl.title}" (id: ${ctrl.id}) with CRA reference "${craRefs.join(", ")}" to a paragraph in the database for guideline "${guidelineTitle}".`,
			);
		}

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
		guidelineId: newGuideline.id,
		totalCount: createdControls.length,
		mappedCount,
		unmappedCount: createdControls.length - mappedCount,
	};
}
