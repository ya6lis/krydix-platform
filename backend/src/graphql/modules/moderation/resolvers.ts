import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/moderationService.js';
import { Role } from '../../../constants/enums.js';
import type { ModerationQueueFilterType } from '../../../repositories/moderationRepository.js';

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

export const moderationResolvers = {
	Query: {
		moderationQueue: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					filterType?: ModerationQueueFilterType;
					search?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext
		) => {
			requireModerator(ctx);
			return service.getModerationQueue({
				filterType: input?.filterType ?? 'PENDING',
				search: input?.search,
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 20,
			});
		},

		moderationItem: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			requireModerator(ctx);
			return service.getModerationItem(id);
		},
	},

	Mutation: {
		approveProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireModerator(ctx);
			return service.approveProduct(id, user.id);
		},

		rejectProduct: async (
			_: unknown,
			{ id, reason }: { id: string; reason: string },
			ctx: GraphQLContext
		) => {
			const user = requireModerator(ctx);
			return service.rejectProduct(id, user.id, reason);
		},

		bulkApproveProducts: async (_: unknown, { ids }: { ids: string[] }, ctx: GraphQLContext) => {
			const user = requireModerator(ctx);
			return service.bulkApproveProducts(ids, user.id);
		},
	},
};
