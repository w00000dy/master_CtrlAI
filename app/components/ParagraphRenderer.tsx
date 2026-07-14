import { BookTextIcon, BotIcon, SparklesIcon } from "lucide-animated";
import type { Prisma } from "../../generated/prisma/client";

export type ParagraphWithControls = Prisma.ParagraphGetPayload<{
	include: {
		controls: {
			select: {
				guidelineId: true;
			};
		};
	};
}>;

type ParagraphProps = {
	paragraph: ParagraphWithControls;
	depth?: number;
	onClick?: (p: ParagraphWithControls) => void;
	isSelected?: boolean;
};

export const ParagraphRenderer = ({
	paragraph,
	depth = 0,
	onClick,
	isSelected = false,
}: ParagraphProps) => {
	const guidelineControlsCount =
		paragraph.controls?.filter((c) => c.guidelineId !== null).length || 0;
	const llmControlsCount =
		paragraph.controls?.filter((c) => c.guidelineId === null).length || 0;

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

					{/* Controls Indicators & Few-Shot */}
					{(guidelineControlsCount > 0 ||
						llmControlsCount > 0 ||
						paragraph.isFewShotExample) && (
						<div
							className={`flex items-center gap-2 mt-1.5 ${!paragraph.marker ? "" : "ml-10"}`}
						>
							{paragraph.isFewShotExample && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
									title="Wird für Few-Shot Prompting verwendet"
								>
									<SparklesIcon size={10} />
									<span>Few-Shot</span>
								</div>
							)}
							{guidelineControlsCount > 0 && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
									title={`${guidelineControlsCount} Technische Richtlinien Controls`}
								>
									<BookTextIcon size={10} />
									<span>{guidelineControlsCount}</span>
								</div>
							)}
							{llmControlsCount > 0 && (
								<div
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
									title={`${llmControlsCount} LLM generierte Controls`}
								>
									<BotIcon size={10} />
									<span>{llmControlsCount}</span>
								</div>
							)}
						</div>
					)}
				</div>
			</button>
		</div>
	);
};
