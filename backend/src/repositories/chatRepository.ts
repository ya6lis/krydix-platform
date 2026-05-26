import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const participantInclude = {
	user: {
		include: {
			profile: true,
		},
	},
} satisfies Prisma.ChatParticipantInclude;

const chatInclude = {
	participants: { include: participantInclude },
	messages: {
		orderBy: { createdAt: 'desc' as const },
		take: 1,
		include: { sender: { include: { profile: true } } },
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
		where: { participants: { some: { userId } } },
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
			productId,
			participants: {
				create: [{ userId: userA }, { userId: userB }],
			},
		},
		include: chatInclude,
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
	return prisma.chatMessage.create({
		data: { chatId, senderId, content },
		include: { sender: { include: { profile: true } } },
	});
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

export async function countUnreadByConversation(
	chatId: string,
	userId: string
): Promise<number> {
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
