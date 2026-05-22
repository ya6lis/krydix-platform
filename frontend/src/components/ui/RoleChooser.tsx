import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface RoleOption {
	value: string;
	icon: IconDefinition;
	title: string;
	description: string;
}

export interface RoleChooserProps {
	options: RoleOption[];
	value: string;
	onChange: (value: string) => void;
}

/** Large selectable role cards — used on the register page (Components.html → Role chooser). */
export function RoleChooser({ options, value, onChange }: RoleChooserProps) {
	return (
		<Box
			role="radiogroup"
			sx={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 1.5 }}
		>
			{options.map((opt) => {
				const active = opt.value === value;
				return (
					<Box
						key={opt.value}
						component="button"
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(opt.value)}
						sx={{
							textAlign: 'left',
							cursor: 'pointer',
							p: '16px',
							borderRadius: '12px',
							fontFamily: 'inherit',
							display: 'flex',
							gap: '14px',
							alignItems: 'flex-start',
							border: '2px solid',
							borderColor: active ? 'primary.main' : 'divider',
							bgcolor: active ? 'primary.light' : 'background.paper',
							transition: 'border-color 120ms, background-color 120ms',
							'&:hover': { borderColor: active ? 'primary.main' : 'text.disabled' },
						}}
					>
						<Box
							sx={{
								width: 36,
								height: 36,
								flexShrink: 0,
								borderRadius: '9px',
								display: 'grid',
								placeItems: 'center',
								fontSize: 15,
								bgcolor: active ? 'primary.main' : 'background.default',
								color: active ? 'primary.contrastText' : 'text.secondary',
							}}
						>
							<FontAwesomeIcon icon={opt.icon} />
						</Box>
						<Box sx={{ minWidth: 0 }}>
							<Typography sx={{ fontSize: 14, fontWeight: 700 }}>{opt.title}</Typography>
							<Typography
								sx={{ fontSize: 12, color: 'text.secondary', mt: '2px', lineHeight: 1.4 }}
							>
								{opt.description}
							</Typography>
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}
