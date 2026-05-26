import { GraphQLError } from 'graphql';
import { Language } from '../constants/enums.js';
import * as chatRepo from '../repositories/chatRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { isUserOnline } from '../services/presenceService.js';
import { emitChatEvent } from '../socket/chatSocket.js';
import { CHAT_SOCKET_EVENT } from '../constants/chatEvents.js';
import * as notificationService from './notificationService.js';
import type {
	MessagesQueryInput,
	SendMessageInput,
	StartConversationInput,
} from '../validators/chatValidators.js';

function displayName(user: {
	email: string;
	profile: {
		displayName: string | null;
		firstName: string;
		lastName: string;
	} | null;
}): string {
	if (user.profile?.displayName?.trim()) return user.profile.displayName.trim();
	if (user.profile) return `${user.profile.firstName} ${user.profile.lastName}`.trim();
	return user.email;
}

function initials(user: {
	profile: { firstName: string; lastName: string } | null;
	email: string;
}): string {
	if (user.profile) {
		return `${user.profile.firstName[0] ?? ''}${user.profile.lastName[0] ?? ''}`.toUpperCase();
	}
	return user.email.slice(0, 2).toUpperCase();
}

function serializeParticipant(user: NonNullable<Awaited<ReturnType<typeof userRepo.findUserById>>>) {
	return {
		id: user.id,
		displayName: displayName(user),
		avatarUrl: user.profile?.avatarUrl ?? null,
		initials: initials(user),
		role: user.role,
		isOnline: isUserOnline(user.lastSeenAt, user.createdAt),
		lastSeenAt: (user.lastSeenAt ?? user.createdAt).toISOString(),
		email: user.email,
		city: user.profile?.city ?? null,
		country: user.profile?.country ?? null,
		memberSince: user.createdAt.toISOString(),
	};
}

async function loadProduct(productId: string | null, language: Language) {
	if (!productId) return null;
	const product = await productRepo.findProductById(productId);
	if (!product) return null;
	const tr =
		product.translations.find((t) => t.language === language) ??
		product.translations.find((t) => t.language === Language.EN) ??
		product.translations[0];
	const mainImage =
		product.media.find((m) => m.isMain)?.url ?? product.media[0]?.url ?? null;
	return {
		id: product.id,
		slug: product.slug,
		title: tr?.title ?? product.slug,
		sku: product.sku,
		price: Number(product.basePrice),
		imageUrl: mainImage,
		sellerId: product.sellerId,
	};
}

function serializeMessage(
	message: chatRepo.ChatMessageRecord,
	participants: ReturnType<typeof serializeParticipant>[]
) {
	const sender = participants.find((p) => p.id === message.senderId) ?? serializeParticipant(message.sender);
	return {
		id: message.id,
		conversationId: message.chatId,
		senderId: message.senderId,
		content: message.content,
		isDelivered: message.isDelivered,
		isRead: message.isRead,
		createdAt: message.createdAt.toISOString(),
		sender,
	};
}

async function requireParticipant(conversationId: string, userId: string) {
	const allowed = await chatRepo.isParticipant(conversationId, userId);
	if (!allowed) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}
}

async function buildConversationSummary(
	chat: chatRepo.ChatRecord,
	userId: string,
	language: Language
) {
	const otherParticipantUser = chat.participants.find((p) => p.userId !== userId)?.user;
	if (!otherParticipantUser) {
		throw new GraphQLError('Invalid conversation participants', {
			extensions: { code: 'INTERNAL_ERROR' },
		});
	}

	const participants = chat.participants.map((p) => serializeParticipant(p.user));
	const otherParticipant = serializeParticipant(otherParticipantUser);
	const lastMessageRow = chat.messages[0];
	const lastMessage = lastMessageRow ? serializeMessage(lastMessageRow, participants) : null;
	const unreadCount = await chatRepo.countUnreadByConversation(chat.id, userId);
	const product = await loadProduct(chat.productId, language);

	return {
		id: chat.id,
		product,
		otherParticipant,
		lastMessage,
		unreadCount,
		updatedAt: lastMessage?.createdAt ?? chat.createdAt.toISOString(),
	};
}

export async function getMyConversations(userId: string, language: Language = Language.EN) {
	const chats = await chatRepo.findConversationsByUserId(userId);
	const summaries = await Promise.all(
		chats.map((chat) => buildConversationSummary(chat, userId, language))
	);
	return summaries.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
	);
}

