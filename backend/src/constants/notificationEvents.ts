export const NOTIFICATION_SOCKET_EVENT = {
	NEW: 'notification:new',
} as const;

export type NotificationSocketEventName =
	(typeof NOTIFICATION_SOCKET_EVENT)[keyof typeof NOTIFICATION_SOCKET_EVENT];
