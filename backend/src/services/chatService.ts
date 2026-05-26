import { GraphQLError } from 'graphql';
import { ChatType, Language, Role, SupportChatStatus } from '../constants/enums.js';
import * as chatRepo from '../repositories/chatRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { isUserOnline } from '../services/presenceService.js';
import { emitChatEvent } from '../socket/chatSocket.js';
import { CHAT_SOCKET_EVENT } from '../constants/chatEvents.js';
import * as notificationService from './notificationService.js';
import type {
	CreateSupportConversationInput,
	MessagesQueryInput,
	SendMessageInput,
	StartConversationInput,
	SupportQueueFilterInput,
	UpdateSupportStatusInput,
} from '../validators/chatValidators.js';

const STAFF_ROLES: Role[] = [Role.MODERATOR, Role.ADMIN];

function isStaffRole(role: Role): boolean {
	return STAFF_ROLES.includes(role);
}

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

function serializeSupportMeta(chat: chatRepo.ChatRecord) {
	if (chat.type !== ChatType.SUPPORT) return null;
	return {
		type: chat.type,
		subject: chat.subject,
		status: chat.status,
		requester: chat.requester ? serializeParticipant(chat.requester) : null,
		assignedTo: chat.assignedTo ? serializeParticipant(chat.assignedTo) : null,
		createdAt: chat.createdAt.toISOString(),
		updatedAt: chat.updatedAt.toISOString(),
	};
}

function resolveOtherParticipant(
	chat: chatRepo.ChatRecord,
	userId: string,
	role: Role
): ReturnType<typeof serializeParticipant> | null {
	if (chat.type === ChatType.SUPPORT) {
		if (chat.requesterId === userId) {
			return chat.assignedTo ? serializeParticipant(chat.assignedTo) : null;
		}
		if (isStaffRole(role) && chat.requester) {
			return serializeParticipant(chat.requester);
		}
		const other = chat.participants.find((p) => p.userId !== userId)?.user;
		return other ? serializeParticipant(other) : null;
	}

	const otherParticipantUser = chat.participants.find((p) => p.userId !== userId)?.user;
	if (!otherParticipantUser) {
		throw new GraphQLError('Invalid conversation participants', {
			extensions: { code: 'INTERNAL_ERROR' },
		});
	}
	return serializeParticipant(otherParticipantUser);
}

async function requireConversationAccess(
	conversationId: string,
	userId: string,
	role: Role
): Promise<chatRepo.ChatRecord> {
	const chat = await chatRepo.findConversationById(conversationId);
	if (!chat) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (chat.type === ChatType.SUPPORT) {
		const participant = await chatRepo.isParticipant(conversationId, userId);
		if (participant || isStaffRole(role)) {
			return chat;
		}
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const participant = await chatRepo.isParticipant(conversationId, userId);
	if (!participant) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}
	return chat;
}

