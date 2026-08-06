export function matchesMarker(
	marker: string | null | undefined,
	craRef: string,
): { start: number; end: number } | null {
	if (!marker) return null;
	const m = marker.toLowerCase().trim();
	const ref = craRef.toLowerCase();

	if (m.length > 5) {
		const escapedM = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regexStr = `(^|[^a-z0-9])(${escapedM})([^a-z0-9]|$)`;
		const matchRange = getMatchRange(ref, regexStr);
		if (matchRange) return matchRange;
	}

	const coreMarker = m.replace(/[^a-z0-9]/g, "");
	if (!coreMarker) return null;

	const escaped = coreMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

	const sectionPattern =
		/(article\s+\d+|art\.?\s*\d+|annex\s+[ivx]+|part\s+[ivx]+|chapter\s+[ivx\d]+)/gi;

	const potentialMarkers = getPotentialMarkers(craRef);

	for (const p of allParagraphs) {
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
				const escapedSr = sr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const srRegex = new RegExp(
					`(^|[^a-z0-9])${escapedSr}([^a-z0-9]|$)`,
					"i",
				);

				if (
					srRegex.test(markerStr) ||
					matchesMarker(p.section.marker, sr) !== null
				) {
					sectionSatisfied = true;
					break;
				}
			}
			if (!sectionSatisfied) {
				continue;
			}
		}

		let score = 0;
		let isValidOrder = true;
		const matchRanges: { start: number; end: number }[] = [];

		const paraMatch = matchesMarker(p.marker, craRef);
		if (paraMatch !== null) {
			score += 10;
			matchRanges.push(paraMatch);
		}

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

			const gaps = [];
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

			// Check if there are explicit unmapped markers after the last match
			if (isValidOrder) {
				const lastMatchEnd = matchRanges[matchRanges.length - 1].end;
				for (const pm of potentialMarkers) {
					if (pm.start >= lastMatchEnd) {
						if (/^[0-9]+$/.test(pm.token)) {
							isValidOrder = false;
							break;
						}

						const before = craRef.slice(Math.max(0, pm.start - 1), pm.start);
						const after = craRef.slice(
							pm.end,
							Math.min(craRef.length, pm.end + 1),
						);
						if (
							(before === "(" && after === ")") ||
							after === "." ||
							after === ")"
						) {
							isValidOrder = false;
							break;
						}
					}
				}
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
