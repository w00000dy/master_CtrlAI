"use client";

import { ArrowLeftIcon, FileTextIcon, LoaderIcon } from "lucide-animated";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ControlCard, type ControlData } from "../../components/ControlCard";
import { deleteGuideline, getGuidelineById } from "../actions";

type GuidelineData = NonNullable<
	Awaited<ReturnType<typeof getGuidelineById>>["guideline"]
>;

export default function GuidelineViewPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const [guideline, setGuideline] = useState<GuidelineData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchGuideline = useCallback(async () => {
		setLoading(true);
		const res = await getGuidelineById(id);
		if (res.success && res.guideline) {
			setGuideline(res.guideline);
		} else {
			setError(res.error || "Failed to load guideline.");
		}
		setLoading(false);
	}, [id]);

	useEffect(() => {
		if (id) {
			void (async () => {
				await fetchGuideline();
			})();
		}
	}, [id, fetchGuideline]);

	const handleDelete = async () => {
		if (!window.confirm("Are you sure you want to delete this guideline?"))
			return;
		setIsDeleting(true);
		const res = await deleteGuideline(id);
		if (res.success) {
			router.push("/guidelines");
		} else {
			alert("Failed to delete guideline");
			setIsDeleting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex justify-center items-center">
				<LoaderIcon className="animate-spin text-blue-600" size={32} />
			</div>
		);
	}

	if (error || !guideline) {
		return (
			<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					<Link
						href="/guidelines"
						className="text-sm text-blue-600 hover:underline flex items-center gap-1"
					>
						<ArrowLeftIcon size={16} /> Back to Guidelines
					</Link>
					<div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100">
						{error || "Guideline not found."}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
			<div className="max-w-5xl mx-auto space-y-8">
				<div className="flex items-center justify-between">
					<Link
						href="/guidelines"
						className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit"
					>
						<ArrowLeftIcon size={16} /> Back to Guidelines
					</Link>
					<button
						type="button"
						onClick={handleDelete}
						disabled={isDeleting}
						className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
					>
						{isDeleting ? "Deleting..." : "Delete Guideline"}
					</button>
				</div>

				<div className="bg-gradient-to-br from-blue-50 via-white to-zinc-50 dark:from-blue-900/10 dark:via-zinc-900 dark:to-zinc-900 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-8 shadow-sm">
					<div className="flex items-start gap-4">
						<div className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 text-blue-600">
							<FileTextIcon size={32} />
						</div>
						<div>
							<h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
								{guideline.title}
							</h1>
							<p className="mt-2 text-blue-600 dark:text-blue-400 font-medium">
								{guideline.document?.title || "Unknown Document"}
							</p>
							<p className="mt-1 text-zinc-500 dark:text-zinc-400">
								Imported on {new Date(guideline.savedAt).toLocaleDateString()}
							</p>
							<div className="mt-4 inline-flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full text-sm font-medium border border-zinc-200 dark:border-zinc-700">
								<span className="w-2 h-2 rounded-full bg-blue-500"></span>
								{guideline.controls.length} Controls
							</div>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
						Imported Controls
					</h2>
					<div className="grid gap-6">
						{guideline.controls.map((control) => (
							<ControlCard
								key={control.id}
								control={control as unknown as ControlData}
								showMappingLink={true}
								layout="horizontal"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
