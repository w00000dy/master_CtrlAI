import type { Paragraph } from "../../generated/prisma/client";

type ParagraphProps = {
	paragraph: Paragraph;
	depth?: number;
	onClick?: (p: Paragraph) => void;
};

export const ParagraphRenderer = ({
	paragraph,
	depth = 0,
	onClick,
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
				className={`group flex items-start gap-3 text-left w-fit transition-colors p-1.5 -ml-1.5 rounded-lg ${onClick ? "cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50" : "cursor-default outline-none"}`}
			>
				{depth > 0 && (
					<span className="text-zinc-300 dark:text-zinc-600 mt-1.5 leading-none shrink-0">
						↳
					</span>
				)}

				{paragraph.marker && (
					<span className="shrink-0 mt-0.5 inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm transition-colors group-hover:bg-white dark:group-hover:bg-zinc-700">
						{paragraph.marker}
					</span>
				)}

				<div
					className={`text-zinc-700 dark:text-zinc-300 leading-relaxed text-[15px] ${!paragraph.marker && depth === 0 ? "mt-0.5" : ""}`}
				>
					{paragraph.text}
				</div>
			</button>
		</div>
	);
};
