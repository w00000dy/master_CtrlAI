"use client";

import { CopyIcon, XIcon } from "lucide-animated";
import type React from "react";
import { useEffect, useState } from "react";
import { PageLayout } from "@/app/components/PageLayout";
import type { Prisma } from "../../generated/prisma/client";
import { ControlCard, type ControlData } from "../components/ControlCard";
import {
	createControl,
	deleteAllControls,
	deleteControl,
	deleteControls,
	getControls,
	getParagraphsForSelection,
	updateControl,
} from "./actions";

type DocumentWithParagraphs = Prisma.DocumentGetPayload<{
	include: {
		sections: {
			include: {
				paragraphs: true;
			};
		};
	};
}>;

export default function ControlsPage() {
	const [controls, setControls] = useState<ControlData[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
	const [activeDuplicateTab, setActiveDuplicateTab] = useState<
		"title" | "statement" | "guidance" | "titleStatement" | "full"
	>("title");
	const [docsWithParagraphs, setDocsWithParagraphs] = useState<
		DocumentWithParagraphs[]
	>([]);

	const [filterMapping, setFilterMapping] = useState<
		"all" | "mapped" | "unmapped"
	>("all");
	const [filterOrigin, setFilterOrigin] = useState<"all" | "guideline" | "llm">(
		"all",
	);

	const [newTitle, setNewTitle] = useState("");
	const [newStatement, setNewStatement] = useState("");
	const [newGuidance, setNewGuidance] = useState("");
	const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingControlId, setEditingControlId] = useState<number | null>(null);

	const fetchControls = async () => {
		setLoading(true);
		const data = await getControls();
		setControls(data as unknown as ControlData[]);
		setLoading(false);
	};

	useEffect(() => {
		let active = true;
		const init = async () => {
			const data = await getControls();
			if (!active) return;
			setControls(data as unknown as ControlData[]);
			setLoading(false);
		};
		init();
		return () => {
			active = false;
		};
	}, []);

	const openModal = async () => {
		setIsModalOpen(true);
		const docs = await getParagraphsForSelection();
		setDocsWithParagraphs(docs);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setNewTitle("");
		setNewStatement("");
		setNewGuidance("");
		setSelectedParagraphs([]);
		setEditingControlId(null);
	};

	const openEditModal = async (control: ControlData) => {
		setNewTitle(control.title);
		setNewStatement(control.statement);
		setNewGuidance(control.implementationGuidance || "");
		setSelectedParagraphs(control.paragraphs.map((p) => p.id));
		setEditingControlId(control.id);
		setIsModalOpen(true);

		if (docsWithParagraphs.length === 0) {
			const docs = await getParagraphsForSelection();
			setDocsWithParagraphs(docs);
		}
	};

	const handleDeleteControl = async (id: number) => {
		if (!window.confirm("Are you sure you want to delete this control?"))
			return;
		await deleteControl(id);
		fetchControls();
	};

	const handleDeleteAllControls = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete ALL controls? This action cannot be undone.",
			)
		)
			return;

		await deleteAllControls();
		fetchControls();
	};

	const toggleParagraph = (id: number) => {
		setSelectedParagraphs((prev) =>
			prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTitle || !newStatement) return;

		setIsSubmitting(true);
		if (editingControlId) {
			await updateControl(editingControlId, {
				title: newTitle,
				statement: newStatement,
				implementationGuidance: newGuidance,
				paragraphIds: selectedParagraphs,
			});
		} else {
			await createControl({
				title: newTitle,
				statement: newStatement,
				implementationGuidance: newGuidance,
				paragraphIds: selectedParagraphs,
			});
		}
		setIsSubmitting(false);
		closeModal();
		fetchControls();
	};

	const filteredControls = controls.filter((control) => {
		const isMapped = control.paragraphs && control.paragraphs.length > 0;

		if (filterMapping === "mapped" && !isMapped) return false;
		if (filterMapping === "unmapped" && isMapped) return false;

		if (filterOrigin === "guideline" && !control.guidelineId) return false;
		if (filterOrigin === "llm" && control.guidelineId) return false;

		return true;
	});

	const handleDeleteFilteredControls = async () => {
		if (
			!window.confirm(
				`Are you sure you want to delete ${filteredControls.length} controls? This action cannot be undone.`,
			)
		)
			return;
		const ids = filteredControls.map((c) => c.id);
		await deleteControls(ids);
		fetchControls();
	};

	const getDuplicateStats = () => {
		const normalize = (str: string | null | undefined) =>
			(str || "").trim().toLowerCase();

		// 1. Same Title
		const titleMap = new Map<string, ControlData[]>();
		for (const c of controls) {
			const key = normalize(c.title);
			if (!key) continue;
			let group = titleMap.get(key);
			if (!group) {
				group = [];
				titleMap.set(key, group);
			}
			group.push(c);
		}

		const sameTitleGroups: { title: string; controls: ControlData[] }[] = [];
		let sameTitleCount = 0;
		for (const group of titleMap.values()) {
			if (group.length > 1) {
				sameTitleCount += group.length;
				sameTitleGroups.push({
					title: group[0].title,
					controls: group,
				});
			}
		}

		// 2. Same Statement
		const statementMap = new Map<string, ControlData[]>();
		for (const c of controls) {
			const key = normalize(c.statement);
			if (!key) continue;
			let group = statementMap.get(key);
			if (!group) {
				group = [];
				statementMap.set(key, group);
			}
			group.push(c);
		}

		const sameStatementGroups: { title: string; controls: ControlData[] }[] =
			[];
		let sameStatementCount = 0;
		for (const group of statementMap.values()) {
			if (group.length > 1) {
				sameStatementCount += group.length;
				sameStatementGroups.push({
					title: group[0].statement,
					controls: group,
				});
			}
		}

		// 3. Same Implementation Guidance
		const guidanceMap = new Map<string, ControlData[]>();
		for (const c of controls) {
			const key = normalize(c.implementationGuidance);
			if (!key) continue;
			let group = guidanceMap.get(key);
			if (!group) {
				group = [];
				guidanceMap.set(key, group);
			}
			group.push(c);
		}

		const sameGuidanceGroups: { title: string; controls: ControlData[] }[] = [];
		let sameGuidanceCount = 0;
		for (const group of guidanceMap.values()) {
			if (group.length > 1) {
				sameGuidanceCount += group.length;
				sameGuidanceGroups.push({
					title: group[0].implementationGuidance || "",
					controls: group,
				});
			}
		}

		// 4. Same Title & Statement
		const titleStatementMap = new Map<string, ControlData[]>();
		for (const c of controls) {
			const key = `${normalize(c.title)}|||${normalize(c.statement)}`;
			let group = titleStatementMap.get(key);
			if (!group) {
				group = [];
				titleStatementMap.set(key, group);
			}
			group.push(c);
		}

		const sameTitleStatementGroups: {
			title: string;
			controls: ControlData[];
		}[] = [];
		let sameTitleStatementCount = 0;
		for (const group of titleStatementMap.values()) {
			if (group.length > 1) {
				sameTitleStatementCount += group.length;
				sameTitleStatementGroups.push({
					title: group[0].title,
					controls: group,
				});
			}
		}

		// 5. Title, Statement & Guidance (All 3 fields)
		const fullMap = new Map<string, ControlData[]>();
		for (const c of controls) {
			const key = `${normalize(c.title)}|||${normalize(c.statement)}|||${normalize(c.implementationGuidance)}`;
			let group = fullMap.get(key);
			if (!group) {
				group = [];
				fullMap.set(key, group);
			}
			group.push(c);
		}

		const sameFullGroups: { title: string; controls: ControlData[] }[] = [];
		let sameFullCount = 0;
		for (const group of fullMap.values()) {
			if (group.length > 1) {
				sameFullCount += group.length;
				sameFullGroups.push({
					title: group[0].title,
					controls: group,
				});
			}
		}

		return {
			sameTitleCount,
			sameTitleGroupsCount: sameTitleGroups.length,
			sameTitleGroups,

			sameStatementCount,
			sameStatementGroupsCount: sameStatementGroups.length,
			sameStatementGroups,

			sameGuidanceCount,
			sameGuidanceGroupsCount: sameGuidanceGroups.length,
			sameGuidanceGroups,

			sameTitleStatementCount,
			sameTitleStatementGroupsCount: sameTitleStatementGroups.length,
			sameTitleStatementGroups,

			sameFullCount,
			sameFullGroupsCount: sameFullGroups.length,
			sameFullGroups,
		};
	};

	return (
		<PageLayout
			title={
				<>
					Controls
					{!loading && (
						<span className="text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
							{filteredControls.length}{" "}
							{controls.length !== filteredControls.length
								? `of ${controls.length}`
								: ""}
						</span>
					)}
				</>
			}
			description="Manage implementation instructions and map them to paragraphs."
			maxWidth="max-w-6xl"
			actions={
				<>
					{controls.length !== filteredControls.length &&
						filteredControls.length > 0 && (
							<button
								type="button"
								onClick={handleDeleteFilteredControls}
								className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors shadow-sm"
							>
								Delete Filtered
							</button>
						)}
					<button
						type="button"
						onClick={handleDeleteAllControls}
						className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
					>
						Delete All Controls
					</button>
					<button
						type="button"
						onClick={() => setIsDuplicatesModalOpen(true)}
						className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
					>
						<CopyIcon size={18} />
						Check Duplicates
					</button>
					<button
						type="button"
						onClick={openModal}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
					>
						Add Control
					</button>
				</>
			}
		>
			<div className="flex gap-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
				<div className="flex flex-col gap-2">
					<label
						htmlFor="filter-mapping"
						className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
					>
						Mapping Status
					</label>
					<select
						id="filter-mapping"
						value={filterMapping}
						onChange={(e) =>
							setFilterMapping(e.target.value as "all" | "mapped" | "unmapped")
						}
						className="text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-w-[150px]"
					>
						<option value="all">All Controls</option>
						<option value="mapped">Mapped Only</option>
						<option value="unmapped">Unmapped Only</option>
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<label
						htmlFor="filter-origin"
						className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
					>
						Origin
					</label>
					<select
						id="filter-origin"
						value={filterOrigin}
						onChange={(e) =>
							setFilterOrigin(e.target.value as "all" | "guideline" | "llm")
						}
						className="text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-w-[150px]"
					>
						<option value="all">All Origins</option>
						<option value="guideline">Guideline Only</option>
						<option value="llm">LLM Generated Only</option>
					</select>
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
			) : filteredControls.length === 0 ? (
				<div className="text-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
					<p className="text-zinc-500 dark:text-zinc-400 text-lg">
						No controls match your filters.
					</p>
					<button
						type="button"
						onClick={() => {
							setFilterMapping("all");
							setFilterOrigin("all");
						}}
						className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline transition-colors"
					>
						Clear filters
					</button>
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-2">
					{filteredControls.map((control) => (
						<ControlCard
							key={control.id}
							control={control}
							onEdit={openEditModal}
							onDelete={handleDeleteControl}
						/>
					))}
				</div>
			)}

			{isDuplicatesModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
					<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
						<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
							<div>
								<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
									<CopyIcon
										className="text-purple-600 dark:text-purple-400"
										size={22}
									/>
									Duplicate Check
								</h2>
								<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
									Overview of duplicate controls in the database. Select a card
									to view matching groups.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsDuplicatesModalOpen(false)}
								className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
							>
								<XIcon size={24} />
							</button>
						</div>

						<div className="p-6 overflow-y-auto flex-1 space-y-6">
							{(() => {
								const stats = getDuplicateStats();

								const tabCards = [
									{
										id: "title" as const,
										label: "Same Title",
										count: stats.sameTitleCount,
										groupsCount: stats.sameTitleGroupsCount,
										desc: "Identical title",
										groups: stats.sameTitleGroups,
										activeClass:
											"ring-2 ring-purple-500 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40",
										inactiveClass:
											"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
										badgeColor:
											"text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40",
									},
									{
										id: "statement" as const,
										label: "Same Statement",
										count: stats.sameStatementCount,
										groupsCount: stats.sameStatementGroupsCount,
										desc: "Identical statement alone",
										groups: stats.sameStatementGroups,
										activeClass:
											"ring-2 ring-emerald-500 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40",
										inactiveClass:
											"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
										badgeColor:
											"text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40",
									},
									{
										id: "guidance" as const,
										label: "Same Guidance",
										count: stats.sameGuidanceCount,
										groupsCount: stats.sameGuidanceGroupsCount,
										desc: "Identical guidance alone",
										groups: stats.sameGuidanceGroups,
										activeClass:
											"ring-2 ring-teal-500 border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40",
										inactiveClass:
											"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-teal-50/50 dark:hover:bg-teal-950/20",
										badgeColor:
											"text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/40",
									},
									{
										id: "titleStatement" as const,
										label: "Title & Statement",
										count: stats.sameTitleStatementCount,
										groupsCount: stats.sameTitleStatementGroupsCount,
										desc: "Identical title & statement",
										groups: stats.sameTitleStatementGroups,
										activeClass:
											"ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40",
										inactiveClass:
											"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
										badgeColor:
											"text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40",
									},
									{
										id: "full" as const,
										label: "All 3 Fields",
										count: stats.sameFullCount,
										groupsCount: stats.sameFullGroupsCount,
										desc: "Title, statement & guidance",
										groups: stats.sameFullGroups,
										activeClass:
											"ring-2 ring-amber-500 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40",
										inactiveClass:
											"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
										badgeColor:
											"text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40",
									},
								];

								const activeCard =
									tabCards.find((c) => c.id === activeDuplicateTab) ||
									tabCards[0];

								return (
									<>
										<div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
											{tabCards.map((card) => {
												const isActive = card.id === activeDuplicateTab;
												return (
													<button
														key={card.id}
														type="button"
														onClick={() => setActiveDuplicateTab(card.id)}
														className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
															isActive ? card.activeClass : card.inactiveClass
														}`}
													>
														<div>
															<span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
																{card.label}
															</span>
															<div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
																{card.count}
															</div>
															<p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
																{card.desc}
															</p>
														</div>
														<div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
															{card.groupsCount > 0
																? `${card.groupsCount} Group${card.groupsCount > 1 ? "s" : ""}`
																: "No duplicates"}
														</div>
													</button>
												);
											})}
										</div>

										{activeCard.groups.length > 0 ? (
											<div className="space-y-4 pt-2">
												<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center justify-between">
													<span>
														Duplicate Groups: {activeCard.label} (
														{activeCard.groups.length})
													</span>
												</h3>
												<div className="space-y-4 max-h-72 overflow-y-auto pr-1">
													{activeCard.groups.map((group) => (
														<div
															key={`group-${activeDuplicateTab}-${group.controls.map((c) => c.id).join("-")}`}
															className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800"
														>
															<div className="flex justify-between items-start mb-2 gap-4">
																<span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm line-clamp-3">
																	{group.title}
																</span>
																<span
																	className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${activeCard.badgeColor}`}
																>
																	{group.controls.length} Controls
																</span>
															</div>
															<div className="space-y-4 mt-3">
																{group.controls.map((ctrl) => (
																	<ControlCard
																		key={ctrl.id}
																		control={ctrl}
																		onEdit={openEditModal}
																		onDelete={handleDeleteControl}
																	/>
																))}
															</div>
														</div>
													))}
												</div>
											</div>
										) : (
											<div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
												No duplicate controls found for &quot;
												{activeCard.label}&quot;.
											</div>
										)}
									</>
								);
							})()}
						</div>

						<div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
							<button
								type="button"
								onClick={() => setIsDuplicatesModalOpen(false)}
								className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors shadow-sm"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

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
										Implementation Guidance{" "}
										<span className="text-zinc-500 font-normal">
											(Optional)
										</span>
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
		</PageLayout>
	);
}
