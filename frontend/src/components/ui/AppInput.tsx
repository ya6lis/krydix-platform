import { TextField, TextFieldProps } from '@mui/material';

export type AppInputProps = TextFieldProps;

export function AppInput({
	size = 'small',
	fullWidth = true,
	variant = 'outlined',
	...props
}: AppInputProps) {
	return <TextField size={size} fullWidth={fullWidth} variant={variant} {...props} />;
}
