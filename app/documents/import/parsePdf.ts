"use server";

import { PDFParse } from "pdf-parse";
import * as z from "zod";
import { generateResponse } from "@/lib/llm";

export type Paragraph = {
	marker: string | null;
	text: string;
	subParagraphs: Paragraph[];
};

const ParagraphSchema: z.ZodType<Paragraph> = z.lazy(() =>
	z
		.object({
			marker: z
				.string()
				.nullable()
				.describe(
					'The inner number or letter of the paragraph (e.g., "1", "a"). If no marker is present, set to null. Strip any surrounding punctuation.',
				),
			text: z.string().describe("The text of the paragraph."),
			subParagraphs: z
				.array(ParagraphSchema)
				.describe("Nested sub-paragraphs. If there are no nested sub-paragraphs, return an empty array []."),
		})
		.describe(
			"A legal paragraph with optional marker and nested sub-paragraphs.",
		),
);

const ParsedDocumentSchema = z.object({
	title: z.string().describe("The overall title of the legal document."),
	sections: z.array(
		z
			.object({
				marker: z
					.string()
					.nullable()
					.describe(
						'The section number or identifier (e.g., "Part 1", "Section A", "Article 5"). Set to null if not present.',
					),
				title: z.string().describe("The title of the section."),
				paragraphs: z
					.array(ParagraphSchema)
					.describe("The paragraphs contained within the section."),
			})
			.describe("A section of the legal document."),
	),
});

export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;

export async function extractPdfText(formData: FormData) {
	const file = formData.get("file") as File;
	if (!file) {
		throw new Error("No file provided");
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const parser = new PDFParse({ data: buffer });
	const pdfData = await parser.getText();
	await parser.destroy();

	return pdfData.text;
}

export async function structureTextWithLlm(rawText: string, model: string) {
	const exampleDocument = ParsedDocumentSchema.parse({
		title: "Artificial Intelligence Act",
		sections: [
			{
				marker: "Chapter 1",
				title: "General Provisions",
				paragraphs: [
					{
						marker: "1",
						text: "The purpose of this Regulation is to improve the functioning of the internal market...",
						subParagraphs: [],
					},
					{
						marker: "2",
						text: "This Regulation applies to:",
						subParagraphs: [
							{
								marker: "a",
								text: "providers placing on the market or putting into service AI systems in the Union;",
								subParagraphs: [],
							},
						],
					},
				],
			},
		],
	});

	const systemPrompt = `### Instruction ###
You are a legal text structuring assistant. 
Your task is to take the provided raw text from a legal document and output a perfectly structured JSON object matching the requested schema. 
Extract the overall title, sections, and paragraphs. Paragraphs can have sub-paragraphs, which can themselves have sub-paragraphs, nested to any depth necessary.
For each section, extract its number or identifier (e.g., "Part 1", "Section A", "Article 5") into the "marker" field if present, otherwise set the marker to null.
For each paragraph, extract ONLY its inner number or letter into the "marker" field if present. Strip any surrounding punctuation, brackets, or parentheses (e.g., for "1.", "(a)", or "[1]", extract "1", "a", or "1"). If no marker is present, set the marker to null.
Do NOT drop, skip, or summarize any core legal text. Every single sentence from the actual document content must be included somewhere (title, text, or paragraph).
Completely ignore and EXCLUDE any page headers, footers, pagination markers, or document metadata (e.g., text like page numbers or dates at the top/bottom of pages).
If there is introductory text before a list of paragraphs (e.g., "Manufacturers of products with digital elements shall:"), treat this introductory text as a paragraph itself, and all the following list items as its sub-paragraphs.

### Example Output ###
${JSON.stringify(exampleDocument, null, 2)}

Ensure all text is captured accurately and organized logically based on the document's recursive structure.`;

	const response = await generateResponse({
		model: model,
		prompt: rawText,
		systemPrompt: systemPrompt,
		schema: ParsedDocumentSchema,
	});

	const resultText = response.content;
	const parsedJson = ParsedDocumentSchema.parse(JSON.parse(resultText));

	return { data: parsedJson, rawJson: resultText };
}
