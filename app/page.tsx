"use client";

import {
	ActivityIcon,
	BookTextIcon,
	ChevronRightIcon,
	FileTextIcon,
	SettingsIcon,
	ShieldCheckIcon,
	TerminalIcon,
} from "lucide-animated";
import Link from "next/link";
import { useRef } from "react";

export default function Home() {
	type IconHandle = { startAnimation: () => void; stopAnimation: () => void };

	const docIconRef = useRef<IconHandle>(null);
	const guideIconRef = useRef<IconHandle>(null);
	const controlIconRef = useRef<IconHandle>(null);
	const benchIconRef = useRef<IconHandle>(null);
	const chatIconRef = useRef<IconHandle>(null);

	return (
		<div className="flex flex-col items-center justify-center flex-1 p-6 md:p-12 bg-zinc-50 dark:bg-zinc-950">
			<div className="max-w-5xl w-full">
				<header className="mb-12 text-center md:text-left">
					<h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-3">
						Compliance Hub
					</h1>
					<p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl">
						Follow the steps below to import your documents, extract controls
						from the technical guidelines, create new controls, and benchmark
						them.
					</p>
				</header>

				{/* Bento Grid for Main Workflow */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{/* Step 1: Documents */}
					<Link
						href="/documents"
						onMouseEnter={() => docIconRef.current?.startAnimation?.()}
						onMouseLeave={() => docIconRef.current?.stopAnimation?.()}
						className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all overflow-hidden"
					>
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="flex justify-between items-start mb-12">
							<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
								<FileTextIcon ref={docIconRef} size={28} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
								Step 1
							</span>
						</div>
						<div>
							<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
								Documents
								<ChevronRightIcon className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								Import and manage your legal documents.
							</p>
						</div>
					</Link>

					{/* Step 2: Guidelines */}
					<Link
						href="/guidelines"
						onMouseEnter={() => guideIconRef.current?.startAnimation?.()}
						onMouseLeave={() => guideIconRef.current?.stopAnimation?.()}
						className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all overflow-hidden"
					>
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="flex justify-between items-start mb-12">
							<div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
								<BookTextIcon ref={guideIconRef} size={28} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
								Step 2
							</span>
						</div>
						<div>
							<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
								Guidelines
								<ChevronRightIcon className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								Import technical guidelines and extract their controls.
							</p>
						</div>
					</Link>

					{/* Step 3: Controls */}
					<Link
						href="/controls"
						onMouseEnter={() => controlIconRef.current?.startAnimation?.()}
						onMouseLeave={() => controlIconRef.current?.stopAnimation?.()}
						className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all overflow-hidden"
					>
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="flex justify-between items-start mb-12">
							<div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
								<ShieldCheckIcon ref={controlIconRef} size={28} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
								Step 3
							</span>
						</div>
						<div>
							<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
								Controls
								<ChevronRightIcon className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								Add or review specific controls and map them to paragraphs.
							</p>
						</div>
					</Link>

					{/* Step 4: Benchmark */}
					<Link
						href="/benchmark"
						onMouseEnter={() => benchIconRef.current?.startAnimation?.()}
						onMouseLeave={() => benchIconRef.current?.stopAnimation?.()}
						className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all overflow-hidden"
					>
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
						<div className="flex justify-between items-start mb-12">
							<div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-2xl text-teal-600 dark:text-teal-400">
								<ActivityIcon ref={benchIconRef} size={28} />
							</div>
							<span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
								Step 4
							</span>
						</div>
						<div>
							<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
								Benchmark
								<ChevronRightIcon className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
								Run tests to evaluate the controls generated by the LLM.
							</p>
						</div>
					</Link>
				</div>

				{/* Secondary Actions (Debug / Settings) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto md:mx-0">
					<Link
						href="/chat"
						onMouseEnter={() => chatIconRef.current?.startAnimation?.()}
						onMouseLeave={() => chatIconRef.current?.stopAnimation?.()}
						className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-800/30 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-colors border border-dashed border-zinc-200 dark:border-zinc-800 group"
					>
						<div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-400 group-hover:text-amber-500 transition-colors">
							<TerminalIcon ref={chatIconRef} size={20} />
						</div>
						<div className="flex flex-col">
							<span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
								LLM Debug Chat
							</span>
							<span className="text-xs text-zinc-500 dark:text-zinc-500">
								Test prompts & model behavior
							</span>
						</div>
					</Link>

					<button
						type="button"
						disabled
						className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-100/30 dark:bg-zinc-900/30 opacity-50 cursor-not-allowed border border-dashed border-zinc-200 dark:border-zinc-800"
					>
						<div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-zinc-500">
							<SettingsIcon size={20} />
						</div>
						<div className="flex flex-col text-left">
							<span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
								Settings
							</span>
							<span className="text-xs text-zinc-500 dark:text-zinc-500">
								Coming soon
							</span>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
