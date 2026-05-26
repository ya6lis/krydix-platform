import { gql } from '@apollo/client';

export const NOTIFICATION_FIELDS = `
	id
	event
	title
	body
	isRead
	metadata
	createdAt
`;

export const MY_NOTIFICATIONS_QUERY = gql`
	query MyNotifications($limit: Int) {
		myNotifications(limit: $limit) {
			${NOTIFICATION_FIELDS}
		}
	}
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
	query UnreadNotificationCount {
		unreadNotificationCount
	}
`;

export const UNREAD_ORDER_NOTIFICATION_COUNT_QUERY = gql`
	query UnreadOrderNotificationCount {
		unreadOrderNotificationCount
	}
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
	mutation MarkNotificationRead($id: ID!) {
		markNotificationRead(id: $id)
	}
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
	mutation MarkAllNotificationsRead {
		markAllNotificationsRead
	}
`;

export const MARK_ORDER_NOTIFICATIONS_READ_MUTATION = gql`
	mutation MarkOrderNotificationsRead($orderId: ID!) {
		markOrderNotificationsRead(orderId: $orderId)
	}
`;

export const MARK_CONVERSATION_NOTIFICATIONS_READ_MUTATION = gql`
	mutation MarkConversationNotificationsRead($conversationId: ID!) {
		markConversationNotificationsRead(conversationId: $conversationId)
	}
`;

export const DELETE_NOTIFICATION_MUTATION = gql`
	mutation DeleteNotification($id: ID!) {
		deleteNotification(id: $id)
	}
`;

export const DELETE_READ_NOTIFICATIONS_MUTATION = gql`
	mutation DeleteReadNotifications {
		deleteReadNotifications
	}
`;
