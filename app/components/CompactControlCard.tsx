import type React from "react";

import type { Control } from "@/generated/prisma/client";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "./MappedParagraphCard";

export function CompactControlCard({
	ctrl,
	selectedParagraphId,
	colorClass,
	action,
}: {
	ctrl: Control & { paragraphs?: ParagraphWithContext[] };
	selectedParagraphId?: number;
	colorClass: string;
	action?: React.ReactNode;
}) {
	const isDirectlyMapped =
		selectedParagraphId !== undefined && ctrl.paragraphs
			? ctrl.paragraphs.some((p) => p.id === selectedParagraphId)
			: true;

	return (
		<div
			className={`bg-white dark:bg-zinc-900 border ${
				isDirectlyMapped
					? "border-zinc-200 dark:border-zinc-800"
					: "border-dashed border-zinc-300 dark:border-zinc-700 opacity-90"
			} rounded-xl p-4 shadow-sm relative group overflow-hidden flex gap-3`}
		>
			<div
				className={`absolute top-0 left-0 w-1 h-full ${
					isDirectlyMapped ? colorClass : "bg-zinc-300 dark:bg-zinc-700"
				}`}
			></div>

			{action && <div className="ml-2 flex items-start pt-1">{action}</div>}

			<div className={`flex-1 ${!action ? "ml-2" : ""}`}>
				{!isDirectlyMapped && (
					<div className="mb-2">
						<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
							Sub-paragraph Control
						</span>
					</div>
				)}
				<h4
					className={`font-bold text-sm mb-2 flex items-center gap-2 ${
						isDirectlyMapped
							? "text-zinc-900 dark:text-zinc-100"
							: "text-zinc-700 dark:text-zinc-300"
					}`}
				>
					<span>{ctrl.title}</span>
					<span className="text-[10px] font-mono font-normal text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60">
						#{ctrl.id}
					</span>
				</h4>
				<p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap mb-3">
					{ctrl.statement}
				</p>
				{ctrl.implementationGuidance && (
					<div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/30">
						<p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
							Implementation Guidance:
						</p>
						<p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
							{ctrl.implementationGuidance}
						</p>
					</div>
				)}

				{ctrl.paragraphs &&
					((isDirectlyMapped && ctrl.paragraphs.length > 1) ||
						(!isDirectlyMapped && ctrl.paragraphs.length > 0)) &&
					selectedParagraphId !== undefined && (
						<div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
							<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
								{isDirectlyMapped ? "Also mapped to:" : "Mapped to:"}
							</p>
							<div className="space-y-2">
								{ctrl.paragraphs
									.filter(
										(p: ParagraphWithContext) => p.id !== selectedParagraphId,
									)
									.map((p: ParagraphWithContext) => (
										<MappedParagraphCard key={p.id} p={p} compact />
									))}
							</div>
						</div>
					)}
			</div>
		</div>
	);
}
