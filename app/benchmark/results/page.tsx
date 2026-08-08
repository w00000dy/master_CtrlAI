"use client";

import { LoaderIcon } from "lucide-animated";
import { useEffect, useState } from "react";
import { PageLayout } from "@/app/components/PageLayout";
import { BENCHMARK_TITLES } from "../constants";
import { getBenchmarkResults, getParagraphBenchmarks } from "./actions";

type BenchmarkResult = Awaited<ReturnType<typeof getBenchmarkResults>>[0];
type ParagraphBenchmark = Awaited<ReturnType<typeof getParagraphBenchmarks>>[0];

function Gauge({ value, label }: { value: number; label: string }) {
	const percentage = Math.round(value);
	let colorClass = "text-green-500";
	if (percentage < 50) colorClass = "text-red-500";
	else if (percentage < 80) colorClass = "text-amber-500";

	return (
		<div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
			<div className="relative flex items-center justify-center">
				<svg className="w-24 h-24 transform -rotate-90">
					<title>{label} Gauge</title>
					<circle
						cx="48"
						cy="48"
						r="36"
						stroke="currentColor"
						strokeWidth="8"
						fill="transparent"
						className="text-zinc-100 dark:text-zinc-800"
					/>
					<circle
						cx="48"
						cy="48"
						r="36"
						stroke="currentColor"
						strokeWidth="8"
						fill="transparent"
						strokeDasharray={226.2}
						strokeDashoffset={226.2 - (226.2 * percentage) / 100}
						className={`${colorClass} transition-all duration-1000 ease-out`}
					/>
				</svg>
				<span className="absolute text-xl font-bold text-zinc-900 dark:text-zinc-100">
					{percentage}%
				</span>
			</div>
			<span className="mt-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400 text-center">
				{label}
			</span>
		</div>
	);
}

