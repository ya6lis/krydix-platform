import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as chatService from '../../../services/chatService.js';
import {
	MessagesQuerySchema,
	SendMessageSchema,
	StartConversationSchema,
} from '../../../validators/chatValidators.js';
import { Language } from '../../../constants/enums.js';

function requireAuth(ctx: GraphQLContext) {
	if (!ctx.user) {
		throw new GraphQLError('Authentication required', {
			extensions: { code: 'UNAUTHENTICATED' },
		});
	}
	return ctx.user;
}

function resolveLanguage(language?: Language): Language {
	return language === Language.UK ? Language.UK : Language.EN;
}

export const chatResolvers = {
	Query: {
		myConversations: async (
			_: unknown,
			{ language }: { language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.getMyConversations(user.id, resolveLanguage(language));
		},

		conversation: async (
			_: unknown,
			{ id, language }: { id: string; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.getConversation(id, user.id, resolveLanguage(language));
		},

		messages: async (
			_: unknown,
			args: { conversationId: string; page?: number; pageSize?: number },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = MessagesQuerySchema.parse(args);
			return chatService.getMessages(user.id, input);
		},

		unreadMessageCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return chatService.getUnreadMessageCount(user.id);
		},
	},

	Mutation: {
		startConversation: async (
			_: unknown,
			args: { sellerId?: string; productId?: string; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = StartConversationSchema.parse(args);
			return chatService.startConversation(user.id, input, resolveLanguage(args.language));
		},

		sendMessage: async (
			_: unknown,
			args: { conversationId: string; content: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = SendMessageSchema.parse(args);
			return chatService.sendMessage(user.id, input);
		},

		markConversationRead: async (
			_: unknown,
			{ conversationId }: { conversationId: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.markConversationRead(user.id, conversationId);
		},

		deleteConversation: async (
			_: unknown,
			{ conversationId }: { conversationId: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.deleteConversation(user.id, conversationId);
		},
	},
};
