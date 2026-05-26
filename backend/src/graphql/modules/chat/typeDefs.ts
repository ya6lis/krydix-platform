export const chatTypeDefs = `#graphql
	type ConversationParticipant {
		id: ID!
		displayName: String!
		avatarUrl: String
		initials: String!
		role: String!
		isOnline: Boolean!
		lastSeenAt: String!
		email: String!
		city: String
		country: String
		memberSince: String!
	}

	type ConversationProduct {
		id: ID!
		slug: String!
		title: String!
		sku: String!
		price: Float!
		imageUrl: String
		sellerId: ID!
	}

	type ChatMessage {
		id: ID!
		conversationId: ID!
		senderId: ID!
		content: String!
		isDelivered: Boolean!
		isRead: Boolean!
		createdAt: String!
		sender: ConversationParticipant!
	}

	type ConversationSummary {
		id: ID!
		product: ConversationProduct
		otherParticipant: ConversationParticipant!
		lastMessage: ChatMessage
		unreadCount: Int!
		updatedAt: String!
	}

	type ConversationDetail {
		id: ID!
		product: ConversationProduct
		participants: [ConversationParticipant!]!
		otherParticipant: ConversationParticipant!
		unreadCount: Int!
		createdAt: String!
	}

	type MessageList {
		items: [ChatMessage!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	extend type Query {
		myConversations(language: Language): [ConversationSummary!]!
		conversation(id: ID!, language: Language): ConversationDetail!
		messages(conversationId: ID!, page: Int, pageSize: Int): MessageList!
		unreadMessageCount: Int!
	}

	extend type Mutation {
		startConversation(sellerId: ID, productId: ID, language: Language): ConversationDetail!
		sendMessage(conversationId: ID!, content: String!): ChatMessage!
		markConversationRead(conversationId: ID!): Boolean!
		deleteConversation(conversationId: ID!): Boolean!
	}
`;
