import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import {
	RouteZone,
	canAccessRouteZone,
	canBuyAsUser,
	canSeeNavForRoles,
	canSell,
	canUseBuyerCommerce,
	getHomeRouteForRole,
} from '../roleAccess';

describe('roleAccess', () => {
	it('allows admin into every authenticated zone', () => {
		expect(canAccessRouteZone(Role.ADMIN, RouteZone.BUYER, true)).toBe(true);
		expect(canAccessRouteZone(Role.ADMIN, RouteZone.SELLER, true)).toBe(true);
		expect(canAccessRouteZone(Role.ADMIN, RouteZone.MODERATOR, true)).toBe(true);
		expect(canAccessRouteZone(Role.ADMIN, RouteZone.ADMIN, true)).toBe(true);
	});

	it('allows moderator into staff zones but not the admin panel', () => {
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.BUYER, true)).toBe(true);
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.SELLER, true)).toBe(true);
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.MODERATOR, true)).toBe(true);
		expect(canAccessRouteZone(Role.MODERATOR, RouteZone.ADMIN, true)).toBe(false);
	});

	it('restricts buyers to buyer zones only', () => {
		expect(canAccessRouteZone(Role.BUYER, RouteZone.BUYER, true)).toBe(true);
		expect(canAccessRouteZone(Role.BUYER, RouteZone.BUYER_COMMERCE, true)).toBe(true);
		expect(canAccessRouteZone(Role.BUYER, RouteZone.SELLER, true)).toBe(false);
		expect(canAccessRouteZone(Role.BUYER, RouteZone.ADMIN, true)).toBe(false);
	});

	it('restricts sellers to seller zones only', () => {
		expect(canAccessRouteZone(Role.SELLER, RouteZone.SELLER, true)).toBe(true);
		expect(canAccessRouteZone(Role.SELLER, RouteZone.BUYER, true)).toBe(false);
		expect(canAccessRouteZone(Role.SELLER, RouteZone.BUYER_COMMERCE, true)).toBe(false);
	});

	it('allows guests on global and cart commerce only', () => {
		expect(canAccessRouteZone(undefined, RouteZone.GLOBAL, false)).toBe(true);
		expect(canAccessRouteZone(undefined, RouteZone.BUYER_COMMERCE, false)).toBe(true);
		expect(canAccessRouteZone(undefined, RouteZone.BUYER, false)).toBe(false);
		expect(canAccessRouteZone(undefined, RouteZone.AUTH, false)).toBe(false);
	});

	it('models buyer vs seller capabilities', () => {
		expect(canUseBuyerCommerce(Role.BUYER)).toBe(true);
		expect(canUseBuyerCommerce(Role.SELLER)).toBe(false);
		expect(canBuyAsUser(Role.BUYER)).toBe(true);
		expect(canBuyAsUser(Role.SELLER)).toBe(false);
		expect(canSell(Role.SELLER)).toBe(true);
		expect(canSell(Role.BUYER)).toBe(false);
	});

	it('resolves home route by role', () => {
		expect(getHomeRouteForRole(Role.SELLER)).toBe(ROUTES.SELLER_DASHBOARD);
		expect(getHomeRouteForRole(Role.ADMIN)).toBe(ROUTES.ADMIN);
		expect(getHomeRouteForRole(Role.MODERATOR)).toBe(ROUTES.MODERATOR);
		expect(getHomeRouteForRole(Role.BUYER)).toBe(ROUTES.ACCOUNT);
		expect(getHomeRouteForRole(undefined)).toBe(ROUTES.PRODUCTS);
	});

	it('hides admin-only nav items from moderators', () => {
		const adminOnlyRoles = [Role.ADMIN];
		expect(canSeeNavForRoles(adminOnlyRoles, Role.ADMIN)).toBe(true);
		expect(canSeeNavForRoles(adminOnlyRoles, Role.MODERATOR)).toBe(false);
		expect(canSeeNavForRoles([Role.MODERATOR, Role.ADMIN], Role.MODERATOR)).toBe(true);
	});
});
