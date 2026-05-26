import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import { Role } from '../../../constants/enums.js';
import * as feedbackService from '../../../services/feedbackService.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

function requireAdmin(ctx: GraphQLContext) {
	const user = requireAuth(ctx);
	if (user.role !== Role.ADMIN) {
		throw new GraphQLError('Admin access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return user;
}

export const feedbackResolvers = {
	Query: {
		adminFeedbacks: async (_: unknown, { input }: { input?: unknown }, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return feedbackService.getAdminFeedbacks(input);
		},

		adminFeedbackStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return feedbackService.getAdminFeedbackStats();
		},

		adminFeedback: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return feedbackService.getAdminFeedbackById(id);
		},
	},

	Mutation: {
		submitFeedback: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return feedbackService.submitFeedback(user.id, input);
		},

		updateFeedback: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
			const admin = requireAdmin(ctx);
			return feedbackService.updateFeedbackStatus(admin.id, input);
		},
	},
};
