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

const SUPPORT_META_FIELDS = `
	type
	subject
	status
	createdAt
	updatedAt
	requester {
		${PARTICIPANT_FIELDS}
	}
	assignedTo {
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

export const MY_SUPPORT_CONVERSATION_QUERY = gql`
	query MySupportConversation($language: Language) {
		mySupportConversation(language: $language) {
			id
			unreadCount
			createdAt
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			participants {
				${PARTICIPANT_FIELDS}
			}
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;

export const MY_SUPPORT_HISTORY_QUERY = gql`
	query MySupportHistory($language: Language, $limit: Int) {
		mySupportHistory(language: $language, limit: $limit) {
			id
			updatedAt
			unreadCount
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			lastMessage {
				${MESSAGE_FIELDS}
			}
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;

export const SUPPORT_QUEUE_QUERY = gql`
	query SupportQueue($filter: SupportQueueFilter) {
		supportQueue(filter: $filter) {
			items {
				id
				updatedAt
				unreadCount
				otherParticipant {
					${PARTICIPANT_FIELDS}
				}
				lastMessage {
					${MESSAGE_FIELDS}
				}
				supportMeta {
					${SUPPORT_META_FIELDS}
				}
			}
			total
			page
			pageSize
		}
	}
`;

export const SUPPORT_CONVERSATION_QUERY = gql`
	query SupportConversation($id: ID!, $language: Language) {
		supportConversation(id: $id, language: $language) {
			id
			unreadCount
			createdAt
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			participants {
				${PARTICIPANT_FIELDS}
			}
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;

export const CREATE_SUPPORT_CONVERSATION_MUTATION = gql`
	mutation CreateSupportConversation($input: CreateSupportConversationInput!, $language: Language) {
		createSupportConversation(input: $input, language: $language) {
			id
			unreadCount
			createdAt
			otherParticipant {
				${PARTICIPANT_FIELDS}
			}
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;

export const ASSIGN_SUPPORT_CONVERSATION_MUTATION = gql`
	mutation AssignSupportConversation($conversationId: ID!, $language: Language) {
		assignSupportConversation(conversationId: $conversationId, language: $language) {
			id
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;

export const UPDATE_SUPPORT_STATUS_MUTATION = gql`
	mutation UpdateSupportConversationStatus(
		$conversationId: ID!
		$status: SupportChatStatus!
		$language: Language
	) {
		updateSupportConversationStatus(
			conversationId: $conversationId
			status: $status
			language: $language
		) {
			id
			supportMeta {
				${SUPPORT_META_FIELDS}
			}
		}
	}
`;
