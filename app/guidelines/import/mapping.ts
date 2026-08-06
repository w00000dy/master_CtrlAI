export function matchesMarker(
	marker: string | null | undefined,
	craRef: string,
): { start: number; end: number } | null {
	if (!marker) return null;
	const m = marker.toLowerCase().trim();
	const ref = craRef.toLowerCase();

	// For long markers, use word boundaries to avoid partial matches
	// e.g., "Part I" should not match "Part II"
	if (m.length > 5) {
		const escapedM = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regexStr = `(^|[^a-z0-9])(${escapedM})([^a-z0-9]|$)`;
		const matchRange = getMatchRange(ref, regexStr);
		if (matchRange) return matchRange;
	}

	// For short markers, extract the alphanumeric core to avoid punctuation mismatches
	// e.g. "1." -> "1", "a)" -> "a"
	const coreMarker = m.replace(/[^a-z0-9]/g, "");
	if (!coreMarker) return null;

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

	return getMatchRange(ref, regexStr);
}

function getMatchRange(
	ref: string,
	regexStr: string,
): { start: number; end: number } | null {
	const regex = new RegExp(regexStr, "i");
	const match = ref.match(regex);
	if (match && match.index !== undefined) {
		let start = match.index;
		if (match[1].length > 0) start += match[1].length;
		return { start, end: start + match[2].length };
	}
	return null;
}

function getPotentialMarkers(
	text: string,
): { token: string; start: number; end: number }[] {
	const results: { token: string; start: number; end: number }[] = [];
	const regex = /[a-z0-9]+/gi;
	const matches = text.matchAll(regex);
	for (const match of matches) {
		const token = match[0];
		if (
			/^[0-9]+$/.test(token) ||
			/^[a-z]$/i.test(token) ||
			/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(token)
		) {
			results.push({
				token,
				start: match.index,
				end: match.index + token.length,
			});
		}
	}
	return results;
}

function extractNumber(text: string | null | undefined): string | null {
	if (!text) return null;
	const match = text.match(/(?:\s|^)(\d+|[ivx]+)(?:\s|$)/i);
	if (match) return match[1];
	const digits = text.match(/\d+/);
	if (digits) return digits[0];
	return null;
}

export type ParagraphForMapping = {
	id: number;
	marker: string | null;
	text: string;
	section: {
		marker: string | null;
	};
	parentParagraph: {
		marker: string | null;
	} | null;
};

export function mapCraRefToParagraph(
	craRef: string,
	allParagraphs: ParagraphForMapping[],
): number | null {
	let bestScore = 0;
	const scoredParagraphs: { id: number; score: number }[] = [];

	// Check if the CRA reference contains more than just the section name
	// (e.g. "Article 10(2)" -> true, "Article 10" -> false)
	const sectionPattern =
		/(article\s+\d+|art\.?\s*\d+|annex\s+[ivx]+|part\s+[ivx]+|chapter\s+[ivx\d]+)/gi;

	const potentialMarkers = getPotentialMarkers(craRef);

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

				if (
					markerStr.includes(sr) ||
					matchesMarker(p.section.marker, sr) !== null
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
		let isValidOrder = true;
		const matchRanges: { start: number; end: number }[] = [];

		// Most specific match: the paragraph marker itself
		const paraMatch = matchesMarker(p.marker, craRef);
		if (paraMatch !== null) {
			score += 10;
			matchRanges.push(paraMatch);
		}

		// Next: the parent paragraph's marker
		let parentMatch: { start: number; end: number } | null = null;
		if (p.parentParagraph) {
			parentMatch = matchesMarker(p.parentParagraph.marker, craRef);
			if (parentMatch !== null) {
				score += 5;
				matchRanges.push(parentMatch);
				if (paraMatch !== null && parentMatch.start > paraMatch.start) {
					isValidOrder = false;
				}
			}
		}

		// Less specific: the section marker
		const sectionMarkerMatch = matchesMarker(p.section.marker, craRef);
		const sectionNum = extractNumber(p.section.marker);
		const sectionNumMatch = sectionNum
			? matchesMarker(sectionNum, craRef)
			: null;

		let activeSectionMatch: { start: number; end: number } | null = null;

		if (sectionMarkerMatch !== null) {
			score += 5;
			activeSectionMatch = sectionMarkerMatch;
			matchRanges.push(sectionMarkerMatch);
		} else if (sectionNumMatch !== null) {
			score += 5;
			activeSectionMatch = sectionNumMatch;
			matchRanges.push(sectionNumMatch);
		}

		if (activeSectionMatch !== null) {
			if (paraMatch !== null && activeSectionMatch.start > paraMatch.start) {
				isValidOrder = false;
			}
			if (
				parentMatch !== null &&
				activeSectionMatch.start > parentMatch.start
			) {
				isValidOrder = false;
			}
		}

		// Check for intervening potential markers that shouldn't be there
		if (isValidOrder && matchRanges.length > 0) {
			matchRanges.sort((a, b) => a.start - b.start);

			const gaps = [{ start: 0, end: matchRanges[0].start }];
			for (let i = 0; i < matchRanges.length - 1; i++) {
				gaps.push({ start: matchRanges[i].end, end: matchRanges[i + 1].start });
			}

			for (const gap of gaps) {
				for (const pm of potentialMarkers) {
					if (pm.start >= gap.start && pm.end <= gap.end) {
						isValidOrder = false;
						break;
					}
				}
				if (!isValidOrder) break;
			}
		}

		if (score > 0 && isValidOrder) {
			scoredParagraphs.push({ id: p.id, score });
			if (score > bestScore) {
				bestScore = score;
			}
		}
	}

	let bestMatchId: number | null = null;
	const minRequiredScore = 10;

	if (bestScore >= minRequiredScore) {
		for (const sp of scoredParagraphs) {
			if (sp.score === bestScore) {
				if (bestMatchId === null) {
					bestMatchId = sp.id;
				} else {
					console.error(
						`Ambiguous match for CRA reference "${craRef}". Multiple paragraphs found with best score ${bestScore}.`,
					);
					return null;
				}
			}
		}
	}

	return bestMatchId;
}
