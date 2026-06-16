export type ParagraphWithContext = {
	id: number;
	marker: string | null;
	text: string;
	section: {
		id: number;
		title: string;
		marker: string | null;
		document: {
			id: number;
			title: string;
		};
	};
	ancestors?: {
		id: number;
		marker: string | null;
		text: string;
	}[];
};

export function MappedParagraphCard({
	p,
	compact = false,
}: {
	p: ParagraphWithContext;
	compact?: boolean;
}) {
	return (
		<div
			className={`bg-zinc-50 ${compact ? "dark:bg-zinc-800/30 p-2.5 border-zinc-200/80 dark:border-zinc-700/50 rounded-lg" : "dark:bg-zinc-900/80 p-4 border-zinc-100 dark:border-zinc-800/80 rounded-lg group hover:border-blue-200 dark:hover:border-blue-900/50"} border transition-colors`}
		>
			<div
				className={`flex flex-wrap items-center gap-${compact ? "1.5" : "2"} mb-${compact ? "2" : "3"}`}
			>
				<span
					className={`font-bold uppercase tracking-wide bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded ${compact ? "text-[9px] px-1.5 py-0.5 shrink-0 truncate max-w-[120px]" : "text-[10px] px-2 py-1"}`}
					title={p.section.document.title}
				>
					{p.section.document.title}
				</span>
				<div
					className={`font-bold uppercase tracking-wide bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded flex items-start ${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1"}`}
				>
					{p.section.marker && (
						<span className="text-zinc-900 dark:text-zinc-200 mr-1.5 bg-zinc-300/50 dark:bg-zinc-700/50 px-1 rounded-sm font-mono whitespace-nowrap shrink-0 mt-0.5">
							{p.section.marker}
						</span>
					)}
					<span className="leading-relaxed">{p.section.title}</span>
				</div>
			</div>

			{p.ancestors && p.ancestors.length > 0 && (
				<div className={`${compact ? "mb-1.5 space-y-1" : "mb-2 space-y-1.5"}`}>
					{p.ancestors.map((anc, i) => (
						<div
							key={anc.id}
							style={{ marginLeft: `${i * 0.75}rem` }}
							className={`${compact ? "text-[10px]" : "text-xs"} text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-200 dark:border-zinc-800 pl-2.5 py-0.5 flex items-start`}
						>
							{anc.marker && (
								<span
									className={`inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded ${compact ? "text-[9px]" : "text-[10px] px-1.5"} font-mono font-bold text-zinc-600 dark:text-zinc-400 mr-1.5 border border-zinc-300 dark:border-zinc-700 mt-0.5 shrink-0 whitespace-nowrap`}
								>
									{anc.marker}
								</span>
							)}
							<span
								className={`${compact ? "line-clamp-1" : "leading-relaxed"}`}
							>
								{anc.text}
							</span>
						</div>
					))}
				</div>
			)}
			<div
				style={{
					marginLeft:
						p.ancestors && p.ancestors.length > 0
							? `${p.ancestors.length * 0.75}rem`
							: "0",
				}}
				className={`${compact ? "text-xs text-zinc-700 dark:text-zinc-300" : "text-sm text-zinc-800 dark:text-zinc-200 pl-3 border-l-2 border-blue-400 dark:border-blue-700"} leading-relaxed relative flex items-start ${!compact && "py-1"}`}
			>
				{!compact && p.ancestors && p.ancestors.length > 0 && (
					<div className="absolute -left-2.5 top-0 text-blue-400 dark:text-blue-700 text-xs">
						↳
					</div>
				)}
				{p.marker && (
					<span
						className={`inline-flex items-center justify-center ${compact ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600" : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"} px-1.5 py-0.5 rounded ${compact ? "text-[9px]" : "text-[11px]"} font-mono font-bold mr-${compact ? "1.5" : "2"} border mt-0.5 shrink-0 whitespace-nowrap`}
					>
						{p.marker}
					</span>
				)}
				<span className={compact ? "line-clamp-2" : ""}>{p.text}</span>
			</div>
		</div>
	);
}
