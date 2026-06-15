"use client";

import {
	DeleteIcon,
	type DeleteIconHandle,
	FileTextIcon,
	type FileTextIconHandle,
	LoaderIcon,
	PlusIcon,
	type PlusIconHandle,
} from "lucide-animated";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidelineModel as Guideline } from "@/generated/prisma/models";
import { deleteAllGuidelines, deleteGuideline, getGuidelines } from "./actions";

type GuidelineWithCount = Guideline & {
	document: { title: string };
	_count: { controls: number };
};

function GuidelineCard({
	gl,
	handleDelete,
}: {
	gl: GuidelineWithCount;
	handleDelete: (id: string) => void;
}) {
	const iconRef = useRef<FileTextIconHandle | null>(null);
	const deleteIconRef = useRef<DeleteIconHandle | null>(null);

	return (
		<div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
			<Link
				href={`/guidelines/${gl.id}`}
				className="p-6 flex-1 block"
				onMouseEnter={() => iconRef.current?.startAnimation?.()}
				onMouseLeave={() => iconRef.current?.stopAnimation?.()}
			>
				<div className="flex items-start gap-4">
					<div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 group-hover:scale-110 transition-transform">
						<FileTextIcon ref={iconRef} animateOnHover={false} size={24} />
					</div>
					<div>
						<h2 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
							{gl.title}
						</h2>
						<div className="mt-2 flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
							<span className="font-medium text-blue-600 dark:text-blue-400">
								{gl.document?.title || "Unknown Document"}
							</span>
							<span>Imported: {new Date(gl.savedAt).toLocaleDateString()}</span>
							<span>{gl._count.controls} Controls</span>
						</div>
					</div>
				</div>
			</Link>
			<div className="border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 flex justify-end">
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						handleDelete(gl.id);
					}}
					onMouseEnter={() => deleteIconRef.current?.startAnimation?.()}
					onMouseLeave={() => deleteIconRef.current?.stopAnimation?.()}
					className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
					title="Delete Guideline"
				>
					<DeleteIcon ref={deleteIconRef} animateOnHover={false} size={18} />
				</button>
			</div>
		</div>
	);
}

export default function GuidelinesPage() {
	const [guidelines, setGuidelines] = useState<GuidelineWithCount[]>([]);
	const [loading, setLoading] = useState(true);

	const deleteAllIconRef = useRef<DeleteIconHandle | null>(null);
	const importIconRef = useRef<PlusIconHandle | null>(null);

	const fetchGuidelines = useCallback(async () => {
		const res = await getGuidelines();
		if (res.success && res.guidelines) {
			setGuidelines(res.guidelines);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void (async () => {
			await fetchGuidelines();
		})();
	}, [fetchGuidelines]);

	const handleDelete = async (id: string) => {
		if (
			!window.confirm(
				"Are you sure you want to delete this guideline? This will also delete its controls.",
			)
		)
			return;
		setLoading(true);
		const res = await deleteGuideline(id);
		if (res.success) {
			fetchGuidelines();
		} else {
			alert("Failed to delete guideline");
			setLoading(false);
		}
	};

	const handleDeleteAll = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete ALL guidelines? This will also delete all imported controls. This action cannot be undone.",
			)
		)
			return;
		setLoading(true);
		const res = await deleteAllGuidelines();
		if (res.success) {
			fetchGuidelines();
		} else {
			alert("Failed to delete all guidelines");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
							Technical Guidelines
						</h1>
						<p className="text-zinc-500 dark:text-zinc-400 mt-2">
							Manage your imported BSI technical guidelines.
						</p>
					</div>
					<div className="flex items-center gap-3">
						{guidelines.length > 0 && (
							<button
								type="button"
								onClick={handleDeleteAll}
								onMouseEnter={() =>
									deleteAllIconRef.current?.startAnimation?.()
								}
								onMouseLeave={() => deleteAllIconRef.current?.stopAnimation?.()}
								className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
							>
								<DeleteIcon
									ref={deleteAllIconRef}
									animateOnHover={false}
									size={20}
								/>
								Delete All
							</button>
						)}
						<Link
							href="/guidelines/import"
							onMouseEnter={() => importIconRef.current?.startAnimation?.()}
							onMouseLeave={() => importIconRef.current?.stopAnimation?.()}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
						>
							<PlusIcon ref={importIconRef} animateOnHover={false} size={20} />
							Import Guideline
						</Link>
					</div>
				</div>

				{loading ? (
					<div className="flex justify-center p-12">
						<LoaderIcon className="animate-spin text-blue-600" size={32} />
					</div>
				) : guidelines.length === 0 ? (
					<div className="text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
						<p className="text-zinc-500 dark:text-zinc-400 text-lg">
							No guidelines imported yet.
						</p>
						<p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
							Click &quot;Import Guideline&quot; to add a .yml file.
						</p>
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{guidelines.map((gl) => (
							<GuidelineCard key={gl.id} gl={gl} handleDelete={handleDelete} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
