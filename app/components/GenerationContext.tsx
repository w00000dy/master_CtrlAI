"use client";

import type React from "react";
import { createContext, useCallback, useContext } from "react";
import useSWR from "swr";
import { POLLING_INTERVAL_MS } from "../../lib/constants";
import {
	cancelAllGenerationTasks,
	enqueueGenerationTasks,
	type GenerationTask,
	getGenerationQueueStatus,
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
	const { data, mutate } = useSWR(
		"generation-queue",
		() => getGenerationQueueStatus(),
		{
			refreshInterval: POLLING_INTERVAL_MS,
			revalidateOnFocus: true,
		},
	);

	const enqueueTasks = useCallback(
		async (tasks: GenerationTask[]) => {
			await enqueueGenerationTasks(tasks);
			mutate(); // Optimistically update/refresh
		},
		[mutate],
	);

	const cancelAll = useCallback(async () => {
		await cancelAllGenerationTasks();
		mutate();
	}, [mutate]);

	return (
		<GenerationContext.Provider
			value={{
				queue: data?.queue || [],
				isProcessing: data?.isProcessing || false,
				totalTasks: data?.totalTasks || 0,
				completedTasks: data?.completedTasks || 0,
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
