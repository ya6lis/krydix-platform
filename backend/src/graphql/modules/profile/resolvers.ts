import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as profileService from '../../../services/profileService.js';
import * as accountService from '../../../services/accountService.js';
import {
	UpdateProfileSchema,
	UploadProfileAvatarSchema,
} from '../../../validators/profileValidators.js';
import { CloseAccountSchema } from '../../../validators/accountValidators.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

function parseInput<T>(
	schema: {
		safeParse: (data: unknown) => {
			success: boolean;
			data?: T;
			error?: { errors: Array<{ message: string }> };
		};
	},
	input: unknown
): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new GraphQLError(result.error!.errors[0].message, {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}
	return result.data as T;
}

export const profileResolvers = {
	Mutation: {
		updateProfile: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const data = parseInput(UpdateProfileSchema, input);
			return profileService.updateProfile(user.id, data);
		},

		uploadProfileAvatar: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const data = parseInput(UploadProfileAvatarSchema, input);
			return profileService.uploadProfileAvatar(user.id, data.dataUrl);
		},

		removeProfileAvatar: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return profileService.removeProfileAvatar(user.id);
		},

		closeAccount: async (_: unknown, { password }: { password: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			const data = parseInput(CloseAccountSchema, { password });
			return accountService.closeAccount(user.id, data.password);
		},
	},
};
