import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Link } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';

interface DashboardSectionCardProps {
	titleKey: string;
	subtitleKey?: string;
	actionLabelKey?: string;
	actionHref?: string;
	children: React.ReactNode;
}

export function DashboardSectionCard({
	titleKey,
	subtitleKey,
	actionLabelKey,
	actionHref,
	children,
}: DashboardSectionCardProps) {
	const { t } = useTranslation();

	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: tokens.radius / 8,
				overflow: 'hidden',
				height: '100%',
				boxSizing: 'border-box',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					px: 3,
					py: 2.25,
					borderBottom: `1px solid ${tokens.line}`,
				}}
			>
				<Box>
					<Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
						{t(titleKey)}
					</Typography>
					{subtitleKey && (
						<Typography sx={{ fontSize: 12.5, color: tokens.ink3, mt: 0.5 }}>
							{t(subtitleKey)}
						</Typography>
					)}
				</Box>
				{actionLabelKey && actionHref && (
					<Link
						component={RouterLink}
						to={actionHref}
						underline="none"
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.75,
							fontSize: 13.5,
							fontWeight: 600,
							color: tokens.accent,
							'&:hover': { color: tokens.accentInk },
						}}
					>
						{t(actionLabelKey)}
						<FontAwesomeIcon icon={Icons.arrowRight} style={{ fontSize: 12 }} />
					</Link>
				)}
			</Box>
			<Box sx={{ p: 3 }}>{children}</Box>
		</Box>
	);
}
