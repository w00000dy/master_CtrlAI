"use client";

import Link from "next/link";
import { useModel } from "./ModelContext";

export default function Header() {
	const { models, selectedModel, setSelectedModel } = useModel();

	return (
		<header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm z-10 flex-shrink-0">
			<div className="flex items-center gap-6">
				<h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
					Compliance LLM
				</h1>
				<nav className="flex gap-4">
					<Link
						href="/"
						className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						Menu
					</Link>
					<Link
						href="/chat"
						className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						Chat
					</Link>

					<Link
						href="/documents"
						className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						Documents
					</Link>
					<Link
						href="/controls"
						className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						Controls
					</Link>
					<Link
						href="/guidelines"
						className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						Guidelines
					</Link>
				</nav>
			</div>

			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-600 dark:text-zinc-400">Model:</span>
				<select
					value={selectedModel}
					onChange={(e) => setSelectedModel(e.target.value)}
					className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
					disabled={!models.length}
				>
					{!models.length && <option value="">Loading models...</option>}
					{models.map((model) => (
						<option key={model} value={model}>
							{model}
						</option>
					))}
				</select>
			</div>
		</header>
	);
}
