import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/reviewModerationService.js';
import { Role } from '../../../constants/enums.js';

function requireModerator(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (ctx.user.role !== Role.MODERATOR && ctx.user.role !== Role.ADMIN) {
		throw new GraphQLError('Moderator access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return ctx.user;
}

export const reviewModerationResolvers = {
	Query: {
		moderationReviews: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					tab?: string;
					search?: string;
					ratingFilter?: string;
					target?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext,
		) => {
			requireModerator(ctx);
			return service.getModerationReviews({
				tab: (input?.tab as never) ?? 'PENDING',
				search: input?.search,
				ratingFilter: input?.ratingFilter,
				target: (input?.target as never) ?? 'ALL',
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 6,
			});
		},
	},

	Mutation: {
		approveReview: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireModerator(ctx);
			return service.approveReview(id, user.id);
		},

		hideReview: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireModerator(ctx);
			return service.hideReview(id, user.id);
		},

		deleteReview: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireModerator(ctx);
			return service.deleteReview(id, user.id);
		},
	},
};
