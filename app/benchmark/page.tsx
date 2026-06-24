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
										Which controls from existing guidelines does this generated
										control cover?
									</p>
									<CriteriaDetails className="mt-2 group">
										<p className="font-semibold text-emerald-700 dark:text-emerald-400">
											✅ DO check the box if the generated control:
										</p>
										<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
											<li>
												Is a <strong>direct match</strong> to the guideline.
											</li>
											<li>
												Provides a <strong>substantial contribution</strong> to
												fulfilling it.
											</li>
											<li>
												Is a <strong>specific, concrete implementation</strong>{" "}
												of a broader guideline.
											</li>
											<li className="text-zinc-600 dark:text-zinc-400">
												<em>
													Note: A single control can cover multiple guidelines!
												</em>
											</li>
										</ul>
										<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
											❌ Do NOT check the box if:
										</p>
										<ul className="list-disc pl-4 space-y-1 mt-1">
											<li>
												It is only <strong>vaguely related</strong> to the
												guideline.
											</li>
											<li>
												It just shares the <strong>same topic</strong> without
												actually fulfilling the requirement.
											</li>
										</ul>
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
											Select the paragraphs where this control is relevant:
										</p>
										<CriteriaDetails className="mb-3 group">
											<p className="font-semibold text-emerald-700 dark:text-emerald-400">
												✅ DO check the paragraph if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
												<li>
													The control <strong>logically derives</strong> from it
													without arbitrary constraints.
												</li>
												<li>
													It <strong>directly mandates</strong> or strongly
													implies the technical requirement.
												</li>
											</ul>
											<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
												❌ Do NOT check the paragraph if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1">
												<li>
													It only mentions the <strong>general topic</strong>{" "}
													without supporting the specific requirement.
												</li>
												<li>
													The control demands something that is{" "}
													<strong>not necessary</strong> or goes far beyond what
													the legal text actually requires.
												</li>
											</ul>
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
											<p className="font-semibold text-emerald-700 dark:text-emerald-400">
												✅ DO select &apos;Yes (Actionable)&apos; if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
												<li>
													It is <strong>highly specific</strong> (no vague
													&quot;ensure security&quot; statements).
												</li>
												<li>
													A developer can directly <strong>implement</strong> it
													as a tangible feature/config.
												</li>
												<li>
													It is clear how to <strong>test/verify</strong> its
													successful implementation.
												</li>
											</ul>
											<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
												❌ Do NOT select &apos;Yes&apos; (select &apos;No&apos;)
												if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1">
												<li>
													It only contains <strong>generic advice</strong> or
													lacks concrete technical steps.
												</li>
											</ul>
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
											<p className="font-semibold text-emerald-700 dark:text-emerald-400">
												✅ DO select &apos;Yes (Correct)&apos; if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
												<li>
													It uses <strong>accurate</strong> technical
													terminology and valid security concepts.
												</li>
												<li>
													It aligns with <strong>modern standards</strong> and
													industry best practices.
												</li>
												<li>
													It <strong>correctly interprets</strong> the spirit of
													the legal requirement.
												</li>
											</ul>
											<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
												❌ Do NOT select &apos;Yes&apos; (select &apos;No&apos;)
												if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1">
												<li>
													It proposes <strong>outdated technology</strong> or
													incorrect concepts.
												</li>
												<li>
													It <strong>misinterprets</strong> or weakens the legal
													requirement.
												</li>
											</ul>
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
											<p className="font-semibold text-emerald-700 dark:text-emerald-400">
												✅ DO select &apos;Yes&apos; if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
												<li>
													The controls provide <strong>full coverage</strong> of
													all technical requirements.
												</li>
												<li>
													There are <strong>no missing gaps</strong> that a
													developer would need to infer.
												</li>
											</ul>
											<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
												❌ Do NOT select &apos;Yes&apos; (select &apos;No&apos;)
												if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1">
												<li>
													The controls only <strong>partially address</strong>{" "}
													the paragraph.
												</li>
												<li>
													Important aspects are <strong>missing</strong>.
												</li>
											</ul>
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
											<p className="font-semibold text-emerald-700 dark:text-emerald-400">
												✅ DO select &apos;Yes (There are redundancies)&apos;
												if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">
												<li>
													Multiple controls <strong>overlap</strong> (demand the
													exact same technical implementation).
												</li>
												<li>
													The same requirement is <strong>repeated</strong> in
													slightly different words.
												</li>
												<li>
													Specific controls are already{" "}
													<strong>fully covered</strong> by another broader
													control.
												</li>
											</ul>
											<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
												❌ Do NOT select &apos;Yes&apos; (select &apos;No&apos;)
												if:
											</p>
											<ul className="list-disc pl-4 space-y-1 mt-1">
												<li>
													Each generated control provides a{" "}
													<strong>distinct, non-overlapping</strong>{" "}
													requirement.
												</li>
											</ul>
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
