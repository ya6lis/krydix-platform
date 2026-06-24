import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ChatType, SupportChatStatus } from '../constants/enums.js';

const userInclude = {
	include: {
		profile: true,
	},
} satisfies Prisma.UserDefaultArgs;

const participantInclude = {
	user: userInclude,
} satisfies Prisma.ChatParticipantInclude;

export const chatInclude = {
	participants: { include: participantInclude },
	requester: userInclude,
	assignedTo: userInclude,
	messages: {
		orderBy: { createdAt: 'desc' as const },
		take: 1,
		include: { sender: userInclude },
	},
} satisfies Prisma.ChatInclude;

export type ChatRecord = Prisma.ChatGetPayload<{ include: typeof chatInclude }>;

export type ChatMessageRecord = Prisma.ChatMessageGetPayload<{
	include: {
		sender: { include: { profile: true } };
	};
}>;

export async function findConversationsByUserId(userId: string): Promise<ChatRecord[]> {
	return prisma.chat.findMany({
		where: {
			type: ChatType.MARKETPLACE,
			participants: { some: { userId } },
		},
		include: chatInclude,
	});
}

export async function findConversationById(chatId: string): Promise<ChatRecord | null> {
	return prisma.chat.findUnique({
		where: { id: chatId },
		include: chatInclude,
	});
}

export async function isParticipant(chatId: string, userId: string): Promise<boolean> {
	const row = await prisma.chatParticipant.findUnique({
		where: { chatId_userId: { chatId, userId } },
		select: { chatId: true },
	});
	return !!row;
}

export async function findExistingConversation(
	userA: string,
	userB: string,
	productId: string | null
): Promise<ChatRecord | null> {
	const chats = await prisma.chat.findMany({
		where: {
			type: ChatType.MARKETPLACE,
			productId,
			participants: {
				every: { userId: { in: [userA, userB] } },
			},
			AND: [
				{ participants: { some: { userId: userA } } },
				{ participants: { some: { userId: userB } } },
			],
		},
		include: chatInclude,
	});

	return chats.find((chat) => chat.participants.length === 2) ?? null;
}

export async function createConversation(
	userA: string,
	userB: string,
	productId: string | null
): Promise<ChatRecord> {
	return prisma.chat.create({
		data: {
			type: ChatType.MARKETPLACE,
			productId,
			participants: {
				create: [{ userId: userA }, { userId: userB }],
			},
		},
		include: chatInclude,
	});
}

export async function findActiveSupportByRequesterId(
	requesterId: string
): Promise<ChatRecord | null> {
	return prisma.chat.findFirst({
		where: {
			type: ChatType.SUPPORT,
			requesterId,
			status: { in: [SupportChatStatus.OPEN, SupportChatStatus.IN_PROGRESS] },
		},
		include: chatInclude,
		orderBy: { updatedAt: 'desc' },
	});
}

export async function findSupportHistoryByRequesterId(
	requesterId: string,
	limit: number
): Promise<ChatRecord[]> {
	return prisma.chat.findMany({
		where: {
			type: ChatType.SUPPORT,
			requesterId,
			status: { in: [SupportChatStatus.RESOLVED, SupportChatStatus.CLOSED] },
		},
		include: chatInclude,
		orderBy: { updatedAt: 'desc' },
		take: limit,
	});
}

export interface SupportQueueFilter {
	status?: SupportChatStatus;
	search?: string;
	page: number;
	pageSize: number;
}

