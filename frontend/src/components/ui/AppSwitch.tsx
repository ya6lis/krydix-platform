import { Switch, SwitchProps, Box, Typography } from '@mui/material';

export interface AppSwitchProps extends Omit<SwitchProps, 'onChange'> {
	/** Inline label — when present with `description`, renders the settings-row layout. */
	label?: React.ReactNode;
	description?: React.ReactNode;
	onChange?: (checked: boolean) => void;
}

/** Toggle switch with an optional title + description row (Components.html → Switches). */
export function AppSwitch({ label, description, onChange, ...props }: AppSwitchProps) {
	const control = (
		<Switch
			color="primary"
			onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
			{...props}
		/>
	);

	if (!label && !description) return control;

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 2,
				py: 1.75,
			}}
		>
			<Box>
				{label && <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{label}</Typography>}
				{description && (
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.375, fontSize: 12.5 }}>
						{description}
					</Typography>
				)}
			</Box>
			{control}
		</Box>
	);
}
