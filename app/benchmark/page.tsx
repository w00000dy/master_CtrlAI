"use client";

import { useEffect, useState, useCallback } from "react";

import type { Control, Guideline } from "../../generated/prisma/client";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "../components/MappedParagraphCard";
import { CompactControlCard } from "../components/CompactControlCard";
import {
	getNextBenchmarkTask,
	getTechnicalControls,
	saveControlBenchmark,
	saveParagraphBenchmark,
} from "./actions";

type Task =
	| { type: "DONE" }
	| {
			type: "CONTROL";
			paragraph: ParagraphWithContext;
			control: Control & { paragraphs: ParagraphWithContext[] };
	  }
	| {
			type: "PARAGRAPH";
			paragraph: ParagraphWithContext;
			evaluatedControls: Control[];
	  };

type TechnicalControl = Control & { guideline: Guideline | null };

export default function BenchmarkPage() {
	const [task, setTask] = useState<Task | null>(null);
	const [technicalControls, setTechnicalControls] = useState<
		TechnicalControl[]
	>([]);
	const [loading, setLoading] = useState(true);

	// Form State for Control
	const [isRelevant, setIsRelevant] = useState<boolean | null>(null);
	const [isActionable, setIsActionable] = useState<boolean | null>(null);
	const [isTechnicallyCorrect, setIsTechnicallyCorrect] = useState<
		boolean | null
	>(null);
	const [selectedCoveredControls, setSelectedCoveredControls] = useState<
		Set<number>
	>(new Set());

	// Form State for Paragraph
	const [isComplete, setIsComplete] = useState<boolean | null>(null);
	const [hasRedundancy, setHasRedundancy] = useState<boolean | null>(null);

	const loadTask = useCallback(async () => {
		setLoading(true);
		try {
			const nextTask = await getNextBenchmarkTask();
			setTask(nextTask);
			if (nextTask.type === "CONTROL") {
				const techControls = await getTechnicalControls(
					nextTask.control.paragraphs.map((p) => p.id)
				);
				setTechnicalControls(techControls);

				// Reset control form
				setIsRelevant(null);
				setIsActionable(null);
				setIsTechnicallyCorrect(null);
				setSelectedCoveredControls(new Set());
			} else if (nextTask.type === "PARAGRAPH") {
				// Reset paragraph form
				setIsComplete(null);
				setHasRedundancy(null);
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const init = async () => {
			await loadTask();
		};
		init();
	}, [loadTask]);

	const toggleTechControl = (id: number) => {
		const newSet = new Set(selectedCoveredControls);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedCoveredControls(newSet);
	};

	const submitControl = async () => {
		if (
			task?.type !== "CONTROL" ||
			isRelevant === null ||
			isActionable === null ||
			isTechnicallyCorrect === null
		) {
			return;
		}

		await saveControlBenchmark({
			llmControlId: task.control.id,
			coveredControlIds: Array.from(selectedCoveredControls),
			isRelevant,
			isActionable,
			isTechnicallyCorrect,
		});

		await loadTask();
	};

	const submitParagraph = async () => {
		if (
			task?.type !== "PARAGRAPH" ||
			isComplete === null ||
			hasRedundancy === null
		) {
			return;
		}

		await saveParagraphBenchmark({
			paragraphId: task.paragraph.id,
			isComplete,
			hasRedundancy,
		});

		await loadTask();
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
			<main className="w-full px-4 md:px-8 lg:px-12 py-8">
				{loading ? (
					<div className="flex justify-center p-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				) : !task ? (
					<div className="text-red-500 text-center">Error loading task.</div>
				) : task.type === "DONE" ? (
					<div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-8 rounded-xl text-center border border-green-200 dark:border-green-800 max-w-4xl mx-auto">
						<h2 className="text-2xl font-bold mb-4">Excellent!</h2>
						<p>All controls and paragraphs have been successfully evaluated.</p>
					</div>
				) : task.type === "CONTROL" ? (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Column 1: Context */}
						<div className="space-y-6">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
								<h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
									Context
								</h3>
								<div className="space-y-4">
									{task.control.paragraphs.map((p) => (
										<MappedParagraphCard key={p.id} p={p} />
									))}
								</div>
							</div>
						</div>

						{/* Column 2: Control to evaluate & Mapping */}
						<div className="space-y-6">
							<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
								<h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-2">
									Control to evaluate
								</h3>
								<h4 className="text-xl font-bold mb-2">{task.control.title}</h4>
								<p className="text-zinc-800 dark:text-zinc-200 mb-4 whitespace-pre-wrap">
									{task.control.statement}
								</p>

							</div>

							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
								<h3 className="text-lg font-bold">
									1. Mapping to Technical Guidelines
								</h3>
								<p className="text-sm text-zinc-500 mb-4">
									Which controls from existing guidelines (e.g., BSI) does this
									generated control cover?
								</p>
								<div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800">
									{technicalControls.map((tc) => (
										<CompactControlCard
											key={tc.id}
											ctrl={{ ...tc, title: `[${tc.guideline?.title ?? "No Guideline"}] ${tc.title}` }}
											colorClass="bg-blue-500"
											action={
												<input
													type="checkbox"
													className="mt-1 mr-1"
													checked={selectedCoveredControls.has(tc.id)}
													onChange={() => toggleTechControl(tc.id)}
												/>
											}
										/>
									))}
								</div>
							</div>
						</div>

						{/* Column 3: Questions */}
						<div className="space-y-6">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6 flex flex-col h-[calc(100%-4rem)]">
								<h3 className="text-lg font-bold">2. Evaluation Questions</h3>

								<div className="space-y-4">
									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-3">
											Is the generated control truly relevant to the legal text,
											or is the LLM &apos;hallucinating&apos; requirements?
										</p>
										<div className="flex gap-4">
											<label className="flex items-center">
												<input
													type="radio"
													name="relevant"
													checked={isRelevant === true}
													onChange={() => setIsRelevant(true)}
													className="mr-2"
												/>
												Yes (Relevant)
											</label>
											<label className="flex items-center">
												<input
													type="radio"
													name="relevant"
													checked={isRelevant === false}
													onChange={() => setIsRelevant(false)}
													className="mr-2"
												/>
												No (Hallucinated / Irrelevant)
											</label>
										</div>
									</div>

									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-3">
											Is the control formulated so that developers or security
											engineers can implement it directly?
										</p>
										<div className="flex gap-4">
											<label className="flex items-center">
												<input
													type="radio"
													name="actionable"
													checked={isActionable === true}
													onChange={() => setIsActionable(true)}
													className="mr-2"
												/>
												Yes (Actionable)
											</label>
											<label className="flex items-center">
												<input
													type="radio"
													name="actionable"
													checked={isActionable === false}
													onChange={() => setIsActionable(false)}
													className="mr-2"
												/>
												No (Too vague)
											</label>
										</div>
									</div>

									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-3">
											Is the technical interpretation of the legal text
											technically correct and state-of-the-art?
										</p>
										<div className="flex gap-4">
											<label className="flex items-center">
												<input
													type="radio"
													name="correct"
													checked={isTechnicallyCorrect === true}
													onChange={() => setIsTechnicallyCorrect(true)}
													className="mr-2"
												/>
												Yes (Correct)
											</label>
											<label className="flex items-center">
												<input
													type="radio"
													name="correct"
													checked={isTechnicallyCorrect === false}
													onChange={() => setIsTechnicallyCorrect(false)}
													className="mr-2"
												/>
												No (Incorrect)
											</label>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end mt-auto pt-6">
								<button
									type="button"
									onClick={submitControl}
									disabled={
										isRelevant === null ||
										isActionable === null ||
										isTechnicallyCorrect === null
									}
									className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									Save & Next
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="space-y-6 lg:col-span-1">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
								<h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4">
									Final Evaluation
								</h3>
								<MappedParagraphCard p={task.paragraph} />
							</div>
						</div>

						<div className="space-y-6 lg:col-span-1">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
								<h3 className="text-md font-semibold mb-4">
									Evaluated controls for this paragraph:
								</h3>
								<ul className="space-y-4 mb-6">
									{task.evaluatedControls.map((ctrl) => (
										<li
											key={ctrl.id}
											className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800"
										>
											<div className="font-semibold">{ctrl.title}</div>
											<div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
												{ctrl.statement}
											</div>
										</li>
									))}
								</ul>
							</div>
						</div>

						<div className="space-y-6 lg:col-span-1">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6 flex flex-col h-full">
								<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
									<p className="font-medium mb-3">
										<strong>Completeness:</strong> Do all generated controls
										completely cover the intention of this paragraph?
									</p>
									<div className="flex gap-4">
										<label className="flex items-center">
											<input
												type="radio"
												name="complete"
												checked={isComplete === true}
												onChange={() => setIsComplete(true)}
												className="mr-2"
											/>
											Yes
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												name="complete"
												checked={isComplete === false}
												onChange={() => setIsComplete(false)}
												className="mr-2"
											/>
											No
										</label>
									</div>
								</div>

								<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
									<p className="font-medium mb-3">
										<strong>Redundancy:</strong> Are there unnecessary overlaps or
										content repetitions among the generated controls for this
										paragraph?
									</p>
									<div className="flex gap-4">
										<label className="flex items-center">
											<input
												type="radio"
												name="redundancy"
												checked={hasRedundancy === true}
												onChange={() => setHasRedundancy(true)}
												className="mr-2"
											/>
											Yes (There are redundancies)
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												name="redundancy"
												checked={hasRedundancy === false}
												onChange={() => setHasRedundancy(false)}
												className="mr-2"
											/>
											No (No redundancies)
										</label>
									</div>
								</div>

								<div className="flex justify-end mt-auto pt-6">
									<button
										type="button"
										onClick={submitParagraph}
										disabled={isComplete === null || hasRedundancy === null}
										className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Save & Next Paragraph
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
