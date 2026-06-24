import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/publicProfileService.js';

export const publicProfileResolvers = {
	Query: {
		publicSellerProfile: async (
			_: unknown,
			{ sellerId }: { sellerId: string },
			_ctx: GraphQLContext
		) => {
			return service.getPublicSellerProfile(sellerId);
		},
		publicUserProfile: async (_: unknown, { userId }: { userId: string }, _ctx: GraphQLContext) => {
			return service.getPublicUserProfile(userId);
		},
	},
};