export async function getConversation(
	conversationId: string,
	userId: string,
	language: Language = Language.EN
) {
	await requireParticipant(conversationId, userId);
	const chat = await chatRepo.findConversationById(conversationId);
	if (!chat) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const participants = chat.participants.map((p) => serializeParticipant(p.user));
	const otherParticipant =
		participants.find((p) => p.id !== userId) ?? participants[0] ?? null;
	const unreadCount = await chatRepo.countUnreadByConversation(chat.id, userId);
	const product = await loadProduct(chat.productId, language);

	return {
		id: chat.id,
		product,
		participants,
		otherParticipant,
		unreadCount,
		createdAt: chat.createdAt.toISOString(),
	};
}

export async function getMessages(userId: string, input: MessagesQueryInput) {
	await requireParticipant(input.conversationId, userId);
	const deliveredCount = await chatRepo.markMessagesDelivered(input.conversationId, userId);
	if (deliveredCount > 0) {
		emitChatEvent(input.conversationId, CHAT_SOCKET_EVENT.CONVERSATION_UPDATED, {
			conversationId: input.conversationId,
			deliveredBy: userId,
		});
	}

	const skip = (input.page - 1) * input.pageSize;
	const { items, total } = await chatRepo.findMessages(input.conversationId, skip, input.pageSize);
	const chat = await chatRepo.findConversationById(input.conversationId);
	const participants =
		chat?.participants.map((p) => serializeParticipant(p.user)) ?? [];

	return {
		items: items.map((message) => serializeMessage(message, participants)),
		total,
		page: input.page,
		pageSize: input.pageSize,
	};
}

export async function startConversation(
	userId: string,
	input: StartConversationInput,
	language: Language = Language.EN
) {
	let sellerId = input.sellerId ?? null;
	let productId = input.productId ?? null;

	if (productId) {
		const product = await productRepo.findProductById(productId);
		if (!product) {
			throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
		}
		sellerId = product.sellerId;
	}

	if (!sellerId) {
		throw new GraphQLError('Seller is required', { extensions: { code: 'VALIDATION_ERROR' } });
	}
	if (sellerId === userId) {
		throw new GraphQLError('Cannot start a conversation with yourself', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	const seller = await userRepo.findUserById(sellerId);
	if (!seller) {
		throw new GraphQLError('Seller not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const existing = await chatRepo.findExistingConversation(userId, sellerId, productId);
	const chat = existing ?? (await chatRepo.createConversation(userId, sellerId, productId));

	return getConversation(chat.id, userId, language);
}

export async function sendMessage(
	userId: string,
	input: SendMessageInput,
	language: Language = Language.EN
) {
	await requireParticipant(input.conversationId, userId);
	const message = await chatRepo.createMessage(input.conversationId, userId, input.content);
	const chat = await chatRepo.findConversationById(input.conversationId);
	const participants =
		chat?.participants.map((p) => serializeParticipant(p.user)) ?? [];
	const serialized = serializeMessage(message, participants);

	emitChatEvent(input.conversationId, CHAT_SOCKET_EVENT.MESSAGE_NEW, serialized);
	emitChatEvent(input.conversationId, CHAT_SOCKET_EVENT.CONVERSATION_UPDATED, {
		conversationId: input.conversationId,
		lastMessage: serialized,
	});

	const recipient = chat?.participants.find((participant) => participant.userId !== userId);
	if (recipient) {
		await notificationService.notifyNewMessage({
			recipientId: recipient.userId,
			senderId: userId,
			conversationId: input.conversationId,
			senderName: serialized.sender.displayName,
			preview: input.content.trim().slice(0, 120),
		});
	}

	return serialized;
}

export async function markConversationRead(userId: string, conversationId: string) {
	await requireParticipant(conversationId, userId);
	const count = await chatRepo.markMessagesRead(conversationId, userId);
	await notificationService.markConversationNotificationsRead(userId, conversationId);
	if (count > 0) {
		emitChatEvent(conversationId, CHAT_SOCKET_EVENT.CONVERSATION_UPDATED, {
			conversationId,
			unreadCount: 0,
			readerId: userId,
		});
	}
	return true;
}

export async function deleteConversation(userId: string, conversationId: string) {
	await requireParticipant(conversationId, userId);
	await chatRepo.deleteConversation(conversationId);
	return true;
}

export async function getUnreadMessageCount(userId: string) {
	return chatRepo.countUnreadTotal(userId);
}
