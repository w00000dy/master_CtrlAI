import { Ollama } from "ollama";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Agent, setGlobalDispatcher } from "undici";
import * as z from "zod";

// Disable fetch timeout for long-running LLM calls
setGlobalDispatcher(new Agent({ headersTimeout: 0 }));

const DEFAULT_TEMPERATURE = 0;

const ollama = new Ollama({
	host: process.env.OLLAMA_HOST,
});

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-local-proxies",
	baseURL: process.env.OPENAI_HOST,
});

export const getProvider = () => {
	if (process.env.OPENAI_HOST || process.env.OPENAI_API_KEY) {
		return "openai";
	}

	return "ollama";
};

export async function listModels() {
	const provider = getProvider();

	if (provider === "openai") {
		const list = await openai.models.list();
		return { success: true, models: list.data.map((m) => m.id) };
	} else {
		const list = await ollama.list();
		return { success: true, models: list.models.map((m) => m.name) };
	}
}

export type ChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export async function generateResponse({
	model,
	prompt,
	systemPrompt,
	chatHistory,
	schema,
	temperature = DEFAULT_TEMPERATURE,
}: {
	model: string;
	prompt: string;
	systemPrompt?: string;
	chatHistory?: ChatMessage[];
	schema?: z.ZodType;
	temperature?: number;
}) {
	const provider = getProvider();

	console.log("\n=== LLM Request ===");
	console.log(`Provider: ${provider} | Model: ${model}`);
	if (systemPrompt) console.log("System Prompt:\n", systemPrompt);
	console.log("Prompt:\n", prompt);
	if (chatHistory && chatHistory.length > 0) {
		console.log("History:");
		chatHistory.forEach((msg) => {
			console.log(`[${msg.role.toUpperCase()}]:\n${msg.content}\n`);
		});
	}

	let result: {
		success: boolean;
		content: string;
		promptTokens: number;
		completionTokens: number;
		error?: string;
	};

	if (provider === "openai") {
		const messages: ChatMessage[] = [];
		if (chatHistory && chatHistory.length > 0) {
			messages.push(...chatHistory);
		}
		if (systemPrompt) {
			messages.push({ role: "system", content: systemPrompt });
		}
		messages.push({ role: "user", content: prompt });

		const response = schema
			? await openai.responses.parse({
					model: model,
					input: messages,
					text: {
						format: zodTextFormat(schema, "output_schema"),
					},
					temperature: temperature,
				})
			: await openai.responses.create({
					model: model,
					input: messages,
					temperature: temperature,
				});

		result = {
			success: true,
			content: response.output_text || "",
			promptTokens: response.usage?.input_tokens || 0,
			completionTokens: response.usage?.output_tokens || 0,
		};
	} else {
		const ollamaFormat = schema
			? (z.toJSONSchema(schema) as Record<string, unknown>)
			: undefined;

		if (chatHistory && chatHistory.length > 0) {
			const messages: ChatMessage[] = [];
			messages.push(...chatHistory);
			if (systemPrompt) {
				messages.push({ role: "system", content: systemPrompt });
			}
			messages.push({ role: "user", content: prompt });
			const response = await ollama.chat({
				model: model,
				messages: messages,
				format: ollamaFormat,
				options: { temperature: temperature },
			});

			result = {
				success: true,
				content: response.message.content,
				promptTokens: response.prompt_eval_count || 0,
				completionTokens: response.eval_count || 0,
			};
		} else {
			const response = await ollama.generate({
				model: model,
				prompt: prompt,
				system: systemPrompt,
				format: ollamaFormat,
				options: { temperature: temperature },
			});

			result = {
				success: true,
				content: response.response,
				promptTokens: response.prompt_eval_count || 0,
				completionTokens: response.eval_count || 0,
			};
		}
	}

	console.log("\n=== LLM Response ===");
	console.log(result.content);
	console.log(
		`[LLM Usage] Prompt tokens: ${result.promptTokens}, Generated tokens: ${result.completionTokens}`,
	);
	console.log("===================\n");

	return result;
}
