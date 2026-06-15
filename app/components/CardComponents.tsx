import Link from "next/link";
import type { ReactNode } from "react";

export function CardBase({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all ${className}`}
		>
			{children}
		</div>
	);
}

export function CardLink({
	href,
	onMouseEnter,
	onMouseLeave,
	children,
	className = "",
}: {
	href: string;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Link
			href={href}
			className={`block ${className}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{children}
		</Link>
	);
}

export function CardIcon({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 ${className}`}
		>
			{children}
		</div>
	);
}
