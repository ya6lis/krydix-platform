import { Box } from '@mui/material';

export interface SegmentedOption {
	value: string;
	label: string;
}

export interface SegmentedControlProps {
	options: SegmentedOption[];
	value: string;
	onChange: (value: string) => void;
	size?: 'sm' | 'md';
}

/** Segmented control for filtering / range switching (Components.html → Segmented control). */
export function SegmentedControl({ options, value, onChange, size = 'md' }: SegmentedControlProps) {
	const padY = size === 'sm' ? 0.5 : 0.75;

	return (
		<Box
			role="tablist"
			sx={{
				display: 'inline-flex',
				p: '3px',
				gap: '2px',
				bgcolor: 'background.default',
				border: '1px solid',
				borderColor: 'divider',
				borderRadius: 2,
			}}
		>
			{options.map((opt) => {
				const active = opt.value === value;
				return (
					<Box
						key={opt.value}
						component="button"
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(opt.value)}
						sx={{
							border: 0,
							cursor: 'pointer',
							px: 1.5,
							py: padY,
							borderRadius: 1.5,
							fontFamily: 'inherit',
							fontSize: 12,
							fontWeight: 600,
							bgcolor: active ? 'background.paper' : 'transparent',
							color: active ? 'text.primary' : 'text.secondary',
							boxShadow: active ? 1 : 'none',
							transition: 'background-color 120ms, color 120ms',
							'&:hover': { color: active ? 'text.primary' : 'text.primary' },
						}}
					>
						{opt.label}
					</Box>
				);
			})}
		</Box>
	);
}
