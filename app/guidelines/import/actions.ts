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

	// For long markers, use word boundaries to avoid partial matches
	// e.g., "Part I" should not match "Part II"
	if (m.length > 5) {
		const escapedM = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(^|[^a-z0-9])${escapedM}([^a-z0-9]|$)`, "i");
		if (regex.test(ref)) {
			return true;
		}
	}

	// For short markers, extract the alphanumeric core to avoid punctuation mismatches
	// e.g. "1." -> "1", "a)" -> "a"
	const coreMarker = m.replace(/[^a-z0-9]/g, "");
	if (!coreMarker) return false;

	const escaped = coreMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	// If the core marker is purely digits, allow it to match without punctuation as well.
	// If it contains letters (like 'a', 'i', 'ii'), REQUIRE standard punctuation like (a), a., or a)
	// to prevent false positives with Roman numerals like 'Annex I' or words.
	let regexStr = "";
	if (/^[0-9]+$/.test(coreMarker)) {
		regexStr = `(^|[^a-z0-9])(\\(${escaped}\\)|${escaped}\\.|${escaped}\\)|${escaped})([^a-z0-9]|$)`;
	} else {
		regexStr = `(^|[^a-z0-9])(\\(${escaped}\\)|${escaped}\\.|${escaped}\\))([^a-z0-9]|$)`;
	}

	const regex = new RegExp(regexStr, "i");
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
			const matchedParagraphIds = new Set<string>();

			for (const craRef of craRefs) {
				let bestScore = 0;
				const scoredParagraphs: { id: string; score: number }[] = [];

				for (const p of allParagraphs) {
					// Check if section constraints are met
					const sectionRefsMatch = craRef.match(
						/(article\s+\d+|art\.?\s*\d+|annex\s+[ivx]+|part\s+[ivx]+|chapter\s+[ivx\d]+)/gi,
					);
					if (sectionRefsMatch && sectionRefsMatch.length > 0) {
						const sectionRefs: string[] = [];
						for (const match of sectionRefsMatch) {
							const normalized = match.toLowerCase().replace(/\s+/g, " ");
							sectionRefs.push(normalized);
							if (
								normalized.startsWith("art") &&
								!normalized.startsWith("article")
							) {
								sectionRefs.push(normalized.replace(/^art\.?\s*/, "article "));
							} else if (normalized.startsWith("article")) {
								sectionRefs.push(normalized.replace(/^article\s*/, "art. "));
								sectionRefs.push(normalized.replace(/^article\s*/, "art "));
							}
						}

						let sectionSatisfied = false;
						for (const sr of sectionRefs) {
							const markerStr = p.section.marker?.toLowerCase() || "";
							const titleStr = p.section.title?.toLowerCase() || "";

							if (
								markerStr.includes(sr) ||
								titleStr.includes(sr) ||
								matchesMarker(p.section.marker, sr) ||
								matchesMarker(p.section.title, sr)
							) {
								sectionSatisfied = true;
								break;
							}
						}
						if (!sectionSatisfied) {
							continue; // Skip because the paragraph is not in the required section
						}
					}

					let score = 0;

					// Most specific match: the paragraph marker itself
					if (matchesMarker(p.marker, craRef)) score += 10;

					// Next: the parent paragraph's marker
					if (
						p.parentParagraph &&
						matchesMarker(p.parentParagraph.marker, craRef)
					) {
						score += 5;
					}

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
