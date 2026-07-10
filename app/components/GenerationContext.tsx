"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { generateControlsForParagraph } from "../controls/actions";

export type GenerationTask = {
	paragraphId: number;
	model: string;
};

type GenerationContextType = {
	queue: GenerationTask[];
	isProcessing: boolean;
	totalTasks: number;
	completedTasks: number;
	enqueueTasks: (tasks: GenerationTask[]) => void;
	cancelAll: () => void;
};

const GenerationContext = createContext<GenerationContextType>({
	queue: [],
	isProcessing: false,
	totalTasks: 0,
	completedTasks: 0,
	enqueueTasks: () => {},
	cancelAll: () => {},
});

export function GenerationProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queue, setQueue] = useState<GenerationTask[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [totalTasks, setTotalTasks] = useState(0);

	const queueRef = useRef<GenerationTask[]>([]);
	const isProcessingRef = useRef(false);

	const completedTasks =
		totalTasks > 0 ? Math.max(0, totalTasks - queue.length) : 0;

	const processQueue = useCallback(async () => {
		if (isProcessingRef.current || queueRef.current.length === 0) return;

		isProcessingRef.current = true;
		setIsProcessing(true);

		while (queueRef.current.length > 0) {
			const currentTask = queueRef.current[0];

			try {
				const res = await generateControlsForParagraph(
					currentTask.paragraphId,
					currentTask.model,
				);

				if (!res?.success) {
					console.warn("Task returned unsuccessful result", res);
				}
			} catch (error) {
				console.error(
					"Network or fatal error during generation (e.g. page reload). Stopping queue processing.",
					error,
				);
				break;
			}

			if (queueRef.current[0] === currentTask) {
				queueRef.current = queueRef.current.slice(1);
				setQueue(queueRef.current);
				localStorage.setItem(
					"generationQueue",
					JSON.stringify(queueRef.current),
				);
			}
		}

		isProcessingRef.current = false;
		setIsProcessing(false);

		if (queueRef.current.length === 0) {
			setTimeout(() => {
				if (queueRef.current.length === 0) {
					setTotalTasks(0);
					localStorage.removeItem("generationQueue");
					localStorage.removeItem("generationTotalTasks");
				}
			}, 2000);
		}
	}, []);

	const enqueueTasks = useCallback(
		(tasks: GenerationTask[]) => {
			const wasEmpty = queueRef.current.length === 0;

			queueRef.current = [...queueRef.current, ...tasks];
			setQueue(queueRef.current);
			localStorage.setItem("generationQueue", JSON.stringify(queueRef.current));

			if (wasEmpty && !isProcessingRef.current) {
				setTotalTasks(tasks.length);
				localStorage.setItem("generationTotalTasks", tasks.length.toString());
				processQueue();
			} else {
				setTotalTasks((t) => {
					const nextTotal = t + tasks.length;
					localStorage.setItem("generationTotalTasks", nextTotal.toString());
					return nextTotal;
				});
			}
		},
		[processQueue],
	);

	const cancelAll = useCallback(() => {
		queueRef.current = [];
		setQueue([]);
		setTotalTasks(0);
		localStorage.removeItem("generationQueue");
		localStorage.removeItem("generationTotalTasks");
	}, []);

	useEffect(() => {
		try {
			const savedQueue = localStorage.getItem("generationQueue");
			if (savedQueue) {
				const parsedQueue = JSON.parse(savedQueue);
				if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
					queueRef.current = parsedQueue;

					const init = () => {
						setQueue(parsedQueue);

						const savedTotal = localStorage.getItem("generationTotalTasks");
						if (savedTotal) setTotalTasks(parseInt(savedTotal, 10));
						else setTotalTasks(parsedQueue.length);
					};
					init();

					if (!isProcessingRef.current) {
						processQueue();
					}
				}
			}
		} catch (error) {
			console.error(
				"Failed to parse generation queue from localStorage",
				error,
			);
		}
	}, [processQueue]);

	return (
		<GenerationContext.Provider
			value={{
				queue,
				isProcessing,
				totalTasks,
				completedTasks,
				enqueueTasks,
				cancelAll,
			}}
		>
			{children}
		</GenerationContext.Provider>
	);
}

export function useGenerationContext() {
	return useContext(GenerationContext);
}
