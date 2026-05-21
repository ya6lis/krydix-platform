import { FormLabel, FormLabelProps, Box } from '@mui/material';

export interface AppLabelProps extends Omit<FormLabelProps, 'children'> {
	children: React.ReactNode;
	required?: boolean;
}

export function AppLabel({ children, required, sx, ...props }: AppLabelProps) {
	return (
		<FormLabel
			sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.5, fontWeight: 600, ...sx }}
			{...props}
		>
			{children}
			{required && (
				<Box component="span" aria-hidden="true" sx={{ color: 'error.main', ml: 0.25 }}>
					*
				</Box>
			)}
		</FormLabel>
	);
}
