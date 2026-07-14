"use server";

import { POLLING_INTERVAL_MS } from "../../lib/constants";
import { generateControlsForParagraph } from "./actions";

export type GenerationTask = {
	paragraphId: number;
	model: string;
};

type QueueState = {
	queue: GenerationTask[];
	totalTasks: number;
	isProcessing: boolean;
};

const store = (globalThis as unknown as { generationQueueStore: QueueState })
	.generationQueueStore || {
	queue: [],
	totalTasks: 0,
	isProcessing: false,
};

(
	globalThis as unknown as { generationQueueStore: QueueState }
).generationQueueStore = store;

export async function getGenerationQueueStatus() {
	const completedTasks =
		store.totalTasks > 0
			? Math.max(0, store.totalTasks - store.queue.length)
			: 0;
	return {
		queue: store.queue,
		isProcessing: store.isProcessing,
		totalTasks: store.totalTasks,
		completedTasks,
	};
}

async function processQueue() {
	if (store.isProcessing || store.queue.length === 0) return;

	store.isProcessing = true;

	while (store.queue.length > 0) {
		const currentTask = store.queue[0];

		try {
			await generateControlsForParagraph(
				currentTask.paragraphId,
				currentTask.model,
			);
		} catch (error) {
			console.error(
				"Queue processing error for paragraph",
				currentTask.paragraphId,
				":",
				error,
			);
		}

		if (store.queue[0] === currentTask) {
			store.queue.shift();
		}
	}

	store.isProcessing = false;

	setTimeout(() => {
		if (store.queue.length === 0) {
			store.totalTasks = 0;
		}
	}, POLLING_INTERVAL_MS + 500);
}

export async function enqueueGenerationTasks(tasks: GenerationTask[]) {
	const wasEmpty = store.queue.length === 0;
	store.queue.push(...tasks);
	store.totalTasks += tasks.length;

	if (wasEmpty && !store.isProcessing) {
		processQueue().catch(console.error);
	}
	return { success: true };
}

export async function cancelAllGenerationTasks() {
	store.queue = [];
	store.totalTasks = 0;
	store.isProcessing = false;
	return { success: true };
}
