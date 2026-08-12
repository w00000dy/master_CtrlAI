"use client";

import { ChevronDownIcon } from "lucide-animated";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { Control, Guideline } from "../../generated/prisma/client";
import { CompactControlCard } from "../components/CompactControlCard";
import { BENCHMARK_TITLES } from "./constants";

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

function CriteriaGuidelines({
	doLabel = "✅ DO select 'Yes' if:",
	doNotLabel = "❌ Do NOT select 'Yes' (select 'No') if:",
	doItems,
	doNotItems,
}: {
	doLabel?: ReactNode;
	doNotLabel?: ReactNode;
	doItems: ReactNode;
	doNotItems: ReactNode;
}) {
	return (
		<>
			<p className="font-semibold text-emerald-700 dark:text-emerald-400">
				{doLabel}
			</p>
			<ul className="list-disc pl-4 space-y-1 mt-1 mb-3">{doItems}</ul>
			<p className="font-semibold text-rose-700 dark:text-rose-400 border-t border-blue-200 dark:border-blue-800/50 pt-2 mt-2">
				{doNotLabel}
			</p>
			<ul className="list-disc pl-4 space-y-1 mt-1">{doNotItems}</ul>
		</>
	);
}

import { ControlCard, type ControlData } from "../components/ControlCard";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "../components/MappedParagraphCard";
import {
	getBenchmarkParagraphs,
	getBenchmarkProgress,
	getNextBenchmarkTask,
	getTechnicalControls,
	saveControlBenchmark,
	saveParagraphBenchmark,
} from "./actions";

type BenchmarkParagraph = {
	id: number;
	marker: string | null;
	text: string;
	sectionTitle: string;
	sectionMarker: string | null;
	documentTitle: string;
	ancestorMarkers: string[];
	totalControls: number;
	evaluatedControls: number;
};

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

function BenchmarkQuestion({
	title,
	question,
	doItems,
	doNotItems,
	name,
	value,
	onChange,
	className = "",
}: {
	title: ReactNode;
	question: ReactNode;
	doItems: ReactNode;
	doNotItems: ReactNode;
	name: string;
	value: boolean | null;
	onChange: (val: boolean) => void;
	className?: string;
}) {
	return (
		<div
			className={`bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg ${className}`}
		>
			<p className="font-medium mb-1">
				<strong>{title}:</strong> {question}
			</p>
			<CriteriaDetails className="mb-3 group">
				<CriteriaGuidelines doItems={doItems} doNotItems={doNotItems} />
			</CriteriaDetails>
			<div className="flex gap-4">
				<label className="flex items-center">
					<input
						type="radio"
						name={name}
						checked={value === true}
						onChange={() => onChange(true)}
						className="mr-2"
					/>
					Yes
				</label>
				<label className="flex items-center">
					<input
						type="radio"
						name={name}
						checked={value === false}
						onChange={() => onChange(false)}
						className="mr-2"
					/>
					No
				</label>
			</div>
		</div>
	);
}

