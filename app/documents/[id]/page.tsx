"use client";

import {
	ArrowLeftIcon,
	BookTextIcon,
	BotIcon,
	CalendarCheckIcon,
	FilePenLineIcon,
	LoaderIcon,
	XIcon,
} from "lucide-animated";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
	Document,
	Paragraph,
	Section,
} from "../../../generated/prisma/client";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "../../components/MappedParagraphCard";
import { useModel } from "../../components/ModelContext";
import { ParagraphRenderer } from "../../components/ParagraphRenderer";
import {
	generateControlsForParagraph,
	getControlsForParagraph,
} from "../../controls/actions";
import {
	deleteDocument,
	getDocumentById,
	updateDocumentTitle,
} from "../actions";

export type DocumentData = Document & {
	sections: (Section & {
		paragraphs: Paragraph[];
	})[];
};

type Control = {
	id: string;
	title: string;
	text: string;
	paragraphs: ParagraphWithContext[];
};

export default function DocumentViewPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;
	const { selectedModel } = useModel();

	const [document, setDocument] = useState<DocumentData | null>(null);
	const [savedAt, setSavedAt] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [isSavingTitle, setIsSavingTitle] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Side Panel State
	const [selectedParagraph, setSelectedParagraph] = useState<Paragraph | null>(
		null,
	);
	const [controls, setControls] = useState<Control[]>([]);
	const [isLoadingControls, setIsLoadingControls] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	useEffect(() => {
		if (!id) return;

		getDocumentById(id).then((res) => {
			if (res.success && res.data) {
				setDocument(res.data.document as DocumentData);
				setEditTitle(res.data.document.title || "");
				setSavedAt(
					res.data.savedAt ? new Date(res.data.savedAt).toISOString() : null,
				);
			} else {
				setError(res.error || "Failed to load the document.");
			}
			setIsLoading(false);
		});
	}, [id]);

	const handleUpdateTitle = async () => {
		if (!editTitle.trim()) return;
		setIsSavingTitle(true);
		const res = await updateDocumentTitle(id, editTitle.trim());
		if (res.success) {
			setDocument((prev) =>
				prev ? { ...prev, title: editTitle.trim() } : prev,
			);
			setIsEditingTitle(false);
		} else {
			alert("Failed to update title");
		}
		setIsSavingTitle(false);
	};

	const handleDelete = async () => {
		if (!window.confirm("Are you sure you want to delete this document?"))
			return;
		setIsDeleting(true);
		const res = await deleteDocument(id);
		if (res.success) {
			router.push("/documents");
		} else {
			alert("Failed to delete document");
			setIsDeleting(false);
		}
	};

	const handleParagraphClick = async (p: Paragraph) => {
		setSelectedParagraph(p);
		setIsLoadingControls(true);
		const res = await getControlsForParagraph(p.id);
		if (res.success && res.controls) {
			setControls(res.controls);
		}
		setIsLoadingControls(false);
	};

	const handleGenerateControls = async () => {
		if (!selectedParagraph || !selectedModel) {
			alert("Please ensure an LLM model is selected in the header.");
			return;
		}
		setIsGenerating(true);
		const res = await generateControlsForParagraph(
			selectedParagraph.id,
			selectedModel,
		);
		if (res.success) {
			const reloadRes = await getControlsForParagraph(selectedParagraph.id);
			if (reloadRes.success && reloadRes.controls) {
				setControls(reloadRes.controls);
			}
		} else {
			alert(`Error generating controls: ${res.error}`);
		}
		setIsGenerating(false);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex items-center justify-center">
				<div className="flex flex-col items-center gap-4 text-zinc-500">
					<LoaderIcon className="animate-spin text-blue-600" size={32} />
					<p>Loading document...</p>
				</div>
			</div>
		);
	}

	if (error || !document) {
		return (
			<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					<Link
						href="/documents"
						className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
					>
						<ArrowLeftIcon size={16} />
						Back to Documents
					</Link>
					<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
						{error || "Document not found."}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex relative overflow-hidden">
			{/* Main Document Content */}
			<div
				className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${selectedParagraph ? "mr-[450px]" : ""}`}
			>
				<div className="max-w-4xl mx-auto space-y-8">
					{/* Navigation & Actions Header */}
					<div className="flex flex-wrap items-center justify-between gap-4 mb-8">
						<Link
							href="/documents"
							className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md w-fit"
						>
							<ArrowLeftIcon size={16} />
							Back to Documents
						</Link>

						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={handleDelete}
								disabled={isDeleting}
								className="text-sm font-medium px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 disabled:opacity-50"
							>
								{isDeleting ? "Deleting..." : "Delete Document"}
							</button>
						</div>
					</div>

					{/* Beautiful Header Card */}
					<div className="relative bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-blue-900/10 dark:via-zinc-900 dark:to-indigo-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-3xl p-8 shadow-sm overflow-hidden">
						<div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

						<div className="relative flex flex-col md:flex-row md:items-start gap-6">
							<div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 shrink-0 self-start">
								<BookTextIcon size={40} />
							</div>

							<div className="flex-1 w-full">
								{isEditingTitle ? (
									<div className="flex items-center gap-3 mb-4">
										<input
											type="text"
											value={editTitle}
											onChange={(e) => setEditTitle(e.target.value)}
											className="flex-1 text-2xl md:text-3xl font-extrabold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
										/>
										<button
											type="button"
											onClick={handleUpdateTitle}
											disabled={isSavingTitle}
											className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
										>
											{isSavingTitle ? "Saving..." : "Save"}
										</button>
										<button
											type="button"
											onClick={() => setIsEditingTitle(false)}
											disabled={isSavingTitle}
											className="px-5 py-3 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
										>
											Cancel
										</button>
									</div>
								) : (
									<div className="flex items-start justify-between gap-4 group mb-4">
										<h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
											{document.title || "Untitled Document"}
										</h1>
										<button
											type="button"
											onClick={() => {
												setEditTitle(document.title || "");
												setIsEditingTitle(true);
											}}
											className="opacity-0 group-hover:opacity-100 p-2.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
											title="Edit Title"
										>
											<FilePenLineIcon size={22} />
										</button>
									</div>
								)}
								{savedAt && (
									<div className="flex items-center gap-1.5 text-sm font-medium text-blue-600/80 dark:text-blue-400/80 bg-white/60 dark:bg-zinc-900/60 w-fit px-3 py-1.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30 backdrop-blur-sm">
										<CalendarCheckIcon size={16} />
										<span>
											Imported on {new Date(savedAt).toLocaleDateString()} at{" "}
											{new Date(savedAt).toLocaleTimeString()}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Document Content */}
					<div className="space-y-8 relative pt-4">
						<div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-200 via-zinc-200 to-transparent dark:from-blue-900/50 dark:via-zinc-800 hidden md:block"></div>

						{document.sections?.map((section) => (
							<div
								key={section.id}
								className="group/section relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 md:ml-12"
							>
								<div className="absolute -left-[54px] top-7 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-950 border-2 border-blue-400 dark:border-blue-500 shadow-sm hidden md:block group-hover/section:scale-125 group-hover/section:bg-blue-50 dark:group-hover/section:bg-blue-900/30 transition-all duration-300"></div>

								<div className="bg-zinc-50/50 dark:bg-zinc-900/30 px-8 py-5 border-b border-zinc-100 dark:border-zinc-800/50">
									<h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-start gap-3">
										<span className="w-1.5 h-6 bg-blue-500/80 rounded-full inline-block shrink-0 mt-0.5"></span>
										{section.marker && (
											<span className="whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400 font-medium">
												{section.marker}
											</span>
										)}
										<span>{section.title}</span>
									</h3>
								</div>
								<div className="p-8 space-y-6">
									{section.paragraphs && section.paragraphs.length > 0 ? (
										<div className="space-y-6">
											{(() => {
												const renderTree = (
													parentId: string | null = null,
													depth = 0,
												): React.ReactNode[] =>
													section.paragraphs
														.filter(
															(p: Paragraph) =>
																(p.parentParagraphId || null) === parentId,
														)
														.flatMap((p: Paragraph) => [
															<ParagraphRenderer
																key={p.id}
																paragraph={p}
																depth={depth}
																onClick={handleParagraphClick}
															/>,
															...renderTree(p.id, depth + 1),
														]);
												return renderTree();
											})()}
										</div>
									) : (
										<p className="text-zinc-400 italic">
											No paragraphs in this section.
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Side Panel */}
			<div
				className={`fixed top-[73px] right-0 bottom-0 w-[450px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-40 flex flex-col ${selectedParagraph ? "translate-x-0" : "translate-x-full"}`}
			>
				{selectedParagraph && (
					<>
						<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
							<h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								Paragraph Details
							</h2>
							<button
								type="button"
								onClick={() => setSelectedParagraph(null)}
								className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
							>
								<XIcon size={20} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 space-y-8">
							<div>
								<div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
									Selected Text
								</div>

								{(() => {
									const ancestors: Paragraph[] = [];
									if (document) {
										const allParagraphs = document.sections.flatMap(
											(s) => s.paragraphs,
										);
										let currentId = selectedParagraph.parentParagraphId;
										while (currentId) {
											const parent = allParagraphs.find(
												(p) => p.id === currentId,
											);
											if (parent) {
												ancestors.unshift(parent);
												currentId = parent.parentParagraphId;
											} else {
												break;
											}
										}
									}

									return (
										<div className="space-y-2">
											{ancestors.map((ancestor, i) => (
												<div
													key={ancestor.id}
													style={{ marginLeft: `${i * 1}rem` }}
													className="bg-zinc-100/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl p-3 text-zinc-500 dark:text-zinc-400 text-xs"
												>
													{ancestor.marker && (
														<span className="font-bold mr-2 text-zinc-600 dark:text-zinc-300">
															{ancestor.marker}
														</span>
													)}
													{ancestor.text}
												</div>
											))}

											<div
												style={{ marginLeft: `${ancestors.length * 1}rem` }}
												className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm relative"
											>
												{ancestors.length > 0 && (
													<div className="absolute -left-3 top-4 text-blue-300 dark:text-blue-700">
														↳
													</div>
												)}
												{selectedParagraph.marker && (
													<span className="font-bold mr-2 text-blue-700 dark:text-blue-400">
														{selectedParagraph.marker}
													</span>
												)}
												{selectedParagraph.text}
											</div>
										</div>
									);
								})()}
							</div>

							<div>
								<div className="flex items-center justify-between mb-4">
									<div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
										Controls
									</div>
									<button
										type="button"
										onClick={handleGenerateControls}
										disabled={isGenerating || !selectedModel}
										className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg transition-all disabled:opacity-50 shadow-sm"
									>
										<BotIcon size={14} />
										{isGenerating ? "Generating..." : "Generate AI Controls"}
									</button>
								</div>

								{!selectedModel && (
									<p className="text-xs text-amber-600 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-900/30">
										Please select an LLM model in the top header to generate
										controls.
									</p>
								)}

								{isLoadingControls ? (
									<div className="flex items-center justify-center p-8 text-zinc-400">
										<LoaderIcon className="animate-spin" size={24} />
									</div>
								) : controls.length === 0 ? (
									<div className="text-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 border-dashed">
										<p className="text-zinc-500 dark:text-zinc-400 text-sm">
											No controls mapped yet.
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{controls.map((ctrl) => (
											<div
												key={ctrl.id}
												className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative group overflow-hidden"
											>
												<div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
												<h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2 ml-2">
													{ctrl.title}
												</h4>
												<p className="text-sm text-zinc-600 dark:text-zinc-400 ml-2 whitespace-pre-wrap">
													{ctrl.text}
												</p>

												{ctrl.paragraphs.length > 1 && (
													<div className="mt-3 ml-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
														<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
															Also mapped to:
														</p>
														<div className="space-y-2">
															{ctrl.paragraphs
																.filter((p) => p.id !== selectedParagraph.id)
																.map((p) => (
																	<MappedParagraphCard
																		key={p.id}
																		p={p}
																		compact
																	/>
																))}
														</div>
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
