"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/app/components/PageLayout";
import { getParagraphsForSelection } from "@/app/controls/actions";
import type { Prisma } from "../../generated/prisma/client";
import { toggleFewShotExample } from "./actions";

type DocumentWithParagraphs = Prisma.DocumentGetPayload<{
	include: {
		sections: {
			include: {
				paragraphs: true;
			};
		};
	};
}>;

export default function SettingsPage() {
	const [docsWithParagraphs, setDocsWithParagraphs] = useState<
		DocumentWithParagraphs[]
	>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const init = async () => {
			const res = await getParagraphsForSelection();
			if (!active) return;
			if (res.success && res.documents) {
				setDocsWithParagraphs(res.documents);
			}
			setLoading(false);
		};
		init();
		return () => {
			active = false;
		};
	}, []);

	const handleToggle = async (paragraphId: number, currentValue: boolean) => {
		const newValue = !currentValue;

		const updateParagraphState = (value: boolean) => {
			setDocsWithParagraphs((prevDocs) =>
				prevDocs.map((doc) => ({
					...doc,
					sections: doc.sections.map((sec) => ({
						...sec,
						paragraphs: sec.paragraphs.map((p) =>
							p.id === paragraphId ? { ...p, isFewShotExample: value } : p,
						),
					})),
				})),
			);
		};

		updateParagraphState(newValue);

		const res = await toggleFewShotExample(paragraphId, newValue);
		if (!res.success) {
			updateParagraphState(currentValue);
			console.error("Failed to toggle setting:", res.error);
		}
	};

	return (
		<PageLayout
			title="Settings"
			description="Configure application-wide settings, such as Few-Shot examples for the control generation."
		>
			<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
				<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
					<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
						Few-Shot Prompting Examples
					</h2>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
						Select the paragraphs that should be used as reference examples when
						generating new controls. Their mapped Technical Controls will be
						shown to the LLM. These paragraphs will be excluded from the
						benchmark.
					</p>
				</div>

				<div className="p-6 overflow-y-auto flex-1">
					{loading ? (
						<div className="flex justify-center items-center h-32">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						</div>
					) : docsWithParagraphs.length === 0 ? (
						<p className="text-sm text-zinc-500 italic text-center py-8">
							No documents available.
						</p>
					) : (
						<div className="space-y-8">
							{docsWithParagraphs.map((doc) => (
								<div key={doc.id} className="space-y-4">
									<div className="font-bold text-lg text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
										{doc.title}
									</div>
									{doc.sections.map((sec) => (
										<div key={sec.id} className="pt-2 pl-4">
											<div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider flex items-start">
												{sec.marker && (
													<span className="inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400 mr-2 border border-zinc-300 dark:border-zinc-700 whitespace-nowrap shrink-0 mt-0.5">
														{sec.marker}
													</span>
												)}
												<span className="leading-relaxed">{sec.title}</span>
											</div>
											<div className="pl-4 space-y-2">
												{sec.paragraphs.map((p) => (
													<label
														key={p.id}
														className="flex items-start gap-3 cursor-pointer group p-3 -ml-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
													>
														<input
															type="checkbox"
															checked={p.isFewShotExample || false}
															onChange={() =>
																handleToggle(p.id, p.isFewShotExample || false)
															}
															className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 transition-colors shrink-0 cursor-pointer"
														/>
														<div>
															<div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
																{p.marker && (
																	<span className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-mono mr-2 border border-blue-200 dark:border-blue-800">
																		{p.marker}
																	</span>
																)}
																{p.text}
															</div>
														</div>
													</label>
												))}
											</div>
										</div>
									))}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</PageLayout>
	);
}
