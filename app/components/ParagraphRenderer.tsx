import {
	BookTextIcon,
	BotIcon,
	GitForkIcon,
	LoaderIcon,
	SparklesIcon,
	TimerIcon,
} from "lucide-animated";
import type { Prisma } from "../../generated/prisma/client";

export type ParagraphWithControls = Prisma.ParagraphGetPayload<{
	include: {
		controls: {
			select: {
				guidelineId: true;
				generatedForId: true;
			};
		};
	};
}>;

type ParagraphProps = {
	paragraph: ParagraphWithControls;
	depth?: number;
	onClick?: (p: ParagraphWithControls) => void;
	isSelected?: boolean;
	generationStatus?: "queued" | "processing" | "none";
};

export const ParagraphRenderer = ({
	paragraph,
	depth = 0,
	onClick,
	isSelected = false,
	generationStatus = "none",
}: ParagraphProps) => {
	const guidelineControlsCount =
		paragraph.controls?.filter((c) => c.guidelineId !== null).length || 0;
	const directLlmControlsCount =
		paragraph.controls?.filter(
			(c) =>
				c.guidelineId === null &&
				(c.generatedForId === paragraph.id || c.generatedForId === null),
		).length || 0;
	const mappedLlmControlsCount =
		paragraph.controls?.filter(
			(c) =>
				c.guidelineId === null &&
				c.generatedForId !== null &&
				c.generatedForId !== paragraph.id,
		).length || 0;

	return (
		<div
			className={
				depth > 0
					? `ml-${Math.min(depth * 6, 24)} mt-3 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4`
					: "space-y-2"
			}
		>
			<button
				type="button"
				onClick={() => onClick?.(paragraph)}
				className={`group flex items-start gap-3 text-left w-full transition-all p-2 -ml-2 rounded-xl ${onClick ? "cursor-pointer" : "cursor-default outline-none"} ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/50 shadow-sm" : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"}`}
			>
				{depth > 0 && (
					<span
						className={`mt-1.5 leading-none shrink-0 ${isSelected ? "text-blue-400 dark:text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
					>
						↳
					</span>
				)}

				<div className="flex-1 flex flex-col gap-1 min-w-0">
					<div className="flex items-start gap-2">
						{paragraph.marker && (
							<span
								className={`shrink-0 mt-0.5 inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-bold rounded-md border shadow-sm transition-colors ${isSelected ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 group-hover:bg-white dark:group-hover:bg-zinc-700"}`}
							>
								{paragraph.marker}
							</span>
						)}

						<div
							className={`leading-relaxed text-[15px] ${!paragraph.marker && depth === 0 ? "mt-0.5" : ""} ${isSelected ? "text-blue-900 dark:text-blue-100 font-medium" : "text-zinc-700 dark:text-zinc-300"}`}
						>
							{paragraph.text}
						</div>
					</div>

					{/* Controls Indicators & Few-Shot & Generation Status */}
					{(guidelineControlsCount > 0 ||
						directLlmControlsCount > 0 ||
						mappedLlmControlsCount > 0 ||
						paragraph.isFewShotExample ||
						generationStatus !== "none") && (
						<div
							className={`flex items-center gap-2 mt-1.5 ${!paragraph.marker ? "" : "ml-10"}`}
						>
							{generationStatus === "processing" && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30"
									title="Generating Controls"
								>
									<LoaderIcon className="animate-spin" size={10} />
									<span>Generating...</span>
								</div>
							)}
							{generationStatus === "queued" && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
									title="Queued for Generation"
								>
									<TimerIcon size={10} />
									<span>Queued</span>
								</div>
							)}
							{paragraph.isFewShotExample && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
									title="Used for Few-Shot Prompting"
								>
									<SparklesIcon size={10} />
									<span>Few-Shot</span>
								</div>
							)}
							{guidelineControlsCount > 0 && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
									title={`${guidelineControlsCount} Technical Guideline Controls`}
								>
									<BookTextIcon size={10} />
									<span>{guidelineControlsCount}</span>
								</div>
							)}
							{directLlmControlsCount > 0 && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
									title={`${directLlmControlsCount} Directly Generated LLM Controls`}
								>
									<BotIcon size={10} />
									<span>{directLlmControlsCount}</span>
								</div>
							)}
							{mappedLlmControlsCount > 0 && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
									title={`${mappedLlmControlsCount} Mapped LLM Controls (generated for another paragraph)`}
								>
									<GitForkIcon size={10} />
									<span>{mappedLlmControlsCount}</span>
								</div>
							)}
						</div>
					)}
				</div>
			</button>
		</div>
	);
};
