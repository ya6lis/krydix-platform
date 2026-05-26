import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import ChatPage from '../ChatPage';
import {
	CONVERSATION_QUERY,
	MARK_CONVERSATION_READ_MUTATION,
	MESSAGES_QUERY,
	MY_CONVERSATIONS_QUERY,
	SEND_MESSAGE_MUTATION,
	UNREAD_MESSAGE_COUNT_QUERY,
} from '@/graphql/operations/chat';

const lastSeenAt = '2026-01-02T09:00:00.000Z';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, unknown>) =>
			opts?.date ? `${key}:${opts.date}` : key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@/hooks/useChatSocket', () => ({
	useChatSocket: jest.fn(() => ({ emitTyping: jest.fn() })),
}));

jest.mock('@/store/authStore', () => ({
	useAuthStore: (selector: (state: { user: { id: string; role: string } }) => unknown) =>
		selector({ user: { id: 'buyer-1', role: 'BUYER' } }),
}));

const conversation = {
	id: 'chat-1',
	updatedAt: '2026-01-02T10:00:00.000Z',
	unreadCount: 1,
	product: {
		id: 'prod-1',
		slug: 'jacket',
		title: 'Heritage Field Jacket',
		sku: 'J-1',
		price: 184,
		imageUrl: null,
		sellerId: 'seller-1',
	},
	otherParticipant: {
		id: 'seller-1',
		displayName: 'Northern Atelier',
		avatarUrl: null,
		initials: 'NA',
		role: 'SELLER',
		isOnline: true,
		lastSeenAt,
		email: 'seller@test.com',
		city: 'Kyiv',
		country: 'Ukraine',
		memberSince: '2024-06-01T00:00:00.000Z',
	},
	lastMessage: {
		id: 'msg-1',
		conversationId: 'chat-1',
		senderId: 'seller-1',
		content: 'Hello there',
		isDelivered: false,
		isRead: false,
		createdAt: '2026-01-02T10:00:00.000Z',
		sender: {
			id: 'seller-1',
			displayName: 'Northern Atelier',
			avatarUrl: null,
			initials: 'NA',
			role: 'SELLER',
			isOnline: true,
			lastSeenAt,
			email: 'seller@test.com',
			city: 'Kyiv',
			country: 'Ukraine',
			memberSince: '2024-06-01T00:00:00.000Z',
		},
	},
};

const mocks = [
	{
		request: { query: UNREAD_MESSAGE_COUNT_QUERY },
		result: { data: { unreadMessageCount: 1 } },
	},
	{
		request: { query: MY_CONVERSATIONS_QUERY, variables: { language: 'EN' } },
		result: { data: { myConversations: [conversation] } },
	},
	{
		request: { query: CONVERSATION_QUERY, variables: { id: 'chat-1', language: 'EN' } },
		result: {
			data: {
				conversation: {
					id: 'chat-1',
					unreadCount: 0,
					createdAt: '2026-01-01T00:00:00.000Z',
					product: conversation.product,
					otherParticipant: conversation.otherParticipant,
					participants: [conversation.otherParticipant],
				},
			},
		},
	},
	{
		request: {
			query: MESSAGES_QUERY,
			variables: { conversationId: 'chat-1', page: 1, pageSize: 100 },
		},
		result: { data: { messages: { items: [conversation.lastMessage], total: 1, page: 1, pageSize: 100 } } },
	},
	{
		request: { query: MARK_CONVERSATION_READ_MUTATION, variables: { conversationId: 'chat-1' } },
		result: { data: { markConversationRead: true } },
	},
	{
		request: {
			query: SEND_MESSAGE_MUTATION,
			variables: { conversationId: 'chat-1', content: 'Test reply' },
		},
		result: {
			data: {
				sendMessage: {
					id: 'msg-2',
					conversationId: 'chat-1',
					senderId: 'buyer-1',
					content: 'Test reply',
					isDelivered: false,
					isRead: false,
					createdAt: '2026-01-02T11:00:00.000Z',
					sender: {
						id: 'buyer-1',
						displayName: 'Anna Buyer',
						avatarUrl: null,
						initials: 'AB',
						role: 'BUYER',
						isOnline: true,
						lastSeenAt: '2025-01-01T00:00:00.000Z',
						email: 'buyer@test.com',
						city: 'Kyiv',
						country: 'Ukraine',
						memberSince: '2025-01-01T00:00:00.000Z',
					},
				},
			},
		},
	},
];

function renderPage() {
	return render(
		<MockedProvider mocks={mocks} addTypename={false}>
			<MemoryRouter initialEntries={['/chat?conversation=chat-1']}>
				<ChatPage />
			</MemoryRouter>
		</MockedProvider>,
	);
}

describe('ChatPage', () => {
	it('renders inbox and message thread', async () => {
		renderPage();
		expect(await screen.findByTestId('chat-page')).toBeInTheDocument();
		expect(screen.getAllByText('Northern Atelier').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Hello there').length).toBeGreaterThan(0);
	});

	it('sends a message from composer', async () => {
		renderPage();
		await screen.findByTestId('chat-composer');
		fireEvent.change(screen.getByTestId('chat-composer'), { target: { value: 'Test reply' } });
		fireEvent.click(screen.getByTestId('chat-send'));
		await waitFor(() => {
			expect(screen.getByText('Test reply')).toBeInTheDocument();
		});
	});
});
