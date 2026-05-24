import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as checkoutService from '../../../services/checkoutService.js';
import { CreateOrderSchema } from '../../../validators/checkoutValidators.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

export const checkoutResolvers = {
	Mutation: {
		createOrder: async (
			_: unknown,
			args: {
				items?: Array<{ productId: string; variantId?: string | null; quantity: number }>;
				paymentMethod: string;
				deliveryMethod: string;
				deliveryAddress?: string;
				promoCode?: string;
				notes?: string;
			},
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);

			const input = CreateOrderSchema.parse(args);

			return checkoutService.createOrder(
				user.id,
				input.paymentMethod,
				input.deliveryMethod,
				input.deliveryAddress,
				input.promoCode,
				input.notes,
				input.items
			);
		},
	},
};
