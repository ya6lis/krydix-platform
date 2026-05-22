import { Box, Card, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { tokens } from '@/theme';

export type StatCardTone = 'accent' | 'cyan' | 'amber' | 'coral';

const TONE_STYLES: Record<StatCardTone, { bg: string; fg: string }> = {
	accent: { bg: tokens.accentSoft, fg: tokens.accentInk },
	cyan: { bg: tokens.cyanSoft, fg: tokens.cyanInk },
	amber: { bg: tokens.amberSoft, fg: tokens.amberInk },
	coral: { bg: tokens.coralSoft, fg: tokens.coralInk },
};

export interface StatCardProps {
	icon: IconDefinition;
	label: string;
	value: React.ReactNode;
	tone?: StatCardTone;
}

/** Compact metric card — icon tile + label + value (Components.html → Stat cards). */
export function StatCard({ icon, label, value, tone = 'accent' }: StatCardProps) {
	const style = TONE_STYLES[tone];

	return (
		<Card sx={{ display: 'flex', alignItems: 'center', gap: 1.75, px: 2.5, py: 2.25 }}>
			<Box
				sx={{
					width: 40,
					height: 40,
					borderRadius: 2,
					flexShrink: 0,
					display: 'grid',
					placeItems: 'center',
					bgcolor: style.bg,
					color: style.fg,
					fontSize: 18,
				}}
			>
				<FontAwesomeIcon icon={icon} />
			</Box>
			<Box sx={{ minWidth: 0 }}>
				<Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
					{label}
				</Typography>
				<Typography
					sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, mt: 0.25 }}
				>
					{value}
				</Typography>
			</Box>
		</Card>
	);
}
