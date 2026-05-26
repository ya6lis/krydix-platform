import { gql } from '@apollo/client';

const PARTICIPANT_FIELDS = `
	id
	displayName
	avatarUrl
	initials
	role
	isOnline
	lastSeenAt
	email
	city
	country
	memberSince
`;

const PRODUCT_FIELDS = `
	id
	slug
	title
	sku
	price
	imageUrl
	sellerId
`;

const MESSAGE_FIELDS = `
	id
	conversationId
	senderId
	content
	isDelivered
	isRead
	createdAt
	sender {
		${PARTICIPANT_FIELDS}
	}
`;

export const MY_CONVERSATIONS_QUERY = gql`
	query MyConversations($language: Language) {
		myConversations(language: $language) {
			id
			updatedAt
			unreadCount
			product {
				${PRODUCT_FIELDS}
			}
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			lastMessage {
				${MESSAGE_FIELDS}
			}
		}
	}
`;

export const CONVERSATION_QUERY = gql`
	query Conversation($id: ID!, $language: Language) {
		conversation(id: $id, language: $language) {
			id
			unreadCount
			createdAt
			product {
				${PRODUCT_FIELDS}
			}
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			participants {
				${PARTICIPANT_FIELDS}
			}
		}
	}
`;

export const MESSAGES_QUERY = gql`
	query Messages($conversationId: ID!, $page: Int, $pageSize: Int) {
		messages(conversationId: $conversationId, page: $page, pageSize: $pageSize) {
			items {
				${MESSAGE_FIELDS}
			}
			total
			page
			pageSize
		}
	}
`;

export const START_CONVERSATION_MUTATION = gql`
	mutation StartConversation($sellerId: ID, $productId: ID, $language: Language) {
		startConversation(sellerId: $sellerId, productId: $productId, language: $language) {
			id
			unreadCount
			createdAt
			product {
				${PRODUCT_FIELDS}
			}
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
		}
	}
`;

export const SEND_MESSAGE_MUTATION = gql`
	mutation SendMessage($conversationId: ID!, $content: String!) {
		sendMessage(conversationId: $conversationId, content: $content) {
			${MESSAGE_FIELDS}
		}
	}
`;

export const DELETE_CONVERSATION_MUTATION = gql`
	mutation DeleteConversation($conversationId: ID!) {
		deleteConversation(conversationId: $conversationId)
	}
`;

export const MARK_CONVERSATION_READ_MUTATION = gql`
	mutation MarkConversationRead($conversationId: ID!) {
		markConversationRead(conversationId: $conversationId)
	}
`;

export const UNREAD_MESSAGE_COUNT_QUERY = gql`
	query UnreadMessageCount {
		unreadMessageCount
	}
`;
