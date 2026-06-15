"use client";

import { CheckIcon } from "lucide-animated";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileUploadArea } from "../../components/FileUploadArea";
import { getDocuments } from "../../documents/actions";
import { importGuidelineYaml } from "./actions";

export default function ImportGuidelinePage() {
	const [files, setFiles] = useState<File[]>([]);
	const [processingState, setProcessingState] = useState<
		null | "parsing" | "mapping" | "saving"
	>(null);
	const [error, setError] = useState<string | null>(null);

	type ImportResult = {
		success: boolean;
		guidelineId?: string;
		totalCount?: number;
		mappedCount?: number;
		unmappedCount?: number;
		error?: string;
	};
	const [result, setResult] = useState<ImportResult | null>(null);
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

	const handleImport = async () => {
		if (files.length === 0) {
			setError("Please select at least one .yml file first.");
			return;
		}

		if (!selectedDocumentId) {
			setError("Please select a target document.");
			return;
		}

		setError(null);
		setProcessingState("mapping");
		setResult(null);

		let totalCount = 0;
		let mappedCount = 0;
		let unmappedCount = 0;
		let hasError = false;

		for (const file of files) {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("documentId", selectedDocumentId);

			try {
				const importResult = await importGuidelineYaml(formData);

				if (!importResult.success) {
					setError(importResult.error || `Failed to import ${file.name}.`);
					hasError = true;
					break;
				}

				totalCount += importResult.totalCount || 0;
				mappedCount += importResult.mappedCount || 0;
				unmappedCount += importResult.unmappedCount || 0;
			} catch (err) {
				console.error(err);
				setError(`An unexpected error occurred while importing ${file.name}.`);
				hasError = true;
				break;
			}
		}

		setProcessingState(null);

		if (!hasError) {
			setResult({
				success: true,
				totalCount,
				mappedCount,
				unmappedCount,
			});
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
						<label
							htmlFor="document-select"
							className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
						>
							Target Document
						</label>
						<select
							id="document-select"
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
							The guideline&apos;s paragraphs will only be matched against the
							selected document.
						</p>
					</div>

					<FileUploadArea
						files={files}
						setFiles={setFiles}
						setError={setError}
						handleImport={handleImport}
						isProcessing={!!processingState}
						isDisabled={!!processingState || files.length === 0 || !selectedDocumentId}
						accept=".yml,.yaml"
						multiple={true}
						dropText="Drop .yml to Attach, or browse"
						buttonText="Import Guideline"
						processingText="Importing..."
					/>
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
