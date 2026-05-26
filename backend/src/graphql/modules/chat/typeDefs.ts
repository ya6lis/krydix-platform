export const chatTypeDefs = `#graphql
	enum ChatType {
		MARKETPLACE
		SUPPORT
	}

	enum SupportChatStatus {
		OPEN
		IN_PROGRESS
		RESOLVED
		CLOSED
	}

	type SupportChatMeta {
		type: ChatType!
		subject: String
		status: SupportChatStatus
		requester: ConversationParticipant
		assignedTo: ConversationParticipant
		createdAt: String!
		updatedAt: String!
	}

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
		otherParticipant: ConversationParticipant
		lastMessage: ChatMessage
		unreadCount: Int!
		updatedAt: String!
		supportMeta: SupportChatMeta
	}

	type ConversationDetail {
		id: ID!
		product: ConversationProduct
		participants: [ConversationParticipant!]!
		otherParticipant: ConversationParticipant
		unreadCount: Int!
		createdAt: String!
		supportMeta: SupportChatMeta
	}

	type MessageList {
		items: [ChatMessage!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	type SupportQueueResult {
		items: [ConversationSummary!]!
		total: Int!
		page: Int!
		pageSize: Int!
	}

	input CreateSupportConversationInput {
		subject: String!
		message: String!
	}

	input SupportQueueFilter {
		status: SupportChatStatus
		search: String
		page: Int
		pageSize: Int
	}

	extend type Query {
		myConversations(language: Language): [ConversationSummary!]!
		conversation(id: ID!, language: Language): ConversationDetail!
		messages(conversationId: ID!, page: Int, pageSize: Int): MessageList!
		unreadMessageCount: Int!
		mySupportConversation(language: Language): ConversationDetail
		mySupportHistory(language: Language, limit: Int): [ConversationSummary!]!
		supportQueue(filter: SupportQueueFilter): SupportQueueResult!
		supportConversation(id: ID!, language: Language): ConversationDetail!
	}

	extend type Mutation {
		startConversation(sellerId: ID, productId: ID, language: Language): ConversationDetail!
		sendMessage(conversationId: ID!, content: String!): ChatMessage!
		markConversationRead(conversationId: ID!): Boolean!
		deleteConversation(conversationId: ID!): Boolean!
		createSupportConversation(input: CreateSupportConversationInput!, language: Language): ConversationDetail!
		assignSupportConversation(conversationId: ID!, language: Language): ConversationDetail!
		updateSupportConversationStatus(conversationId: ID!, status: SupportChatStatus!, language: Language): ConversationDetail!
	}
`;
