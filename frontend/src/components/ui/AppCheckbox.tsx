import { Checkbox, CheckboxProps, FormControlLabel, FormControlLabelProps } from '@mui/material';

export interface AppCheckboxProps extends Omit<CheckboxProps, 'onChange'> {
	label: React.ReactNode;
	labelPlacement?: FormControlLabelProps['labelPlacement'];
	onChange?: (checked: boolean) => void;
}

export function AppCheckbox({
	label,
	labelPlacement = 'end',
	onChange,
	...props
}: AppCheckboxProps) {
	return (
		<FormControlLabel
			label={label}
			labelPlacement={labelPlacement}
			control={
				<Checkbox {...props} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} />
			}
		/>
	);
}
