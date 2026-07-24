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

export async function generateChat({
	model,
	prompt,
	systemPrompt,
	chatHistory,
	format,
	temperature = DEFAULT_TEMPERATURE,
}: {
	model: string;
	prompt: string;
	systemPrompt?: string;
	chatHistory?: ChatMessage[];
	format?: "json";
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

		const response = await openai.chat.completions.create({
			model: model,
			messages: messages,
			response_format: format === "json" ? { type: "json_object" } : undefined,
			temperature: temperature,
		});

		result = {
			success: true,
			content: response.choices[0].message.content || "",
			promptTokens: response.usage?.prompt_tokens || 0,
			completionTokens: response.usage?.completion_tokens || 0,
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
				format: format,
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
				format: format,
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
