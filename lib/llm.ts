import { Ollama } from "ollama";
import OpenAI from "openai";
import { Agent, setGlobalDispatcher } from "undici";

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

	try {
		if (provider === "openai") {
			const list = await openai.models.list();
			return { success: true, models: list.data.map((m) => m.id) };
		} else {
			const list = await ollama.list();
			return { success: true, models: list.models.map((m) => m.name) };
		}
	} catch (error) {
		console.error(`Error loading models from ${provider}:`, error);
		return { success: false, error: "Error loading models." };
	}
}

export type ChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export async function generateChat({
	model,
	messages,
	format,
	temperature = DEFAULT_TEMPERATURE,
}: {
	model: string;
	messages: ChatMessage[];
	format?: "json";
	temperature?: number;
}) {
	const provider = getProvider();

	console.log("\n=== LLM Request ===");
	console.log(`Provider: ${provider} | Model: ${model}`);
	console.log("Messages:");
	messages.forEach((msg) => {
		console.log(`[${msg.role.toUpperCase()}]:\n${msg.content}\n`);
	});

	try {
		let result: {
			success: boolean;
			content: string;
			promptTokens: number;
			completionTokens: number;
			error?: string;
		};

		if (provider === "openai") {
			const response = await openai.chat.completions.create({
				model: model,
				messages: messages,
				response_format:
					format === "json" ? { type: "json_object" } : undefined,
				temperature: temperature,
			});

			result = {
				success: true,
				content: response.choices[0].message.content || "",
				promptTokens: response.usage?.prompt_tokens || 0,
				completionTokens: response.usage?.completion_tokens || 0,
			};
		} else {
			const response = await ollama.chat({
				model: model,
				messages: messages,
				format: format === "json" ? "json" : undefined,
				options: { temperature: temperature },
			});

			result = {
				success: true,
				content: response.message.content,
				promptTokens: response.prompt_eval_count || 0,
				completionTokens: response.eval_count || 0,
			};
		}

		console.log("\n=== LLM Response ===");
		console.log(result.content);
		console.log(
			`[LLM Usage] Prompt tokens: ${result.promptTokens}, Generated tokens: ${result.completionTokens}`,
		);
		console.log("===================\n");

		return result;
	} catch (error) {
		console.error(`${provider} Error:`, error);
		return {
			success: false,
			error: `Error communicating with ${provider}. Is the service running?`,
			content: "",
			promptTokens: 0,
			completionTokens: 0,
		};
	}
}
