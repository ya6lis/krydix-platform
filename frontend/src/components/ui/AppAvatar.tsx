import { Box, Avatar } from '@mui/material';
import { tokens } from '@/theme';

export type AppAvatarColor = 1 | 2 | 3 | 4 | 5;
export type AppAvatarSize = 'sm' | 'md' | 'lg';

const COLOR_STYLES: Record<AppAvatarColor, { bg: string; fg: string }> = {
	1: { bg: tokens.accentSoft, fg: tokens.accentInk },
	2: { bg: tokens.cyanSoft, fg: tokens.cyanInk },
	3: { bg: tokens.blueSoft, fg: tokens.blueInk },
	4: { bg: tokens.amberSoft, fg: tokens.amberInk },
	5: { bg: tokens.coralSoft, fg: tokens.coralInk },
};

const SIZE_MAP: Record<AppAvatarSize, { box: number; font: number }> = {
	sm: { box: 28, font: 10.5 },
	md: { box: 34, font: 11.5 },
	lg: { box: 44, font: 14 },
};

export interface AppAvatarProps {
	/** Full name — initials are derived from the first two words. */
	name: string;
	/** Color variant 1–5; auto-derived from the name when omitted. */
	color?: AppAvatarColor;
	size?: AppAvatarSize;
	/** Optional image URL; falls back to initials when missing. */
	src?: string;
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function autoColor(name: string): AppAvatarColor {
	let sum = 0;
	for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
	return ((sum % 5) + 1) as AppAvatarColor;
}

/** Colored initials avatar — matches `.avatar` `.a1`–`.a5` `.lg` in the design system. */
export function AppAvatar({ name, color, size = 'md', src }: AppAvatarProps) {
	const variant = color ?? autoColor(name);
	const style = COLOR_STYLES[variant];
	const { box, font } = SIZE_MAP[size];

	return (
		<Avatar
			src={src}
			alt={name}
			sx={{
				width: box,
				height: box,
				fontSize: font,
				fontWeight: 700,
				bgcolor: style.bg,
				color: style.fg,
			}}
		>
			<Box component="span">{initials(name)}</Box>
		</Avatar>
	);
}
