import { NotificationEvent, Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import { Icons } from '@/constants/icons';
import type { AppNotification } from '@/types/notification';
import type { NotificationTone } from '@/components/ui/NotificationItem';

const STAFF_ROLES: string[] = [Role.MODERATOR, Role.ADMIN];

export const SUPPORT_NOTIFICATION_ACTION = {
	NEW_REQUEST: 'NEW_REQUEST',
	ASSIGNED: 'ASSIGNED',
	RESOLVED: 'RESOLVED',
	CLOSED: 'CLOSED',
} as const;

function isSupportNotification(notification: AppNotification): boolean {
	const metadata = notification.metadata ?? {};
	return notification.event === NotificationEvent.SUPPORT_UPDATE || metadata.isSupportChat === true;
}

function supportNotificationRoute(role: Role | string | undefined): string {
	if (role && STAFF_ROLES.includes(role)) {
		return ROUTES.STAFF_SUPPORT;
	}
	return ROUTES.SUPPORT;
}

export function notificationTone(event: NotificationEvent): NotificationTone {
	switch (event) {
		case NotificationEvent.NEW_MESSAGE:
			return 'message';
		case NotificationEvent.SUPPORT_UPDATE:
			return 'message';
		case NotificationEvent.NEW_ORDER:
		case NotificationEvent.ORDER_STATUS_CHANGE:
		case NotificationEvent.COMPLAINT_UPDATE:
			return 'order';
		case NotificationEvent.MODERATION_RESULT:
			return 'mod';
		case NotificationEvent.VERIFICATION_RESULT:
			return 'verif';
		default:
			return 'warn';
	}
}

export function notificationIcon(event: NotificationEvent) {
	switch (event) {
		case NotificationEvent.NEW_MESSAGE:
		case NotificationEvent.SUPPORT_UPDATE:
			return Icons.chats;
		case NotificationEvent.NEW_ORDER:
		case NotificationEvent.ORDER_STATUS_CHANGE:
		case NotificationEvent.COMPLAINT_UPDATE:
			return Icons.order;
		case NotificationEvent.MODERATION_RESULT:
			return Icons.shield;
		case NotificationEvent.VERIFICATION_RESULT:
			return Icons.userShield;
		default:
			return Icons.bell;
	}
}

export function notificationCategory(event: NotificationEvent): 'orders' | 'system' {
	if (
		event === NotificationEvent.NEW_ORDER ||
		event === NotificationEvent.ORDER_STATUS_CHANGE ||
		event === NotificationEvent.COMPLAINT_UPDATE
	) {
		return 'orders';
	}
	return 'system';
}

export function filterNotifications(
	notifications: AppNotification[],
	tab: 'all' | 'unread' | 'orders' | 'system'
): AppNotification[] {
	switch (tab) {
		case 'unread':
			return notifications.filter((item) => !item.isRead);
		case 'orders':
			return notifications.filter(
				(item) => notificationCategory(item.event as NotificationEvent) === 'orders'
			);
		case 'system':
			return notifications.filter(
				(item) => notificationCategory(item.event as NotificationEvent) === 'system'
			);
		default:
			return notifications;
	}
}

export const NOTIFICATION_TAB_KEYS = ['all', 'unread', 'orders', 'system'] as const;
export type NotificationTabKey = (typeof NOTIFICATION_TAB_KEYS)[number];

export function notificationTabCounts(notifications: AppNotification[]) {
	return {
		all: notifications.length,
		unread: notifications.filter((item) => !item.isRead).length,
		orders: filterNotifications(notifications, 'orders').length,
		system: filterNotifications(notifications, 'system').length,
	};
}

export function notificationRoute(
	notification: AppNotification,
	role: Role | string | undefined
): string | null {
	const metadata = notification.metadata ?? {};
	const event = notification.event as NotificationEvent;

	if (isSupportNotification(notification)) {
		return supportNotificationRoute(role);
	}

	if (event === NotificationEvent.NEW_MESSAGE && typeof metadata.conversationId === 'string') {
		return `${ROUTES.CHAT}?conversation=${metadata.conversationId}`;
	}

	if (
		(event === NotificationEvent.NEW_ORDER ||
			event === NotificationEvent.ORDER_STATUS_CHANGE ||
			event === NotificationEvent.COMPLAINT_UPDATE) &&
		typeof metadata.orderId === 'string'
	) {
		return role === Role.SELLER
			? ROUTES.SELLER_ORDER(metadata.orderId)
			: ROUTES.ORDER(metadata.orderId);
	}

	return ROUTES.NOTIFICATIONS;
}

export function formatNotificationTime(iso: string, locale: string): string {
	const date = new Date(iso);
	const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
	if (diffMin < 1) return 'now';
	if (diffMin < 60) return `${diffMin}m`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d`;
	return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function extractOrderLabel(
	notification: Pick<AppNotification, 'body' | 'metadata'>
): string | null {
	const metadata = notification.metadata ?? {};
	if (typeof metadata.orderLabel === 'string' && metadata.orderLabel.trim()) {
		return metadata.orderLabel.trim();
	}
	if (typeof metadata.orderId === 'string' && metadata.orderId.trim()) {
		return metadata.orderId.slice(-8).toUpperCase();
	}
	const match = notification.body.match(/#([A-Za-z0-9-]+)/);
	return match?.[1]?.toUpperCase() ?? null;
}

export function extractOrderStatus(
	notification: Pick<AppNotification, 'body' | 'metadata'>,
	t: (key: string, opts?: Record<string, unknown>) => string
): string | null {
	const metadata = notification.metadata ?? {};
	if (typeof metadata.status === 'string' && metadata.status.trim()) {
		return t(`status.order.${metadata.status}`, {
			defaultValue: metadata.status.replace(/_/g, ' ').toLowerCase(),
		});
	}
	const match = notification.body.match(/is now ([^.]+)\./i);
	return match?.[1]?.trim() ?? null;
}

export function notificationDisplayText(
	notification: AppNotification,
	t: (key: string, opts?: Record<string, unknown>) => string
) {
	const metadata = notification.metadata ?? {};
	const event = notification.event as NotificationEvent;

	switch (event) {
		case NotificationEvent.NEW_MESSAGE:
			if (metadata.isSupportChat === true) {
				return {
					title: t('notifications.events.supportReply.title', {
						name: metadata.senderName ?? notification.title,
					}),
					body: typeof metadata.preview === 'string' ? metadata.preview : notification.body,
				};
			}
			return {
				title: t('notifications.events.newMessage.title', {
					name: metadata.senderName ?? notification.title,
				}),
				body: typeof metadata.preview === 'string' ? metadata.preview : notification.body,
			};
		case NotificationEvent.SUPPORT_UPDATE: {
			const action = metadata.action as string | undefined;
			const subject = typeof metadata.subject === 'string' ? metadata.subject : null;
			const staffName =
				typeof metadata.staffName === 'string' ? metadata.staffName : t('common.supportTeam');
			const requesterName =
				typeof metadata.requesterName === 'string' ? metadata.requesterName : t('common.user');

			switch (action) {
				case SUPPORT_NOTIFICATION_ACTION.ASSIGNED:
					return {
						title: t('notifications.events.supportAssigned.title'),
						body: subject
							? t('notifications.events.supportAssigned.bodyWithSubject', {
									name: staffName,
									subject,
								})
							: t('notifications.events.supportAssigned.body', { name: staffName }),
					};
				case SUPPORT_NOTIFICATION_ACTION.RESOLVED:
					return {
						title: t('notifications.events.supportResolved.title'),
						body: subject
							? t('notifications.events.supportResolved.bodyWithSubject', { subject })
							: t('notifications.events.supportResolved.body'),
					};
				case SUPPORT_NOTIFICATION_ACTION.CLOSED:
					return {
						title: t('notifications.events.supportClosed.title'),
						body: subject
							? t('notifications.events.supportClosed.bodyWithSubject', { subject })
							: t('notifications.events.supportClosed.body'),
					};
				case SUPPORT_NOTIFICATION_ACTION.NEW_REQUEST:
					return {
						title: t('notifications.events.supportNewRequest.title'),
						body: subject
							? t('notifications.events.supportNewRequest.bodyWithSubject', {
									name: requesterName,
									subject,
								})
							: t('notifications.events.supportNewRequest.body', { name: requesterName }),
					};
				default:
					return { title: notification.title, body: notification.body };
			}
		}
		case NotificationEvent.NEW_ORDER: {
			const order = extractOrderLabel(notification);
			if (!order) {
				return { title: t('notifications.events.newOrder.title'), body: notification.body };
			}
			return {
				title: t('notifications.events.newOrder.title'),
				body: t('notifications.events.newOrder.body', { order }),
			};
		}
		case NotificationEvent.ORDER_STATUS_CHANGE: {
			const order = extractOrderLabel(notification);
			const status = extractOrderStatus(notification, t);
			if (!order || !status) {
				return { title: t('notifications.events.orderStatus.title'), body: notification.body };
			}
			return {
				title: t('notifications.events.orderStatus.title'),
				body: t('notifications.events.orderStatus.body', { order, status }),
			};
		}
		case NotificationEvent.COMPLAINT_UPDATE: {
			if (typeof metadata.orderId === 'string') {
				const order = extractOrderLabel(notification);
				const returnStatus =
					typeof metadata.returnStatus === 'string' ? metadata.returnStatus : null;
				if (returnStatus) {
					return {
						title: t('notifications.events.returnUpdate.title'),
						body: t('notifications.events.returnUpdate.body', {
							order: order ?? metadata.orderId.slice(-4).toUpperCase(),
							status: t(`status.returnRequest.${returnStatus}`, {
								defaultValue: returnStatus.replace(/_/g, ' ').toLowerCase(),
							}),
						}),
					};
				}
			}
			return { title: notification.title, body: notification.body };
		}
		default:
			return { title: notification.title, body: notification.body };
	}
}
