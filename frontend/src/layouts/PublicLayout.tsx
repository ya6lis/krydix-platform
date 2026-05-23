import { useState } from 'react';
import { Link as RouterLink, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';
import { AppAvatar, AppButton } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';
import { tokens } from '@/theme';

const NAV_LINK_SX = {
	fontSize: '13.5px',
	fontWeight: 500,
	color: tokens.ink2,
	textDecoration: 'none',
	px: 1.5,
	py: 0.75,
	borderRadius: '8px',
	transition: 'background 120ms, color 120ms',
	'&:hover': { bgcolor: tokens.surface2, color: tokens.ink1 },
	'&.active': { color: tokens.accentInk, bgcolor: tokens.accentSoft, fontWeight: 600 },
} as const;

const ICON_BTN_SX = {
	width: 36,
	height: 36,
	borderRadius: '10px',
	bgcolor: tokens.surface,
	border: `1px solid ${tokens.line}`,
	color: tokens.ink2,
	display: 'grid',
	placeItems: 'center',
	cursor: 'pointer',
	transition: 'border-color 120ms, color 120ms',
	'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
} as const;

export default function PublicLayout() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

	const toggleLang = () => {
		const next = i18n.language === 'en' ? 'uk' : 'en';
		i18n.changeLanguage(next);
	};

	const handleAccountClose = () => setAccountAnchor(null);

	const handleLogout = () => {
		clearAuth();
		handleAccountClose();
		navigate(ROUTES.LOGIN);
	};

	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			{/* ── Topbar ── */}
			<Box
				component="header"
				sx={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					bgcolor: 'rgba(244,246,248,0.92)',
					backdropFilter: 'blur(8px)',
					borderBottom: `1px solid ${tokens.line}`,
					px: { xs: 2, sm: 3, md: 4.5 },
					py: '14px',
					display: 'flex',
					alignItems: 'center',
					gap: 2,
				}}
			>
				{/* Brand */}
				<Box
					component={RouterLink}
					to={ROUTES.HOME}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.25,
						textDecoration: 'none',
						color: 'inherit',
						flexShrink: 0,
					}}
				>
					<Box
						sx={{
							width: 30,
							height: 30,
							borderRadius: '8px',
							background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.accentInk})`,
							color: '#fff',
							display: 'grid',
							placeItems: 'center',
							fontWeight: 800,
							fontSize: 15,
							letterSpacing: '-0.04em',
						}}
					>
						K
					</Box>
					<Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
						Krydix
						<Box component="span" sx={{ color: 'primary.main' }}>
							.
						</Box>
					</Typography>
				</Box>

				{/* Nav links */}
				<Box component="nav" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
					<Box component={NavLink} to={ROUTES.PRODUCTS} sx={NAV_LINK_SX}>
						{t('nav.products')}
					</Box>
				</Box>

				{/* Spacer */}
				<Box sx={{ flex: 1 }} />

				{/* Right controls */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					{/* Language toggle */}
					<Box
						component="button"
						onClick={toggleLang}
						sx={{
							...ICON_BTN_SX,
							fontSize: '11px',
							fontWeight: 700,
							letterSpacing: '0.04em',
							fontFamily: 'inherit',
							border: `1px solid ${tokens.line}`,
						}}
						aria-label="Switch language"
					>
						{i18n.language === 'en' ? 'EN' : 'UK'}
					</Box>

					{/* Search */}
					<Box
						component={RouterLink}
						to={ROUTES.SEARCH}
						sx={ICON_BTN_SX}
						aria-label={t('nav.search')}
					>
						<FontAwesomeIcon icon={Icons.search} fontSize={14} />
					</Box>

					{/* Auth section */}
					{user ? (
						<>
							<Box
								component="button"
								onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
									setAccountAnchor(e.currentTarget)
								}
								sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0 }}
								aria-label={t('nav.account')}
							>
								<AppAvatar
									name={
										`${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() ||
										user.email
									}
									size="sm"
								/>
							</Box>
							<Menu
								anchorEl={accountAnchor}
								open={Boolean(accountAnchor)}
								onClose={handleAccountClose}
								transformOrigin={{ horizontal: 'right', vertical: 'top' }}
								anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
							>
								<MenuItem component={RouterLink} to={ROUTES.ACCOUNT} onClick={handleAccountClose}>
									{t('nav.account')}
								</MenuItem>
								<MenuItem onClick={handleLogout}>{t('auth.logout')}</MenuItem>
							</Menu>
						</>
					) : (
						<>
							<AppButton
								tone="ghost"
								size="small"
								sx={{ fontSize: '13px' }}
								onClick={() => navigate(ROUTES.LOGIN)}
							>
								{t('auth.login')}
							</AppButton>
							<AppButton
								tone="primary"
								size="small"
								sx={{ fontSize: '13px' }}
								onClick={() => navigate(ROUTES.REGISTER)}
							>
								{t('auth.register')}
							</AppButton>
						</>
					)}
				</Box>
			</Box>

			{/* ── Main content ── */}
			<Box component="main" sx={{ flex: 1 }}>
				<Outlet />
			</Box>

			{/* ── Footer ── */}
			<Box
				component="footer"
				sx={{
					borderTop: `1px solid ${tokens.line}`,
					px: { xs: 2, md: 4.5 },
					py: 3,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					fontSize: '12.5px',
					color: tokens.ink3,
					flexWrap: 'wrap',
					gap: 1,
				}}
			>
				<span>{t('auth.copyright')}</span>
				<Box sx={{ display: 'flex', gap: 2 }}>
					<span>{t('auth.legal.privacy')}</span>
					<span>{t('auth.legal.terms')}</span>
					<span>{t('auth.legal.help')}</span>
				</Box>
			</Box>
		</Box>
	);
}
