import type { NotificationEvent, OrderStatus } from '@prisma/client';
import * as notificationRepo from '../repositories/notificationRepository.js';
import type { OrderRecord } from '../repositories/orderRepository.js';
import { emitUserNotification } from '../socket/chatSocket.js';
import { NOTIFICATION_SOCKET_EVENT } from '../constants/notificationEvents.js';

function serializeNotification(notification: notificationRepo.NotificationRecord) {
	const metadata =
		notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
			? (notification.metadata as Record<string, unknown>)
			: null;

	return {
		id: notification.id,
		event: notification.event,
		title: notification.title,
		body: notification.body,
		isRead: notification.isRead,
		metadata,
		createdAt: notification.createdAt.toISOString(),
	};
}

function orderLabel(orderId: string): string {
	return orderId.slice(-8).toUpperCase();
}

async function pushNotification(input: notificationRepo.CreateNotificationInput) {
	const enabled = await notificationRepo.isNotificationEnabled(input.userId, input.event);
	if (!enabled) return null;

	const notification = await notificationRepo.createNotification(input);
	const unreadCount = await notificationRepo.countUnreadByUserId(input.userId);
	const payload = {
		notification: serializeNotification(notification),
		unreadCount,
	};

	emitUserNotification(input.userId, NOTIFICATION_SOCKET_EVENT.NEW, payload);
	return notification;
}

export async function notifyNewMessage(input: {
	recipientId: string;
	senderId: string;
	conversationId: string;
	senderName: string;
	preview: string;
}) {
	if (input.recipientId === input.senderId) return;

	await pushNotification({
		userId: input.recipientId,
		event: 'NEW_MESSAGE',
		title: 'New message',
		body: `${input.senderName}: ${input.preview}`,
		metadata: {
			conversationId: input.conversationId,
			senderId: input.senderId,
			senderName: input.senderName,
			preview: input.preview,
		},
	});
}

export async function notifyNewOrder(order: OrderRecord) {
	const label = orderLabel(order.id);

	await pushNotification({
		userId: order.buyerId,
		event: 'NEW_ORDER',
		title: 'Order placed',
		body: `Your order #${label} was placed successfully.`,
		metadata: {
			orderId: order.id,
			orderLabel: label,
			status: order.status,
		},
	});

	const sellerIds = [...new Set(order.items.map((item) => item.sellerId))];
	await Promise.all(
		sellerIds.map((sellerId) =>
			pushNotification({
				userId: sellerId,
				event: 'NEW_ORDER',
				title: 'New order received',
				body: `You received a new order #${label}.`,
				metadata: {
					orderId: order.id,
					orderLabel: label,
					status: order.status,
				},
			}),
		),
	);
}

export async function notifyOrderStatusChange(order: OrderRecord, previousStatus?: OrderStatus) {
	if (previousStatus === order.status) return;

	const label = orderLabel(order.id);

	await pushNotification({
		userId: order.buyerId,
		event: 'ORDER_STATUS_CHANGE',
		title: 'Order status updated',
		body: `Order #${label} is now ${order.status.replace(/_/g, ' ').toLowerCase()}.`,
		metadata: {
			orderId: order.id,
			orderLabel: label,
			status: order.status,
			previousStatus: previousStatus ?? null,
		},
	});
}

export async function getMyNotifications(userId: string, limit = 30) {
	const items = await notificationRepo.findNotificationsByUserId(userId, limit);
	return items.map(serializeNotification);
}

export async function getUnreadNotificationCount(userId: string) {
	return notificationRepo.countUnreadByUserId(userId);
}

export async function getUnreadOrderNotificationCount(userId: string) {
	return notificationRepo.countUnreadOrderNotifications(userId);
}

export async function markNotificationRead(userId: string, notificationId: string) {
	return notificationRepo.markNotificationRead(notificationId, userId);
}

export async function markAllNotificationsRead(userId: string) {
	return notificationRepo.markAllNotificationsRead(userId);
}

export async function markOrderNotificationsRead(userId: string, orderId: string) {
	const count = await notificationRepo.markOrderNotificationsRead(userId, orderId);
	return count > 0;
}

export async function markConversationNotificationsRead(userId: string, conversationId: string) {
	const count = await notificationRepo.markConversationNotificationsRead(userId, conversationId);
	return count > 0;
}
