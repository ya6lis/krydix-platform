import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as cartService from '../../../services/cartService.js';
import * as checkoutService from '../../../services/checkoutService.js';
import {
	AddToCartSchema,
	UpdateCartItemSchema,
	RemoveCartItemSchema,
	ApplyPromoCodeSchema,
} from '../../../validators/cartValidators.js';
import { Language } from '../../../constants/enums.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

export const cartResolvers = {
	Query: {
		myCart: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return cartService.getCart(user.id, Language.EN);
		},
	},

	Mutation: {
		addToCart: async (
			_: unknown,
			args: { productId: string; variantId?: string; quantity: number },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = AddToCartSchema.parse(args);
			return cartService.addToCart(user.id, input.productId, input.variantId, input.quantity);
		},

		updateCartItem: async (
			_: unknown,
			args: { cartItemId: string; quantity: number },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = UpdateCartItemSchema.parse(args);
			return cartService.updateCartItem(user.id, input.cartItemId, input.quantity);
		},

		removeFromCart: async (_: unknown, args: { cartItemId: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			const input = RemoveCartItemSchema.parse(args);
			return cartService.removeFromCart(user.id, input.cartItemId);
		},

		clearCart: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return cartService.clearCart(user.id);
		},

		applyPromoCode: async (_: unknown, args: { code: string }, ctx: GraphQLContext) => {
			requireAuth(ctx);
			const { code } = ApplyPromoCodeSchema.parse(args);
			try {
				// Validate promo without a fixed subtotal — return result for frontend preview
				// Pass 0 as subtotal to check existence/expiry/limits only (min amount checked at checkout)
				const result = await checkoutService.validatePromoCode(code, Infinity);
				return { valid: true, discount: result.discount, message: null };
			} catch (err) {
				if (err instanceof GraphQLError) {
					return { valid: false, discount: 0, message: err.message };
				}
				throw err;
			}
		},
	},
};
