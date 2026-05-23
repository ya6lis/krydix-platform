import { NavLink } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/constants/routes';

/* ── width constant shared with AppShell ─────────────────────── */
export const SIDEBAR_WIDTH = 248;

/* ── role constant for unauthenticated visitors ──────────────── */
const GUEST = 'GUEST';

/* ── nav config ──────────────────────────────────────────────── */
type BadgeVariant = 'default' | 'warn' | 'danger';

interface NavItem {
	id: string;
	labelKey: string;
	icon: (typeof Icons)[keyof typeof Icons];
	href: string;
	badge?: { count: number; variant: BadgeVariant };
	roles: string[];
}

interface NavGroup {
	id: string;
	labelKey: string;
	items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
	{
		id: 'overview',
		labelKey: 'nav.group.overview',
		items: [
			{
				id: 'dashboard',
				labelKey: 'nav.dashboard',
				icon: Icons.chart,
				href: '/account',
				roles: ['BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'marketplace',
		labelKey: 'nav.group.marketplace',
		items: [
			{
				id: 'catalog',
				labelKey: 'nav.catalog',
				icon: Icons.products,
				href: '/products',
				// guests can browse catalog
				roles: [GUEST, 'BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'orders',
				labelKey: 'nav.orders',
				icon: Icons.order,
				href: '/account/orders',
				badge: { count: 20, variant: 'default' },
				roles: ['BUYER', 'SELLER', 'ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'selling',
		labelKey: 'nav.group.selling',
		items: [
			{
				id: 'verification',
				labelKey: 'nav.verification',
				icon: Icons.shield,
				href: '/seller-cabinet/verification',
				roles: ['BUYER', 'SELLER', 'ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'moderation',
		labelKey: 'nav.group.moderation',
		items: [
			{
				id: 'queue',
				labelKey: 'nav.queue',
				icon: Icons.clipboardCheck,
				href: '/moderator/products',
				badge: { count: 12, variant: 'warn' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'complaints',
				labelKey: 'nav.complaints',
				icon: Icons.warning,
				href: '/moderator/complaints',
				badge: { count: 4, variant: 'danger' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'reviews',
				labelKey: 'nav.reviews',
				icon: Icons.star,
				href: '/moderator/reviews',
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'communication',
		labelKey: 'nav.group.communication',
		items: [
			{
				id: 'messages',
				labelKey: 'nav.messages',
				icon: Icons.chats,
				href: '/chat',
				badge: { count: 3, variant: 'default' },
				roles: ['BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'admin',
		labelKey: 'nav.group.adminGroup',
		items: [
			{
				id: 'users',
				labelKey: 'nav.users',
				icon: Icons.users,
				href: '/admin/users',
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'categories',
				labelKey: 'nav.categories',
				icon: Icons.category,
				href: '/admin/categories',
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'verifications',
				labelKey: 'nav.verifications',
				icon: Icons.userShield,
				href: '/moderator/verification',
				badge: { count: 7, variant: 'warn' },
				roles: ['MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'platform',
				labelKey: 'nav.platform',
				icon: Icons.settings,
				href: '/admin/settings',
				roles: ['ADMINISTRATOR'],
			},
			{
				id: 'audit',
				labelKey: 'nav.audit',
				icon: Icons.file,
				href: '/admin/audit',
				roles: ['ADMINISTRATOR'],
			},
		],
	},
	{
		id: 'account',
		labelKey: 'nav.group.account',
		items: [
			{
				id: 'settings',
				labelKey: 'nav.settings',
				icon: Icons.settings,
				href: '/account/profile',
				roles: ['BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
			},
			{
				id: 'help',
				labelKey: 'nav.help',
				icon: Icons.question,
				href: '/support',
				// guests can access help too
				roles: [GUEST, 'BUYER', 'SELLER', 'MODERATOR', 'ADMINISTRATOR'],
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

/* ── component ───────────────────────────────────────────────── */
export default function AppSidebar() {
	const { t } = useTranslation();
	const user = useAuthStore((s) => s.user);
	// treat unauthenticated visitors as GUEST so role filter works cleanly
	const role = user?.role ?? GUEST;

	// initials from profile name, fall back to first char of email
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
				'&::-webkit-scrollbar-thumb': {
					background: tokens.line,
					borderRadius: 3,
				},
			}}
		>
			{/* ── brand — always links to home ── */}
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

			{/* ── nav groups — filtered by role ── */}
			{NAV_GROUPS.map((group) => {
				const visibleItems = group.items.filter((item) => item.roles.includes(role));
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

			{/* ── footer: user profile link or guest sign-in prompt ── */}
			{user ? (
				<Box
					component={NavLink}
					to="/account/profile"
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
						transition: 'border-color 120ms, transform 120ms',
						'&:hover': {
							borderColor: tokens.accent,
							transform: 'translateY(-1px)',
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
							{user.profile
								? `${user.profile.firstName} ${user.profile.lastName}`
								: user.email}
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
						sx={{ color: tokens.ink3, transition: 'color 120ms', fontSize: 13 }}
					>
						<FontAwesomeIcon icon={faChevronRight} />
					</Box>
				</Box>
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
							sx={{
								fontSize: 13,
								fontWeight: 600,
								color: tokens.ink1,
								transition: 'color 120ms',
							}}
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
			end={item.href === '/account'}
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
					'& .nav-badge-default': {
						background: tokens.accent,
						color: '#fff',
					},
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
