import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as service from '../../../services/adminService.js';
import * as productService from '../../../services/adminProductService.js';
import * as reviewService from '../../../services/adminReviewService.js';
import * as auditService from '../../../services/adminAuditService.js';
import * as platformService from '../../../services/platformService.js';
import { Role } from '../../../constants/enums.js';

function requireStaff(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	if (ctx.user.role !== Role.MODERATOR && ctx.user.role !== Role.ADMIN) {
		throw new GraphQLError('Staff access required', { extensions: { code: 'FORBIDDEN' } });
	}
	return ctx.user;
}

function requireAdmin(ctx: GraphQLContext) {
	const user = requireStaff(ctx);
	if (user.role !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
	return user;
}

export const adminResolvers = {
	Query: {
		adminStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireStaff(ctx);
			return service.getAdminStats();
		},

		allUsers: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					roleFilter?: string;
					statusFilter?: string;
					search?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext,
		) => {
			requireStaff(ctx);
			return service.getAllUsers({
				roleFilter: (input?.roleFilter as never) ?? 'ALL',
				statusFilter: input?.statusFilter as never,
				search: input?.search,
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 25,
			});
		},

		adminProductStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireStaff(ctx);
			return productService.getAdminProductStats();
		},

		allProducts: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					statusFilter?: string;
					availabilityFilter?: string;
					search?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext,
		) => {
			requireStaff(ctx);
			return productService.getAllProducts({
				statusFilter: (input?.statusFilter as never) ?? 'ALL',
				availabilityFilter: input?.availabilityFilter as never,
				search: input?.search,
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 25,
			});
		},

		adminReviewStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireStaff(ctx);
			return reviewService.getAdminReviewStats();
		},

		allReviews: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					statusFilter?: string;
					ratingFilter?: string;
					search?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext,
		) => {
			requireStaff(ctx);
			return reviewService.getAllReviews({
				statusFilter: (input?.statusFilter as never) ?? 'ALL',
				ratingFilter: input?.ratingFilter,
				search: input?.search,
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 25,
			});
		},

		auditLogs: async (
			_: unknown,
			{
				input,
			}: {
				input?: {
					actorRoles?: string[];
					actionKeys?: string[];
					datePreset?: string;
					dateFrom?: string;
					dateTo?: string;
					page?: number;
					pageSize?: number;
				};
			},
			ctx: GraphQLContext,
		) => {
			requireAdmin(ctx);
			return auditService.getAuditLogs({
				actorRoles: input?.actorRoles as never,
				actionKeys: input?.actionKeys as never,
				datePreset: input?.datePreset as never,
				dateFrom: input?.dateFrom,
				dateTo: input?.dateTo,
				page: input?.page ?? 1,
				pageSize: input?.pageSize ?? 50,
			});
		},

		platformOverview: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return platformService.getPlatformOverview();
		},

		commissionRules: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return platformService.getCommissionRules();
		},

		payoutConfig: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return platformService.getPayoutConfig();
		},

		adminPromoCodes: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			requireAdmin(ctx);
			return platformService.getAdminPromoCodes();
		},
	},

	Mutation: {
		changeUserRole: async (
			_: unknown,
			{ id, role }: { id: string; role: string },
			ctx: GraphQLContext,
		) => {
			const user = requireStaff(ctx);
			return service.changeUserRole(user.id, user.role as Role, id, role as Role);
		},

		softDeleteUser: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireStaff(ctx);
			return service.softDeleteUser(user.id, user.role as Role, id);
		},

		softBanUser: async (
			_: unknown,
			{ id, reason }: { id: string; reason?: string },
			ctx: GraphQLContext,
		) => {
			const user = requireStaff(ctx);
			return service.softBanUser(user.id, user.role as Role, id, reason);
		},

		softUnbanUser: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireStaff(ctx);
			return service.softUnbanUser(user.id, user.role as Role, id);
		},

		inviteUser: async (
			_: unknown,
			{ input }: { input: { email: string; firstName: string; lastName: string; role: string } },
			ctx: GraphQLContext,
		) => {
			const user = requireStaff(ctx);
			return service.inviteUser(user.id, user.role as Role, {
				...input,
				role: input.role as Role,
			});
		},

		changeAdminProductStatus: async (
			_: unknown,
			{ id, status }: { id: string; status: string },
			ctx: GraphQLContext,
		) => {
			const user = requireStaff(ctx);
			return productService.changeAdminProductStatus(
				user.id,
				user.role as Role,
				id,
				status as never,
			);
		},

		adminDeleteProduct: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireAdmin(ctx);
			return productService.adminDeleteProduct(user.id, user.role as Role, id);
		},

		changeAdminReviewStatus: async (
			_: unknown,
			{ id, status }: { id: string; status: string },
			ctx: GraphQLContext,
		) => {
			const user = requireStaff(ctx);
			return reviewService.changeAdminReviewStatus(
				user.id,
				user.role as Role,
				id,
				status as never,
			);
		},

		adminDeleteReview: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireAdmin(ctx);
			return reviewService.adminDeleteReview(user.id, user.role as Role, id);
		},

		saveCommissionRules: async (
			_: unknown,
			{ rules }: { rules: Array<Record<string, unknown>> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			return platformService.saveCommissionRules(user.id, rules as never);
		},

		savePayoutConfig: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			return platformService.savePayoutConfig(user.id, input as never);
		},

		createAdminPromoCode: async (
			_: unknown,
			{ input }: { input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			return platformService.createAdminPromoCode(user.id, input as never);
		},

		updateAdminPromoCode: async (
			_: unknown,
			{ id, input }: { id: string; input: Record<string, unknown> },
			ctx: GraphQLContext,
		) => {
			const user = requireAdmin(ctx);
			return platformService.updateAdminPromoCode(user.id, id, input as never);
		},
	},
};
