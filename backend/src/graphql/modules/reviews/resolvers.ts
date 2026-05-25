import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/reviewService.js';

function optionalAuth(ctx: GraphQLContext) {
	return ctx.user?.id;
}

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

export const reviewsResolvers = {
	Query: {
		productReviews: async (
			_: unknown,
			{ input }: { input: { productId: string; page?: number; pageSize?: number } },
			ctx: GraphQLContext
		) => {
			return service.getProductReviews(
				input.productId,
				{ page: input.page, pageSize: input.pageSize },
				optionalAuth(ctx)
			);
		},

		reviewEligibility: async (
			_: unknown,
			{ productId }: { productId: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return service.getReviewEligibility(productId, user.id);
		},
	},

	Mutation: {
		createProductReview: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return service.createProductReview(user.id, input as never);
		},

		editProductReview: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const { reviewId, ...rest } = input as { reviewId: string };
			return service.editProductReview(user.id, reviewId, rest);
		},

		respondToReview: async (
			_: unknown,
			{ reviewId, reply }: { reviewId: string; reply: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return service.respondToReview(user.id, reviewId, reply);
		},

		flagReview: async (
			_: unknown,
			{ reviewId, reason }: { reviewId: string; reason: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return service.flagReview(user.id, reviewId, reason);
		},
	},
};
