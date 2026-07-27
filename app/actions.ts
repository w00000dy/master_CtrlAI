"use server";

import { type ChatMessage, generateResponse, listModels } from "@/lib/llm";

export async function getModels() {
	return await listModels();
}

export async function generateChatResponse(
	messages: { role: string; content: string }[],
	model: string,
) {
	const mappedMessages = [...messages] as ChatMessage[];
	const promptMessage = mappedMessages.pop();

	if (!promptMessage) {
		return { success: false, error: "No prompt provided" };
	}

	const result = await generateResponse({
		model: model,
		prompt: promptMessage.content,
		chatHistory: mappedMessages.length > 0 ? mappedMessages : undefined,
	});

	if (!result.success) {
		return { success: false, error: result.error };
	}

	return { success: true, message: result.content };
}
