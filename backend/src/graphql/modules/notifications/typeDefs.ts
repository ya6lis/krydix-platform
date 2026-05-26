export const notificationsTypeDefs = `#graphql
	enum NotificationEvent {
		NEW_ORDER
		ORDER_STATUS_CHANGE
		NEW_MESSAGE
		MODERATION_RESULT
		VERIFICATION_RESULT
		COMPLAINT_UPDATE
		REVIEW_RECEIVED
		SUPPORT_UPDATE
	}

	type Notification {
		id: ID!
		event: NotificationEvent!
		title: String!
		body: String!
		isRead: Boolean!
		metadata: JSON
		createdAt: String!
	}

	extend type Query {
		myNotifications(limit: Int): [Notification!]!
		unreadNotificationCount: Int!
		unreadOrderNotificationCount: Int!
	}

	extend type Mutation {
		markNotificationRead(id: ID!): Boolean!
		markAllNotificationsRead: Boolean!
		markOrderNotificationsRead(orderId: ID!): Boolean!
		markConversationNotificationsRead(conversationId: ID!): Boolean!
		deleteNotification(id: ID!): Boolean!
		deleteReadNotifications: Int!
	}
`;
