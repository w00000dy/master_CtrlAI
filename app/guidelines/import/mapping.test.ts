import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ParagraphForMapping } from "./mapping.ts";
import { mapCraRefToParagraphs } from "./mapping.ts";

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
