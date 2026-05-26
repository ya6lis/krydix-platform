export interface ConversationParticipant {
	id: string;
	displayName: string;
	avatarUrl: string | null;
	initials: string;
	role: string;
	isOnline: boolean;
	lastSeenAt: string;
	email: string;
	city: string | null;
	country: string | null;
	memberSince: string;
}

export interface ConversationProduct {
	id: string;
	slug: string;
	title: string;
	sku: string;
	price: string | number;
	imageUrl: string | null;
	sellerId: string;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	senderId: string;
	content: string;
	isDelivered: boolean;
	isRead: boolean;
	createdAt: string;
	sender: ConversationParticipant;
}

export interface ConversationSummary {
	id: string;
	product: ConversationProduct | null;
	otherParticipant: ConversationParticipant;
	lastMessage: ChatMessage | null;
	unreadCount: number;
	updatedAt: string;
}

export interface ConversationDetail {
	id: string;
	product: ConversationProduct | null;
	participants: ConversationParticipant[];
	otherParticipant: ConversationParticipant;
	unreadCount: number;
	createdAt: string;
}

export interface MessageListResult {
	items: ChatMessage[];
	total: number;
	page: number;
	pageSize: number;
}
