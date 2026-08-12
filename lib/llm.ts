import { Ollama } from "ollama";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Agent, setGlobalDispatcher } from "undici";
import * as z from "zod";
import { OLLAMA_HOST, OPENAI_API_KEY, OPENAI_HOST } from "./constants";

// Disable fetch timeout for long-running LLM calls
setGlobalDispatcher(new Agent({ headersTimeout: 0 }));

const DEFAULT_TEMPERATURE = 0;

const ollama = new Ollama({
	host: OLLAMA_HOST,
});

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY || "dummy-key-for-local-proxies",
	baseURL: OPENAI_HOST,
});

export const getProvider = () => {
	if (OPENAI_HOST || OPENAI_API_KEY) {
		return "openai";
	}

	return "ollama";
};

export async function listModels() {
	const provider = getProvider();

	if (provider === "openai") {
		const list = await openai.models.list();
		return list.data.map((m) => m.id);
	} else {
		const list = await ollama.list();
		return list.models.map((m) => m.name);
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
	if (systemPrompt) {
		console.log("System Prompt:");
		console.log(systemPrompt);
	}
	console.log("\nUser Prompt:");
	console.log(prompt);
	if (chatHistory && chatHistory.length > 0) {
		console.log("History:");
		chatHistory.forEach((msg) => {
			console.log(`[${msg.role.toUpperCase()}]:\n${msg.content}\n`);
		});
	}
	let openAiSchema: z.ZodType | undefined;
	let ollamaFormat: Record<string, unknown> | undefined;
	let isWrappedArray = false;

	if (schema) {
		const jsonSchema = z.toJSONSchema(schema);
		ollamaFormat = jsonSchema as Record<string, unknown>;
		if (jsonSchema.type !== "object") {
			openAiSchema = z.object({
				items: schema,
			});
			isWrappedArray = true;
		} else {
			openAiSchema = schema;
		}

		console.log("Ollama formatted schema:");
		console.log(JSON.stringify(jsonSchema, null, 2));
		console.log("OpenAI formatted schema:");
		console.log(zodTextFormat(openAiSchema, "output_schema"));
	}

	let result: {
		content: string;
		promptTokens: number;
		completionTokens: number;
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

		const response = openAiSchema
			? await openai.responses.parse({
					model: model,
					input: messages,
					text: {
						format: zodTextFormat(openAiSchema, "output_schema"),
					},
					temperature: temperature,
				})
			: await openai.responses.create({
					model: model,
					input: messages,
					temperature: temperature,
				});

		let content = response.output_text;
		if (isWrappedArray && content) {
			const parsed = JSON.parse(content);
			if (parsed && typeof parsed === "object" && "items" in parsed) {
				content = JSON.stringify(parsed.items);
			}
		}

		result = {
			content: content,
			promptTokens: response.usage?.input_tokens || 0,
			completionTokens: response.usage?.output_tokens || 0,
		};
	} else {
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
				content: response.response,
				promptTokens: response.prompt_eval_count || 0,
				completionTokens: response.eval_count || 0,
			};
		}
	}

	console.log("\n=== LLM Response ===");
	console.log(result.content);
	console.log("===================\n");
	console.log(
		`Prompt tokens: ${result.promptTokens}, Generated tokens: ${result.completionTokens}`,
	);

	return result;
}
