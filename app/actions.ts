"use server";

import { type ChatMessage, generateChat, listModels } from "@/lib/llm";

export async function getModels() {
	return await listModels();
}

export async function generateChatResponse(
	messages: { role: string; content: string }[],
	model: string,
) {
	const mappedMessages = messages.map((msg) => ({
		role: msg.role === "bot" ? "assistant" : (msg.role as ChatMessage["role"]),
		content: msg.content,
	}));
	const promptMessage = mappedMessages.pop();

	if (!promptMessage) {
		return { success: false, error: "No prompt provided" };
	}

	const result = await generateChat({
		model: model,
		prompt: promptMessage.content,
		chatHistory: mappedMessages.length > 0 ? mappedMessages : undefined,
	});

	if (!result.success) {
		return { success: false, error: result.error };
	}

	return { success: true, message: result.content };
}
