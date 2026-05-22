import { Box, Slider, Typography } from '@mui/material';

export interface RangeSliderProps {
	min: number;
	max: number;
	step?: number;
	value: [number, number];
	onChange: (value: [number, number]) => void;
	/** Prefix shown before the min/max value labels, e.g. `$`. */
	prefix?: string;
	/** Hide the value labels below the track. */
	hideValues?: boolean;
}

/** Dual-handle range slider for price / numeric filters (Components.html → Range slider). */
export function RangeSlider({
	min,
	max,
	step = 1,
	value,
	onChange,
	prefix = '',
	hideValues = false,
}: RangeSliderProps) {
	return (
		<Box>
			<Slider
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(_, v) => onChange(v as [number, number])}
				valueLabelDisplay="auto"
				disableSwap
			/>
			{!hideValues && (
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
					<Typography variant="caption" sx={{ fontSize: 12.5, fontWeight: 600 }}>
						{prefix}
						{value[0]}
					</Typography>
					<Typography variant="caption" sx={{ fontSize: 12.5, fontWeight: 600 }}>
						{prefix}
						{value[1]}
					</Typography>
				</Box>
			)}
		</Box>
	);
}
