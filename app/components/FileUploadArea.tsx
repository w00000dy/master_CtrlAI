"use client";

import { CloudUploadIcon, LoaderIcon } from "lucide-animated";
import {
	type ChangeEvent,
	type DragEvent,
	type ReactNode,
	useState,
} from "react";

interface FileUploadAreaProps {
	files: File[];
	setFiles: (files: File[]) => void;
	setError: (error: string | null) => void;
	handleImport: () => void;
	isProcessing: boolean;
	isDisabled: boolean;
	accept: string;
	dropText: string;
	buttonText: ReactNode;
	processingText: ReactNode;
	multiple?: boolean;
}

export function FileUploadArea({
	files,
	setFiles,
	setError,
	handleImport,
	isProcessing,
	isDisabled,
	accept,
	dropText,
	buttonText,
	processingText,
	multiple = false,
}: FileUploadAreaProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleFiles = (newFiles: File[]) => {
		if (newFiles.length > 0) {
			setFiles(multiple ? newFiles : [newFiles[0]]);
			setError(null);
		}
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			handleFiles(Array.from(e.target.files));
		}
	};

	const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files) {
			handleFiles(Array.from(e.dataTransfer.files));
		}
	};

	return (
		<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
			<div className="flex-1 w-full">
				<label
					htmlFor="file-upload"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`flex flex-col justify-center w-full min-h-[8rem] h-auto p-4 transition bg-white dark:bg-zinc-900 border-2 border-dashed rounded-md appearance-none cursor-pointer focus:outline-none ${
						isDragging
							? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
							: "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
					}`}
				>
					<span className="flex items-center justify-center space-x-2">
						<CloudUploadIcon
							className="text-zinc-600 dark:text-zinc-400"
							size={24}
						/>
						<span className="font-medium text-zinc-600 dark:text-zinc-400">
							{files.length > 0 ? `${files.length} file(s) selected` : dropText}
						</span>
					</span>
					{files.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-2 justify-center">
							{files.map((f) => (
								<span
									key={`${f.name}-${f.size}-${f.lastModified}`}
									className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate"
								>
									{f.name}
								</span>
							))}
						</div>
					)}
					<input
						type="file"
						id="file-upload"
						name="file_upload"
						accept={accept}
						multiple={multiple}
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
