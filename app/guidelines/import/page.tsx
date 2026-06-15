"use client";

import { CheckIcon, CloudUploadIcon, LoaderIcon } from "lucide-animated";
import React, { useEffect, useState } from "react";
import { importGuidelineYaml } from "./actions";
import { getDocuments } from "../../documents/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImportGuidelinePage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [processingState, setProcessingState] = useState<
		null | "parsing" | "mapping" | "saving"
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<any>(null);
	const [documents, setDocuments] = useState<{ id: string; title: string }[]>(
		[],
	);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

	useEffect(() => {
		const loadDocuments = async () => {
			const res = await getDocuments();
			if (res.success && res.documents) {
				setDocuments(res.documents);
			}
		};
		loadDocuments();
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setFile(e.target.files[0]);
			setError(null);
		}
	};

	const handleImport = async () => {
		if (!file) {
			setError("Please select a .yml file first.");
			return;
		}

		if (!selectedDocumentId) {
			setError("Please select a document to associate with this guideline.");
			return;
		}

		setProcessingState("parsing");
		setError(null);
		setResult(null);

		const formData = new FormData();
		formData.append("file", file);
		formData.append("documentId", selectedDocumentId);

		try {
			// Actually the action does parsing, mapping, and saving in one go.
			setProcessingState("mapping");
			const importResult = await importGuidelineYaml(formData);

			if (!importResult.success) {
				setError(importResult.error || "Failed to import guideline.");
				setProcessingState(null);
				return;
			}

			setResult(importResult);
		} catch (err) {
			console.error(err);
			setError("An unexpected error occurred.");
		} finally {
			setProcessingState(null);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
			<div className="max-w-4xl mx-auto space-y-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
						Import Technical Guideline
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">
						Upload a .yml file (e.g. from BSI TR-03183-1) to import controls and
						automatically map them to paragraphs.
					</p>
				</div>

				<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
					{/* Document Selection */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
							Target Document
						</label>
						<select
							value={selectedDocumentId}
							onChange={(e) => setSelectedDocumentId(e.target.value)}
							className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
						>
							<option value="">-- Select a Document --</option>
							{documents.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.title}
								</option>
							))}
						</select>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">
							The guideline's paragraphs will only be matched against the
							selected document.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-2">
						<div className="flex-1 w-full">
							<label
								htmlFor="file-upload"
								className="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-md appearance-none cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 focus:outline-none"
							>
								<span className="flex items-center space-x-2">
									<CloudUploadIcon
										className="text-zinc-600 dark:text-zinc-400"
										size={24}
									/>
									<span className="font-medium text-zinc-600 dark:text-zinc-400">
										{file ? file.name : "Drop .yml to Attach, or browse"}
									</span>
								</span>
								<input
									type="file"
									id="file-upload"
									name="file_upload"
									accept=".yml,.yaml"
									className="hidden"
									onChange={handleFileChange}
								/>
							</label>
						</div>

						<button
							type="button"
							onClick={handleImport}
							disabled={!!processingState || !file || !selectedDocumentId}
							className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{processingState ? (
								<>
									<LoaderIcon
										className="animate-spin -ml-1 mr-2 text-current"
										size={20}
									/>
									Importing...
								</>
							) : (
								"Import Guideline"
							)}
						</button>
					</div>
					{error && (
						<p className="mt-4 text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					)}
				</div>

				{result && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
						<div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-xl p-8 shadow-sm flex flex-col items-center text-center space-y-4">
							<div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
								<CheckIcon size={32} />
							</div>
							<h2 className="text-2xl font-bold text-green-800 dark:text-green-400">
								Import Successful!
							</h2>
							<p className="text-green-700 dark:text-green-500 max-w-lg">
								Successfully imported {result.totalCount} controls.{" "}
								{result.mappedCount} were automatically mapped to paragraphs,
								and {result.unmappedCount} remain unmapped.
							</p>
							<div className="pt-4 flex gap-4">
								<Link
									href={`/guidelines/${result.guidelineId}`}
									className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
								>
									View Guideline
								</Link>
								<Link
									href="/guidelines"
									className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors shadow-sm"
								>
									Back to Guidelines
								</Link>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
