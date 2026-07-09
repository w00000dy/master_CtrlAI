"use client";

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
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
	const [completedTasks, setCompletedTasks] = useState(0);

	const queueRef = useRef<GenerationTask[]>([]);
	const isProcessingRef = useRef(false);

	const processQueue = useCallback(async () => {
		if (isProcessingRef.current || queueRef.current.length === 0) return;

		isProcessingRef.current = true;
		setIsProcessing(true);

		while (queueRef.current.length > 0) {
			const currentTask = queueRef.current[0];

			try {
				await generateControlsForParagraph(
					currentTask.paragraphId,
					currentTask.model,
				);
			} catch (error) {
				console.error(
					"Error generating controls for paragraph",
					currentTask.paragraphId,
					error,
				);
			}

			if (queueRef.current[0] === currentTask) {
				queueRef.current = queueRef.current.slice(1);
				setQueue(queueRef.current);
				setCompletedTasks((c) => c + 1);
			}
		}

		isProcessingRef.current = false;
		setIsProcessing(false);

		if (queueRef.current.length === 0) {
			setTimeout(() => {
				if (queueRef.current.length === 0) {
					setTotalTasks(0);
					setCompletedTasks(0);
				}
			}, 2000);
		}
	}, []);

	const enqueueTasks = useCallback(
		(tasks: GenerationTask[]) => {
			const wasEmpty = queueRef.current.length === 0;

			queueRef.current = [...queueRef.current, ...tasks];
			setQueue(queueRef.current);

			if (wasEmpty && !isProcessingRef.current) {
				setTotalTasks(tasks.length);
				setCompletedTasks(0);
				processQueue();
			} else {
				setTotalTasks((t) => t + tasks.length);
			}
		},
		[processQueue],
	);

	const cancelAll = useCallback(() => {
		queueRef.current = [];
		setQueue([]);
		setTotalTasks(0);
		setCompletedTasks(0);
	}, []);

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
