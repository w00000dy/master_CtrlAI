"use client";

import type React from "react";
import { useState } from "react";
import { generateChatResponse } from "../actions";
import { useModel } from "../components/ModelContext";

const MessageBubble = ({
	sender,
	content,
}: {
	sender: string;
	content: string;
}) => {
	const isUser = sender === "user";
	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
					isUser
						? "bg-blue-600 text-white rounded-br-sm"
						: "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm border border-zinc-200 dark:border-zinc-700"
				}`}
			>
				{content}
			</div>
		</div>
	);
};

export default function ChatPage() {
	const [messages, setMessages] = useState([
		{ role: "bot", content: "Hello! How can I help you today?" },
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { selectedModel } = useModel();

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const newMessages = [...messages, { role: "user", content: input.trim() }];
		setMessages(newMessages);
		setInput("");
		setIsLoading(true);

		try {
			const { success, message, error } = await generateChatResponse(
				newMessages,
				selectedModel,
			);
			setMessages((prev) => [
				...prev,
				{
					role: "bot",
					content: success ? (message as string) : `Error: ${error}`,
				},
			]);
		} catch {
			setMessages((prev) => [
				...prev,
				{ role: "bot", content: "An unexpected error occurred." },
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col flex-1 overflow-hidden">
			<main className="flex-1 overflow-y-auto p-4 w-full max-w-3xl mx-auto flex flex-col gap-4">
				{messages.map((msg, idx) => (
					<MessageBubble key={idx} sender={msg.role} content={msg.content} />
				))}
				{isLoading && <MessageBubble sender="bot" content="..." />}
			</main>

			<footer className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0 mt-auto">
				<form
					onSubmit={handleSend}
					className="max-w-3xl mx-auto flex gap-2 relative"
				>
					<input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={isLoading || !selectedModel}
						placeholder={
							selectedModel ? "Type a message..." : "Waiting for models..."
						}
						className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-6 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={!input.trim() || isLoading || !selectedModel}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white rounded-full px-6 py-3 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
					>
						Send
					</button>
				</form>
			</footer>
		</div>
	);
}
