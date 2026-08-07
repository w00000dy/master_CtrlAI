"use server";

import { generateControlsForParagraph } from "./actions";
import { type GenerationTask, queueEmitter, store } from "./queueStore";

const VISUAL_DELAY_MS = 2000;

export type { GenerationTask };

export async function emitQueueUpdate() {
	const status = await getGenerationQueueStatus();
	queueEmitter.emit("queueUpdated", status);
}

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
		emitQueueUpdate();
	}

	store.isProcessing = false;
	emitQueueUpdate();

	setTimeout(() => {
		if (store.queue.length === 0) {
			store.totalTasks = 0;
			emitQueueUpdate();
		}
	}, VISUAL_DELAY_MS);
}

export async function enqueueGenerationTasks(tasks: GenerationTask[]) {
	const wasEmpty = store.queue.length === 0;
	store.queue.push(...tasks);
	store.totalTasks += tasks.length;

	if (wasEmpty && !store.isProcessing) {
		processQueue().catch(console.error);
	}

	emitQueueUpdate();
	return { success: true };
}

export async function cancelAllGenerationTasks() {
	store.queue = [];
	store.totalTasks = 0;
	store.isProcessing = false;
	emitQueueUpdate();
	return { success: true };
}