export default function BenchmarkPage() {
	const [task, setTask] = useState<Task | null>(null);
	const [technicalControls, setTechnicalControls] = useState<
		TechnicalControl[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<"CONTROL" | "PARAGRAPH">("CONTROL");
	const [paragraphsList, setParagraphsList] = useState<BenchmarkParagraph[]>(
		[],
	);
	const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(
		null,
	);
	const [progress, setProgress] = useState<{
		total: number;
		evaluated: number;
	} | null>(null);

	// Form State for Control
	const [relevantParagraphs, setRelevantParagraphs] = useState<Set<number>>(
		new Set(),
	);
	const [isActionable, setIsActionable] = useState<boolean | null>(null);
	const [isTechnicallyCorrect, setIsTechnicallyCorrect] = useState<
		boolean | null
	>(null);
	const [isMeasurable, setIsMeasurable] = useState<boolean | null>(null);
	const [hasNormativeLanguage, setHasNormativeLanguage] = useState<
		boolean | null
	>(null);
	const [selectedCoveredControls, setSelectedCoveredControls] = useState<
		Set<number>
	>(new Set());

	// Form State for Paragraph
	const [isComplete, setIsComplete] = useState<boolean | null>(null);
	const [hasRedundancy, setHasRedundancy] = useState<boolean | null>(null);
	const [hasHallucinations, setHasHallucinations] = useState<boolean | null>(
		null,
	);

	const loadTask = useCallback(async () => {
		setLoading(true);
		try {
			const [nextTask, progRes, paras] = await Promise.all([
				getNextBenchmarkTask(mode, selectedParagraphId),
				getBenchmarkProgress(mode, selectedParagraphId),
				getBenchmarkParagraphs(),
			]);

			setTask(nextTask);
			setProgress({
				total: progRes.total ?? 0,
				evaluated: progRes.evaluated ?? 0,
			});
			setParagraphsList(paras);

			if (nextTask.type === "CONTROL") {
				const techControls = await getTechnicalControls(
					nextTask.control.paragraphs.map((p) => p.id),
				);
				setTechnicalControls(techControls);

				// Reset control form
				setRelevantParagraphs(new Set());
				setIsActionable(null);
				setIsTechnicallyCorrect(null);
				setIsMeasurable(null);
				setHasNormativeLanguage(null);
				setSelectedCoveredControls(new Set());
			} else if (nextTask.type === "PARAGRAPH") {
				// Reset paragraph form
				setIsComplete(null);
				setHasRedundancy(null);
				setHasHallucinations(null);
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [mode, selectedParagraphId]);

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
			isTechnicallyCorrect === null ||
			isMeasurable === null ||
			hasNormativeLanguage === null
		) {
			return;
		}

		try {
			await saveControlBenchmark({
				llmControlId: task.control.id,
				coveredControlIds: Array.from(selectedCoveredControls),
				relevantParagraphIds: Array.from(relevantParagraphs),
				isActionable,
				isTechnicallyCorrect,
				isMeasurable,
				hasNormativeLanguage,
			});
			await loadTask();
		} catch (error) {
			console.error("Error saving benchmark:", error);
			alert("Failed to save benchmark result");
		}
	};

	const submitParagraph = async () => {
		if (
			task?.type !== "PARAGRAPH" ||
			isComplete === null ||
			hasRedundancy === null ||
			hasHallucinations === null
		) {
			return;
		}

		try {
			await saveParagraphBenchmark({
				paragraphId: task.paragraph.id,
				isComplete,
				hasRedundancy,
				hasHallucinations,
			});
			await loadTask();
		} catch (error) {
			console.error("Error saving benchmark:", error);
			alert("Failed to save benchmark result");
		}
	};

	return (
		<div className="flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
			<div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-2.5 px-4 md:px-8 shrink-0 flex flex-wrap justify-between items-center gap-3">
				<div className="flex items-center gap-2 max-w-xl flex-1 min-w-[280px]">
					<label
						htmlFor="paragraph-select"
						className="text-xs font-semibold text-zinc-500 uppercase tracking-wider shrink-0"
					>
						Paragraph:
					</label>
					<select
						id="paragraph-select"
						value={selectedParagraphId ?? ""}
						onChange={(e) => {
							const val = e.target.value;
							setSelectedParagraphId(val ? Number(val) : null);
						}}
						className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate"
					>
						<option value="">All Paragraphs</option>
						{paragraphsList.map((p) => {
							const markers = [
								...(p.sectionMarker ? [p.sectionMarker] : []),
								...p.ancestorMarkers,
								...(p.marker ? [p.marker] : []),
							].join(" ");
							const markerStr = markers ? `${markers} - ` : "";
							const paraSnippet =
								p.text.length > 40 ? `${p.text.substring(0, 40)}...` : p.text;
							const label = `[${p.documentTitle}] ${markerStr}${paraSnippet} (${p.evaluatedControls}/${p.totalControls} evaluated)`;
							return (
								<option key={p.id} value={p.id}>
									{label}
								</option>
							);
						})}
					</select>
				</div>

				<div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg shrink-0">
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
				<div className="text-sm text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-2 shrink-0">
					{progress && (
						<>
							<span>
								{progress.evaluated} / {progress.total}
							</span>
							<span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800 font-semibold">
								{progress.total > 0
									? Math.round((progress.evaluated / progress.total) * 100)
									: 0}
								%
							</span>
						</>
					)}
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
						<h2 className="text-2xl font-bold mb-4">
							{selectedParagraphId ? "Paragraph Completed!" : "Excellent!"}
						</h2>
						<p className="mb-4">
							{selectedParagraphId
								? "All controls for this paragraph have been evaluated."
								: "All controls and paragraphs have been successfully evaluated."}
						</p>
						{selectedParagraphId && (
							<button
								type="button"
								onClick={() => setSelectedParagraphId(null)}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
							>
								Show all paragraphs
							</button>
						)}
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
										<CriteriaGuidelines
											doLabel={
												<>✅ DO check the box if the generated control:</>
											}
											doNotLabel={<>❌ Do NOT check the box if:</>}
											doItems={
												<>
													<li>
														Is a <strong>direct match</strong> to the guideline.
													</li>
													<li>
														Provides a <strong>substantial contribution</strong>{" "}
														to fulfilling it.
													</li>
													<li>
														Is a{" "}
														<strong>specific, concrete implementation</strong>{" "}
														of a broader guideline.
													</li>
													<li className="text-zinc-600 dark:text-zinc-400">
														<em>
															Note: One AI-generated control can cover multiple
															controls from the technical guidelines!
														</em>
													</li>
												</>
											}
											doNotItems={
												<>
													<li>
														It is only <strong>vaguely related</strong> to the
														guideline.
													</li>
													<li>
														It just shares the <strong>same topic</strong>{" "}
														without actually fulfilling the requirement.
													</li>
												</>
											}
										/>
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
											<strong>{BENCHMARK_TITLES.RELEVANCE}:</strong> Select the
											paragraphs where this control is relevant:
										</p>
										<CriteriaDetails className="mb-3 group">
											<CriteriaGuidelines
												doLabel={<>✅ DO check the paragraph if:</>}
												doNotLabel={<>❌ Do NOT check the paragraph if:</>}
												doItems={
													<>
														<li>
															The control is a{" "}
															<strong>direct consequence</strong> of the
															paragraph, without adding unnecessary rules.
														</li>
														<li>
															It <strong>directly mandates</strong> or strongly
															implies the technical requirement.
														</li>
													</>
												}
												doNotItems={
													<>
														<li>
															It only mentions the{" "}
															<strong>general topic</strong> without supporting
															the specific requirement.
														</li>
														<li>
															The control demands something that is{" "}
															<strong>not necessary</strong> or goes far beyond
															what the legal text actually requires.
														</li>
													</>
												}
											/>
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

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.ACTIONABILITY}
										question="Is the control formulated so that developers or security engineers can implement it directly?"
										name="actionable"
										value={isActionable}
										onChange={setIsActionable}
										doItems={
											<>
												<li>
													It is <strong>highly specific</strong> (no vague
													&quot;ensure security&quot; statements).
												</li>
												<li>
													A developer can directly <strong>implement</strong> it
													as a tangible feature/config.
												</li>
											</>
										}
										doNotItems={
											<li>
												It only contains <strong>generic advice</strong> or
												lacks concrete technical steps.
											</li>
										}
									/>

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.TECHNICAL_CORRECTNESS}
										question="Is the technical interpretation of the legal text technically correct and state-of-the-art?"
										name="correct"
										value={isTechnicallyCorrect}
										onChange={setIsTechnicallyCorrect}
										doItems={
											<>
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
											</>
										}
										doNotItems={
											<>
												<li>
													It proposes <strong>outdated technology</strong> or
													incorrect concepts.
												</li>
												<li>
													It <strong>misinterprets</strong> or weakens the legal
													requirement.
												</li>
											</>
										}
									/>

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.MEASURABILITY}
										question="Is the control measurable?"
										name="measurable"
										value={isMeasurable}
										onChange={setIsMeasurable}
										className="mt-4"
										doItems={
											<li>
												It is possible to objectively verify whether the control
												is implemented (e.g., via an automated test, a log
												entry, or a clear configuration check).
											</li>
										}
										doNotItems={
											<li>
												Verification relies purely on subjective judgment, vague
												statements, or manual assertion without concrete
												evidence.
											</li>
										}
									/>

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.NORMATIVE_LANGUAGE}
										question="Is the control formulated using proper normative language (e.g., MUST, SHOULD) typical for compliance frameworks?"
										name="normative"
										value={hasNormativeLanguage}
										onChange={setHasNormativeLanguage}
										className="mt-4"
										doItems={
											<>
												<li>
													It uses strict, professional normative language.
												</li>
												<li>
													The tone matches official regulatory or technical
													guidelines.
												</li>
											</>
										}
										doNotItems={
											<>
												<li>
													It uses casual or suggestive language (e.g., &quot;You
													might want to...&quot;, &quot;It is a good idea
													to...&quot;).
												</li>
												<li>It lacks authoritative requirements.</li>
											</>
										}
									/>
								</div>
							</div>

							<div className="flex justify-end mt-auto pt-6">
								<button
									type="button"
									onClick={submitControl}
									disabled={
										isActionable === null ||
										isTechnicallyCorrect === null ||
										isMeasurable === null ||
										hasNormativeLanguage === null
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
									<BenchmarkQuestion
										title={BENCHMARK_TITLES.COMPLETENESS}
										question="Do all generated controls completely cover the intention of this paragraph?"
										name="complete"
										value={isComplete}
										onChange={setIsComplete}
										doItems={
											<>
												<li>
													The controls provide <strong>full coverage</strong> of
													all technical requirements.
												</li>
												<li>
													There are <strong>no missing gaps</strong> that a
													developer would need to infer.
												</li>
											</>
										}
										doNotItems={
											<>
												<li>
													The controls only <strong>partially address</strong>{" "}
													the paragraph.
												</li>
												<li>
													Important aspects are <strong>missing</strong>.
												</li>
											</>
										}
									/>

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.PRECISION}
										question="Do the generated controls invent technical requirements that are not supported by the original text?"
										name="hallucinations"
										value={hasHallucinations}
										onChange={setHasHallucinations}
										doItems={
											<>
												<li>
													The controls add{" "}
													<strong>new topics or obligations</strong> that have
													no basis in the provided text (e.g., demanding a
													password policy when the paragraph is only about data
													backups).
												</li>
												<li>
													They invent requirements that are clearly{" "}
													<strong>outside the scope</strong> of the legal
													paragraph.
												</li>
											</>
										}
										doNotItems={
											<>
												<li>
													The controls translate a broad legal requirement into{" "}
													<strong>
														concrete, state-of-the-art technical implementations
													</strong>{" "}
													(e.g., specifying &quot;Use AES-256&quot; for a
													general &quot;encryption&quot; requirement). This is
													expected and desired!
												</li>
												<li>
													All technical controls are logically derived from the
													core intention of the text without adding unrelated
													constraints.
												</li>
											</>
										}
									/>

									<BenchmarkQuestion
										title={BENCHMARK_TITLES.EFFICIENCY}
										question="Are there unnecessary overlaps or content repetitions among the generated controls for this paragraph?"
										name="redundancy"
										value={hasRedundancy}
										onChange={setHasRedundancy}
										doItems={
											<>
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
											</>
										}
										doNotItems={
											<li>
												Each generated control provides a{" "}
												<strong>distinct, non-overlapping</strong> requirement.
											</li>
										}
									/>
								</div>

								<div className="flex justify-end mt-auto pt-6 shrink-0">
									<button
										type="button"
										onClick={submitParagraph}
										disabled={
											isComplete === null ||
											hasRedundancy === null ||
											hasHallucinations === null
										}
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
