"use client";

import { MoonIcon, SunIcon } from "lucide-animated";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<button
			type="button"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
			aria-label="Toggle theme"
		>
			{theme === "dark" ? <MoonIcon size={20} /> : <SunIcon size={20} />}
		</button>
	);
}
