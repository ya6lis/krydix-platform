import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme';

const ROLE_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
	BUYER: { bg: tokens.cyanSoft, fg: tokens.cyanInk, dot: tokens.cyan },
	SELLER: { bg: tokens.amberSoft, fg: tokens.amberInk, dot: tokens.amber },
	MODERATOR: { bg: tokens.accentSoft, fg: tokens.accentInk, dot: tokens.accent },
	ADMIN: { bg: tokens.ink1, fg: '#fff', dot: tokens.line },
	GUEST: { bg: tokens.surface2, fg: tokens.ink3, dot: tokens.ink3 },
};

interface RoleBadgeProps {
	role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
	const { t } = useTranslation();
	const key = role.toUpperCase();
	const style = ROLE_STYLES[key] ?? ROLE_STYLES.GUEST;
	const label = t(`users.roles.${key.toLowerCase()}`, { defaultValue: key });

	return (
		<Box
			component="span"
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 0.75,
				fontSize: 11.5,
				fontWeight: 700,
				px: 1.125,
				py: 0.375,
				borderRadius: 999,
				bgcolor: style.bg,
				color: style.fg,
				textTransform: 'capitalize',
			}}
		>
			<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: style.dot, flexShrink: 0 }} />
			{label}
		</Box>
	);
}
