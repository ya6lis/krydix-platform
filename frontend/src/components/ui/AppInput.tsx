import { forwardRef, type Ref } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export type AppInputProps = TextFieldProps;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === 'function') {
		ref(value);
		return;
	}

	if (ref && typeof ref === 'object') {
		(ref as { current: T | null }).current = value;
	}
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(function AppInput(
	{ size = 'small', fullWidth = true, variant = 'outlined', inputRef, ...props },
	ref,
) {
	const handleInputRef = (instance: HTMLInputElement | null) => {
		assignRef(inputRef, instance);
		assignRef(ref, instance);
	};

	return <TextField size={size} fullWidth={fullWidth} variant={variant} inputRef={handleInputRef} {...props} />;
});
