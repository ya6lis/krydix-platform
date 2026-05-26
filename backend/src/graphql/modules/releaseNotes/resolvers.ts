import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import { Role } from '../../../constants/enums.js';
import * as releaseNoteService from '../../../services/releaseNoteService.js';

function requireAdmin(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (ctx.user.role !== Role.ADMIN) {
		throw new GraphQLError('Admin access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return ctx.user;
}

export const releaseNotesResolvers = {
	Query: {
		latestReleaseNote: async (_: unknown, { language }: { language: 'EN' | 'UK' }) =>
			releaseNoteService.getLatestReleaseNote(language),

		publishedReleaseNotes: async (
			_: unknown,
			{ language, limit }: { language: 'EN' | 'UK'; limit?: number | null },
		) => releaseNoteService.getPublishedReleaseNotes(language, limit ?? 10),

		unseenReleaseNotesCount: async (
			_: unknown,
			{ sincePublishedAt }: { sincePublishedAt?: string | null },
		) => releaseNoteService.getUnseenReleaseNotesCount(sincePublishedAt),

		adminReleaseNotes: async (_: unknown, { input }: { input?: unknown }, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return releaseNoteService.getAdminReleaseNotes(input);
		},

		adminReleaseNote: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return releaseNoteService.getAdminReleaseNoteById(id);
		},
	},

	Mutation: {
		createReleaseNote: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
			const admin = requireAdmin(ctx);
			return releaseNoteService.createReleaseNote(admin.id, input);
		},

		updateReleaseNote: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
			const admin = requireAdmin(ctx);
			return releaseNoteService.updateReleaseNote(admin.id, input);
		},

		deleteReleaseNote: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const admin = requireAdmin(ctx);
			return releaseNoteService.deleteReleaseNote(admin.id, id);
		},
	},
};
