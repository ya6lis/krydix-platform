import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types/context.js';
import { IMPORT_EXPORT_ROLES, type ImportExportRole } from '../constants/importExport.js';

export function canImportExport(role: string | undefined): boolean {
	return !!role && IMPORT_EXPORT_ROLES.includes(role as ImportExportRole);
}

export function requireImportExport(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (!canImportExport(ctx.user.role)) {
		throw new GraphQLError('Import/export access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return ctx.user;
}
