import {
	FormControl,
	FormControlProps,
	FormHelperText,
	InputLabel,
	MenuItem,
	Select,
	SelectProps,
} from '@mui/material';

export interface AppSelectOption {
	value: string | number;
	label: string;
}

export interface AppSelectProps extends Omit<SelectProps, 'error'> {
	options: AppSelectOption[];
	label?: string;
	error?: boolean;
	helperText?: string;
	fullWidth?: boolean;
	formControlProps?: FormControlProps;
}

export function AppSelect({
	options,
	label,
	error,
	helperText,
	fullWidth = true,
	size = 'small',
	formControlProps,
	...props
}: AppSelectProps) {
	const labelId = label ? `${props.name ?? 'select'}-label` : undefined;

	return (
		<FormControl fullWidth={fullWidth} size={size} error={error} {...formControlProps}>
			{label && <InputLabel id={labelId}>{label}</InputLabel>}
			<Select labelId={labelId} label={label} {...props}>
				{options.map((opt) => (
					<MenuItem key={opt.value} value={opt.value}>
						{opt.label}
					</MenuItem>
				))}
			</Select>
			{helperText && <FormHelperText>{helperText}</FormHelperText>}
		</FormControl>
	);
}
