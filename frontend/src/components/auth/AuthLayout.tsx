import { Box, Typography, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { useRoleHomeRoute } from '@/hooks/useRoleHomeRoute';

export interface AuthLayoutProps {
	/** Small uppercase chip above the title. */
	eyebrow: string;
	title: string;
	/** Sub-line under the title — usually carries the cross-link. */
	subtitle: React.ReactNode;
	/** The form content. */
	children: React.ReactNode;
	/** Right-panel: uppercase tag, headline and decorative content. */
	artTag: string;
	artHeadline: string;
	artChildren: React.ReactNode;
	/** Title font size at the desktop breakpoint (design: 36 login, 32 register). */
	titleSize?: number;
	/**
	 * CSS gradient string for the decorative overlay on the right art panel.
	 * Defaults to login variant (purple + cyan).
	 */
	artGradient?: string;
}

const LOGIN_GRADIENT = `radial-gradient(circle at 85% 25%, ${tokens.purple} 0%, transparent 50%), radial-gradient(circle at 15% 85%, ${tokens.cyan} 0%, transparent 40%)`;
const REGISTER_GRADIENT = `radial-gradient(circle at 80% 30%, ${tokens.purple} 0%, transparent 50%), radial-gradient(circle at 20% 80%, ${tokens.coral} 0%, transparent 40%)`;

export { LOGIN_GRADIENT, REGISTER_GRADIENT };

/** Split-screen shell for pre-auth pages — form left, indigo brand panel right. */
export function AuthLayout({
	eyebrow,
	title,
	subtitle,
	children,
	artTag,
	artHeadline,
	artChildren,
	titleSize = 36,
	artGradient = LOGIN_GRADIENT,
}: AuthLayoutProps) {
	const { t } = useTranslation();
	const homeRoute = useRoleHomeRoute();

	return (
		<Box
			sx={{
				minHeight: '100vh',
				display: 'grid',
				gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
				bgcolor: 'background.paper',
			}}
		>
			{/* ── Left: form panel ── */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					maxWidth: 540,
					minHeight: '100vh',
					mx: { xs: 'auto', md: 0 },
					ml: { md: 'auto' },
					px: { xs: 3, sm: 6, md: 7.5 },
					py: 4,
				}}
			>
				<Box
					component={RouterLink}
					to={homeRoute}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.25,
						textDecoration: 'none',
						color: 'inherit',
					}}
				>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: '9px',
							display: 'grid',
							placeItems: 'center',
							color: '#fff',
							fontWeight: 800,
							fontSize: 16,
							letterSpacing: '-0.04em',
							background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentInk})`,
						}}
					>
						K
					</Box>
					<Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
						Krydix
						<Box component="span" sx={{ color: 'primary.main' }}>
							.
						</Box>
					</Typography>
				</Box>

				<Box sx={{ my: 'auto', py: 4 }}>
					<Box
						component="span"
						sx={{
							display: 'inline-flex',
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: 'primary.dark',
							bgcolor: 'primary.light',
							px: '10px',
							py: '4px',
							borderRadius: '4px',
							mb: 2.25,
						}}
					>
						{eyebrow}
					</Box>
					<Typography
						component="h1"
						sx={{
							fontSize: { xs: titleSize - 6, sm: titleSize },
							fontWeight: 800,
							letterSpacing: '-0.03em',
							lineHeight: 1.1,
						}}
					>
						{title}
					</Typography>
					<Typography sx={{ fontSize: 14.5, color: 'text.secondary', mt: 1.25, mb: 3.5 }}>
						{subtitle}
					</Typography>
					{children}
				</Box>

				<Box
					sx={{
						mt: 4,
						pt: 3,
						borderTop: '1px solid',
						borderColor: 'divider',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						fontSize: 12.5,
						color: 'text.secondary',
					}}
				>
					<span>{t('auth.copyright')}</span>
					<Stack direction="row" spacing={2}>
						{(['privacy', 'terms', 'help'] as const).map((key) => (
							<Box
								key={key}
								component="a"
								href="#"
								sx={{
									color: 'text.secondary',
									textDecoration: 'none',
									'&:hover': { color: 'text.primary' },
								}}
							>
								{t(`auth.legal.${key}`)}
							</Box>
						))}
					</Stack>
				</Box>
			</Box>

			{/* ── Right: brand art panel ── */}
			<Box
				sx={{
					display: { xs: 'none', md: 'flex' },
					flexDirection: 'column',
					justifyContent: 'space-between',
					position: 'relative',
					overflow: 'hidden',
					p: 7.5,
					bgcolor: tokens.indigo,
					color: '#fff',
				}}
			>
				<Box
					aria-hidden
					sx={{
						position: 'absolute',
						inset: 0,
						opacity: 0.4,
						background: artGradient,
					}}
				/>
				<Box sx={{ position: 'relative' }}>
					<Typography
						sx={{
							fontSize: 11,
							fontWeight: 700,
							letterSpacing: '0.16em',
							textTransform: 'uppercase',
							color: tokens.purpleSoft,
						}}
					>
						{artTag}
					</Typography>
					<Typography
						component="h2"
						sx={{
							fontSize: { md: 36, lg: 42 },
							fontWeight: 700,
							lineHeight: 1.12,
							letterSpacing: '-0.03em',
							mt: 2,
							maxWidth: '22ch',
						}}
					>
						{artHeadline}
					</Typography>
				</Box>
				<Box sx={{ position: 'relative' }}>{artChildren}</Box>
			</Box>
		</Box>
	);
}
