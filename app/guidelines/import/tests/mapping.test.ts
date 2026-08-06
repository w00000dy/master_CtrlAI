import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ParagraphForMapping } from "../mapping.ts";
import { mapCraRefToParagraph, matchesMarker } from "../mapping.ts";
import { craParagraphs } from "./mapping-cra-data.mock.ts";

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

	describe("returns null for null, undefined, or empty markers", () => {
		for (const marker of [null, undefined]) {
			test(`returns null for ${marker} marker`, () => {
				assert.equal(matchesMarker(marker, "Article 10"), null);
			});
		}

		test("returns null for empty string marker", () => {
			assertNotMatchesBoth("", "Article 10");
		});
	});

	describe("returns null when short marker has no alphanumeric characters", () => {
		const nonAlphanumericMarkers = ["()", "..."];
		for (const marker of nonAlphanumericMarkers) {
			test(`returns null for marker "${marker}"`, () => {
				assert.equal(matchesMarker(marker, "Article 10"), null);
			});
		}
	});

	describe("matches long markers", () => {
		const matchingCases = [
			{ a: "Article 10", b: "Article 10" },
			{ a: "Art. 10", b: "Art. 10" },
			{ a: "Article 10", b: "Article 10(2)" },
			{ a: "Article 10", b: "Article 10 (2)" },
			{ a: "Part I", b: "Part I" },
		];
		for (const { a, b } of matchingCases) {
			test(`matches "${a}" within "${b}"`, () => {
				assert.notEqual(matchesMarker(a, b), null);
			});
		}

		const nonMatchingCases = [
			{ a: "Part I", b: "Part II" },
			{ a: "P I", b: "P II" },
			{ a: "Article 1", b: "Article 10" },
			{ a: "Art. 10", b: "Article 10" },
		];
		for (const { a, b } of nonMatchingCases) {
			test(`does not match "${a}" with "${b}"`, () => {
				assertNotMatchesBoth(a, b);
			});
		}
	});

	describe("matches numeric short markers in various formats", () => {
		const matchingCases = [
			{ a: "1", b: "Article 10(1)", desc: "in parentheses" },
			{ a: "1", b: "1. This is a paragraph", desc: "with dot" },
			{ a: "1", b: "1) paragraph", desc: "right parenthesis" },
			{ a: "1", b: "1 ", desc: "bare number" },
			{ a: "1.", b: "Article 10(1)", desc: "marker contains dot" },
			{ a: "(1)", b: "1.", desc: "marker contains parentheses" },
		];
		for (const { a, b, desc } of matchingCases) {
			test(`matches "${a}" within "${b}" (${desc})`, () => {
				assert.notEqual(matchesMarker(a, b), null);
			});
		}

		test('does not match "1" inside other numbers like "11"', () => {
			assertNotMatchesBoth("1", "11");
		});
	});

	describe("matches letter short markers in various formats", () => {
		const matchingCases = [
			{ a: "a", b: "Article 10(2)(a)", desc: "in parentheses" },
			{ a: "a", b: "a. paragraph", desc: "with dot" },
			{ a: "a", b: "a) paragraph", desc: "right parenthesis" },
			{ a: "i", b: "(i)", desc: "Roman numeral with punctuation" },
		];
		for (const { a, b, desc } of matchingCases) {
			test(`matches "${a}" within "${b}" (${desc})`, () => {
				assert.notEqual(matchesMarker(a, b), null);
			});
		}

		const nonMatchingCases = [
			{ a: "a", b: "a paragraph", desc: "bare letter" },
			{ a: "a", b: "Article", desc: "inside words" },
			{ a: "i", b: "Annex I", desc: "Roman numeral without punctuation" },
		];
		for (const { a, b, desc } of nonMatchingCases) {
			test(`does NOT match "${a}" within "${b}" (${desc})`, () => {
				assertNotMatchesBoth(a, b);
			});
		}
	});

	describe("is case insensitive", () => {
		const cases = [
			{ a: "ARTICLE 10", b: "article 10(2)" },
			{ a: "A", b: "Article 10(2)(a)" },
			{ a: "Part I", b: "part i" },
		];
		for (const { a, b } of cases) {
			test(`matches "${a}" with "${b}" regardless of case`, () => {
				assert.notEqual(matchesMarker(a, b), null);
			});
		}
	});
});

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

	describe("returns null if article does not exist", () => {
		const invalidRefs = ["Article 1", "Article 1 (2)", "Article 1 (2) a"];
		for (const ref of invalidRefs) {
			test(`returns null for non-existent article reference "${ref}"`, () => {
				assert.equal(mapCraRefToParagraph(ref, mockParagraphs), null);
			});
		}
	});

	test("returns null if order of section and paragraph reference is wrong", () => {
		const result = mapCraRefToParagraph("2 10", mockParagraphs);
		assert.equal(result, null);
	});

	describe("returns null if order of parent paragraph and paragraph reference is wrong", () => {
		const cases = ["10 a 2", "a 2 10", "Article 10 (a)(2)"];
		for (const ref of cases) {
			test(`returns null for incorrect order "${ref}"`, () => {
				assert.equal(mapCraRefToParagraph(ref, mockParagraphs), null);
			});
		}
	});

	describe("matches section and paragraph reference without section name", () => {
		const cases = [
			{ ref: "10 2", desc: "just numbers" },
			{ ref: "10 2 a", desc: "with letter" },
			{ ref: "a 10 2", desc: "with prefix (could be doc name)" },
		];
		for (const { ref, desc } of cases) {
			test(`matches "${ref}" (${desc}) to paragraph 2`, () => {
				assert.equal(mapCraRefToParagraph(ref, mockParagraphs), 2);
			});
		}
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

	test("handles section markers with attached numbers (e.g. Title1)", () => {
		const result = mapCraRefToParagraph("Title1 1 2", [
			{
				id: 99,
				marker: "2",
				section: { marker: "Title1" },
				parentParagraph: null,
			},
		]);
		assert.equal(result, null);
	});

	test("handles section markers with no numbers (e.g. Title)", () => {
		const result = mapCraRefToParagraph("Title 2", [
			{
				id: 100,
				marker: "2",
				section: { marker: "Title" },
				parentParagraph: null,
			},
		]);
		assert.equal(result, 100);
	});

	test("returns null and logs error if match is ambiguous", () => {
		const ambiguousParagraphs: ParagraphForMapping[] = [
			{
				id: 1,
				marker: "1",
				section: { marker: "Article 10" },
				parentParagraph: null,
			},
			{
				id: 2,
				marker: "1",
				section: { marker: "Article 10" },
				parentParagraph: null,
			},
		];
		const originalError = console.error;
		let logged = false;
		console.error = () => {
			logged = true;
		};

		const result = mapCraRefToParagraph("Article 10(1)", ambiguousParagraphs);

		console.error = originalError;
		assert.equal(result, null);
		assert.equal(logged, true);
	});
});

