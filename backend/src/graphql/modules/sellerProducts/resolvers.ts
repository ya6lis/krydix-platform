import type { GraphQLContext } from '../../../types/context.js';
import { ImportMode } from '../../../constants/importExport.js';
import { requireImportExport } from '../../../utils/importExportAccess.js';
import { requireSellerCabinet } from '../../../utils/sellerCabinetAccess.js';
import * as service from '../../../services/sellerProductService.js';
import * as importService from '../../../services/bulkImportService.js';
import {
	exportSellerProducts,
	getProductImportTemplate,
} from '../../../services/productExportService.js';
import {
	CreateProductSchema,
	UpdateProductSchema,
	UploadMediaSchema,
	ProductListFilterSchema,
	ProductListPaginationSchema,
	ConfirmImportSchema,
	ImportPreviewSchema,
} from '../../../validators/sellerProductValidators.js';

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
			const user = requireSellerCabinet(ctx);
			const parsedFilter = ProductListFilterSchema.parse(filter ?? {});
			const parsedPagination = ProductListPaginationSchema.parse(pagination);
			return service.getMyProducts(user.id, parsedFilter, parsedPagination);
		},

		myProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return service.getMyProduct(id, user.id);
		},

		exportMyProducts: async (
			_: unknown,
			{ filter }: { filter?: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireImportExport(ctx);
			const parsedFilter = ProductListFilterSchema.parse(filter ?? {});
			return exportSellerProducts(user.id, parsedFilter);
		},

		downloadProductImportTemplate: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireImportExport(ctx);
			return getProductImportTemplate();
		},
	},
	Mutation: {
		createProduct: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			const parsed = CreateProductSchema.parse(input);
			return service.createProduct(user.id, parsed);
		},

		updateProduct: async (
			_: unknown,
			{ id, input }: { id: string; input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			const parsed = UpdateProductSchema.parse(input);
			return service.updateProduct(id, user.id, parsed);
		},

		uploadProductMedia: async (
			_: unknown,
			args: { productId: string; dataUrl: string; isMain?: boolean; mediaType?: string },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			const parsed = UploadMediaSchema.parse(args);
			return service.uploadProductMedia(user.id, parsed);
		},

		deleteProductMedia: async (
			_: unknown,
			{ mediaId }: { mediaId: string },
			ctx: GraphQLContext
		) => {
			const user = requireSellerCabinet(ctx);
			return service.deleteProductMedia(mediaId, user.id);
		},

		duplicateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return service.duplicateProduct(id, user.id);
		},

		archiveProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return service.archiveProduct(id, user.id);
		},

		deactivateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return service.deactivateProduct(id, user.id);
		},

		activateProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireSellerCabinet(ctx);
			return service.activateProduct(id, user.id);
		},

		previewImport: async (
			_: unknown,
			args: { dataUrl: string; fileType?: string; mode?: ImportMode },
			ctx: GraphQLContext
		) => {
			const user = requireImportExport(ctx);
			const parsed = ImportPreviewSchema.parse(args);
			return importService.previewImport(
				parsed.dataUrl,
				parsed.fileType,
				parsed.mode as ImportMode,
				user.id
			);
		},

		confirmImport: async (
			_: unknown,
			{ rows, mode }: { rows: unknown[]; mode?: ImportMode },
			ctx: GraphQLContext
		) => {
			const user = requireImportExport(ctx);
			const parsed = ConfirmImportSchema.parse({ rows, mode });
			return importService.confirmImport(user.id, parsed.rows, parsed.mode as ImportMode, user.id);
		},
	},
};
