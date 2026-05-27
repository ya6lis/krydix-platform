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
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.DASHBOARD },
			{ labelKey: 'nav.orders', icon: Icons.order, path: ROUTES.ORDERS },
			{ labelKey: 'nav.profile', icon: Icons.user, path: ROUTES.PROFILE },
			{ labelKey: 'nav.reviews', icon: Icons.star, path: ROUTES.MY_REVIEWS },
			{ labelKey: 'nav.notifications', icon: Icons.bell, path: ROUTES.NOTIFICATIONS },
		],
	},
];

const sellerNav: NavSection[] = [
	{
		titleKey: 'nav.sections.seller',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.DASHBOARD },
			{ labelKey: 'nav.products', icon: Icons.product, path: ROUTES.SELLER_PRODUCTS },
			{ labelKey: 'nav.orders', icon: Icons.order, path: ROUTES.SELLER_ORDERS },
			{ labelKey: 'nav.verification', icon: Icons.shield, path: ROUTES.SELLER_VERIFICATION },
			{ labelKey: 'nav.settings', icon: Icons.settings, path: ROUTES.SETTINGS },
		],
	},
];

const moderatorNav: NavSection[] = [
	{
		titleKey: 'nav.sections.moderation',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.DASHBOARD },
			{ labelKey: 'nav.productModeration', icon: Icons.product, path: ROUTES.PRODUCT_MODERATION },
			{ labelKey: 'nav.allProducts', icon: Icons.product, path: ROUTES.MANAGE_PRODUCTS },
			{ labelKey: 'nav.allReviews', icon: Icons.star, path: ROUTES.MANAGE_REVIEWS },
			{ labelKey: 'nav.complaints', icon: Icons.flag, path: ROUTES.COMPLAINTS },
			{ labelKey: 'nav.reviewModeration', icon: Icons.star, path: ROUTES.REVIEW_MODERATION },
			{ labelKey: 'nav.users', icon: Icons.users, path: ROUTES.USERS },
			{ labelKey: 'nav.userSupport', icon: Icons.chat, path: ROUTES.STAFF_SUPPORT },
		],
	},
];

const adminNav: NavSection[] = [
	{
		titleKey: 'nav.sections.management',
		items: [
			{ labelKey: 'nav.dashboard', icon: Icons.chart, path: ROUTES.DASHBOARD },
			{ labelKey: 'nav.users', icon: Icons.user, path: ROUTES.USERS },
			{ labelKey: 'nav.categories', icon: Icons.category, path: ROUTES.CATEGORIES },
			{ labelKey: 'nav.products', icon: Icons.product, path: ROUTES.MANAGE_PRODUCTS },
			{ labelKey: 'nav.allReviews', icon: Icons.star, path: ROUTES.MANAGE_REVIEWS },
			{ labelKey: 'nav.complaints', icon: Icons.flag, path: ROUTES.COMPLAINTS },
			{ labelKey: 'nav.feedback', icon: Icons.chat, path: ROUTES.FEEDBACK },
			{ labelKey: 'nav.userSupport', icon: Icons.chat, path: ROUTES.STAFF_SUPPORT },
			{ labelKey: 'nav.releaseNotes', icon: Icons.bolt, path: ROUTES.RELEASE_NOTES },
		],
	},
	{
		titleKey: 'nav.sections.system',
		items: [
			{ labelKey: 'nav.settings', icon: Icons.settings, path: ROUTES.SETTINGS },
			{ labelKey: 'nav.audit', icon: Icons.chartLine, path: ROUTES.AUDIT },
		],
	},
];

export const NAV_CONFIG: Record<string, NavSection[]> = {
	[Role.BUYER]: buyerNav,
	[Role.SELLER]: sellerNav,
	[Role.MODERATOR]: moderatorNav,
	[Role.ADMIN]: adminNav,
};
