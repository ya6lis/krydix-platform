import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { Role } from '@/constants/enums';

export interface NavItem {
	labelKey: string;
	icon: IconProp;
	path: string;
	children?: Omit<NavItem, 'children'>[];
}

export interface NavSection {
	titleKey?: string;
	items: NavItem[];
}

const buyerNav: NavSection[] = [
	{
		titleKey: 'nav.sections.account',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.ACCOUNT },
			{ labelKey: 'nav.orders', icon: Icons.order, path: ROUTES.ACCOUNT_ORDERS },
			{ labelKey: 'nav.profile', icon: Icons.user, path: ROUTES.ACCOUNT_PROFILE },
			{ labelKey: 'nav.reviews', icon: Icons.star, path: ROUTES.ACCOUNT_REVIEWS },
			{ labelKey: 'nav.notifications', icon: Icons.bell, path: ROUTES.ACCOUNT_NOTIFICATIONS },
		],
	},
];

const sellerNav: NavSection[] = [
	{
		titleKey: 'nav.sections.seller',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.SELLER_DASHBOARD },
			{ labelKey: 'nav.products', icon: Icons.product, path: ROUTES.SELLER_PRODUCTS },
			{ labelKey: 'nav.orders', icon: Icons.order, path: ROUTES.SELLER_ORDERS },
			{ labelKey: 'nav.import', icon: Icons.upload, path: ROUTES.SELLER_IMPORT },
			{ labelKey: 'nav.verification', icon: Icons.shield, path: ROUTES.SELLER_VERIFICATION },
			{ labelKey: 'nav.settings', icon: Icons.settings, path: ROUTES.SELLER_SETTINGS },
		],
	},
];

const moderatorNav: NavSection[] = [
	{
		titleKey: 'nav.sections.moderation',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.MODERATOR },
			{ labelKey: 'nav.productModeration', icon: Icons.product, path: ROUTES.MODERATOR_PRODUCT_MODERATION },
			{ labelKey: 'nav.allProducts', icon: Icons.product, path: ROUTES.MODERATOR_ALL_PRODUCTS },
			{ labelKey: 'nav.allReviews', icon: Icons.star, path: ROUTES.MODERATOR_ALL_REVIEWS },
			{ labelKey: 'nav.complaints', icon: Icons.flag, path: ROUTES.MODERATOR_COMPLAINTS },
			{ labelKey: 'nav.reviewModeration', icon: Icons.star, path: ROUTES.MODERATOR_REVIEW_MODERATION },
			{ labelKey: 'nav.users', icon: Icons.users, path: ROUTES.MODERATOR_USERS },
			{ labelKey: 'nav.verification', icon: Icons.shield, path: ROUTES.MODERATOR_VERIFICATION },
			{ labelKey: 'nav.userSupport', icon: Icons.chat, path: ROUTES.MODERATOR_SUPPORT },
		],
	},
];

const adminNav: NavSection[] = [
	{
		titleKey: 'nav.sections.management',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.ADMIN },
			{ labelKey: 'nav.users', icon: Icons.user, path: ROUTES.ADMIN_USERS },
			{ labelKey: 'nav.categories', icon: Icons.category, path: ROUTES.ADMIN_CATEGORIES },
			{ labelKey: 'nav.products', icon: Icons.product, path: ROUTES.ADMIN_PRODUCTS },
			{ labelKey: 'nav.allReviews', icon: Icons.star, path: ROUTES.ADMIN_REVIEWS },
			{ labelKey: 'nav.complaints', icon: Icons.flag, path: ROUTES.ADMIN_COMPLAINTS },
			{ labelKey: 'nav.feedback', icon: Icons.chat, path: ROUTES.ADMIN_FEEDBACK },
			{ labelKey: 'nav.userSupport', icon: Icons.chat, path: ROUTES.MODERATOR_SUPPORT },
			{ labelKey: 'nav.releaseNotes', icon: Icons.bolt, path: ROUTES.ADMIN_RELEASE_NOTES },
			{ labelKey: 'nav.reviews', icon: Icons.star, path: ROUTES.ADMIN_REVIEWS },
		],
	},
	{
		titleKey: 'nav.sections.system',
		items: [
			{ labelKey: 'nav.settings', icon: Icons.settings, path: ROUTES.ADMIN_SETTINGS },
			{ labelKey: 'nav.audit', icon: Icons.chartLine, path: ROUTES.ADMIN_AUDIT },
		],
	},
];

export const NAV_CONFIG: Record<string, NavSection[]> = {
	[Role.BUYER]: buyerNav,
	[Role.SELLER]: sellerNav,
	[Role.MODERATOR]: moderatorNav,
	[Role.ADMIN]: adminNav,
};
