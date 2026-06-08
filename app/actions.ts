"use server";

import { Ollama } from "ollama";

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
});

export async function getModels() {
  try {
    const list = await ollama.list();
    return { success: true, models: list.models.map(m => m.name) };
  } catch (error) {
    console.error("Ollama Error (list):", error);
    return { success: false, error: "Error loading models." };
  }
}

export async function generateChatResponse(messages: { role: string; content: string }[], model: string) {
  try {
    const response = await ollama.chat({
      model: model || "qwen3:8b",
      messages: messages.map((msg) => ({
        role: msg.role === "bot" ? "assistant" : msg.role,
        content: msg.content
      })),
    });

    return { success: true, message: response.message.content };
  } catch (error) {
    console.error("Ollama Error:", error);
    return { success: false, error: "Error communicating with Ollama. Is the Ollama service running?" };
  }
}
