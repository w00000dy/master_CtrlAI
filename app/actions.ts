"use server";

import { listModels } from "@/lib/llm";

export async function getModels() {
	return await listModels();
}
