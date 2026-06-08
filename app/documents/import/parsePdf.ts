"use server";

import { PDFParse } from 'pdf-parse';
import { Ollama } from "ollama";

// Disable fetch timeout for long-running LLM calls
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ headersTimeout: 0 }));

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
});

export type Paragraph = {
  marker?: string;
  text: string;
  subParagraphs?: Paragraph[];
};

export type ParsedDocument = {
  title: string;
  sections: {
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

    let pdfData;
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
    return { success: false, error: "An unexpected error occurred during PDF extraction." };
  }
}

export async function structureTextWithLlm(rawText: string, model: string) {
  try {
    const systemPrompt = `You are a legal text structuring assistant. 
Your task is to take the provided raw text from a legal document (like EU Cyber Resilience Act) and output a perfectly structured JSON object. 
Extract the overall title, sections, and paragraphs. Paragraphs can have sub-paragraphs, which can themselves have sub-paragraphs, nested to any depth necessary.
For each paragraph, extract its number or letter (e.g., "1.", "a)", "I.") into the "marker" field if present.

The output MUST strictly match this JSON schema and contain no markdown blocks or other text outside the JSON:
{
  "title": "Document Title",
  "sections": [
    {
      "title": "Section or Annex Title",
      "paragraphs": [
        {
          "marker": "1.",
          "text": "Paragraph 1 text",
          "subParagraphs": [
            {
              "marker": "a)",
              "text": "Sub-paragraph 1 text",
              "subParagraphs": []
            }
          ]
        }
      ]
    }
  ]
}

Ensure all text is captured accurately and organized logically based on the document's recursive structure.`;

    const response = await ollama.chat({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText }
      ],
      format: "json",
    });

    const resultText = response.message.content;
    const promptTokens = response.prompt_eval_count;
    const evalTokens = response.eval_count;
    console.log(`[LLM Usage] Prompt tokens (Context used): ${promptTokens}, Generated tokens: ${evalTokens}`);
    
    let parsedJson: ParsedDocument;

    try {
      parsedJson = JSON.parse(resultText);
    } catch (error) {
      console.error("Failed to parse JSON from LLM:", resultText, error);
      return { success: false, error: "LLM returned invalid JSON.", rawJson: resultText };
    }

    return { success: true, data: parsedJson, rawJson: resultText };
  } catch (error) {
    console.error("Error in structureTextWithLlm:", error);
    return { success: false, error: "An unexpected error occurred during LLM processing." };
  }
}
