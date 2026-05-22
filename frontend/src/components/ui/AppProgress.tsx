import { Box, LinearProgress, Typography } from '@mui/material';

export interface AppProgressProps {
	/** Completion percentage, 0–100. */
	value: number;
	/** Show the percentage (or `completeLabel`) to the right of the bar. */
	showLabel?: boolean;
	/** Renders the bar in the success tone with `completeLabel`. */
	complete?: boolean;
	completeLabel?: string;
}

/** Horizontal progress bar with optional value label (Components.html → Progress). */
export function AppProgress({
	value,
	showLabel = true,
	complete = false,
	completeLabel,
}: AppProgressProps) {
	const clamped = Math.min(100, Math.max(0, value));

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, width: '100%' }}>
			<LinearProgress
				variant="determinate"
				value={complete ? 100 : clamped}
				color={complete ? 'success' : 'primary'}
				sx={{ flex: 1 }}
			/>
			{showLabel && (
				<Typography
					variant="caption"
					sx={{
						fontSize: 12.5,
						fontWeight: complete ? 700 : 600,
						color: complete ? 'success.dark' : 'text.secondary',
						minWidth: complete ? 'auto' : 36,
						textAlign: 'right',
					}}
				>
					{complete ? (completeLabel ?? '100%') : `${Math.round(clamped)}%`}
				</Typography>
			)}
		</Box>
	);
}