export async function findSupportQueue(
	filter: SupportQueueFilter
): Promise<{ items: ChatRecord[]; total: number }> {
	const where: Prisma.ChatWhereInput = {
		type: ChatType.SUPPORT,
		...(filter.status ? { status: filter.status } : {}),
		...(filter.search
			? {
					OR: [
						{ subject: { contains: filter.search, mode: 'insensitive' } },
						{
							requester: {
								OR: [
									{ email: { contains: filter.search, mode: 'insensitive' } },
									{
										profile: {
											displayName: { contains: filter.search, mode: 'insensitive' },
										},
									},
								],
							},
						},
					],
				}
			: {}),
	};

	const skip = (filter.page - 1) * filter.pageSize;
	const [items, total] = await Promise.all([
		prisma.chat.findMany({
			where,
			include: chatInclude,
			orderBy: { updatedAt: 'desc' },
			skip,
			take: filter.pageSize,
		}),
		prisma.chat.count({ where }),
	]);

	return { items, total };
}

export async function createSupportConversation(
	requesterId: string,
	subject: string,
	message: string
): Promise<ChatRecord> {
	return prisma.chat.create({
		data: {
			type: ChatType.SUPPORT,
			subject,
			status: SupportChatStatus.OPEN,
			requesterId,
			participants: {
				create: [{ userId: requesterId }],
			},
			messages: {
				create: [{ senderId: requesterId, content: message }],
			},
		},
		include: chatInclude,
	});
}

export async function addParticipant(chatId: string, userId: string): Promise<void> {
	await prisma.chatParticipant.upsert({
		where: { chatId_userId: { chatId, userId } },
		create: { chatId, userId },
		update: {},
	});
}

export async function assignSupportConversation(
	chatId: string,
	staffId: string
): Promise<ChatRecord> {
	return prisma.chat.update({
		where: { id: chatId },
		data: {
			assignedToId: staffId,
			status: SupportChatStatus.IN_PROGRESS,
		},
		include: chatInclude,
	});
}

export async function updateSupportStatus(
	chatId: string,
	status: SupportChatStatus
): Promise<ChatRecord> {
	return prisma.chat.update({
		where: { id: chatId },
		data: { status },
		include: chatInclude,
	});
}

export async function touchConversation(chatId: string): Promise<void> {
	await prisma.chat.update({
		where: { id: chatId },
		data: { updatedAt: new Date() },
	});
}

export async function findMessages(
	chatId: string,
	skip: number,
	take: number
): Promise<{ items: ChatMessageRecord[]; total: number }> {
	const [items, total] = await Promise.all([
		prisma.chatMessage.findMany({
			where: { chatId },
			include: { sender: { include: { profile: true } } },
			orderBy: { createdAt: 'asc' },
			skip,
			take,
		}),
		prisma.chatMessage.count({ where: { chatId } }),
	]);
	return { items, total };
}

export async function createMessage(
	chatId: string,
	senderId: string,
	content: string
): Promise<ChatMessageRecord> {
	const message = await prisma.chatMessage.create({
		data: { chatId, senderId, content },
		include: { sender: { include: { profile: true } } },
	});
	await touchConversation(chatId);
	return message;
}

export async function markMessagesRead(chatId: string, readerId: string): Promise<number> {
	const result = await prisma.chatMessage.updateMany({
		where: {
			chatId,
			senderId: { not: readerId },
			isRead: false,
		},
		data: { isRead: true, isDelivered: true },
	});
	return result.count;
}

export async function markMessagesDelivered(chatId: string, readerId: string): Promise<number> {
	const result = await prisma.chatMessage.updateMany({
		where: {
			chatId,
			senderId: { not: readerId },
			isDelivered: false,
		},
		data: { isDelivered: true },
	});
	return result.count;
}

export async function deleteConversation(chatId: string): Promise<void> {
	await prisma.chat.delete({ where: { id: chatId } });
}

export async function countUnreadByConversation(chatId: string, userId: string): Promise<number> {
	return prisma.chatMessage.count({
		where: {
			chatId,
			senderId: { not: userId },
			isRead: false,
		},
	});
}

export async function countUnreadTotal(userId: string): Promise<number> {
	return prisma.chatMessage.count({
		where: {
			senderId: { not: userId },
			isRead: false,
			chat: { participants: { some: { userId } } },
		},
	});
}
