import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GenerationProvider } from "./components/GenerationContext";
import Header from "./components/Header";
import { ModelProvider } from "./components/ModelContext";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Compliance LLM",
	description: "Compliance LLM Tool",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans">
				<ThemeProvider>
					<ModelProvider>
						<GenerationProvider>
							<Header />
							{children}
						</GenerationProvider>
					</ModelProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
