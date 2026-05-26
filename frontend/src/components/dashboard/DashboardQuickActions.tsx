import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Grid, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { tokens } from '@/theme';

export interface DashboardQuickAction {
	id: string;
	labelKey: string;
	href: string;
	icon: IconDefinition;
	tone?: 'accent' | 'cyan' | 'amber' | 'coral';
}

interface DashboardQuickActionsProps {
	titleKey?: string;
	actions: DashboardQuickAction[];
}

const TONE_BG: Record<NonNullable<DashboardQuickAction['tone']>, string> = {
	accent: tokens.accentSoft,
	cyan: tokens.cyanSoft,
	amber: tokens.amberSoft,
	coral: tokens.coralSoft,
};

const TONE_FG: Record<NonNullable<DashboardQuickAction['tone']>, string> = {
	accent: tokens.accentInk,
	cyan: tokens.cyanInk,
	amber: tokens.amberInk,
	coral: tokens.coralInk,
};

export function DashboardQuickActions({ titleKey, actions }: DashboardQuickActionsProps) {
	const { t } = useTranslation();

	return (
		<Box>
			{titleKey && (
				<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', mb: 2 }}>
					{t(titleKey)}
				</Typography>
			)}
			<Grid container spacing={1.5}>
				{actions.map((action) => {
					const tone = action.tone ?? 'accent';
					return (
						<Grid item xs={6} sm={4} md={3} key={action.id}>
							<Box
								component={RouterLink}
								to={action.href}
								sx={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'flex-start',
									gap: 1.25,
									p: 2,
									borderRadius: 2,
									border: `1px solid ${tokens.line}`,
									bgcolor: tokens.surface,
									textDecoration: 'none',
									color: tokens.ink1,
									height: '100%',
									boxSizing: 'border-box',
									transition: 'border-color 120ms, box-shadow 120ms',
									'&:hover': {
										borderColor: tokens.accent,
										boxShadow: tokens.shadowSm,
									},
								}}
							>
								<Box
									sx={{
										width: 36,
										height: 36,
										borderRadius: 1.5,
										display: 'grid',
										placeItems: 'center',
										bgcolor: TONE_BG[tone],
										color: TONE_FG[tone],
									}}
								>
									<FontAwesomeIcon icon={action.icon} />
								</Box>
								<Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>
									{t(action.labelKey)}
								</Typography>
							</Box>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
}
