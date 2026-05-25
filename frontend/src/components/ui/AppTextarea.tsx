import { forwardRef, type Ref } from 'react';
import { TextField, TextFieldProps, FormHelperText, Box } from '@mui/material';

export interface AppTextareaProps extends Omit<TextFieldProps, 'multiline' | 'rows'> {
	rows?: number;
	maxLength?: number;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === 'function') {
		ref(value);
		return;
	}

	if (ref && typeof ref === 'object') {
		(ref as { current: T | null }).current = value;
	}
}

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(function AppTextarea(
	{
		rows = 4,
		maxLength,
		size = 'small',
		fullWidth = true,
		variant = 'outlined',
		value,
		inputProps,
		inputRef,
		...props
	},
	ref
) {
	const currentLength = typeof value === 'string' ? value.length : 0;
	const handleInputRef = (instance: HTMLInputElement | HTMLTextAreaElement | null) => {
		assignRef(
			inputRef as Ref<HTMLTextAreaElement> | undefined,
			instance as HTMLTextAreaElement | null
		);
		assignRef(ref, instance as HTMLTextAreaElement | null);
	};

	return (
		<Box>
			<TextField
				multiline
				rows={rows}
				size={size}
				fullWidth={fullWidth}
				variant={variant}
				value={value}
				inputRef={handleInputRef}
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
});
