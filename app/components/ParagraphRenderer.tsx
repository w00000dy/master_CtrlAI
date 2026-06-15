import type { Paragraph } from "../../generated/prisma/client";

type ParagraphProps = {
	paragraph: Paragraph;
	depth?: number;
	onClick?: (p: Paragraph) => void;
	isSelected?: boolean;
};

export const ParagraphRenderer = ({
	paragraph,
	depth = 0,
	onClick,
	isSelected = false,
}: ParagraphProps) => {
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
				className={`group flex items-start gap-3 text-left w-fit transition-all p-2 -ml-2 rounded-xl ${onClick ? "cursor-pointer" : "cursor-default outline-none"} ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/50 shadow-sm" : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"}`}
			>
				{depth > 0 && (
					<span
						className={`mt-1.5 leading-none shrink-0 ${isSelected ? "text-blue-400 dark:text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}
					>
						↳
					</span>
				)}

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
			</button>
		</div>
	);
};
