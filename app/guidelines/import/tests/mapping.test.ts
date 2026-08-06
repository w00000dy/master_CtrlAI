import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ParagraphForMapping } from "../mapping.ts";
import { mapCraRefToParagraph, matchesMarker } from "../mapping.ts";
import { craParagraphs } from "./mapping-cra-data.mock.ts";

describe("mapCraRefToParagraph - Basic", () => {
	const mockParagraphs: ParagraphForMapping[] = [
		{
			id: 1,
			marker: "1",
			section: { marker: "Article 10" },
			parentParagraph: null,
		},
		{
			id: 2,
			marker: "2",
			section: { marker: "Article 10" },
			parentParagraph: null,
		},
		{
			id: 3,
			marker: "a",
			section: { marker: "Article 10" },
			parentParagraph: { marker: "2" },
		},
		{
			id: 4,
			marker: "1",
			section: { marker: "Article 11" },
			parentParagraph: null,
		},
	];

	test("returns null if no specific paragraph is requested", () => {
		const result = mapCraRefToParagraph("Article 10", mockParagraphs);
		assert.equal(result, null);
	});

	test("returns null if article does not exist", () => {
		assert.equal(mapCraRefToParagraph("Article 1", mockParagraphs), null);
		assert.equal(mapCraRefToParagraph("Article 1 (2)", mockParagraphs), null);
		assert.equal(mapCraRefToParagraph("Article 1 (2) a", mockParagraphs), null);
	});

	test("returns null if order of section and paragraph reference is wrong", () => {
		const result = mapCraRefToParagraph("2 10", mockParagraphs);
		assert.equal(result, null);
	});

	test("returns null if order of parent paragraph and paragraph reference is wrong", () => {
		assert.equal(mapCraRefToParagraph("10 a 2", mockParagraphs), null);
		assert.equal(mapCraRefToParagraph("a 2 10", mockParagraphs), null);
	});

	test("matches section and paragraph reference without section name", () => {
		assert.equal(mapCraRefToParagraph("10 2", mockParagraphs), 2);
		assert.equal(mapCraRefToParagraph("10 2 a", mockParagraphs), 2);
		assert.equal(mapCraRefToParagraph("a 10 2", mockParagraphs), 2); // a is a Prefix (could be the name of the document)
	});

	test("maps to a specific paragraph when perfectly matched", () => {
		const result = mapCraRefToParagraph("Article 10(2)", mockParagraphs);
		assert.equal(result, 2);
	});

	test("maps to a child paragraph when matched", () => {
		const result = mapCraRefToParagraph("Article 10(2)(a)", mockParagraphs);
		assert.equal(result, 3);
	});

	test("returns null if specific paragraph is requested but not found", () => {
		const result = mapCraRefToParagraph("Article 10(9)", mockParagraphs);
		assert.equal(result, null);
	});

	test("does not cross section boundaries", () => {
		const result = mapCraRefToParagraph("Article 11(1)", mockParagraphs);
		assert.equal(result, 4);
	});

	test("matches short markers", () => {
		const result = mapCraRefToParagraph("Art. 11(1)", mockParagraphs);
		assert.equal(result, 4);
	});

	test("handles craRef without section pattern", () => {
		const result = mapCraRefToParagraph(
			"Just some random text without markers",
			mockParagraphs,
		);
		assert.equal(result, null);
	});

	test("handles sections with null marker", () => {
		const nullSectionParagraphs: ParagraphForMapping[] = [
			{
				id: 5,
				marker: "1",
				section: { marker: null },
				parentParagraph: null,
			},
		];
		const result = mapCraRefToParagraph("Article 10(1)", nullSectionParagraphs);
		assert.equal(result, null);
	});
});

