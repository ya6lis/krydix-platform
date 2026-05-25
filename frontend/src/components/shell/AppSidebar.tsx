import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Box, Typography, Popover, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';
import i18n from '@/i18n';

/* ── width constant ──────────────────────────────────────────── */
export const SIDEBAR_WIDTH = 248;

/* ── role constant for guests ────────────────────────────────── */
const GUEST = 'GUEST';

/* ── nav config ──────────────────────────────────────────────── */
type BadgeVariant = 'default' | 'warn' | 'danger';

interface NavItem {
	id: string;
	labelKey: string;
	icon: (typeof Icons)[keyof typeof Icons];
	href: string;
	badge?: { count?: number; variant: BadgeVariant };
	roles: string[];
}

interface NavGroup {
	id: string;
	labelKey: string;
	items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
	// ── Overview: one dashboard link per role ─────────────────────
	{
		id: 'overview',
		labelKey: 'nav.group.overview',
		items: [
			{
				id: 'dashboard-seller',
				labelKey: 'nav.dashboard',
				icon: Icons.chart,
				href: ROUTES.SELLER_DASHBOARD,
				roles: ['SELLER'],
			},
			{
				id: 'dashboard',
				labelKey: 'nav.dashboard',
				icon: Icons.chart,
				href: ROUTES.ACCOUNT,
				roles: ['BUYER', 'MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},

	// ── Selling: seller-only cabinet links ────────────────────────
	{
		id: 'selling',
		labelKey: 'nav.group.selling',
		items: [
			{
				id: 'seller-products',
				labelKey: 'nav.products',
				icon: Icons.store,
				href: ROUTES.SELLER_PRODUCTS,
				roles: ['SELLER'],
			},
			{
				id: 'seller-orders',
				labelKey: 'nav.orders',
				icon: Icons.order,
				href: ROUTES.SELLER_ORDERS,
				badge: { variant: 'default' },
				roles: ['SELLER'],
			},
			{
				id: 'seller-verification',
				labelKey: 'nav.verification',
				icon: Icons.shield,
				href: ROUTES.SELLER_VERIFICATION,
				roles: ['SELLER'],
			},
		],
	},

	// ── Marketplace: catalog + buyer orders + messages ────────────
	{
		id: 'marketplace',
		labelKey: 'nav.group.marketplace',
		items: [
			{
				id: 'catalog',
				labelKey: 'nav.catalog',
				icon: Icons.products,
				href: ROUTES.PRODUCTS,
				roles: [GUEST, 'BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'orders',
				labelKey: 'nav.orders',
				icon: Icons.order,
				href: ROUTES.ACCOUNT_ORDERS,
				badge: { variant: 'default' },
				roles: ['BUYER', 'ADMINISTRATOR'],
			},
			{
				id: 'messages',
				labelKey: 'nav.messages',
				icon: Icons.chats,
				href: '/chat',
				badge: { variant: 'default' },
				roles: ['BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},

	// ── Moderation: queue, complaints, reviews, verifications ─────
	{
		id: 'moderation',
		labelKey: 'nav.group.moderation',
		items: [
			{
				id: 'queue',
				labelKey: 'nav.queue',
				icon: Icons.clipboardCheck,
				href: ROUTES.MODERATOR_PRODUCTS,
				badge: { variant: 'warn' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'complaints',
				labelKey: 'nav.complaints',
				icon: Icons.warning,
				href: ROUTES.MODERATOR_COMPLAINTS,
				badge: { variant: 'danger' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'reviews',
				labelKey: 'nav.reviews',
				icon: Icons.star,
				href: ROUTES.MODERATOR_REVIEWS,
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'verifications',
				labelKey: 'nav.verifications',
				icon: Icons.userShield,
				href: ROUTES.MODERATOR_VERIFICATION,
				badge: { variant: 'warn' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},

	// ── Admin: user mgmt, categories, platform, audit ─────────────
	{
		id: 'admin',
		labelKey: 'nav.group.adminGroup',
		items: [
			{
				id: 'users',
				labelKey: 'nav.users',
				icon: Icons.users,
				href: ROUTES.ADMIN_USERS,
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'categories',
				labelKey: 'nav.categories',
				icon: Icons.category,
				href: ROUTES.ADMIN_CATEGORIES,
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'platform',
				labelKey: 'nav.platform',
				icon: Icons.settings,
				href: ROUTES.ADMIN_SETTINGS,
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'audit',
				labelKey: 'nav.audit',
				icon: Icons.file,
				href: ROUTES.ADMIN_AUDIT,
				roles: ['ADMINISTRATOR'],
			},
		],
	},
];

/* ── badge color map ─────────────────────────────────────────── */
const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
	default: { bg: tokens.surface2, color: tokens.ink2 },
	warn: { bg: tokens.amber, color: tokens.amberInk },
	danger: { bg: tokens.coral, color: '#fff' },
};

// Phase 13: replace with counts from API/store selectors.
const NAV_BADGE_COUNTS: Partial<Record<string, number>> = {};
const WHATS_NEW_COUNT = 0;

/* ── role badge map ──────────────────────────────────────────── */
const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
	BUYER: { bg: tokens.accentSoft, color: tokens.accentInk, label: 'Buyer' },
	SELLER: { bg: '#ede9fe', color: '#5b21b6', label: 'Seller' },
	MODERATOR: { bg: tokens.amber, color: tokens.amberInk, label: 'Moderator' },
	ADMINISTRATOR: { bg: tokens.coralSoft, color: tokens.coralInk, label: 'Admin' },
};

/* ── component ───────────────────────────────────────────────── */
export default function AppSidebar() {
	const { t } = useTranslation();
	const user = useAuthStore((s) => s.user);
	const role = user?.role ?? GUEST;
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

	const initials = user?.profile
		? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
		: (user?.email?.[0] ?? '?').toUpperCase();

	return (
		<Box
			component="aside"
			sx={{
				width: SIDEBAR_WIDTH,
				minWidth: SIDEBAR_WIDTH,
				height: '100vh',
				position: 'sticky',
				top: 0,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: '22px',
				padding: '24px 18px',
				background: tokens.bg,
				borderRight: `1px solid ${tokens.line}`,
				flexShrink: 0,
				'&::-webkit-scrollbar': { width: 6 },
				'&::-webkit-scrollbar-thumb': { background: tokens.line, borderRadius: 3 },
			}}
		>
			{/* ── brand ── */}
			<Box
				component={NavLink}
				to={ROUTES.HOME}
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					padding: '0 8px',
					textDecoration: 'none',
					color: 'inherit',
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
						flexShrink: 0,
					}}
				>
					K
				</Box>
				<Typography
					sx={{
						fontWeight: 800,
						fontSize: 17,
						letterSpacing: '-0.02em',
						color: tokens.ink1,
						'& .dot': { color: tokens.accent },
					}}
				>
					Krydix<span className="dot">.</span>
				</Typography>
			</Box>

			{/* ── nav groups ── */}
			{NAV_GROUPS.map((group) => {
				const visibleItems = group.items
					.filter((item) => item.roles.includes(role))
					.map((item) => {
						if (!item.badge) {
							return item;
						}

						const count = NAV_BADGE_COUNTS[item.id] ?? 0;
						return {
							...item,
							badge: count > 0 ? { ...item.badge, count } : undefined,
						};
					});
				if (visibleItems.length === 0) return null;
				return (
					<Box key={group.id} sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
						<Typography
							sx={{
								fontSize: '10.5px',
								fontWeight: 700,
								letterSpacing: '0.1em',
								textTransform: 'uppercase',
								color: tokens.ink3,
								padding: '0 12px 8px',
							}}
						>
							{t(group.labelKey)}
						</Typography>
						{visibleItems.map((item) => (
							<SidebarNavItem key={item.id} item={item} />
						))}
					</Box>
				);
			})}

			{/* ── footer ── */}
			{user ? (
				<>
					{/* Authenticated footer — opens user menu */}
					<Box
						component="button"
						onClick={(e) => setMenuAnchor(e.currentTarget)}
						sx={{
							marginTop: 'auto',
							padding: '10px',
							borderRadius: '12px',
							background: menuAnchor ? tokens.accentSoft : tokens.surface,
							border: `1px solid ${menuAnchor ? tokens.accent : tokens.line}`,
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
							cursor: 'pointer',
							textAlign: 'left',
							width: '100%',
							transition: 'border-color 120ms, background 120ms',
							'&:hover': {
								borderColor: tokens.accent,
								background: tokens.accentSoft,
								'& .foot-chev': { color: tokens.accent },
							},
						}}
					>
						<Box
							sx={{
								width: 32,
								height: 32,
								borderRadius: '50%',
								background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.cyan})`,
								color: '#fff',
								display: 'grid',
								placeItems: 'center',
								fontSize: 12,
								fontWeight: 700,
								flexShrink: 0,
							}}
						>
							{initials}
						</Box>
						<Box sx={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
							<Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink1 }}>
								{user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email}
							</Typography>
							<Typography
								sx={{
									fontSize: 11,
									color: tokens.ink3,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{user.email}
							</Typography>
						</Box>
						<Box
							className="foot-chev"
							sx={{
								color: menuAnchor ? tokens.accent : tokens.ink3,
								transition: 'color 120ms',
								fontSize: 12,
							}}
						>
							<FontAwesomeIcon icon={menuAnchor ? faChevronUp : faChevronRight} />
						</Box>
					</Box>

					{/* User menu popover */}
					<Popover
						open={Boolean(menuAnchor)}
						anchorEl={menuAnchor}
						onClose={() => setMenuAnchor(null)}
						anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
						transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
						PaperProps={{
							sx: {
								width: 288,
								borderRadius: '16px',
								border: `1px solid ${tokens.line}`,
								boxShadow: tokens.shadowMd,
								ml: '8px',
								mb: '8px',
								overflow: 'hidden',
							},
						}}
					>
						<UserMenu user={user} onClose={() => setMenuAnchor(null)} />
					</Popover>
				</>
			) : (
				/* Guest sign-in prompt */
				<Box
					component={NavLink}
					to={ROUTES.LOGIN}
					sx={{
						marginTop: 'auto',
						padding: '10px',
						borderRadius: '12px',
						background: tokens.surface,
						border: `1px solid ${tokens.line}`,
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						textDecoration: 'none',
						color: 'inherit',
						transition: 'border-color 120ms, background 120ms, transform 120ms',
						'&:hover': {
							borderColor: tokens.accent,
							background: tokens.accentSoft,
							transform: 'translateY(-1px)',
							'& .sign-in-label': { color: tokens.accentInk },
							'& .sign-in-chev': { color: tokens.accent },
						},
					}}
				>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: '50%',
							background: tokens.surface2,
							border: `1px solid ${tokens.line}`,
							color: tokens.ink3,
							display: 'grid',
							placeItems: 'center',
							fontSize: 13,
							flexShrink: 0,
						}}
					>
						<FontAwesomeIcon icon={Icons.signIn} />
					</Box>
					<Box sx={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
						<Typography
							className="sign-in-label"
							sx={{ fontSize: 13, fontWeight: 600, color: tokens.ink1, transition: 'color 120ms' }}
						>
							{t('shell.guest.signIn')}
						</Typography>
						<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>
							{t('shell.guest.subtitle')}
						</Typography>
					</Box>
					<Box
						className="sign-in-chev"
						sx={{ color: tokens.ink3, transition: 'color 120ms', fontSize: 13 }}
					>
						<FontAwesomeIcon icon={faChevronRight} />
					</Box>
				</Box>
			)}
		</Box>
	);
}

/* ── SidebarNavItem ──────────────────────────────────────────── */
function SidebarNavItem({ item }: { item: NavItem }) {
	const { t } = useTranslation();
	const badgeStyle = item.badge ? BADGE_STYLES[item.badge.variant] : null;

	return (
		<Box
			component={NavLink}
			to={item.href}
			end={item.href === '/account' || item.href === ROUTES.SELLER_DASHBOARD}
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '12px',
				padding: '8px 12px',
				borderRadius: '8px',
				color: tokens.ink2,
				textDecoration: 'none',
				fontSize: '13.5px',
				fontWeight: 500,
				transition: 'background 120ms, color 120ms',
				'& .nav-icon': { color: tokens.ink3, transition: 'color 120ms' },
				'&:hover': {
					background: tokens.surface2,
					color: tokens.ink1,
					'& .nav-icon': { color: tokens.ink2 },
				},
				'&.active': {
					background: tokens.accentSoft,
					color: tokens.accentInk,
					fontWeight: 600,
					'& .nav-icon': { color: tokens.accent },
					'& .nav-badge-default': { background: tokens.accent, color: '#fff' },
				},
			}}
		>
			<Box
				component="span"
				className="nav-icon"
				sx={{ width: 18, flexShrink: 0, textAlign: 'center' }}
			>
				<FontAwesomeIcon icon={item.icon} style={{ width: 18, height: 18 }} />
			</Box>
			<Box component="span" sx={{ flex: 1 }}>
				{t(item.labelKey)}
			</Box>
			{item.badge && (
				<Box
					component="span"
					className={item.badge.variant === 'default' ? 'nav-badge-default' : undefined}
					sx={{
						fontSize: '11px',
						fontWeight: 700,
						background: badgeStyle!.bg,
						color: badgeStyle!.color,
						padding: '1px 7px',
						borderRadius: '999px',
						minWidth: 22,
						textAlign: 'center',
					}}
				>
					{item.badge.count}
				</Box>
			)}
		</Box>
	);
}

/* ── MenuTag type ────────────────────────────────────────────── */
interface MenuTag {
	label: string;
	bg: string;
	color: string;
}

/* ── UserMenu ────────────────────────────────────────────────── */
function UserMenu({ user, onClose }: { user: AuthUser; onClose: () => void }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const clearAuth = useAuthStore((s) => s.clearAuth);
	const [langSubAnchor, setLangSubAnchor] = useState<HTMLElement | null>(null);
	const [currentLangCode, setCurrentLangCode] = useState<'en' | 'uk'>(
		i18n.language.startsWith('uk') ? 'uk' : 'en'
	);
	const langRowRef = useRef<HTMLDivElement>(null);
	const langDisplay = currentLangCode === 'uk' ? 'Українська' : 'English';

	const changeLang = (code: 'en' | 'uk') => {
		i18n.changeLanguage(code);
		setCurrentLangCode(code);
		setLangSubAnchor(null);
	};

	const initials = user.profile
		? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
		: user.email[0].toUpperCase();
	const fullName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email;

	const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.BUYER;

	const newTag: MenuTag | undefined =
		WHATS_NEW_COUNT > 0
			? { label: String(WHATS_NEW_COUNT), bg: tokens.amber, color: tokens.amberInk }
			: undefined;

	const handleLogout = () => {
		clearAuth();
		onClose();
		navigate(ROUTES.LOGIN);
	};

	const go = (to: string) => {
		navigate(to);
		onClose();
	};

	return (
		<Box sx={{ padding: '6px' }}>
			{/* ── header ── */}
			<Box
				sx={{
					padding: '10px 12px 14px',
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
				}}
			>
				<Box
					sx={{
						width: 38,
						height: 38,
						borderRadius: '50%',
						background: `linear-gradient(135deg, ${tokens.accent}, ${tokens.cyan})`,
						color: '#fff',
						display: 'grid',
						placeItems: 'center',
						fontSize: 13,
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{initials}
				</Box>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography sx={{ fontSize: 13.5, fontWeight: 700, color: tokens.ink1, lineHeight: 1.3 }}>
						{fullName}
					</Typography>
					<Typography
						sx={{
							fontSize: 11.5,
							color: tokens.ink3,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{user.email}
					</Typography>
				</Box>
				<Box
					sx={{
						padding: '3px 9px',
						borderRadius: '999px',
						background: badge.bg,
						color: badge.color,
						fontSize: 11,
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{badge.label}
				</Box>
			</Box>

			<Divider sx={{ borderColor: tokens.line, mx: '6px' }} />

			{/* ── group 1: profile / settings ── */}
			<Box sx={{ padding: '4px 0' }}>
				<MenuRow
					icon={Icons.user}
					label={t('shell.menu.profile')}
					onClick={() => go(ROUTES.ACCOUNT_PROFILE)}
				/>
				<MenuRow
					icon={Icons.settings}
					label={t('shell.menu.settings')}
					onClick={() => go(ROUTES.ACCOUNT_SETTINGS)}
				/>
			</Box>

			<Divider sx={{ borderColor: tokens.line, mx: '6px' }} />

			{/* ── group 2: language / help / what's new / feedback ── */}
			<Box sx={{ padding: '4px 0' }}>
				<Box ref={langRowRef}>
					<MenuRow
						icon={Icons.globe}
						label={t('shell.menu.language')}
						meta={langDisplay}
						onClick={() => setLangSubAnchor(langRowRef.current)}
					/>
				</Box>
				<Popover
					open={Boolean(langSubAnchor)}
					anchorEl={langSubAnchor}
					onClose={() => setLangSubAnchor(null)}
					anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
					transformOrigin={{ vertical: 'center', horizontal: 'left' }}
					PaperProps={{
						sx: {
							minWidth: 160,
							borderRadius: '12px',
							border: `1px solid ${tokens.line}`,
							boxShadow: tokens.shadowMd,
							ml: '8px',
							overflow: 'hidden',
							padding: '6px',
						},
					}}
				>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
						{(['en', 'uk'] as const).map((code) => (
							<Box
								key={code}
								component="button"
								onClick={() => changeLang(code)}
								sx={{
									width: '100%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '9px 14px',
									borderRadius: '8px',
									border: 'none',
									background: currentLangCode === code ? tokens.accentSoft : 'transparent',
									color: currentLangCode === code ? tokens.accentInk : tokens.ink1,
									fontSize: 13,
									fontWeight: currentLangCode === code ? 700 : 500,
									cursor: 'pointer',
									transition: 'background 100ms',
									'&:hover': currentLangCode !== code ? { background: tokens.surface2 } : {},
								}}
							>
								{code === 'en' ? 'English' : 'Українська'}
								{currentLangCode === code && (
									<Box component="span" sx={{ fontSize: 12, color: tokens.accent }}>
										✓
									</Box>
								)}
							</Box>
						))}
					</Box>
				</Popover>
				<MenuRow
					icon={Icons.question}
					label={t('shell.menu.help')}
					onClick={() => go('/support')}
				/>
				<MenuRow
					icon={Icons.bolt}
					label={t('shell.menu.whatsNew')}
					tag={newTag}
					onClick={() => onClose()}
				/>
				<MenuRow icon={Icons.chat} label={t('shell.menu.feedback')} onClick={() => onClose()} />
			</Box>

			<Divider sx={{ borderColor: tokens.line, mx: '6px' }} />

			{/* ── footer: sign out ── */}
			<Box sx={{ padding: '4px 0' }}>
				<MenuRow
					icon={Icons.signOut}
					label={t('shell.menu.signOut')}
					onClick={handleLogout}
					danger
				/>
			</Box>
		</Box>
	);
}

/* ── MenuRow ─────────────────────────────────────────────────── */
function MenuRow({
	icon,
	label,
	onClick,
	danger,
	tag,
	meta,
}: {
	icon: (typeof Icons)[keyof typeof Icons];
	label: string;
	onClick?: () => void;
	danger?: boolean;
	tag?: MenuTag;
	meta?: string;
}) {
	return (
		<Box
			component={onClick ? 'button' : 'div'}
			onClick={onClick}
			sx={{
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				padding: '7px 12px',
				borderRadius: '8px',
				border: 'none',
				background: 'transparent',
				color: danger ? tokens.coral : tokens.ink1,
				fontSize: 13,
				fontWeight: 400,
				cursor: onClick ? 'pointer' : 'default',
				textAlign: 'left',
				transition: 'background 100ms',
				'&:hover': onClick ? { background: danger ? tokens.coralSoft : tokens.surface2 } : {},
			}}
		>
			<Box
				sx={{
					width: 16,
					textAlign: 'center',
					color: danger ? tokens.coral : tokens.ink3,
					fontSize: 13,
					flexShrink: 0,
				}}
			>
				<FontAwesomeIcon icon={icon} />
			</Box>
			<Box component="span" sx={{ flex: 1 }}>
				{label}
			</Box>
			{meta && (
				<Box component="span" sx={{ fontSize: 12, color: tokens.ink3 }}>
					{meta}
				</Box>
			)}
			{tag && (
				<Box
					component="span"
					sx={{
						fontSize: 10.5,
						fontWeight: 700,
						background: tag.bg,
						color: tag.color,
						padding: '2px 7px',
						borderRadius: '999px',
					}}
				>
					{tag.label}
				</Box>
			)}
		</Box>
	);
}
