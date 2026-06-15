"use client";

import { DeleteIcon, SquarePenIcon, XIcon } from "lucide-animated";
import type React from "react";
import { useEffect, useState } from "react";
import type {
	Document,
	Paragraph,
	Section,
} from "../../generated/prisma/client";
import {
	MappedParagraphCard,
	type ParagraphWithContext,
} from "../components/MappedParagraphCard";
import {
	createControl,
	deleteAllControls,
	deleteControl,
	getControls,
	getParagraphsForSelection,
	updateControl,
} from "./actions";

type Control = {
	id: string;
	title: string;
	statement: string;
	implementationGuidance: string | null;
	paragraphs: ParagraphWithContext[];
};

type DocumentWithParagraphs = Document & {
	sections: (Section & {
		paragraphs: Paragraph[];
	})[];
};

export default function ControlsPage() {
	const [controls, setControls] = useState<Control[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [docsWithParagraphs, setDocsWithParagraphs] = useState<
		DocumentWithParagraphs[]
	>([]);

	// form state
	const [newTitle, setNewTitle] = useState("");
	const [newStatement, setNewStatement] = useState("");
	const [newGuidance, setNewGuidance] = useState("");
	const [selectedParagraphs, setSelectedParagraphs] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingControlId, setEditingControlId] = useState<string | null>(null);

	const fetchControls = async () => {
		setLoading(true);
		const res = await getControls();
		if (res.success && res.controls) {
			setControls(res.controls as unknown as Control[]);
		}
		setLoading(false);
	};

	useEffect(() => {
		let active = true;
		const init = async () => {
			const res = await getControls();
			if (!active) return;
			if (res.success && res.controls) {
				setControls(res.controls as unknown as Control[]);
			}
			setLoading(false);
		};
		init();
		return () => {
			active = false;
		};
	}, []);

	const openModal = async () => {
		setIsModalOpen(true);
		const res = await getParagraphsForSelection();
		if (res.success && res.documents) {
			setDocsWithParagraphs(res.documents);
		}
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setNewTitle("");
		setNewStatement("");
		setNewGuidance("");
		setSelectedParagraphs([]);
		setEditingControlId(null);
	};

	const openEditModal = async (control: Control) => {
		setNewTitle(control.title);
		setNewStatement(control.statement);
		setNewGuidance(control.implementationGuidance || "");
		setSelectedParagraphs(control.paragraphs.map((p) => p.id));
		setEditingControlId(control.id);
		setIsModalOpen(true);

		if (docsWithParagraphs.length === 0) {
			const res = await getParagraphsForSelection();
			if (res.success && res.documents) {
				setDocsWithParagraphs(res.documents);
			}
		}
	};

	const handleDeleteControl = async (id: string) => {
		if (!window.confirm("Are you sure you want to delete this control?"))
			return;
		const res = await deleteControl(id);
		if (res.success) {
			fetchControls();
		} else {
			alert("Failed to delete control.");
		}
	};

	const handleDeleteAllControls = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete ALL controls? This action cannot be undone.",
			)
		)
			return;
		const res = await deleteAllControls();
		if (res.success) {
			fetchControls();
		} else {
			alert("Failed to delete all controls.");
		}
	};

	const toggleParagraph = (id: string) => {
		setSelectedParagraphs((prev) =>
			prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTitle || !newStatement) return;

		setIsSubmitting(true);
		let res: { success: boolean; control?: unknown; error?: string };
		if (editingControlId) {
			res = await updateControl(editingControlId, {
				title: newTitle,
				statement: newStatement,
				implementationGuidance: newGuidance,
				paragraphIds: selectedParagraphs,
			});
		} else {
			res = await createControl({
				title: newTitle,
				statement: newStatement,
				implementationGuidance: newGuidance,
				paragraphIds: selectedParagraphs,
			});
		}
		setIsSubmitting(false);

		if (res.success) {
			closeModal();
			fetchControls();
		} else {
			alert("Error creating control");
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
							Controls
						</h1>
						<p className="text-zinc-500 dark:text-zinc-400 mt-2">
							Manage implementation instructions and map them to paragraphs.
						</p>
					</div>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleDeleteAllControls}
							className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
						>
							Delete All Controls
						</button>
						<button
							type="button"
							onClick={openModal}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
						>
							Add Control
						</button>
					</div>
				</div>

				{loading ? (
					<div className="flex justify-center p-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				) : controls.length === 0 ? (
					<div className="text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
						<p className="text-zinc-500 dark:text-zinc-400 text-lg">
							No controls found.
						</p>
						<p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
							Click &quot;Add Control&quot; to create your first implementation
							instruction.
						</p>
					</div>
				) : (
					<div className="grid gap-6 lg:grid-cols-2">
						{controls.map((control) => (
							<div
								key={control.id}
								className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col shadow-sm overflow-hidden"
							>
								<div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
									<div className="flex items-start justify-between">
										<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
											<span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block"></span>
											{control.title}
										</h2>
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button
												type="button"
												onClick={() => openEditModal(control)}
												className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
												title="Edit"
											>
												<SquarePenIcon size={16} />
											</button>
											<button
												type="button"
												onClick={() => handleDeleteControl(control.id)}
												className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
												title="Delete"
											>
												<DeleteIcon size={16} />
											</button>
										</div>
									</div>
									<p className="mt-4 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
										{control.statement}
									</p>
									{control.implementationGuidance && (
										<div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
											<h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Implementation Guidance</h4>
											<p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
												{control.implementationGuidance}
											</p>
										</div>
									)}
								</div>

								<div className="p-6 flex-1 bg-white dark:bg-zinc-900">
									<h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
										Mapped Paragraphs
									</h3>
									{control.paragraphs.length === 0 ? (
										<p className="text-sm text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center">
											No paragraphs mapped.
										</p>
									) : (
										<div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
											{control.paragraphs.map((p) => (
												<MappedParagraphCard key={p.id} p={p} />
											))}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
						<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
							<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
								{editingControlId ? "Edit Control" : "Add New Control"}
							</h2>
							<button
								type="button"
								onClick={closeModal}
								className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
							>
								<XIcon size={24} />
							</button>
						</div>

						<div className="p-6 overflow-y-auto flex-1">
							<form
								id="control-form"
								onSubmit={handleSubmit}
								className="space-y-6"
							>
								<div>
									<label
										htmlFor="control-title"
										className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
									>
										Control Title / ID
									</label>
									<input
										id="control-title"
										required
										type="text"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
										className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
										placeholder="e.g. CTRL-01 or Password Policy"
									/>
								</div>
								<div>
									<label
										htmlFor="control-statement"
										className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
									>
										Statement
									</label>
									<textarea
										id="control-statement"
										required
										rows={3}
										value={newStatement}
										onChange={(e) => setNewStatement(e.target.value)}
										className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-y"
										placeholder="Describe exactly what needs to be implemented..."
									/>
								</div>
								<div>
									<label
										htmlFor="control-guidance"
										className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
									>
										Implementation Guidance <span className="text-zinc-500 font-normal">(Optional)</span>
									</label>
									<textarea
										id="control-guidance"
										rows={3}
										value={newGuidance}
										onChange={(e) => setNewGuidance(e.target.value)}
										className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-y"
										placeholder="Additional details on how to implement the control..."
									/>
								</div>

								<div>
									<div className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
										Map to Paragraphs
									</div>
									<p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
										Select the paragraphs that this control fulfills.
									</p>
									<div className="space-y-6 max-h-72 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50 dark:bg-zinc-950/50">
										{docsWithParagraphs.length === 0 && (
											<p className="text-sm text-zinc-500 italic">
												No documents available.
											</p>
										)}
										{docsWithParagraphs.map((doc) => (
											<div key={doc.id} className="space-y-4">
												<div className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-1">
													{doc.title}
												</div>
												{doc.sections.map((sec) => (
													<div key={sec.id} className="pt-2">
														<div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider flex items-start">
															{sec.marker && (
																<span className="inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-600 dark:text-zinc-400 mr-2 border border-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0 mt-0.5">
																	{sec.marker}
																</span>
															)}
															<span className="leading-relaxed">
																{sec.title}
															</span>
														</div>
														<div className="pl-3 space-y-2">
															{sec.paragraphs.map((p) => (
																<label
																	key={p.id}
																	className="flex items-start gap-3 cursor-pointer group p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
																>
																	<input
																		type="checkbox"
																		checked={selectedParagraphs.includes(p.id)}
																		onChange={() => toggleParagraph(p.id)}
																		className="mt-1 shrink-0 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
																	/>
																	<span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 leading-relaxed flex items-start">
																		{p.marker && (
																			<span className="inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-400 mr-2 border border-zinc-300 dark:border-zinc-700 mt-0.5 shrink-0 whitespace-nowrap">
																				{p.marker}
																			</span>
																		)}
																		<span>{p.text}</span>
																	</span>
																</label>
															))}
														</div>
													</div>
												))}
											</div>
										))}
									</div>
								</div>
							</form>
						</div>

						<div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3">
							<button
								type="button"
								onClick={closeModal}
								className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								form="control-form"
								disabled={isSubmitting}
								className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
							>
								{isSubmitting
									? "Saving..."
									: editingControlId
										? "Save Changes"
										: "Create Control"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
