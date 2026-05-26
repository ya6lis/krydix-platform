import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as categoryService from '../../../services/categoryService.js';
import {
	CreateCategorySchema,
	MoveCategorySchema,
	UpdateCategorySchema,
	UpdateCategoryTranslationSchema,
} from '../../../validators/categoryValidators.js';
import { Role } from '../../../constants/enums.js';

function requireAdmin(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (ctx.user.role !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
	return ctx.user;
}

function parseInput<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { errors: Array<{ message: string }> } } }, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new GraphQLError(result.error!.errors[0].message, {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}
	return result.data as T;
}

export const categoriesResolvers = {
	Query: {
		categoryTree: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return categoryService.getCategoryTree();
		},

		adminCategory: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return categoryService.getCategoryById(id);
		},
	},

	Mutation: {
		createCategory: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			const parsed = parseInput(CreateCategorySchema, input);
			return categoryService.createCategory(user.id, user.role as Role, parsed);
		},

		updateCategory: async (
			_: unknown,
			{ id, input }: { id: string; input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			const parsed = parseInput(UpdateCategorySchema, input);
			return categoryService.updateCategory(user.id, user.role as Role, id, parsed);
		},

		moveCategory: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			const parsed = parseInput(MoveCategorySchema, input);
			return categoryService.moveCategory(user.id, user.role as Role, parsed);
		},

		deleteCategory: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireAdmin(ctx);
			return categoryService.deleteCategory(user.id, user.role as Role, id);
		},

		updateCategoryTranslation: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			const parsed = parseInput(UpdateCategoryTranslationSchema, input);
			return categoryService.updateCategoryTranslation(user.id, user.role as Role, parsed);
		},
	},
};
