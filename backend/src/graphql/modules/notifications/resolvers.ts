import { GraphQLError } from 'graphql';
import { JSONResolver } from 'graphql-scalars';
import type { GraphQLContext } from '../../../types/context.js';
import * as notificationService from '../../../services/notificationService.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

export const notificationsResolvers = {
	JSON: JSONResolver,

	Query: {
		myNotifications: async (_: unknown, { limit }: { limit?: number }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.getMyNotifications(user.id, limit ?? 30);
		},

		unreadNotificationCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.getUnreadNotificationCount(user.id);
		},

		unreadOrderNotificationCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.getUnreadOrderNotificationCount(user.id);
		},
	},

	Mutation: {
		markNotificationRead: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.markNotificationRead(user.id, id);
		},

		markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			await notificationService.markAllNotificationsRead(user.id);
			return true;
		},

		markOrderNotificationsRead: async (
			_: unknown,
			{ orderId }: { orderId: string },
			ctx: GraphQLContext,
		) => {
			const user = requireAuth(ctx);
			return notificationService.markOrderNotificationsRead(user.id, orderId);
		},

		markConversationNotificationsRead: async (
			_: unknown,
			{ conversationId }: { conversationId: string },
			ctx: GraphQLContext,
		) => {
			const user = requireAuth(ctx);
			return notificationService.markConversationNotificationsRead(user.id, conversationId);
		},

		deleteNotification: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.deleteNotification(user.id, id);
		},

		deleteReadNotifications: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return notificationService.deleteReadNotifications(user.id);
		},
	},
};
