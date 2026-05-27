import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types/context.js';
import { IMPORT_EXPORT_ROLES, type ImportExportRole } from '../constants/importExport.js';

const SELLER_CABINET_ROLES = IMPORT_EXPORT_ROLES;

export type SellerCabinetRole = ImportExportRole;

export function canAccessSellerCabinet(role: string | undefined): boolean {
	return !!role && SELLER_CABINET_ROLES.includes(role as SellerCabinetRole);
}

/** Seller cabinet APIs — seller, moderator, and admin. */
export function requireSellerCabinet(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (!canAccessSellerCabinet(ctx.user.role)) {
		throw new GraphQLError('Seller cabinet access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return ctx.user;
}
