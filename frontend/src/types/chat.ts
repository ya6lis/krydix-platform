import type { ChatType, SupportChatStatus } from '@/constants/enums';

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

export interface SupportChatMeta {
	type: ChatType;
	subject: string | null;
	status: SupportChatStatus | null;
	requester: ConversationParticipant | null;
	assignedTo: ConversationParticipant | null;
	createdAt: string;
	updatedAt: string;
}

export interface ConversationSummary {
	id: string;
	product: ConversationProduct | null;
	otherParticipant: ConversationParticipant | null;
	lastMessage: ChatMessage | null;
	unreadCount: number;
	updatedAt: string;
	supportMeta?: SupportChatMeta | null;
}

export interface ConversationDetail {
	id: string;
	product: ConversationProduct | null;
	participants: ConversationParticipant[];
	otherParticipant: ConversationParticipant | null;
	unreadCount: number;
	createdAt: string;
	supportMeta?: SupportChatMeta | null;
}

export interface MessageListResult {
	items: ChatMessage[];
	total: number;
	page: number;
	pageSize: number;
}
