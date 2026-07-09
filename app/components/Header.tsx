"use client";

import { LoaderIcon, XIcon } from "lucide-animated";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGenerationContext } from "./GenerationContext";
import { useModel } from "./ModelContext";

const ThemeToggle = dynamic(() => import("./ThemeToggle"), {
	ssr: false,
	loading: () => <div className="w-9 h-9" />,
});

const NAV_LINKS = [
	{ href: "/", label: "Menu" },
	{ href: "/chat", label: "Chat" },
	{ href: "/documents", label: "Documents" },
	{ href: "/guidelines", label: "Guidelines" },
	{ href: "/controls", label: "Controls" },
	{ href: "/benchmark", label: "Benchmark" },
	{ href: "/benchmark/results", label: "Results" },
	{ href: "/settings", label: "Settings" },
];

export default function Header() {
	const { models, selectedModel, setSelectedModel } = useModel();
	const { totalTasks, completedTasks, cancelAll } = useGenerationContext();

	return (
		<header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm z-10 flex-shrink-0">
			<div className="flex items-center gap-6">
				<h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
					Compliance LLM
				</h1>
				<nav className="flex gap-4">
					{NAV_LINKS.map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
						>
							{label}
						</Link>
					))}
				</nav>
			</div>

			<div className="flex items-center gap-4">
				{totalTasks > 0 && (
					<div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm transition-all">
						<LoaderIcon className="animate-spin text-blue-500" size={16} />
						<div className="flex flex-col min-w-[120px]">
							<div className="flex justify-between items-center text-xs mb-1">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Generating
								</span>
								<span className="text-zinc-500 font-mono">
									{completedTasks}/{totalTasks}
								</span>
							</div>
							<div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
								<div
									className="h-full bg-blue-500 transition-all duration-300 ease-out"
									style={{
										width: `${Math.max(5, (completedTasks / totalTasks) * 100)}%`,
									}}
								/>
							</div>
						</div>
						<button
							type="button"
							onClick={cancelAll}
							className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-red-500 rounded-md transition-colors"
							title="Cancel all"
						>
							<XIcon size={14} />
						</button>
					</div>
				)}

				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-600 dark:text-zinc-400">
						Model:
					</span>
					<select
						value={selectedModel}
						onChange={(e) => setSelectedModel(e.target.value)}
						className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
					>
						{models.length === 0 && <option value="">Loading models...</option>}
						{models.map((model) => (
							<option key={model} value={model}>
								{model}
							</option>
						))}
					</select>
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
