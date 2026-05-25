import { forwardRef } from 'react';
import {
	FormControl,
	FormControlLabel,
	FormHelperText,
	FormLabel,
	Radio,
	RadioGroup,
	RadioGroupProps,
} from '@mui/material';

export interface AppRadioOption {
	value: string;
	label: React.ReactNode;
	disabled?: boolean;
}

export interface AppRadioProps extends Omit<RadioGroupProps, 'children'> {
	options: AppRadioOption[];
	label?: string;
	error?: boolean;
	helperText?: string;
	required?: boolean;
}

export const AppRadio = forwardRef<HTMLDivElement, AppRadioProps>(function AppRadio(
	{ options, label, error, helperText, required, ...props },
	ref,
) {
	return (
		<FormControl ref={ref} error={error} required={required}>
			{label && <FormLabel>{label}</FormLabel>}
			<RadioGroup {...props}>
				{options.map((opt) => (
					<FormControlLabel
						key={opt.value}
						value={opt.value}
						label={opt.label}
						disabled={opt.disabled}
						control={<Radio />}
					/>
				))}
			</RadioGroup>
			{helperText && <FormHelperText>{helperText}</FormHelperText>}
		</FormControl>
	);
});
