import { NotificationEvent } from '@/constants/enums';

export interface AppNotification {
	id: string;
	event: NotificationEvent;
	title: string;
	body: string;
	isRead: boolean;
	metadata: Record<string, unknown> | null;
	createdAt: string;
}

export interface NotificationSocketPayload {
	notification: AppNotification;
	unreadCount: number;
}
