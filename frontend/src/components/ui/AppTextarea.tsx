import { TextField, TextFieldProps, FormHelperText, Box } from '@mui/material';

export interface AppTextareaProps extends Omit<TextFieldProps, 'multiline' | 'rows'> {
	rows?: number;
	maxLength?: number;
}

export function AppTextarea({
	rows = 4,
	maxLength,
	size = 'small',
	fullWidth = true,
	variant = 'outlined',
	value,
	inputProps,
	...props
}: AppTextareaProps) {
	const currentLength = typeof value === 'string' ? value.length : 0;

	return (
		<Box>
			<TextField
				multiline
				rows={rows}
				size={size}
				fullWidth={fullWidth}
				variant={variant}
				value={value}
				inputProps={{ maxLength, ...inputProps }}
				{...props}
			/>
			{maxLength !== undefined && (
				<FormHelperText sx={{ textAlign: 'right', mr: 0 }}>
					{currentLength}/{maxLength}
				</FormHelperText>
			)}
		</Box>
	);
}
