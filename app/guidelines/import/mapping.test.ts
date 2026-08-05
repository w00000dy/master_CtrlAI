import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ParagraphForMapping } from "./mapping.ts";
import { mapCraRefToParagraphs, matchesMarker } from "./mapping.ts";

describe("mapCraRefToParagraphs", () => {
	const mockParagraphs: ParagraphForMapping[] = [
		{
			id: 1,
			marker: "1",
			text: "This is the first paragraph of Article 10.",
			section: { marker: "Article 10", title: "Security Requirements" },
			parentParagraph: null,
		},
		{
			id: 2,
			marker: "2",
			text: "This is the second paragraph of Article 10.",
			section: { marker: "Article 10", title: "Security Requirements" },
			parentParagraph: null,
		},
		{
			id: 3,
			marker: "a",
			text: "This is a subparagraph of paragraph 2.",
			section: { marker: "Article 10", title: "Security Requirements" },
			parentParagraph: { marker: "2" },
		},
		{
			id: 4,
			marker: "1",
			text: "First paragraph of Article 11.",
			section: { marker: "Article 11", title: "Reporting" },
			parentParagraph: null,
		},
	];

	test("returns empty array if no specific paragraph is requested", () => {
		const result = mapCraRefToParagraphs("Article 10", mockParagraphs);
		assert.deepEqual(result, []);
	});

	test("maps to a specific paragraph when perfectly matched", () => {
		const result = mapCraRefToParagraphs("Article 10(2)", mockParagraphs);
		assert.deepEqual(result, [2]);
	});

	test("maps to a child paragraph when matched", () => {
		const result = mapCraRefToParagraphs("Article 10(2)(a)", mockParagraphs);
		assert.deepEqual(result, [3]);
	});

	test("returns empty array if specific paragraph is requested but not found", () => {
		const result = mapCraRefToParagraphs("Article 10(99)", mockParagraphs);
		assert.deepEqual(result, []);
	});

	test("does not cross section boundaries", () => {
		const result = mapCraRefToParagraphs("Article 11(1)", mockParagraphs);
		assert.deepEqual(result, [4]);
	});
});

describe("matchesMarker", () => {
	const assertNotMatchesBoth = (a: string, b: string) => {
		assert.equal(matchesMarker(a, b), false, `matchesMarker("${a}", "${b}") should be false`);
		assert.equal(matchesMarker(b, a), false, `matchesMarker("${b}", "${a}") should be false`);
	};

	test("returns false for null or undefined marker", () => {
		assert.equal(matchesMarker(null, "Article 10"), false);
		assert.equal(matchesMarker(undefined, "Article 10"), false);
		assertNotMatchesBoth("", "Article 10");
	});

	test("matches long markers with word boundaries", () => {
		assert.equal(matchesMarker("Article 10", "Article 10"), true);
		assert.equal(matchesMarker("Art. 10", "Art. 10"), true);
		assert.equal(matchesMarker("Article 10", "Article 10(2)"), true);
		assert.equal(matchesMarker("Article 10", "Article 10 (2)"), true);
		assert.equal(matchesMarker("Part I", "Part I"), true);
		assertNotMatchesBoth("Part I", "Part II"); // word boundary check
		assertNotMatchesBoth("P I", "P II");
		assertNotMatchesBoth("Article 1", "Article 10");
		assertNotMatchesBoth("Art. 10", "Article 10");
	});

	test("matches numeric short markers in various formats", () => {
		assert.equal(matchesMarker("1", "Article 10(1)"), true); // in parentheses
		assert.equal(matchesMarker("1", "1. This is a paragraph"), true); // with dot
		assert.equal(matchesMarker("1", "1) paragraph"), true); // right parenthesis
		assert.equal(matchesMarker("1", "1 "), true); // bare number
		assert.equal(matchesMarker("1.", "Article 10(1)"), true); // marker contains dot
		assert.equal(matchesMarker("(1)", "1."), true); // marker contains parentheses
		assertNotMatchesBoth("1", "11"); // does not match inside other numbers
	});

	test("matches letter short markers only with punctuation to avoid false positives", () => {
		assert.equal(matchesMarker("a", "Article 10(2)(a)"), true); // in parentheses
		assert.equal(matchesMarker("a", "a. paragraph"), true); // with dot
		assert.equal(matchesMarker("a", "a) paragraph"), true); // right parenthesis
		assertNotMatchesBoth("a", "a paragraph"); // does NOT match bare letter
		assertNotMatchesBoth("a", "Article"); // does NOT match inside words
		assertNotMatchesBoth("i", "Annex I"); // does NOT match Roman numeral without punctuation
		assert.equal(matchesMarker("i", "(i)"), true); // matches Roman numeral with punctuation
	});

	test("is case insensitive", () => {
		assert.equal(matchesMarker("ARTICLE 10", "article 10(2)"), true);
		assert.equal(matchesMarker("A", "Article 10(2)(a)"), true);
		assert.equal(matchesMarker("Part I", "part i"), true);
	});
});
