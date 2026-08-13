import { DeleteIcon, SquarePenIcon } from "lucide-animated";
import Link from "next/link";
import type { Control } from "@/generated/prisma/client";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "./MappedParagraphCard";

export type ControlData = Control & {
	paragraphs: ParagraphWithContext[];
	guideline?: { title: string } | null;
};

export function ControlCard({
	control,
	onEdit,
	onDelete,
	showMappingLink = false,
	layout = "vertical",
	hideMappedParagraphs = false,
	hideBadges = false,
	variant = "default",
	highlighted = false,
}: {
	control: ControlData;
	onEdit?: (control: ControlData) => void;
	onDelete?: (id: number) => void;
	showMappingLink?: boolean;
	layout?: "vertical" | "horizontal";
	hideMappedParagraphs?: boolean;
	hideBadges?: boolean;
	variant?: "default" | "blue" | "purple";
	highlighted?: boolean;
}) {
	const isMapped = control.paragraphs && control.paragraphs.length > 0;
	const isFewShotExample = control.paragraphs?.some((p) => p.isFewShotExample);

	return (
		<div
			className={`group rounded-xl flex shadow-sm overflow-hidden ${
				layout === "horizontal" ? "flex-col md:flex-row" : "flex-col"
			} ${
				highlighted
					? "bg-purple-50/40 dark:bg-purple-950/20 border border-purple-400 dark:border-purple-600 ring-1 ring-purple-500/30"
					: variant === "blue"
						? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
						: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
			}`}
		>
			<div
				className={`p-6 w-full ${
					highlighted
						? "border-purple-100 dark:border-purple-800/50 bg-transparent"
						: variant === "blue"
							? "border-blue-100 dark:border-blue-800/50 bg-transparent"
							: "border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30"
				} ${
					layout === "horizontal" && !hideMappedParagraphs
						? "md:w-2/3 border-b md:border-b-0 md:border-r"
						: hideMappedParagraphs
							? ""
							: "border-b"
				}`}
			>
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
							<span
								className={`w-1.5 h-5 ${
									highlighted ? "bg-purple-500" : "bg-blue-500"
								} rounded-full inline-block shrink-0`}
							/>
							<span>{control.title}</span>
							<span className="text-xs font-mono font-normal text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 ml-1 shrink-0">
								#{control.id}
							</span>
						</h2>
						{!hideBadges && (
							<div className="flex flex-wrap items-center gap-2">
								{isMapped ? (
									<span className="px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs font-semibold rounded-md border border-green-200 dark:border-green-800/50">
										Mapped
									</span>
								) : (
									<span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-xs font-semibold rounded-md border border-amber-200 dark:border-amber-800/50">
										Unmapped
									</span>
								)}
								{control.guidelineId ? (
									<span
										className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-semibold rounded-md border border-blue-200 dark:border-blue-800/50"
										title={control.guideline?.title || "Guideline"}
									>
										{control.guideline?.title
											? `Guideline: ${control.guideline.title.substring(0, 30)}${control.guideline.title.length > 30 ? "..." : ""}`
											: "Guideline"}
									</span>
								) : (
									<span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-semibold rounded-md border border-purple-200 dark:border-purple-800/50">
										LLM Generated
									</span>
								)}
								{isFewShotExample && (
									<span className="px-2 py-0.5 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 text-xs font-semibold rounded-md border border-fuchsia-200 dark:border-fuchsia-800/50">
										Few-Shot Example
									</span>
								)}
							</div>
						)}
					</div>

					{(onEdit || onDelete) && (
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
							{onEdit && (
								<button
									type="button"
									onClick={() => onEdit(control)}
									className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
									title="Edit"
								>
									<SquarePenIcon size={16} />
								</button>
							)}
							{onDelete && (
								<button
									type="button"
									onClick={() => onDelete(control.id)}
									className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
									title="Delete"
								>
									<DeleteIcon size={16} />
								</button>
							)}
						</div>
					)}
				</div>
				<p className="mt-4 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
					{control.statement}
				</p>
				{control.implementationGuidance && (
					<div
						className={`mt-4 p-4 rounded-lg border ${
							variant === "blue"
								? "bg-white/50 dark:bg-black/20 border-blue-200 dark:border-blue-800/50"
								: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
						}`}
					>
						<h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
							Implementation Guidance
						</h4>
						<p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
							{control.implementationGuidance}
						</p>
					</div>
				)}
			</div>

			{!hideMappedParagraphs && (
				<div
					className={`p-6 flex-1 ${
						variant === "blue"
							? "bg-blue-50/50 dark:bg-blue-900/10"
							: "bg-white dark:bg-zinc-900"
					} ${
						layout === "horizontal"
							? "md:w-1/3 bg-zinc-50/50 dark:bg-zinc-900/30"
							: ""
					}`}
				>
					<h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
						Mapped Paragraphs
					</h3>
					{!isMapped ? (
						<div className="text-sm text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center flex flex-col gap-3">
							<p>No paragraphs mapped.</p>
							{showMappingLink && (
								<Link
									href="/controls"
									className="text-blue-600 hover:underline"
								>
									Go to Controls to map manually →
								</Link>
							)}
						</div>
					) : (
						<div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
							{control.paragraphs.map((p) => (
								<MappedParagraphCard key={p.id} p={p} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
