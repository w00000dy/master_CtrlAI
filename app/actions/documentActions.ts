"use server";

import fs from "fs/promises";
import path from "path";
import { ParsedDocument } from "./parsePdf";

const DATA_DIR = path.join(process.cwd(), "data", "documents");

// Helper to ensure the data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export async function saveDocument(document: ParsedDocument) {
  try {
    await ensureDataDir();
    
    // Generate a unique ID / filename based on the title and timestamp
    const baseName = document.title ? sanitizeFilename(document.title) : "document";
    const id = `${baseName}_${Date.now()}`;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    
    const fileContent = JSON.stringify({
      id,
      savedAt: new Date().toISOString(),
      document
    }, null, 2);
    
    await fs.writeFile(filePath, fileContent, "utf-8");
    
    return { success: true, id };
  } catch (error) {
    console.error("Failed to save document:", error);
    return { success: false, error: "Failed to save the document." };
  }
}

export async function getDocuments() {
  try {
    await ensureDataDir();
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    const documents = [];
    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");
      try {
        const parsed = JSON.parse(content);
        // We just return metadata for the list view, not the full massive document
        documents.push({
          id: parsed.id,
          title: parsed.document.title,
          savedAt: parsed.savedAt
        });
      } catch (e) {
        console.error("Invalid JSON file:", file);
      }
    }
    
    // Sort by newest first
    documents.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    
    return { success: true, documents };
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return { success: false, error: "Failed to load documents.", documents: [] };
  }
}

export async function getDocumentById(id: string) {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    
    return { success: true, data: parsed };
  } catch (error) {
    console.error(`Failed to fetch document ${id}:`, error);
    return { success: false, error: "Document not found." };
  }
}
