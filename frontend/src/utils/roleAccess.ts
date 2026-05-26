import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';

/** Platform staff — moderators and administrators (not the admin panel). */
export const STAFF_ROLES: readonly Role[] = [Role.MODERATOR, Role.ADMIN];

export enum RouteZone {
	/** Public marketplace pages — catalog, product, support, etc. */
	GLOBAL = 'GLOBAL',
	/** Any signed-in user. */
	AUTH = 'AUTH',
	/** Buyer account: orders, settings, notifications. */
	BUYER = 'BUYER',
	/** Cart, wishlist, checkout — buying flow (guests may use cart). */
	BUYER_COMMERCE = 'BUYER_COMMERCE',
	/** Seller cabinet and seller chat. */
	SELLER = 'SELLER',
	/** Moderator panel routes. */
	MODERATOR = 'MODERATOR',
	/** Admin panel routes. */
	ADMIN = 'ADMIN',
}

export function isStaffRole(role: Role | string | undefined): boolean {
	return !!role && STAFF_ROLES.includes(role as Role);
}

export function isAdminRole(role: Role | string | undefined): boolean {
	return role === Role.ADMIN;
}

export function isBuyerRole(role: Role | string | undefined): boolean {
	return role === Role.BUYER;
}

export function isSellerRole(role: Role | string | undefined): boolean {
	return role === Role.SELLER;
}

export function isGuestRole(role: Role | string | undefined): boolean {
	return !role || role === Role.GUEST;
}

/** Buyer commerce actions (cart, wishlist, checkout). Guests + buyers + staff. */
export function canUseBuyerCommerce(role: Role | string | undefined): boolean {
	if (isStaffRole(role)) return true;
	if (isGuestRole(role)) return true;
	return isBuyerRole(role);
}

/** Purchase actions for authenticated users (wishlist, checkout). */
export function canBuyAsUser(role: Role | string | undefined): boolean {
	if (isStaffRole(role)) return true;
	return isBuyerRole(role);
}

/** Seller-only selling actions and cabinet. */
export function canSell(role: Role | string | undefined): boolean {
	if (isStaffRole(role)) return true;
	return isSellerRole(role);
}

export function canAccessRouteZone(
	role: Role | string | undefined,
	zone: RouteZone,
	isAuthenticated: boolean,
): boolean {
	if (zone === RouteZone.GLOBAL) return true;

	if (!isAuthenticated) {
		return zone === RouteZone.BUYER_COMMERCE;
	}

	if (zone === RouteZone.ADMIN) {
		return isAdminRole(role);
	}

	if (zone === RouteZone.MODERATOR) {
		return role === Role.MODERATOR || isAdminRole(role);
	}

	if (isStaffRole(role)) return true;

	switch (zone) {
		case RouteZone.AUTH:
			return true;
		case RouteZone.BUYER:
			return isBuyerRole(role);
		case RouteZone.BUYER_COMMERCE:
			return isBuyerRole(role);
		case RouteZone.SELLER:
			return isSellerRole(role);
		default:
			return false;
	}
}

/** Nav item visibility — administrators see all sections; others match declared roles. */
export function canSeeNavForRoles(itemRoles: readonly string[], userRole: string): boolean {
	if (isAdminRole(userRole)) return true;
	return itemRoles.includes(userRole);
}

/** Default landing route after visiting `/` or clicking the brand home link. */
export function getHomeRouteForRole(role: Role | string | undefined): string {
	switch (role) {
		case Role.SELLER:
			return ROUTES.SELLER_DASHBOARD;
		case Role.ADMIN:
			return ROUTES.ADMIN;
		case Role.MODERATOR:
			return ROUTES.MODERATOR;
		case Role.BUYER:
			return ROUTES.ACCOUNT;
		default:
			return ROUTES.PRODUCTS;
	}
}
