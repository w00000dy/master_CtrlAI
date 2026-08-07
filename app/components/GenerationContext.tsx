"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	cancelAllGenerationTasks,
	enqueueGenerationTasks,
	type GenerationTask,
} from "../controls/queueActions";

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
	const [data, setData] = useState({
		queue: [] as GenerationTask[],
		isProcessing: false,
		totalTasks: 0,
		completedTasks: 0,
	});

	useEffect(() => {
		const eventSource = new EventSource("/api/queue/stream");

		eventSource.onmessage = (event) => {
			try {
				const status = JSON.parse(event.data);
				setData(status);
			} catch (error) {
				console.error("Failed to parse queue status from SSE", error);
			}
		};

		eventSource.onerror = (error) => {
			console.error("SSE connection error", error);
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	}, []);

	const enqueueTasks = useCallback(async (tasks: GenerationTask[]) => {
		await enqueueGenerationTasks(tasks);
	}, []);

	const cancelAll = useCallback(async () => {
		await cancelAllGenerationTasks();
	}, []);

	return (
		<GenerationContext.Provider
			value={{
				queue: data.queue || [],
				isProcessing: data.isProcessing || false,
				totalTasks: data.totalTasks || 0,
				completedTasks: data.completedTasks || 0,
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