async function ensureStaffCanReply(chat: chatRepo.ChatRecord, staffId: string) {
	if (chat.type !== ChatType.SUPPORT) return;

	if (chat.assignedToId && chat.assignedToId !== staffId) {
		throw new GraphQLError('This request is assigned to another team member', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	if (!chat.assignedToId) {
		await chatRepo.addParticipant(chat.id, staffId);
		await chatRepo.assignSupportConversation(chat.id, staffId);
		await notifySupportAssignedForChat(chat, staffId);
	}
}

async function notifySupportAssignedForChat(chat: chatRepo.ChatRecord, staffId: string) {
	if (!chat.requesterId) return;
	const staff = await userRepo.findUserById(staffId);
	if (!staff) return;
	await notificationService.notifySupportAssigned({
		requesterId: chat.requesterId,
		conversationId: chat.id,
		subject: chat.subject,
		staffName: displayName(staff),
	});
}

async function buildConversationSummary(
	chat: chatRepo.ChatRecord,
	userId: string,
	language: Language,
	role: Role = Role.BUYER
) {
	const participants = chat.participants.map((p) => serializeParticipant(p.user));
	const otherParticipant = resolveOtherParticipant(chat, userId, role);
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
		updatedAt: chat.updatedAt.toISOString(),
		supportMeta: serializeSupportMeta(chat),
	};
}

async function buildConversationDetail(
	chat: chatRepo.ChatRecord,
	userId: string,
	language: Language,
	role: Role
) {
	const participants = chat.participants.map((p) => serializeParticipant(p.user));
	const otherParticipant = resolveOtherParticipant(chat, userId, role);
	const unreadCount = await chatRepo.countUnreadByConversation(chat.id, userId);
	const product = await loadProduct(chat.productId, language);

	return {
		id: chat.id,
		product,
		participants,
		otherParticipant,
		unreadCount,
		createdAt: chat.createdAt.toISOString(),
		supportMeta: serializeSupportMeta(chat),
	};
}

function requireStaffRole(role: Role) {
	if (!isStaffRole(role)) {
		throw new GraphQLError('Insufficient permissions', { extensions: { code: 'FORBIDDEN' } });
	}
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
	language: Language = Language.EN,
	role: Role = Role.BUYER
) {
	const chat = await requireConversationAccess(conversationId, userId, role);
	return buildConversationDetail(chat, userId, language, role);
}

export async function getMessages(
	userId: string,
	input: MessagesQueryInput,
	role: Role = Role.BUYER
) {
	await requireConversationAccess(input.conversationId, userId, role);
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
	role: Role = Role.BUYER,
	language: Language = Language.EN
) {
	const chat = await requireConversationAccess(input.conversationId, userId, role);

	if (chat.type === ChatType.SUPPORT && isStaffRole(role)) {
		await ensureStaffCanReply(chat, userId);
	}

	const message = await chatRepo.createMessage(input.conversationId, userId, input.content);
	const refreshedChat = await chatRepo.findConversationById(input.conversationId);
	const participants =
		refreshedChat?.participants.map((p) => serializeParticipant(p.user)) ?? [];
	const serialized = serializeMessage(message, participants);

	emitChatEvent(input.conversationId, CHAT_SOCKET_EVENT.MESSAGE_NEW, serialized);
	emitChatEvent(input.conversationId, CHAT_SOCKET_EVENT.CONVERSATION_UPDATED, {
		conversationId: input.conversationId,
		lastMessage: serialized,
	});

	if (chat.type === ChatType.SUPPORT) {
		const recipientId =
			chat.requesterId === userId ? chat.assignedToId : chat.requesterId;
		if (recipientId) {
			await notificationService.notifyNewMessage({
				recipientId,
				senderId: userId,
				conversationId: input.conversationId,
				senderName: serialized.sender.displayName,
				preview: input.content.trim().slice(0, 120),
				isSupportChat: true,
			});
		}
	} else {
		const recipient = refreshedChat?.participants.find(
			(participant) => participant.userId !== userId
		);
		if (recipient) {
			await notificationService.notifyNewMessage({
				recipientId: recipient.userId,
				senderId: userId,
				conversationId: input.conversationId,
				senderName: serialized.sender.displayName,
				preview: input.content.trim().slice(0, 120),
			});
		}
	}

	return serialized;
}

export async function markConversationRead(
	userId: string,
	conversationId: string,
	role: Role = Role.BUYER
) {
	await requireConversationAccess(conversationId, userId, role);
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

export async function deleteConversation(
	userId: string,
	conversationId: string,
	role: Role = Role.BUYER
) {
	const chat = await requireConversationAccess(conversationId, userId, role);
	if (chat.type === ChatType.SUPPORT) {
		throw new GraphQLError('Support conversations cannot be deleted', {
			extensions: { code: 'FORBIDDEN' },
		});
	}
	await chatRepo.deleteConversation(conversationId);
	return true;
}

export async function getUnreadMessageCount(userId: string) {
	return chatRepo.countUnreadTotal(userId);
}

export async function getMySupportConversation(
	userId: string,
	language: Language = Language.EN,
	role: Role = Role.BUYER
) {
	const chat = await chatRepo.findActiveSupportByRequesterId(userId);
	if (!chat) return null;
	return buildConversationDetail(chat, userId, language, role);
}

export async function getMySupportHistory(
	userId: string,
	language: Language = Language.EN,
	limit = 10
) {
	const chats = await chatRepo.findSupportHistoryByRequesterId(userId, limit);
	return Promise.all(chats.map((chat) => buildConversationSummary(chat, userId, language)));
}

export async function createSupportConversation(
	userId: string,
	input: CreateSupportConversationInput,
	language: Language = Language.EN,
	role: Role = Role.BUYER
) {
	const existing = await chatRepo.findActiveSupportByRequesterId(userId);
	if (existing) {
		throw new GraphQLError('You already have an open support request', {
			extensions: { code: 'VALIDATION_ERROR' },
		});
	}

	const chat = await chatRepo.createSupportConversation(userId, input.subject, input.message);
	return buildConversationDetail(chat, userId, language, role);
}

export async function getSupportQueue(
	staffId: string,
	role: Role,
	filter: SupportQueueFilterInput,
	language: Language = Language.EN
) {
	requireStaffRole(role);
	const { items, total } = await chatRepo.findSupportQueue(filter);
	const summaries = await Promise.all(
		items.map((chat) => buildConversationSummary(chat, staffId, language, role))
	);
	return {
		items: summaries,
		total,
		page: filter.page,
		pageSize: filter.pageSize,
	};
}

export async function getSupportConversation(
	conversationId: string,
	userId: string,
	role: Role,
	language: Language = Language.EN
) {
	const chat = await requireConversationAccess(conversationId, userId, role);
	if (chat.type !== ChatType.SUPPORT) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}
	return buildConversationDetail(chat, userId, language, role);
}

export async function assignSupportConversation(
	staffId: string,
	role: Role,
	conversationId: string,
	language: Language = Language.EN
) {
	requireStaffRole(role);
	const chat = await requireConversationAccess(conversationId, staffId, role);
	if (chat.type !== ChatType.SUPPORT) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}
	if (
		chat.assignedToId &&
		chat.assignedToId !== staffId &&
		chat.status !== SupportChatStatus.OPEN
	) {
		throw new GraphQLError('This request is already assigned', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	await chatRepo.addParticipant(conversationId, staffId);
	const wasUnassigned = !chat.assignedToId;
	const updated = await chatRepo.assignSupportConversation(conversationId, staffId);
	if (wasUnassigned && chat.requesterId) {
		await notifySupportAssignedForChat(chat, staffId);
	}
	return buildConversationDetail(updated, staffId, language, role);
}

export async function updateSupportConversationStatus(
	staffId: string,
	role: Role,
	input: UpdateSupportStatusInput,
	language: Language = Language.EN
) {
	requireStaffRole(role);
	const chat = await requireConversationAccess(input.conversationId, staffId, role);
	if (chat.type !== ChatType.SUPPORT) {
		throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (
		chat.assignedToId &&
		chat.assignedToId !== staffId &&
		input.status !== SupportChatStatus.CLOSED
	) {
		throw new GraphQLError('Only the assigned team member can update this request', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	const updated = await chatRepo.updateSupportStatus(input.conversationId, input.status);
	if (
		chat.requesterId &&
		(input.status === SupportChatStatus.RESOLVED || input.status === SupportChatStatus.CLOSED)
	) {
		const staff = chat.assignedToId ? await userRepo.findUserById(chat.assignedToId) : null;
		await notificationService.notifySupportStatusChange({
			requesterId: chat.requesterId,
			conversationId: chat.id,
			subject: chat.subject,
			status: input.status,
			staffName: staff ? displayName(staff) : undefined,
		});
	}
	return buildConversationDetail(updated, staffId, language, role);
}
