import { GraphQLError } from 'graphql';
import { JSONResolver } from 'graphql-scalars';
import * as catalogService from '../../../services/catalogService.js';
import { ProductQuerySchema } from '../../../validators/catalogValidators.js';
import { Language } from '../../../constants/enums.js';

interface ProductsArgs {
	filter?: Record<string, unknown>;
	sort?: string;
	page?: number;
	pageSize?: number;
	language?: Language;
}

function resolveLanguage(language?: Language): Language {
	return language === Language.UK ? Language.UK : Language.EN;
}

export const catalogResolvers = {
	JSON: JSONResolver,

	Query: {
		categories: async (
			_: unknown,
			{ language, sellerId }: { language?: Language; sellerId?: string }
		) => {
			return catalogService.getCategories(resolveLanguage(language), sellerId);
		},

		category: async (_: unknown, { slug, language }: { slug: string; language?: Language }) => {
			return catalogService.getCategoryBySlug(slug, resolveLanguage(language));
		},

		products: async (_: unknown, args: ProductsArgs) => {
			const result = ProductQuerySchema.safeParse({
				filter: args.filter,
				sort: args.sort,
				page: args.page,
				pageSize: args.pageSize,
			});
			if (!result.success) {
				throw new GraphQLError(result.error.errors[0].message, {
					extensions: { code: 'VALIDATION_ERROR' },
				});
			}
			return catalogService.getProducts(result.data, resolveLanguage(args.language));
		},

		product: async (_: unknown, { slug, language }: { slug: string; language?: Language }) => {
			return catalogService.getProductBySlug(slug, resolveLanguage(language));
		},

		productBrands: async () => {
			return catalogService.getProductBrands();
		},

		productBrandsWithCounts: async (_: unknown, { sellerId }: { sellerId?: string }) => {
			return catalogService.getProductBrandsWithCounts(sellerId);
		},
	},
};
