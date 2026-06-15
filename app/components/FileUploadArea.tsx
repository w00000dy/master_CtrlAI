"use client";

import { CloudUploadIcon, LoaderIcon } from "lucide-animated";
import type { ChangeEvent, ReactNode } from "react";

interface FileUploadAreaProps {
	file: File | null;
	setFile: (file: File | null) => void;
	setError: (error: string | null) => void;
	handleImport: () => void;
	isProcessing: boolean;
	isDisabled: boolean;
	accept: string;
	dropText: string;
	buttonText: ReactNode;
	processingText: ReactNode;
}

export function FileUploadArea({
	file,
	setFile,
	setError,
	handleImport,
	isProcessing,
	isDisabled,
	accept,
	dropText,
	buttonText,
	processingText,
}: FileUploadAreaProps) {
	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setFile(e.target.files[0]);
			setError(null);
		}
	};

	return (
		<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
							{file ? file.name : dropText}
						</span>
					</span>
					<input
						type="file"
						id="file-upload"
						name="file_upload"
						accept={accept}
						className="hidden"
						onChange={handleFileChange}
					/>
				</label>
			</div>

			<button
				type="button"
				onClick={handleImport}
				disabled={isDisabled}
				className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{isProcessing ? (
					<>
						<LoaderIcon
							className="animate-spin -ml-1 mr-2 text-current"
							size={20}
						/>
						{processingText}
					</>
				) : (
					buttonText
				)}
			</button>
		</div>
	);
}
