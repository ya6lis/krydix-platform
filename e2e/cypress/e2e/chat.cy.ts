import authFixture from '../fixtures/auth.json';
import cartFixture from '../fixtures/cart.json';

const conversations = [
	{
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
			email: 'seller@test.com',
			city: 'Kyiv',
			country: 'Ukraine',
			memberSince: '2024-06-01T00:00:00.000Z',
		},
		lastMessage: {
			id: 'msg-1',
			conversationId: 'chat-1',
			senderId: 'seller-1',
			content: 'Yes, size M is available.',
			isRead: false,
			createdAt: '2026-01-02T10:00:00.000Z',
			sender: {
				id: 'seller-1',
				displayName: 'Northern Atelier',
				avatarUrl: null,
				initials: 'NA',
				role: 'SELLER',
				isOnline: true,
				email: 'seller@test.com',
				city: 'Kyiv',
				country: 'Ukraine',
				memberSince: '2024-06-01T00:00:00.000Z',
			},
		},
	},
];

const conversationDetail = {
	id: 'chat-1',
	unreadCount: 0,
	createdAt: '2026-01-01T00:00:00.000Z',
	product: conversations[0].product,
	otherParticipant: conversations[0].otherParticipant,
	participants: [conversations[0].otherParticipant],
};

const messages = {
	items: conversations[0].lastMessage ? [conversations[0].lastMessage] : [],
	total: 1,
	page: 1,
	pageSize: 100,
};

function setRefreshToken(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: cartFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: authFixture.me });
		} else if (op === 'MyConversations') {
			req.reply({ data: { myConversations: conversations } });
		} else if (op === 'Conversation') {
			req.reply({ data: { conversation: conversationDetail } });
		} else if (op === 'Messages') {
			req.reply({ data: { messages } });
		} else if (op === 'StartConversation') {
			req.reply({ data: { startConversation: conversationDetail } });
		} else if (op === 'SendMessage') {
			const content = req.body?.variables?.content ?? 'Hello from test';
			req.reply({
				data: {
					sendMessage: {
						id: 'msg-new',
						conversationId: 'chat-1',
						senderId: 'buyer-1',
						content,
						isRead: false,
						createdAt: new Date().toISOString(),
						sender: {
							id: 'buyer-1',
							displayName: 'Anna Buyer',
							avatarUrl: null,
							initials: 'AB',
							role: 'BUYER',
							isOnline: true,
							email: 'buyer@test.com',
							city: 'Kyiv',
							country: 'Ukraine',
							memberSince: '2025-01-01T00:00:00.000Z',
						},
					},
				},
			});
		} else if (op === 'MarkConversationRead') {
			req.reply({ data: { markConversationRead: true } });
		} else if (op === 'Product') {
			req.reply({
				data: {
					product: {
						id: 'prod-1',
						slug: 'jacket',
						sku: 'J-1',
						brand: 'Heritage Co.',
						basePrice: 184,
						comparePrice: null,
						status: 'APPROVED',
						isAvailable: true,
						title: 'Heritage Field Jacket',
						description: 'Test product',
						metaTitle: null,
						metaDescription: null,
						mainImage: null,
						rating: 4.8,
						reviewCount: 5,
						totalStock: 10,
						createdAt: '2026-01-01T00:00:00.000Z',
						media: [],
						variants: [],
						categories: [],
						seller: { id: 'seller-1', name: 'Northern Atelier' },
					},
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('Chat flow', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/catalog/jacket', {
			onBeforeLoad: setRefreshToken,
		});
		cy.wait('@graphql');
	});

	it('opens chat from product page and sends a message', () => {
		cy.get('[data-testid="product-message-seller"]').click();
		cy.url().should('include', '/chat');
		cy.get('[data-testid="chat-page"]').should('be.visible');
		cy.get('[data-testid="chat-composer"]').type('Hello from Cypress');
		cy.get('[data-testid="chat-send"]').click();
		cy.contains('Hello from Cypress').should('be.visible');
	});
});
