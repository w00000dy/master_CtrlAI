"use client";

import { CheckIcon, type CheckIconHandle, LoaderIcon } from "lucide-animated";
import React, { useState } from "react";
import { PageLayout } from "@/app/components/PageLayout";
import { FileUploadArea } from "../../components/FileUploadArea";
import { useModel } from "../../components/ModelContext";
import { ParagraphRenderer } from "../../components/ParagraphRenderer";
import { SectionHeader } from "../../components/SectionHeader";
import { saveDocument } from "../actions";
import {
	extractPdfText,
	type Paragraph,
	type ParsedDocument,
	structureTextWithLlm,
} from "./parsePdf";

function AnimatedCheckIcon() {
	const iconRef = React.useRef<CheckIconHandle | null>(null);
	React.useEffect(() => {
		iconRef.current?.startAnimation();
	}, []);
	return <CheckIcon ref={iconRef} animateOnHover={false} size={20} />;
}

function AnimatedLoaderIcon() {
	return (
		<LoaderIcon
			animateOnHover={false}
			size={20}
			className="animate-spin text-blue-500"
		/>
	);
}

export default function ImportPage() {
	const { selectedModel } = useModel();
	const [files, setFiles] = useState<File[]>([]);
	const [processingState, setProcessingState] = useState<
		null | "extracting" | "structuring"
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [parsedData, setParsedData] = useState<ParsedDocument | null>(null);
	const [rawText, setRawText] = useState<string | null>(null);
	const [rawJson, setRawJson] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);

	const handleImport = async () => {
		if (files.length === 0) {
			setError("Please select a PDF file first.");
			return;
		}

		const file = files[0];

		if (!selectedModel) {
			setError(
				"Please wait for models to load or select a model in the header.",
			);
			return;
		}

		setProcessingState("extracting");
		setError(null);
		setRawText(null);
		setRawJson(null);
		setParsedData(null);
		setSaveSuccess(false);

		const formData = new FormData();
		formData.append("file", file);

		try {
			const extractedText = await extractPdfText(formData);
			setRawText(extractedText);

			setProcessingState("structuring");
			const structureResult = await structureTextWithLlm(
				extractedText,
				selectedModel,
			);

			setParsedData(structureResult.data);
			setRawJson(structureResult.rawJson || null);
		} catch (err: unknown) {
			console.error(err);
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred.";
			setError(message);
		} finally {
			setProcessingState(null);
		}
	};

	return (
		<PageLayout
			title="Import Legal Document"
			description={`Upload a PDF to extract and structure its paragraphs and guidelines using ${selectedModel || "the selected LLM"}.`}
			maxWidth="max-w-4xl"
		>
			{/* Upload Section */}
			<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
				<FileUploadArea
					files={files}
					setFiles={setFiles}
					setError={setError}
					handleImport={handleImport}
					isProcessing={!!processingState}
					isDisabled={!!processingState || files.length === 0}
					accept="application/pdf"
					dropText="Drop PDF to Attach, or browse"
					buttonText="Import PDF"
					processingText={
						processingState === "extracting"
							? "Extracting Text..."
							: "Structuring..."
					}
				/>
				{error && (
					<p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
				)}
			</div>

			{/* Steps Section */}
			{(processingState || rawText || rawJson) && (
				<div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
					<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
						Processing Steps
					</h2>

					{/* Step 1: PDF Extraction */}
					<details className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
						<summary className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
							{processingState === "extracting" ? (
								<AnimatedLoaderIcon />
							) : rawText ? (
								<div className="text-green-500">
									<AnimatedCheckIcon />
								</div>
							) : (
								<div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />
							)}
							Step 1: Extracting Raw Text from PDF
						</summary>
						{rawText && (
							<div className="p-6">
								<pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
									{rawText}
								</pre>
							</div>
						)}
					</details>

					{/* Step 2: LLM Structuring */}
					<details className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
						<summary className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
							{processingState === "structuring" ? (
								<AnimatedLoaderIcon />
							) : rawJson ? (
								<div className="text-green-500">
									<AnimatedCheckIcon />
								</div>
							) : (
								<div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />
							)}
							Step 2: Structuring Document with LLM
						</summary>
						{rawJson && (
							<div className="p-6">
								<pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
									{rawJson}
								</pre>
							</div>
						)}
					</details>
				</div>
			)}

			{/* Results Section */}
			{parsedData && (
				<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
					<div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
						<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
							Final Result: {parsedData.title || "Extracted Document"}
						</h2>
						<button
							type="button"
							onClick={async () => {
								setIsSaving(true);
								const result = await saveDocument(parsedData);
								setIsSaving(false);
								if (result?.id) {
									setSaveSuccess(true);
								}
							}}
							disabled={isSaving || saveSuccess}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isSaving
								? "Saving..."
								: saveSuccess
									? "Saved ✓"
									: "Save Document"}
						</button>
					</div>

					<div className="space-y-6">
						{parsedData.sections?.map((section) => (
							<div
								key={section.title}
								className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm"
							>
								<div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
									<SectionHeader
										marker={section.marker}
										title={section.title}
										size="normal"
									/>
								</div>
								<div className="p-6 space-y-6">
									{section.paragraphs && section.paragraphs.length > 0 && (
										<div className="space-y-6">
											{(() => {
												const renderTree = (
													paragraphs: Paragraph[],
													pathPrefix = "",
													depth = 0,
												): React.ReactNode[] =>
													paragraphs.flatMap((p, pIdx) => {
														const currentPath = pathPrefix
															? `${pathPrefix}-${pIdx}`
															: `${pIdx}`;
														return [
															<ParagraphRenderer
																key={currentPath}
																paragraph={
																	p as unknown as import("../../components/ParagraphRenderer").ParagraphWithControls
																}
																depth={depth}
															/>,
															...(p.subParagraphs
																? renderTree(
																		p.subParagraphs,
																		currentPath,
																		depth + 1,
																	)
																: []),
														];
													});
												return renderTree(section.paragraphs);
											})()}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</PageLayout>
	);
}
