import { Button, ButtonProps, CircularProgress } from '@mui/material';

export interface AppButtonProps extends ButtonProps {
	loading?: boolean;
}

export function AppButton({
	loading = false,
	disabled,
	children,
	startIcon,
	sx,
	...props
}: AppButtonProps) {
	return (
		<Button
			disabled={disabled || loading}
			startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
			sx={{ minWidth: 100, ...sx }}
			{...props}
		>
			{children}
		</Button>
	);
}
