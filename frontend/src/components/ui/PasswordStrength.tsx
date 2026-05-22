import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme';

export interface PasswordStrengthProps {
	value: string;
}

const SEGMENT_COUNT = 4;

/** Returns a 0–4 strength score for a password. */
export function scorePassword(password: string): number {
	if (!password) return 0;
	let score = 0;
	if (password.length >= 8) score += 1;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
	if (/\d/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;
	return score;
}

const SCORE_META: Record<number, { key: string; seg: string; text: string }> = {
	1: { key: 'weak', seg: tokens.coral, text: tokens.coralInk },
	2: { key: 'fair', seg: tokens.amber, text: tokens.amberInk },
	3: { key: 'good', seg: tokens.accent, text: tokens.accentInk },
	4: { key: 'strong', seg: tokens.cyan, text: tokens.cyanInk },
};

/** Password strength meter — 4 segments + feedback row (Components.html → Password strength). */
export function PasswordStrength({ value }: PasswordStrengthProps) {
	const { t } = useTranslation();
	const score = scorePassword(value);
	const meta = SCORE_META[score];
	const labelKey = meta ? meta.key : 'empty';

	return (
		<Box>
			<Box sx={{ display: 'flex', gap: '4px' }}>
				{Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
					<Box
						key={i}
						sx={{
							flex: 1,
							height: 4,
							borderRadius: '2px',
							bgcolor: meta && i < score ? meta.seg : tokens.surface2,
							transition: 'background-color 150ms',
						}}
					/>
				))}
			</Box>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					mt: '6px',
				}}
			>
				<Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
					{t('components.passwordStrength.label')}
				</Typography>
				<Typography
					sx={{ fontSize: 11.5, fontWeight: 700, color: meta ? meta.text : 'text.secondary' }}
				>
					{t(`components.passwordStrength.${labelKey}`)}
				</Typography>
			</Box>
		</Box>
	);
}
