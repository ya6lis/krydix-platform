import type { NotificationEvent, OrderStatus } from '@prisma/client';
import * as notificationRepo from '../repositories/notificationRepository.js';
import type { OrderRecord } from '../repositories/orderRepository.js';
import { emitUserNotification } from '../socket/chatSocket.js';
import { NOTIFICATION_SOCKET_EVENT } from '../constants/notificationEvents.js';
import { SUPPORT_NOTIFICATION_ACTION } from '../constants/supportNotifications.js';
import type { SupportNotificationAction } from '../constants/supportNotifications.js';

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
	return `KX-${orderId.slice(-4).toUpperCase()}`;
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
	isSupportChat?: boolean;
}) {
	if (input.recipientId === input.senderId) return;

	const title = input.isSupportChat ? 'Support reply' : 'New message';
	const body = input.isSupportChat
		? `${input.senderName} replied to your support request: ${input.preview}`
		: `${input.senderName}: ${input.preview}`;

	await pushNotification({
		userId: input.recipientId,
		event: 'NEW_MESSAGE',
		title,
		body,
		metadata: {
			conversationId: input.conversationId,
			senderId: input.senderId,
			senderName: input.senderName,
			preview: input.preview,
			isSupportChat: input.isSupportChat ?? false,
		},
	});
}

async function notifySupportUpdate(input: {
	userId: string;
	conversationId: string;
	subject: string | null;
	action: SupportNotificationAction;
	title: string;
	body: string;
	staffName?: string | null;
	requesterName?: string | null;
}) {
	await pushNotification({
		userId: input.userId,
		event: 'SUPPORT_UPDATE',
		title: input.title,
		body: input.body,
		metadata: {
			conversationId: input.conversationId,
			subject: input.subject,
			action: input.action,
			staffName: input.staffName ?? null,
			requesterName: input.requesterName ?? null,
			isSupportChat: true,
		},
	});
}

export async function notifySupportNewRequest(input: {
	staffUserIds: string[];
	conversationId: string;
	subject: string | null;
	requesterName: string;
}) {
	await Promise.all(
		input.staffUserIds.map((userId) =>
			notifySupportUpdate({
				userId,
				conversationId: input.conversationId,
				subject: input.subject,
				action: SUPPORT_NOTIFICATION_ACTION.NEW_REQUEST,
				title: 'New support request',
				body: `${input.requesterName} opened a support request${input.subject ? `: ${input.subject}` : '.'}`,
				requesterName: input.requesterName,
			}),
		),
	);
}

export async function notifySupportAssigned(input: {
	requesterId: string;
	conversationId: string;
	subject: string | null;
	staffName: string;
}) {
	await notifySupportUpdate({
		userId: input.requesterId,
		conversationId: input.conversationId,
		subject: input.subject,
		action: SUPPORT_NOTIFICATION_ACTION.ASSIGNED,
		title: 'Support request in progress',
		body: `${input.staffName} is now working on your support request${input.subject ? `: ${input.subject}` : '.'}`,
		staffName: input.staffName,
	});
}

export async function notifySupportStatusChange(input: {
	requesterId: string;
	conversationId: string;
	subject: string | null;
	status: 'RESOLVED' | 'CLOSED';
	staffName?: string;
}) {
	const action =
		input.status === 'RESOLVED'
			? SUPPORT_NOTIFICATION_ACTION.RESOLVED
			: SUPPORT_NOTIFICATION_ACTION.CLOSED;
	const title =
		input.status === 'RESOLVED' ? 'Support request resolved' : 'Support request closed';
	const body =
		input.status === 'RESOLVED'
			? `Your support request${input.subject ? ` "${input.subject}"` : ''} was marked as resolved.`
			: `Your support request${input.subject ? ` "${input.subject}"` : ''} was closed.`;

	await notifySupportUpdate({
		userId: input.requesterId,
		conversationId: input.conversationId,
		subject: input.subject,
		action,
		title,
		body,
		staffName: input.staffName ?? null,
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

export async function notifyReturnUpdate(input: {
	userId: string;
	orderId: string;
	title: string;
	body: string;
	returnStatus: string;
}) {
	const label = orderLabel(input.orderId);
	await pushNotification({
		userId: input.userId,
		event: 'COMPLAINT_UPDATE',
		title: input.title,
		body: input.body,
		metadata: {
			orderId: input.orderId,
			orderLabel: label,
			returnStatus: input.returnStatus,
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

export async function deleteNotification(userId: string, notificationId: string) {
	return notificationRepo.deleteNotification(notificationId, userId);
}

export async function deleteReadNotifications(userId: string) {
	return notificationRepo.deleteReadNotifications(userId);
}
