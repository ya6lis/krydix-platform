import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../../../types/context.js';
import * as chatService from '../../../services/chatService.js';
import {
	CreateSupportConversationSchema,
	MessagesQuerySchema,
	SendMessageSchema,
	StartConversationSchema,
	SupportQueueFilterSchema,
	UpdateSupportStatusSchema,
} from '../../../validators/chatValidators.js';
import { Language, SupportChatStatus } from '../../../constants/enums.js';

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
			return chatService.getConversation(id, user.id, resolveLanguage(language), user.role);
		},

		messages: async (
			_: unknown,
			args: { conversationId: string; page?: number; pageSize?: number },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = MessagesQuerySchema.parse(args);
			return chatService.getMessages(user.id, input, user.role);
		},

		unreadMessageCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
			const user = requireAuth(ctx);
			return chatService.getUnreadMessageCount(user.id);
		},

		mySupportConversation: async (
			_: unknown,
			{ language }: { language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.getMySupportConversation(user.id, resolveLanguage(language), user.role);
		},

		mySupportHistory: async (
			_: unknown,
			{ language, limit }: { language?: Language; limit?: number },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.getMySupportHistory(user.id, resolveLanguage(language), limit ?? 10);
		},

		supportQueue: async (
			_: unknown,
			{ filter }: { filter?: Record<string, unknown> },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const parsed = SupportQueueFilterSchema.parse(filter ?? {});
			return chatService.getSupportQueue(user.id, user.role, parsed, Language.EN);
		},

		supportConversation: async (
			_: unknown,
			{ id, language }: { id: string; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.getSupportConversation(id, user.id, user.role, resolveLanguage(language));
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
			return chatService.sendMessage(user.id, input, user.role);
		},

		markConversationRead: async (
			_: unknown,
			{ conversationId }: { conversationId: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.markConversationRead(user.id, conversationId, user.role);
		},

		deleteConversation: async (
			_: unknown,
			{ conversationId }: { conversationId: string },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.deleteConversation(user.id, conversationId, user.role);
		},

		createSupportConversation: async (
			_: unknown,
			args: { input: Record<string, unknown>; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = CreateSupportConversationSchema.parse(args.input);
			return chatService.createSupportConversation(
				user.id,
				input,
				resolveLanguage(args.language),
				user.role
			);
		},

		assignSupportConversation: async (
			_: unknown,
			{ conversationId, language }: { conversationId: string; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			return chatService.assignSupportConversation(
				user.id,
				user.role,
				conversationId,
				resolveLanguage(language)
			);
		},

		updateSupportConversationStatus: async (
			_: unknown,
			args: { conversationId: string; status: SupportChatStatus; language?: Language },
			ctx: GraphQLContext
		) => {
			const user = requireAuth(ctx);
			const input = UpdateSupportStatusSchema.parse(args);
			return chatService.updateSupportConversationStatus(
				user.id,
				user.role,
				input,
				resolveLanguage(args.language)
			);
		},
	},
};
