import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import {
	RouteZone,
	canAccessRouteZone,
	canBuyAsUser,
	canImportExport,
	canSeeNavForRoles,
	canSell,
	canUseBuyerCommerce,
	getHomeRouteForRole,
	getProfileRouteForUser,
	getProfileMenuLabelKey,
	getPublicProfileRoute,
	getSettingsRouteForUser,
	isAdminRole,
	isBuyerRole,
	isGuestRole,
	isSellerRole,
	isStaffRole,
} from '@/utils/roleAccess';

describe('roleAccess', () => {
	it('identifies staff and admin roles', () => {
		expect(isStaffRole(Role.MODERATOR)).toBe(true);
		expect(isStaffRole(Role.ADMIN)).toBe(true);
		expect(isStaffRole(Role.BUYER)).toBe(false);
		expect(isAdminRole(Role.ADMIN)).toBe(true);
		expect(isAdminRole(Role.MODERATOR)).toBe(false);
	});

	it('identifies buyer, seller, guest roles', () => {
		expect(isBuyerRole(Role.BUYER)).toBe(true);
		expect(isSellerRole(Role.SELLER)).toBe(true);
		expect(isGuestRole(undefined)).toBe(true);
		expect(isGuestRole(Role.GUEST)).toBe(true);
	});

	it('allows buyer commerce for guests, buyers, and staff', () => {
		expect(canUseBuyerCommerce(undefined)).toBe(true);
		expect(canUseBuyerCommerce(Role.BUYER)).toBe(true);
		expect(canUseBuyerCommerce(Role.SELLER)).toBe(false);
		expect(canUseBuyerCommerce(Role.MODERATOR)).toBe(true);
	});

	it('allows buying for buyers and staff only', () => {
		expect(canBuyAsUser(Role.BUYER)).toBe(true);
		expect(canBuyAsUser(Role.SELLER)).toBe(false);
		expect(canBuyAsUser(Role.ADMIN)).toBe(true);
	});

	it('allows selling for sellers and staff', () => {
		expect(canSell(Role.SELLER)).toBe(true);
		expect(canSell(Role.BUYER)).toBe(false);
		expect(canSell(Role.MODERATOR)).toBe(true);
	});

	it('enforces route zones', () => {
		expect(canAccessRouteZone(Role.ADMIN, RouteZone.ADMIN, true)).toBe(true);
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.ADMIN, true)).toBe(false);
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.MODERATOR, true)).toBe(true);
		expect(canAccessRouteZone(Role.BUYER, RouteZone.SELLER, true)).toBe(false);
		expect(canAccessRouteZone(undefined, RouteZone.BUYER_COMMERCE, false)).toBe(true);
	});

	it('returns unified home route for authenticated roles', () => {
		expect(getHomeRouteForRole(Role.SELLER)).toBe(ROUTES.DASHBOARD);
		expect(getHomeRouteForRole(Role.ADMIN)).toBe(ROUTES.DASHBOARD);
		expect(getHomeRouteForRole(Role.MODERATOR)).toBe(ROUTES.DASHBOARD);
		expect(getHomeRouteForRole(Role.BUYER)).toBe(ROUTES.DASHBOARD);
		expect(getHomeRouteForRole(undefined)).toBe(ROUTES.PRODUCTS);
	});

	it('returns profile and settings routes', () => {
		expect(getProfileRouteForUser({ id: 's1', role: Role.SELLER })).toBe(ROUTES.SELLER_PUBLIC('s1'));
		expect(getProfileRouteForUser({ id: 'b1', role: Role.BUYER })).toBe(ROUTES.USER_PUBLIC('b1'));
		expect(getProfileRouteForUser({ id: 'm1', role: Role.MODERATOR })).toBe(ROUTES.USER_PUBLIC('m1'));
		expect(getPublicProfileRoute('s1', Role.SELLER)).toBe(ROUTES.SELLER_PUBLIC('s1'));
		expect(getPublicProfileRoute('b1', Role.BUYER)).toBe(ROUTES.USER_PUBLIC('b1'));
		expect(getProfileMenuLabelKey(Role.SELLER)).toBe('shell.menu.store');
		expect(getProfileMenuLabelKey(Role.BUYER)).toBe('shell.menu.profile');
		expect(getSettingsRouteForUser({ id: 's1', role: Role.SELLER })).toBe(ROUTES.SETTINGS);
		expect(getSettingsRouteForUser({ id: 'b1', role: Role.BUYER })).toBe(ROUTES.SETTINGS);
	});

	it('allows import/export for seller, moderator, and admin only', () => {
		expect(canImportExport(Role.SELLER)).toBe(true);
		expect(canImportExport(Role.MODERATOR)).toBe(true);
		expect(canImportExport(Role.ADMIN)).toBe(true);
		expect(canImportExport(Role.BUYER)).toBe(false);
		expect(canImportExport(undefined)).toBe(false);
	});

	it('shows nav items for matching roles; admin sees all', () => {
		expect(canSeeNavForRoles([Role.BUYER], Role.BUYER)).toBe(true);
		expect(canSeeNavForRoles([Role.BUYER], Role.SELLER)).toBe(false);
		expect(canSeeNavForRoles([Role.BUYER], Role.ADMIN)).toBe(true);
	});
});
