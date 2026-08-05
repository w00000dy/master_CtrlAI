export function matchesMarker(
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

export type ParagraphForMapping = {
	id: number;
	marker: string | null;
	text: string;
	section: {
		marker: string | null;
		title: string | null;
	};
	parentParagraph: {
		marker: string | null;
	} | null;
};

export function mapCraRefToParagraphs(
	craRef: string,
	allParagraphs: ParagraphForMapping[],
): number[] {
	let bestScore = 0;
	const scoredParagraphs: { id: number; score: number }[] = [];

	// Check if the CRA reference contains more than just the section name
	// (e.g. "Article 10(2)" -> true, "Article 10" -> false)
	const sectionPattern =
		/(article\s+\d+|art\.?\s*\d+|annex\s+[ivx]+|part\s+[ivx]+|chapter\s+[ivx\d]+)/gi;

	for (const p of allParagraphs) {
		// Check if section constraints are met
		const sectionRefsMatch = craRef.match(sectionPattern);
		if (sectionRefsMatch && sectionRefsMatch.length > 0) {
			const sectionRefs: string[] = [];
			for (const match of sectionRefsMatch) {
				const normalized = match.toLowerCase().replace(/\s+/g, " ");
				sectionRefs.push(normalized);
				if (normalized.startsWith("art") && !normalized.startsWith("article")) {
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
		if (p.parentParagraph && matchesMarker(p.parentParagraph.marker, craRef)) {
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

	const matchedIds: number[] = [];
	// Only add paragraphs that achieved the best score for this craRef.
	// We require a minimum score of 10
	// (meaning the paragraph or its parent must have been exactly matched).
	const minRequiredScore = 10;
	if (bestScore >= minRequiredScore) {
		for (const sp of scoredParagraphs) {
			if (sp.score === bestScore) {
				matchedIds.push(sp.id);
			}
		}
	}

	return matchedIds;
}
