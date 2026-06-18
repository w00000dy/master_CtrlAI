"use server";

import { type ChatMessage, generateChat, listModels } from "@/lib/llm";

export async function getModels() {
	return await listModels();
}

export async function generateChatResponse(
	messages: { role: string; content: string }[],
	model: string,
) {
	const result = await generateChat({
		model: model,
		messages: messages.map((msg) => ({
			role:
				msg.role === "bot" ? "assistant" : (msg.role as ChatMessage["role"]),
			content: msg.content,
		})),
	});

	if (!result.success) {
		return { success: false, error: result.error };
	}

	return { success: true, message: result.content };
}
