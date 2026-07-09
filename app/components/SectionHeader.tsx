export function SectionHeader({
	marker,
	title,
	size = "normal",
}: {
	marker?: string | null;
	title: string;
	size?: "normal" | "large";
}) {
	return (
		<h3
			className={`text-zinc-900 dark:text-zinc-100 flex items-start ${
				size === "large"
					? "text-xl font-bold tracking-tight gap-3"
					: "text-lg font-semibold gap-2"
			}`}
		>
			{size === "large" && (
				<span className="w-1.5 h-6 bg-blue-500/80 rounded-full inline-block shrink-0 mt-0.5"></span>
			)}
			{marker && (
				<span className="whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400 font-medium">
					{marker}
				</span>
			)}
			<span>{title}</span>
		</h3>
	);
}
