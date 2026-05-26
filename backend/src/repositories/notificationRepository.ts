import type { NotificationEvent, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type NotificationRecord = Prisma.NotificationGetPayload<object>;

export interface CreateNotificationInput {
	userId: string;
	event: NotificationEvent;
	title: string;
	body: string;
	metadata?: Prisma.InputJsonValue;
}

const ORDER_EVENTS: NotificationEvent[] = ['NEW_ORDER', 'ORDER_STATUS_CHANGE'];

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
	return prisma.notification.create({
		data: {
			userId: input.userId,
			event: input.event,
			title: input.title,
			body: input.body,
			metadata: input.metadata ?? undefined,
		},
	});
}

export async function findNotificationsByUserId(
	userId: string,
	limit = 30,
): Promise<NotificationRecord[]> {
	return prisma.notification.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: limit,
	});
}

export async function countUnreadByUserId(userId: string): Promise<number> {
	return prisma.notification.count({
		where: { userId, isRead: false },
	});
}

export async function countUnreadOrderNotifications(userId: string): Promise<number> {
	return prisma.notification.count({
		where: {
			userId,
			isRead: false,
			event: { in: ORDER_EVENTS },
		},
	});
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
	const result = await prisma.notification.updateMany({
		where: { id, userId, isRead: false },
		data: { isRead: true },
	});
	return result.count > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
	const result = await prisma.notification.updateMany({
		where: { userId, isRead: false },
		data: { isRead: true },
	});
	return result.count;
}

export async function markOrderNotificationsRead(userId: string, orderId: string): Promise<number> {
	const result = await prisma.notification.updateMany({
		where: {
			userId,
			isRead: false,
			event: { in: ORDER_EVENTS },
			metadata: {
				path: ['orderId'],
				equals: orderId,
			},
		},
		data: { isRead: true },
	});
	return result.count;
}

export async function markConversationNotificationsRead(
	userId: string,
	conversationId: string,
): Promise<number> {
	const result = await prisma.notification.updateMany({
		where: {
			userId,
			isRead: false,
			OR: [
				{
					event: 'NEW_MESSAGE',
					metadata: {
						path: ['conversationId'],
						equals: conversationId,
					},
				},
				{
					event: 'SUPPORT_UPDATE',
					metadata: {
						path: ['conversationId'],
						equals: conversationId,
					},
				},
			],
		},
		data: { isRead: true },
	});
	return result.count;
}

export async function isNotificationEnabled(
	userId: string,
	event: NotificationEvent,
): Promise<boolean> {
	const pref = await prisma.notificationPreference.findUnique({
		where: { userId_event: { userId, event } },
	});
	return pref?.enabled ?? true;
}

export async function deleteNotification(id: string, userId: string): Promise<boolean> {
	const result = await prisma.notification.deleteMany({
		where: { id, userId },
	});
	return result.count > 0;
}

export async function deleteReadNotifications(userId: string): Promise<number> {
	const result = await prisma.notification.deleteMany({
		where: { userId, isRead: true },
	});
	return result.count;
}
