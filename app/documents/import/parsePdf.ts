"use server";

import { PDFParse } from "pdf-parse";
import { generateChat } from "@/lib/llm";

export type Paragraph = {
	marker: string | null;
	text: string;
	subParagraphs?: Paragraph[];
};

export type ParsedDocument = {
	title: string;
	sections: {
		marker: string | null;
		title: string;
		paragraphs: Paragraph[];
	}[];
};

export async function extractPdfText(formData: FormData) {
	try {
		const file = formData.get("file") as File;
		if (!file) {
			return { success: false, error: "No file provided" };
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		let pdfData: { text: string };
		try {
			const parser = new PDFParse({ data: buffer });
			pdfData = await parser.getText();
			await parser.destroy();
		} catch (err) {
			console.error("PDF Parsing Error:", err);
			return { success: false, error: "Failed to parse PDF file." };
		}

		const rawText = pdfData.text;
		return { success: true, rawText };
	} catch (error) {
		console.error("Error in extractPdfText:", error);
		return {
			success: false,
			error: "An unexpected error occurred during PDF extraction.",
		};
	}
}

export async function structureTextWithLlm(rawText: string, model: string) {
	try {
		const systemPrompt = `You are a legal text structuring assistant. 
Your task is to take the provided raw text from a legal document and output a perfectly structured JSON object. 
Extract the overall title, sections, and paragraphs. Paragraphs can have sub-paragraphs, which can themselves have sub-paragraphs, nested to any depth necessary.
For each section, extract its number or identifier (e.g., "Part 1", "Section A", "Article 5") into the "marker" field if present, otherwise set the marker to null.
For each paragraph, extract ONLY its inner number or letter into the "marker" field if present. Strip any surrounding punctuation, brackets, or parentheses (e.g., for "1.", "(a)", or "[1]", extract "1", "a", or "1"). If no marker is present, set the marker to null.
Do NOT drop, skip, or summarize any core legal text. Every single sentence from the actual document content must be included somewhere (title, text, or paragraph).
Completely ignore and EXCLUDE any page headers, footers, pagination markers, or document metadata (e.g., text like page numbers or dates at the top/bottom of pages).
If there is introductory text before a list of paragraphs (e.g., "Manufacturers of products with digital elements shall:"), treat this introductory text as a paragraph itself, and all the following list items as its sub-paragraphs.

The output MUST strictly match this JSON schema and contain no markdown blocks or other text outside the JSON:
{
  "title": "Document Title",
  "sections": [
    {
      "marker": "Part 1",
      "title": "Section or Annex Title",
      "paragraphs": [
        {
          "marker": null,
          "text": "Unmarked text",
          "subParagraphs": [
            {
              "marker": "1",
              "text": "Paragraph 1 text",
              "subParagraphs": [
                {
                  "marker": "a",
                  "text": "Sub-paragraph a text",
                  "subParagraphs": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Ensure all text is captured accurately and organized logically based on the document's recursive structure.`;

		const response = await generateChat({
			model: model,
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: rawText },
			],
			format: "json",
		});

		if (!response.success) {
			return {
				success: false,
				error: response.error,
			};
		}

		const resultText = response.content;
		let parsedJson: ParsedDocument;

		try {
			parsedJson = JSON.parse(resultText);
		} catch (error) {
			console.error("Failed to parse JSON from LLM:", resultText, error);
			return {
				success: false,
				error: "LLM returned invalid JSON.",
				rawJson: resultText,
			};
		}

		return { success: true, data: parsedJson, rawJson: resultText };
	} catch (error) {
		console.error("Error in structureTextWithLlm:", error);
		return {
			success: false,
			error: "An unexpected error occurred during LLM processing.",
		};
	}
}
