import { GraphQLError } from 'graphql';
import { canImportExport, requireImportExport } from '../importExportAccess.js';
import type { GraphQLContext } from '../../types/context.js';

describe('importExportAccess', () => {
	it('allows seller, moderator, and admin', () => {
		expect(canImportExport('SELLER')).toBe(true);
		expect(canImportExport('MODERATOR')).toBe(true);
		expect(canImportExport('ADMIN')).toBe(true);
	});

	it('denies buyer and guest', () => {
		expect(canImportExport('BUYER')).toBe(false);
		expect(canImportExport(undefined)).toBe(false);
	});

	it('requireImportExport throws for unauthorized roles', () => {
		const ctx = { user: { id: '1', role: 'BUYER', email: 'b@test.com' } } as GraphQLContext;
		expect(() => requireImportExport(ctx)).toThrow(GraphQLError);
	});

	it('requireImportExport returns user for allowed roles', () => {
		const ctx = { user: { id: '1', role: 'MODERATOR', email: 'm@test.com' } } as GraphQLContext;
		expect(requireImportExport(ctx).role).toBe('MODERATOR');
	});
});
