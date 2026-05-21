import { GraphQLError } from 'graphql';
import * as authService from '../../../services/authService.js';
import { RegisterInputSchema, LoginInputSchema } from '../../../validators/authValidators.js';
import type { GraphQLContext } from '../../../types/context.js';

interface RegisterInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

interface LoginInput {
	email: string;
	password: string;
}

function parseOrThrow<T>(
	schema: {
		safeParse: (data: unknown) => {
			success: boolean;
			data?: T;
			error?: { errors: { message: string }[] };
		};
	},
	data: unknown
): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new GraphQLError(result.error!.errors[0].message, {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}
	return result.data!;
}

export const authResolvers = {
	Query: {
		me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			if (!ctx.user) return null;
			return authService.getMe(ctx.user.id);
		},
	},
	Mutation: {
		register: async (_: unknown, { input }: { input: RegisterInput }) => {
			const data = parseOrThrow(RegisterInputSchema, input);
			return authService.register(data.email, data.password, data.firstName, data.lastName);
		},

		login: async (_: unknown, { input }: { input: LoginInput }) => {
			const data = parseOrThrow(LoginInputSchema, input);
			return authService.login(data.email, data.password);
		},

		refreshToken: async (_: unknown, { token }: { token: string }) => {
			return authService.refreshToken(token);
		},

		verifyEmail: async (_: unknown, { token }: { token: string }) => {
			return authService.verifyEmail(token);
		},

		logout: async (_: unknown, { refreshToken }: { refreshToken: string }, ctx: GraphQLContext) => {
			if (!ctx.user)
				throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
			return authService.logout(refreshToken);
		},
	},
};
