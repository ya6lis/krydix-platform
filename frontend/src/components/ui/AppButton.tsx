import { Button, ButtonProps, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { tokens } from '@/theme';

/** Matches the 5 `.btn` variants from Components.html design. */
export type AppButtonTone = 'primary' | 'accent' | 'ghost' | 'danger' | 'success';

const TONE_SX: Record<AppButtonTone, SxProps<Theme>> = {
	primary: {
		bgcolor: tokens.ink1,
		color: '#fff',
		border: 'none',
		'&:hover': { bgcolor: tokens.ink1, filter: 'brightness(1.2)', border: 'none' },
		'&.Mui-disabled': { bgcolor: tokens.ink3, color: '#fff' },
	},
	accent: {
		bgcolor: tokens.accent,
		color: '#fff',
		border: 'none',
		'&:hover': { bgcolor: tokens.accent, filter: 'brightness(1.05)', border: 'none' },
		'&.Mui-disabled': { bgcolor: tokens.accentLight, color: '#fff' },
	},
	ghost: {
		bgcolor: tokens.surface,
		color: tokens.ink1,
		border: `1px solid ${tokens.line}`,
		'&:hover': { bgcolor: tokens.surface, borderColor: tokens.ink3 },
		'&.Mui-disabled': { color: tokens.ink3, borderColor: tokens.line2 },
	},
	danger: {
		bgcolor: tokens.coralSoft,
		color: tokens.coralInk,
		border: 'none',
		'&:hover': { bgcolor: tokens.coral, color: '#fff', border: 'none' },
		'&.Mui-disabled': { bgcolor: tokens.coralSoft, color: tokens.ink3 },
	},
	success: {
		bgcolor: tokens.cyanSoft,
		color: tokens.cyanInk,
		border: 'none',
		'&:hover': { bgcolor: tokens.cyan, color: '#fff', border: 'none' },
		'&.Mui-disabled': { bgcolor: tokens.cyanSoft, color: tokens.ink3 },
	},
};

export interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
	loading?: boolean;
	/** Design-system tone. When set, overrides MUI variant/color system. */
	tone?: AppButtonTone;
	/** Fall through to MUI variant when tone is not set. */
	variant?: ButtonProps['variant'];
	color?: ButtonProps['color'];
}

export function AppButton({
	loading = false,
	disabled,
	children,
	startIcon,
	tone,
	variant,
	color,
	sx,
	...props
}: AppButtonProps) {
	const toneSx = tone ? TONE_SX[tone] : undefined;

	return (
		<Button
			variant={tone ? 'contained' : variant}
			color={tone ? undefined : color}
			disabled={disabled || loading}
			startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
			sx={[
				{ minWidth: 80 },
				toneSx ?? {},
				...(Array.isArray(sx) ? sx : [sx ?? {}]),
			]}
			{...props}
		>
			{children}
		</Button>
	);
}
