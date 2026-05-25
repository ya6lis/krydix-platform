import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/sellerProductService.js';
import * as importService from '../../../services/bulkImportService.js';
import {
	CreateProductSchema,
	UpdateProductSchema,
	UploadMediaSchema,
	ProductListFilterSchema,
	ProductListPaginationSchema,
	ConfirmImportSchema,
	ImportPreviewSchema,
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
		myProducts: async (
			_: unknown,
			{
				filter,
				pagination,
			}: {
				filter?: Record<string, unknown>;
				pagination: Record<string, unknown>;
			},
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			const parsedFilter = ProductListFilterSchema.parse(filter ?? {});
			const parsedPagination = ProductListPaginationSchema.parse(pagination);
			return service.getMyProducts(user.id, parsedFilter, parsedPagination);
		},

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

		duplicateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSeller(ctx);
			return service.duplicateProduct(id, user.id);
		},

		archiveProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSeller(ctx);
			return service.archiveProduct(id, user.id);
		},

		deactivateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSeller(ctx);
			return service.deactivateProduct(id, user.id);
		},

		activateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSeller(ctx);
			return service.activateProduct(id, user.id);
		},

		previewImport: async (
			_: unknown,
			args: { dataUrl: string; fileType?: string },
			ctx: GraphQLContext
		) => {
			requireSeller(ctx);
			const parsed = ImportPreviewSchema.parse(args);
			return importService.previewImport(parsed.dataUrl, parsed.fileType);
		},

		confirmImport: async (
			_: unknown,
			{ rows }: { rows: unknown[] },
			ctx: GraphQLContext
		) => {
			const user = requireSeller(ctx);
			const parsed = ConfirmImportSchema.parse({ rows });
			return importService.confirmImport(user.id, parsed.rows);
		},
	},
};