describe("mapCraRefToParagraph - CRA", () => {
	describe("correctly maps a direct match", () => {
		const cases = [
			{ ref: "CRA Annex I Part I (1)", expectedId: 25 },
			{ ref: "CRA Annex I Part I (2) point (d)", expectedId: 30 },
			{ ref: "CRA Annex I Part I (2) point (e)", expectedId: 31 },
			{
				ref: "CRA Annex I Part  I   (2)   point   (e)     ",
				expectedId: 31,
				desc: "with extra whitespace",
			},
			{ ref: "CRA Annex I Part II (2)", expectedId: 42 },
		];
		for (const { ref, expectedId, desc } of cases) {
			test(`maps "${ref}" to paragraph ${expectedId}${desc ? ` (${desc})` : ""}`, () => {
				assert.equal(mapCraRefToParagraph(ref, craParagraphs), expectedId);
			});
		}
	});

	describe("returns null when no direct match is found", () => {
		const cases = [
			"CRA Article 13 (3) & (4)",
			"CRA Annex I Part I (2) point (o)",
		];
		for (const ref of cases) {
			test(`returns null for unmatched reference "${ref}"`, () => {
				assert.equal(mapCraRefToParagraph(ref, craParagraphs), null);
			});
		}
	});

	describe("returns null when craRef is erroneous", () => {
		const cases = ["CRA Annex I (2) point (e)", "CRA Annex II (2)"];
		for (const ref of cases) {
			test(`returns null for erroneous reference "${ref}"`, () => {
				assert.equal(mapCraRefToParagraph(ref, craParagraphs), null);
			});
		}
	});
});
