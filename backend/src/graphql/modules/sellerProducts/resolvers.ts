import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/sellerProductService.js';
import {
	CreateProductSchema,
	UpdateProductSchema,
	UploadMediaSchema,
} from '../../../validators/sellerProductValidators.js';

function requireSeller(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (ctx.user.role !== 'SELLER' && ctx.user.role !== 'ADMIN') {
		throw new GraphQLError('Seller access required', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	return ctx.user;
}

export const sellerProductsResolvers = {
	Query: {
		myProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSeller(ctx);
			return service.getMyProduct(id, user.id);
		},
	},
	Mutation: {
		createProduct: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			const parsed = CreateProductSchema.parse(input);
			return service.createProduct(user.id, parsed);
		},

		updateProduct: async (
			_: unknown,
			{ id, input }: { id: string; input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			const parsed = UpdateProductSchema.parse(input);
			return service.updateProduct(id, user.id, parsed);
		},

		uploadProductMedia: async (
			_: unknown,
			args: { productId: string; dataUrl: string; isMain?: boolean; mediaType?: string },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			const parsed = UploadMediaSchema.parse(args);
			return service.uploadProductMedia(user.id, parsed);
		},

		deleteProductMedia: async (
			_: unknown,
			{ mediaId }: { mediaId: string },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			return service.deleteProductMedia(mediaId, user.id);
		},
	},
};
