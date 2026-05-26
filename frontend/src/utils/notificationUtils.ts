import { NotificationEvent, Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import { Icons } from '@/constants/icons';
import type { AppNotification } from '@/types/notification';
import type { NotificationTone } from '@/components/ui/NotificationItem';

export function notificationTone(event: NotificationEvent): NotificationTone {
	switch (event) {
		case NotificationEvent.NEW_MESSAGE:
			return 'message';
		case NotificationEvent.NEW_ORDER:
		case NotificationEvent.ORDER_STATUS_CHANGE:
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
			return Icons.chats;
		case NotificationEvent.NEW_ORDER:
		case NotificationEvent.ORDER_STATUS_CHANGE:
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
	if (event === NotificationEvent.NEW_ORDER || event === NotificationEvent.ORDER_STATUS_CHANGE) {
		return 'orders';
	}
	return 'system';
}

export function filterNotifications(
	notifications: AppNotification[],
	tab: 'all' | 'unread' | 'orders' | 'system',
): AppNotification[] {
	switch (tab) {
		case 'unread':
			return notifications.filter((item) => !item.isRead);
		case 'orders':
			return notifications.filter(
				(item) => notificationCategory(item.event as NotificationEvent) === 'orders',
			);
		case 'system':
			return notifications.filter(
				(item) => notificationCategory(item.event as NotificationEvent) === 'system',
			);
		default:
			return notifications;
	}
}

export function notificationRoute(
	notification: AppNotification,
	role: Role | string | undefined,
): string | null {
	const metadata = notification.metadata ?? {};
	const event = notification.event as NotificationEvent;

	if (event === NotificationEvent.NEW_MESSAGE && typeof metadata.conversationId === 'string') {
		return role === Role.SELLER
			? `${ROUTES.SELLER_CHAT}?conversation=${metadata.conversationId}`
			: `${ROUTES.CHAT}?conversation=${metadata.conversationId}`;
	}

	if (
		(event === NotificationEvent.NEW_ORDER || event === NotificationEvent.ORDER_STATUS_CHANGE) &&
		typeof metadata.orderId === 'string'
	) {
		return role === Role.SELLER
			? ROUTES.SELLER_ORDER(metadata.orderId)
			: ROUTES.ACCOUNT_ORDER(metadata.orderId);
	}

	return ROUTES.ACCOUNT_NOTIFICATIONS;
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
	notification: Pick<AppNotification, 'body' | 'metadata'>,
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
	t: (key: string, opts?: Record<string, unknown>) => string,
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
	t: (key: string, opts?: Record<string, unknown>) => string,
) {
	const metadata = notification.metadata ?? {};
	const event = notification.event as NotificationEvent;

	switch (event) {
		case NotificationEvent.NEW_MESSAGE:
			return {
				title: t('notifications.events.newMessage.title', {
					name: metadata.senderName ?? notification.title,
				}),
				body: typeof metadata.preview === 'string' ? metadata.preview : notification.body,
			};
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
		default:
			return { title: notification.title, body: notification.body };
	}
}
