import type React from "react";

export function PageLayout({
	title,
	description,
	actions,
	children,
	maxWidth = "max-w-5xl",
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	children: React.ReactNode;
	maxWidth?: string;
}) {
	return (
		<div className="flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950 p-8 overflow-y-auto">
			<div className={`${maxWidth} w-full mx-auto space-y-8`}>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
							{title}
						</h1>
						{description && (
							<p className="text-zinc-500 dark:text-zinc-400">{description}</p>
						)}
					</div>
					{actions && <div className="flex items-center gap-3">{actions}</div>}
				</div>
				{children}
			</div>
		</div>
	);
}
