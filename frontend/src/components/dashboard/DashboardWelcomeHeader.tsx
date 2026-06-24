import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Stack, Typography, Link } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { getProfileRouteForUser } from '@/utils/roleAccess';

const ROLE_STYLES: Record<string, { bg: string; color: string; labelKey: string }> = {
	[Role.BUYER]: {
		bg: tokens.accentSoft,
		color: tokens.accentInk,
		labelKey: 'dashboard.role.buyer',
	},
	[Role.SELLER]: { bg: '#ede9fe', color: '#5b21b6', labelKey: 'dashboard.role.seller' },
	[Role.MODERATOR]: {
		bg: tokens.amberSoft,
		color: tokens.amberInk,
		labelKey: 'dashboard.role.moderator',
	},
	[Role.ADMIN]: { bg: tokens.coralSoft, color: tokens.coralInk, labelKey: 'dashboard.role.admin' },
};

interface DashboardWelcomeHeaderProps {
	name?: string | null;
	role: Role | string;
	subtitleKey: string;
}

export function DashboardWelcomeHeader({ name, role, subtitleKey }: DashboardWelcomeHeaderProps) {
	const { t } = useTranslation();
	const user = useAuthStore((s) => s.user);
	const roleStyle = ROLE_STYLES[role] ?? ROLE_STYLES[Role.BUYER];
	const profileHref = getProfileRouteForUser(user);

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'flex-start',
				justifyContent: 'space-between',
				mb: 3,
				flexWrap: 'wrap',
				gap: 2,
			}}
		>
			<Box>
				<Stack direction="row" alignItems="center" spacing={1.25} mb={0.75}>
					<Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
						{name ? t('dashboard.common.greetingNamed', { name }) : t('dashboard.common.greeting')}
					</Typography>
					<Box
						sx={{
							fontSize: 11,
							fontWeight: 700,
							px: 1,
							py: 0.375,
							borderRadius: 999,
							bgcolor: roleStyle.bg,
							color: roleStyle.color,
						}}
					>
						{t(roleStyle.labelKey)}
					</Box>
				</Stack>
				<Typography sx={{ color: tokens.ink3, fontSize: 14 }}>{t(subtitleKey)}</Typography>
			</Box>

			<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
				<Link
					component={RouterLink}
					to={profileHref}
					underline="none"
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.75,
						fontSize: 13.5,
						fontWeight: 600,
						color: tokens.ink2,
						'&:hover': { color: tokens.accent },
					}}
				>
					<FontAwesomeIcon icon={Icons.user} />
					{t('dashboard.common.profile')}
				</Link>
				<Link
					component={RouterLink}
					to={ROUTES.NOTIFICATIONS}
					underline="none"
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.75,
						fontSize: 13.5,
						fontWeight: 600,
						color: tokens.ink2,
						'&:hover': { color: tokens.accent },
					}}
				>
					<FontAwesomeIcon icon={Icons.bell} />
					{t('dashboard.common.notifications')}
				</Link>
			</Stack>
		</Box>
	);
}
