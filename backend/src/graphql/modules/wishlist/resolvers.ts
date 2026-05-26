import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as wishlistService from '../../../services/wishlistService.js';
import { WishlistProductSchema } from '../../../validators/wishlistValidators.js';
import { Language } from '../../../constants/enums.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

export const wishlistResolvers = {
	Query: {
		myWishlist: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return wishlistService.getWishlist(user.id, Language.EN);
		},

		myWishlistProductIds: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return wishlistService.getWishlistProductIds(user.id);
		},
	},

	Mutation: {
		addToWishlist: async (_: unknown, args: { productId: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			const { productId } = WishlistProductSchema.parse(args);
			return wishlistService.addToWishlist(user.id, productId, Language.EN);
		},

		removeFromWishlist: async (_: unknown, args: { productId: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			const { productId } = WishlistProductSchema.parse(args);
			return wishlistService.removeFromWishlist(user.id, productId, Language.EN);
		},

		toggleWishlist: async (_: unknown, args: { productId: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			const { productId } = WishlistProductSchema.parse(args);
			return wishlistService.toggleWishlist(user.id, productId, Language.EN);
		},
	},
};
