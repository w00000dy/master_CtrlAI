"use client";

import { ChevronDownIcon } from "lucide-animated";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import type { Control, Guideline } from "../../generated/prisma/client";
import { CompactControlCard } from "../components/CompactControlCard";

function CriteriaDetails({
	children,
	className = "mt-2 group",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<details className={className}>
			<summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-600 font-medium list-none inline-flex items-center">
				<span className="mr-1 leading-none">View criteria</span>
				<ChevronDownIcon
					className="transition-transform group-open:rotate-180"
					size={14}
					aria-hidden="true"
				/>
			</summary>
			<div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-800 dark:text-blue-200 rounded-md border border-blue-100 dark:border-blue-800/50 space-y-2">
				{children}
			</div>
		</details>
	);
}

import { ControlCard, type ControlData } from "../components/ControlCard";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "../components/MappedParagraphCard";
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
	const [mode, setMode] = useState<"CONTROL" | "PARAGRAPH">("CONTROL");

	// Form State for Control
	const [relevantParagraphs, setRelevantParagraphs] = useState<Set<number>>(
		new Set(),
	);
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
			const nextTask = await getNextBenchmarkTask(mode);
			setTask(nextTask);
			if (nextTask.type === "CONTROL") {
				const techControls = await getTechnicalControls(
					nextTask.control.paragraphs.map((p) => p.id),
				);
				setTechnicalControls(techControls);

				// Reset control form
				setRelevantParagraphs(new Set());
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
	}, [mode]);

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

	const toggleRelevantParagraph = (id: number) => {
		const newSet = new Set(relevantParagraphs);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setRelevantParagraphs(newSet);
	};

	const submitControl = async () => {
		if (
			task?.type !== "CONTROL" ||
			isActionable === null ||
			isTechnicallyCorrect === null
		) {
			return;
		}

		await saveControlBenchmark({
			llmControlId: task.control.id,
			coveredControlIds: Array.from(selectedCoveredControls),
			relevantParagraphIds: Array.from(relevantParagraphs),
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
		<div className="flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
			<div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-2 px-4 shrink-0 flex justify-center">
				<div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
					<button
						type="button"
						onClick={() => setMode("CONTROL")}
						className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${mode === "CONTROL" ? "bg-white dark:bg-zinc-900 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"}`}
					>
						Control Benchmark
					</button>
					<button
						type="button"
						onClick={() => setMode("PARAGRAPH")}
						className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${mode === "PARAGRAPH" ? "bg-white dark:bg-zinc-900 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"}`}
					>
						Paragraph Benchmark
					</button>
				</div>
			</div>
			<main className="w-full px-4 md:px-8 lg:px-12 py-8 flex-1 min-h-0 flex flex-col">
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
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
						{/* Column 1: Context */}
						<div className="flex flex-col h-full min-h-0">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col h-full min-h-0">
								<h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 shrink-0">
									Context
								</h3>
								<div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
									{task.control.paragraphs.map((p) => (
										<MappedParagraphCard key={p.id} p={p} />
									))}
								</div>
							</div>
						</div>

						{/* Column 2: Control to evaluate & Mapping */}
						<div className="flex flex-col h-full min-h-0 space-y-6">
							<div className="space-y-2">
								<h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider">
									Control to evaluate
								</h3>
								<ControlCard
									control={task.control}
									hideMappedParagraphs
									hideBadges
									variant="blue"
								/>
							</div>

							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col flex-1 min-h-0 space-y-4">
								<div className="shrink-0">
									<h3 className="text-lg font-bold">
										1. Mapping to Technical Guidelines
									</h3>
									<p className="text-sm text-zinc-500">
										Which controls from existing guidelines (e.g., BSI) does
										this generated control cover?
									</p>
									<CriteriaDetails className="mt-2 group">
										<p className="font-semibold">
											Check a technical control if ANY of the following apply:
										</p>
										<ul className="list-disc pl-4 space-y-1">
											<li>
												<strong>Direct Match:</strong> The generated control
												explicitly covers the core technical requirement of the
												guideline control.
											</li>
											<li>
												<strong>Substantial Contribution:</strong> Implementing
												the generated control fulfills a significant portion of
												the technical control.
											</li>
											<li>
												<strong>Specific Implementation:</strong> The generated
												control acts as a concrete technical implementation for
												a broader guideline requirement.
											</li>
										</ul>
										<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
											Do NOT check if the connection is only vaguely related or
											tangentially addresses the topic without fulfilling the
											actual requirement.
										</p>
									</CriteriaDetails>
								</div>
								<div className="flex-1 overflow-y-auto min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800">
									{technicalControls.map((tc) => (
										<CompactControlCard
											key={tc.id}
											ctrl={{
												...tc,
												title: `[${tc.guideline?.title ?? "No Guideline"}] ${tc.title}`,
											}}
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
						<div className="flex flex-col h-full min-h-0">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col h-full min-h-0">
								<h3 className="text-lg font-bold mb-6 shrink-0">
									2. Evaluation Questions
								</h3>

								<div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-1">
											Is the generated control truly relevant to the legal text,
											or is the LLM &apos;hallucinating&apos; requirements?
											(Select paragraphs where the control is relevant)
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold">
												Select a paragraph checkbox if ALL of the following
												apply:
											</p>
											<ul className="list-disc pl-4 space-y-1">
												<li>
													<strong>Relevance:</strong> The control logically
													derives from this specific text. It does not introduce
													arbitrary constraints that are absent from the legal
													text.
												</li>
												<li>
													<strong>Direct Support:</strong> The paragraph
													directly mandates or strongly implies the technical
													requirement generated.
												</li>
											</ul>
											<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
												Do NOT select a paragraph if it only mentions the
												general topic but does not actually support the specific
												generated requirement.
											</p>
										</CriteriaDetails>
										<div className="flex flex-col gap-2">
											{task.control.paragraphs.map((p) => (
												<label key={p.id} className="flex items-start">
													<input
														type="checkbox"
														checked={relevantParagraphs.has(p.id)}
														onChange={() => toggleRelevantParagraph(p.id)}
														className="mt-1 mr-2 shrink-0"
													/>
													<span className="text-sm">
														{p.marker && (
															<strong className="mr-1">{p.marker}</strong>
														)}
														{p.text}
													</span>
												</label>
											))}
										</div>
									</div>

									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-1">
											Is the control formulated so that developers or security
											engineers can implement it directly?
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold">
												Select &apos;Yes (Actionable)&apos; if ALL of the
												following apply:
											</p>
											<ul className="list-disc pl-4 space-y-1">
												<li>
													<strong>Specificity:</strong> The control specifies
													exactly <em>what</em> needs to be done, avoiding vague
													statements like &quot;ensure security&quot;.
												</li>
												<li>
													<strong>Implementability:</strong> A developer can
													translate the control into a tangible technical
													feature, configuration, or process.
												</li>
												<li>
													<strong>Testability:</strong> It is possible to verify
													whether the control has been successfully implemented.
												</li>
											</ul>
											<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
												Select &apos;No (Too vague)&apos; if the control only
												contains generic advice or lacks concrete technical
												steps.
											</p>
										</CriteriaDetails>
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
										<p className="font-medium mb-1">
											Is the technical interpretation of the legal text
											technically correct and state-of-the-art?
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold">
												Select &apos;Yes (Correct)&apos; if ALL of the following
												apply:
											</p>
											<ul className="list-disc pl-4 space-y-1">
												<li>
													<strong>Accuracy:</strong> The control uses correct
													technical terminology and reflects valid security
													concepts.
												</li>
												<li>
													<strong>Modern Standards:</strong> The solution aligns
													with current industry best practices (e.g., modern
													encryption, standard protocols) and is not outdated.
												</li>
												<li>
													<strong>Interpretation:</strong> The technical
													implementation correctly reflects the spirit of the
													legal requirement without weakening it.
												</li>
											</ul>
											<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
												Select &apos;No (Incorrect)&apos; if the control
												proposes outdated technology, uses incorrect technical
												concepts, or misinterprets the legal requirement.
											</p>
										</CriteriaDetails>
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
										isActionable === null || isTechnicallyCorrect === null
									}
									className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									Save & Next
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
						<div className="space-y-6 lg:col-span-1 flex flex-col h-full min-h-0">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col h-full min-h-0">
								<h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4 shrink-0">
									Final Evaluation
								</h3>
								<div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
									<MappedParagraphCard p={task.paragraph} />
								</div>
							</div>
						</div>

						<div className="space-y-6 lg:col-span-1 flex flex-col h-full min-h-0">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col h-full min-h-0">
								<h3 className="text-md font-semibold mb-4 shrink-0">
									Evaluated controls for this paragraph:
								</h3>
								<div className="space-y-4 mb-6 flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
									{task.evaluatedControls.map((ctrl) => (
										<ControlCard
											key={ctrl.id}
											control={{ ...ctrl, paragraphs: [] } as ControlData}
											hideMappedParagraphs
											hideBadges
										/>
									))}
								</div>
							</div>
						</div>

						<div className="space-y-6 lg:col-span-1 flex flex-col h-full min-h-0">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col h-full min-h-0">
								<div className="space-y-6 flex-1 overflow-y-auto min-h-0 pr-2 pb-4">
									<div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
										<p className="font-medium mb-1">
											<strong>Completeness:</strong> Do all generated controls
											completely cover the intention of this paragraph?
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold">
												Select &apos;Yes&apos; if ALL of the following apply:
											</p>
											<ul className="list-disc pl-4 space-y-1">
												<li>
													<strong>Full Coverage:</strong> The generated controls
													address every distinct technical requirement mandated
													by the paragraph.
												</li>
												<li>
													<strong>No Gaps:</strong> There are no missing
													security measures that a developer would need to infer
													to fully comply with the text.
												</li>
											</ul>
											<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
												Select &apos;No&apos; if the controls only partially
												address the paragraph or if important aspects are
												missing.
											</p>
										</CriteriaDetails>
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
										<p className="font-medium mb-1">
											<strong>Redundancy:</strong> Are there unnecessary
											overlaps or content repetitions among the generated
											controls for this paragraph?
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold">
												Select &apos;Yes (There are redundancies)&apos; if ANY
												of the following apply:
											</p>
											<ul className="list-disc pl-4 space-y-1">
												<li>
													<strong>Overlap:</strong> Multiple controls
													essentially demand the exact same technical
													implementation.
												</li>
												<li>
													<strong>Repetition:</strong> The same requirement is
													stated multiple times in slightly different words.
												</li>
												<li>
													<strong>Broader Coverage:</strong> Multiple specific
													controls are already covered by another more broadly
													formulated control.
												</li>
											</ul>
											<p className="italic text-zinc-500 dark:text-zinc-400 mt-2">
												Select &apos;No (No redundancies)&apos; if each control
												provides a distinct, non-overlapping requirement.
											</p>
										</CriteriaDetails>
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
								</div>

								<div className="flex justify-end mt-auto pt-6 shrink-0">
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
