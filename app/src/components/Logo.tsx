import LogoSvg from "../assets/logo.svg?react";

interface LogoProps {
	size?: number;
	className?: string;
}

export function Logo({ size = 16, className }: LogoProps) {
	return (
		<LogoSvg
			width={size}
			height={size}
			className={className}
			role="img"
			aria-label="Voice logo"
			style={{ fill: "currentColor" }}
		/>
	);
}
