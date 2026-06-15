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

function matchesMarker(
	marker: string | null | undefined,
	craRef: string,
): boolean {
	if (!marker) return false;
	const m = marker.toLowerCase().trim();
	const ref = craRef.toLowerCase();

	// For long markers, simple inclusion is safe and handles complex strings well
	if (m.length > 5 && ref.includes(m)) {
		return true;
	}

	// For short markers (like "1", "a", "Part I"), require word boundaries to avoid false positives.
	// We use [^a-z0-9] to match any boundary (space, punctuation, parenthesis)
	const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
	return regex.test(ref);
}

export async function importGuidelineYaml(formData: FormData) {
	const file = formData.get("file") as File;
	const documentId = formData.get("documentId") as string;

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
				text: true,
				section: {
					select: {
						marker: true,
						title: true,
					},
				},
			},
		});

		let mappedCount = 0;

		const createdControls = [];

		for (const ctrl of controlsData) {
			const craRefs: string[] = Array.isArray(ctrl.cra) ? ctrl.cra : [];
			const matchedParagraphIds = new Set<string>();

			for (const craRef of craRefs) {
				let bestScore = 0;
				const scoredParagraphs: { id: string; score: number }[] = [];

				for (const p of allParagraphs) {
					let score = 0;

					// Most specific match: the paragraph marker itself
					if (matchesMarker(p.marker, craRef)) score += 10;

					// Less specific: the section marker or title
					if (matchesMarker(p.section.marker, craRef)) score += 5;
					if (matchesMarker(p.section.title, craRef)) score += 5;

					// Fallback for strong text match if no markers matched at all
					if (score === 0) {
						const nQuery = craRef.toLowerCase().replace(/[^a-z0-9]/g, "");
						if (
							nQuery.length > 8 &&
							p.text
								.toLowerCase()
								.replace(/[^a-z0-9]/g, "")
								.includes(nQuery)
						) {
							score += 1;
						}
					}

					if (score > 0) {
						scoredParagraphs.push({ id: p.id, score });
						if (score > bestScore) {
							bestScore = score;
						}
					}
				}

				// Only add paragraphs that achieved the best score for this craRef
				for (const sp of scoredParagraphs) {
					if (sp.score === bestScore) {
						matchedParagraphIds.add(sp.id);
					}
				}
			}

			if (matchedParagraphIds.size > 0) {
				mappedCount++;
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