export default function BenchmarkResultsPage() {
	const [controlResults, setControlResults] = useState<BenchmarkResult[]>([]);
	const [paragraphResults, setParagraphResults] = useState<
		ParagraphBenchmark[]
	>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadData() {
			setLoading(true);
			const [ctrlRes, paraRes] = await Promise.all([
				getBenchmarkResults(),
				getParagraphBenchmarks(),
			]);
			setControlResults(ctrlRes);
			setParagraphResults(paraRes);
			setLoading(false);
		}
		loadData();
	}, []);

	const totalControls = controlResults.length;
	const actionableControls = controlResults.filter(
		(r) => r.isActionable,
	).length;
	const correctControls = controlResults.filter(
		(r) => r.isTechnicallyCorrect,
	).length;
	const measurableControls = controlResults.filter(
		(r) => r.isMeasurable,
	).length;

	const actionabilityScore =
		totalControls > 0 ? (actionableControls / totalControls) * 100 : 0;
	const correctnessScore =
		totalControls > 0 ? (correctControls / totalControls) * 100 : 0;
	const measurabilityScore =
		totalControls > 0 ? (measurableControls / totalControls) * 100 : 0;

	const relevanceScores = controlResults.map((r) => {
		const totalMapped = r.llmControl.paragraphs.length;
		if (totalMapped === 0) return 100;
		const relevant = r.relevantParagraphs.length;
		return (relevant / totalMapped) * 100;
	});
	const avgRelevanceScore =
		totalControls > 0
			? relevanceScores.reduce((a, b) => a + b, 0) / totalControls
			: 0;

	const totalParagraphs = paragraphResults.length;
	const completeParagraphs = paragraphResults.filter(
		(r) => r.isComplete,
	).length;
	const noRedundancyParagraphs = paragraphResults.filter(
		(r) => !r.hasRedundancy,
	).length;
	const noHallucinationsParagraphs = paragraphResults.filter(
		(r) => !r.hasHallucinations,
	).length;

	const completenessScore =
		totalParagraphs > 0 ? (completeParagraphs / totalParagraphs) * 100 : 0;
	const efficiencyScore =
		totalParagraphs > 0 ? (noRedundancyParagraphs / totalParagraphs) * 100 : 0;
	const precisionScore =
		totalParagraphs > 0
			? (noHallucinationsParagraphs / totalParagraphs) * 100
			: 0;

	return (
		<PageLayout
			title="Benchmark Results"
			description="Analytics and detailed evaluations of the LLM-generated compliance controls."
			maxWidth="max-w-7xl"
		>
			{loading ? (
				<div className="flex justify-center p-12">
					<LoaderIcon className="animate-spin text-blue-600" size={32} />
				</div>
			) : (
				<div className="space-y-12">
					{/* Dashboard */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
						<Gauge
							value={avgRelevanceScore}
							label={BENCHMARK_TITLES.RELEVANCE}
						/>
						<Gauge
							value={actionabilityScore}
							label={BENCHMARK_TITLES.ACTIONABILITY}
						/>
						<Gauge
							value={correctnessScore}
							label={BENCHMARK_TITLES.TECHNICAL_CORRECTNESS}
						/>
						<Gauge
							value={measurabilityScore}
							label={BENCHMARK_TITLES.MEASURABILITY}
						/>
						<Gauge
							value={completenessScore}
							label={BENCHMARK_TITLES.COMPLETENESS}
						/>
						<Gauge
							value={efficiencyScore}
							label={BENCHMARK_TITLES.EFFICIENCY}
						/>
						<Gauge value={precisionScore} label={BENCHMARK_TITLES.PRECISION} />
					</div>

					<div className="grid lg:grid-cols-2 gap-8">
						{/* Evaluated Controls List */}
						<div className="space-y-4">
							<h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
								<span>Evaluated Controls ({totalControls})</span>
							</h3>
							<div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
								{controlResults.map((result) => (
									<div
										key={result.id}
										className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm"
									>
										<div className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">
											{result.llmControl.title}
										</div>
										<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
											{result.llmControl.statement}
										</p>

										<div className="flex gap-2 text-xs font-semibold mb-4">
											<span
												className={`px-2 py-1 rounded-full ${result.isActionable ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
											>
												{result.isActionable ? "✓ Actionable" : "✗ Vague"}
											</span>
											<span
												className={`px-2 py-1 rounded-full ${result.isTechnicallyCorrect ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
											>
												{result.isTechnicallyCorrect
													? "✓ Correct"
													: "✗ Incorrect"}
											</span>
											<span
												className={`px-2 py-1 rounded-full ${result.isMeasurable ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
											>
												{result.isMeasurable
													? "✓ Measurable"
													: "✗ Not Measurable"}
											</span>
										</div>

										<div className="text-xs text-zinc-500">
											<strong>Relevant for:</strong>{" "}
											{result.relevantParagraphs.length} of{" "}
											{result.llmControl.paragraphs.length} paragraphs
										</div>
										<div className="text-xs text-zinc-500 mt-1">
											<strong>Covers:</strong> {result.coveredControls.length}{" "}
											technical controls
										</div>
									</div>
								))}
								{totalControls === 0 && (
									<div className="text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500">
										No controls evaluated yet.
									</div>
								)}
							</div>
						</div>

						{/* Evaluated Paragraphs List */}
						<div className="space-y-4">
							<h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
								<span>Evaluated Paragraphs ({totalParagraphs})</span>
							</h3>
							<div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
								{paragraphResults.map((result) => (
									<div
										key={result.id}
										className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm"
									>
										<div className="text-xs font-semibold text-blue-500 mb-1">
											{result.paragraph.section.document.title} -{" "}
											{result.paragraph.section.title}
										</div>
										<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">
											{result.paragraph.marker && (
												<strong className="mr-1">
													{result.paragraph.marker}
												</strong>
											)}
											{result.paragraph.text}
										</p>

										<div className="flex gap-2 text-xs font-semibold">
											<span
												className={`px-2 py-1 rounded-full ${result.isComplete ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
											>
												{result.isComplete
													? "✓ Complete Coverage"
													: "⚠ Incomplete"}
											</span>
											<span
												className={`px-2 py-1 rounded-full ${!result.hasRedundancy ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
											>
												{!result.hasRedundancy
													? "✓ Efficient"
													: "⚠ Redundant Controls"}
											</span>
											<span
												className={`px-2 py-1 rounded-full ${!result.hasHallucinations ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
											>
												{!result.hasHallucinations
													? "✓ No Hallucinations"
													: "✗ Over-Compliant"}
											</span>
										</div>
									</div>
								))}
								{totalParagraphs === 0 && (
									<div className="text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500">
										No paragraphs evaluated yet.
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</PageLayout>
	);
}
