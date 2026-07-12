interface LogoProps {
	className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
	return (
		<span
			className={`font-extrabold tracking-tighter bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent select-none ${className}`.trim()}
		>
			CtrlAI
		</span>
	);
}
