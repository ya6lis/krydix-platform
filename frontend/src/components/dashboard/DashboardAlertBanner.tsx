import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';

export interface DashboardAlertItem {
	id: string;
	messageKey: string;
	messageParams?: Record<string, string | number>;
	href: string;
	tone?: 'warning' | 'danger';
	icon?: IconDefinition;
}

interface DashboardAlertBannerProps {
	alerts: DashboardAlertItem[];
}

export function DashboardAlertBanner({ alerts }: DashboardAlertBannerProps) {
	const { t } = useTranslation();

	if (alerts.length === 0) return null;

	return (
		<Stack spacing={1.25} sx={{ mb: 2.5 }}>
			{alerts.map((alert) => {
				const tone = alert.tone ?? 'warning';
				const bg = tone === 'danger' ? tokens.coralSoft : tokens.amberSoft;
				const color = tone === 'danger' ? tokens.coralInk : tokens.amberInk;

				return (
					<Box
						key={alert.id}
						component={RouterLink}
						to={alert.href}
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 1.5,
							px: 2,
							py: 1.5,
							borderRadius: 2,
							bgcolor: bg,
							color,
							textDecoration: 'none',
							border: `1px solid ${tone === 'danger' ? tokens.coral : tokens.amber}`,
							'&:hover': { opacity: 0.92 },
						}}
					>
						<FontAwesomeIcon icon={alert.icon ?? Icons.warning} />
						<Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
							{t(alert.messageKey, alert.messageParams)}
						</Typography>
						<FontAwesomeIcon icon={Icons.arrowRight} style={{ fontSize: 12 }} />
					</Box>
				);
			})}
		</Stack>
	);
}