describe("matchesMarker", () => {
	const assertNotMatchesBoth = (a: string, b: string) => {
		assert.equal(
			matchesMarker(a, b),
			null,
			`matchesMarker("${a}", "${b}") should be null`,
		);
		assert.equal(
			matchesMarker(b, a),
			null,
			`matchesMarker("${b}", "${a}") should be null`,
		);
	};

	test("returns null for null or undefined marker", () => {
		assert.equal(matchesMarker(null, "Article 10"), null);
		assert.equal(matchesMarker(undefined, "Article 10"), null);
		assertNotMatchesBoth("", "Article 10");
	});

	test("returns null when short marker has no alphanumeric characters", () => {
		assert.equal(matchesMarker("()", "Article 10"), null);
		assert.equal(matchesMarker("...", "Article 10"), null);
	});

	test("matches long markers with word boundaries", () => {
		assert.notEqual(matchesMarker("Article 10", "Article 10"), null);
		assert.notEqual(matchesMarker("Art. 10", "Art. 10"), null);
		assert.notEqual(matchesMarker("Article 10", "Article 10(2)"), null);
		assert.notEqual(matchesMarker("Article 10", "Article 10 (2)"), null);
		assert.notEqual(matchesMarker("Part I", "Part I"), null);
		assertNotMatchesBoth("Part I", "Part II");
		assertNotMatchesBoth("P I", "P II");
		assertNotMatchesBoth("Article 1", "Article 10");
		assertNotMatchesBoth("Art. 10", "Article 10");
	});

	test("matches numeric short markers in various formats", () => {
		assert.notEqual(matchesMarker("1", "Article 10(1)"), null); // in parentheses
		assert.notEqual(matchesMarker("1", "1. This is a paragraph"), null); // with dot
		assert.notEqual(matchesMarker("1", "1) paragraph"), null); // right parenthesis
		assert.notEqual(matchesMarker("1", "1 "), null); // bare number
		assert.notEqual(matchesMarker("1.", "Article 10(1)"), null); // marker contains dot
		assert.notEqual(matchesMarker("(1)", "1."), null); // marker contains parentheses
		assertNotMatchesBoth("1", "11"); // does not match inside other numbers
	});

	test("matches letter short markers only with punctuation to avoid false positives", () => {
		assert.notEqual(matchesMarker("a", "Article 10(2)(a)"), null); // in parentheses
		assert.notEqual(matchesMarker("a", "a. paragraph"), null); // with dot
		assert.notEqual(matchesMarker("a", "a) paragraph"), null); // right parenthesis
		assertNotMatchesBoth("a", "a paragraph"); // does NOT match bare letter
		assertNotMatchesBoth("a", "Article"); // does NOT match inside words
		assertNotMatchesBoth("i", "Annex I"); // does NOT match Roman numeral without punctuation
		assert.notEqual(matchesMarker("i", "(i)"), null); // matches Roman numeral with punctuation
	});

	test("is case insensitive", () => {
		assert.notEqual(matchesMarker("ARTICLE 10", "article 10(2)"), null);
		assert.notEqual(matchesMarker("A", "Article 10(2)(a)"), null);
		assert.notEqual(matchesMarker("Part I", "part i"), null);
	});
});

describe("mapCraRefToParagraph - CRA", () => {
	test("correctly maps a direct match", () => {
		assert.equal(
			mapCraRefToParagraph("CRA Annex I Part I (1)", craParagraphs),
			25,
		);
		assert.equal(
			mapCraRefToParagraph("CRA Annex I Part I (2) point (d)", craParagraphs),
			30,
		);
		assert.equal(
			mapCraRefToParagraph("CRA Annex I Part I (2) point (e)", craParagraphs),
			31,
		);
		assert.equal(
			mapCraRefToParagraph("CRA Annex I Part II (2)", craParagraphs),
			42,
		);
	});

	test("returns null when no direct match is found", () => {
		assert.equal(
			mapCraRefToParagraph("CRA Article 13 (3) & (4)", craParagraphs),
			null,
		);
	});

	test("returns null when crafRef is erroneus", () => {
		assert.equal(
			mapCraRefToParagraph("CRA Annex I (2) point (e)", craParagraphs),
			null,
		);
		assert.equal(mapCraRefToParagraph("CRA Annex II (2)", craParagraphs), null);
	});
});
