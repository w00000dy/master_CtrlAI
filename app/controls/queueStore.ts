import { EventEmitter } from "node:events";

export type GenerationTask = {
	paragraphId: number;
	model: string;
};

type QueueState = {
	queue: GenerationTask[];
	totalTasks: number;
	isProcessing: boolean;
	emitter: EventEmitter;
};

export const store = (
	globalThis as unknown as { generationQueueStore: QueueState }
).generationQueueStore || {
	queue: [],
	totalTasks: 0,
	isProcessing: false,
	emitter: new EventEmitter(),
};

if (!store.emitter) {
	store.emitter = new EventEmitter();
}

(
	globalThis as unknown as { generationQueueStore: QueueState }
).generationQueueStore = store;

export const queueEmitter = store.emitter;
