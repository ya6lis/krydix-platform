jest.mock('../../repositories/chatRepository.js');
jest.mock('../../repositories/productRepository.js');
jest.mock('../../repositories/userRepository.js');
jest.mock('../../socket/chatSocket.js', () => ({
	emitChatEvent: jest.fn(),
}));
jest.mock('../notificationService.js', () => ({
	notifyNewMessage: jest.fn(),
	notifySupportNewRequest: jest.fn(),
	notifySupportAssigned: jest.fn(),
	notifySupportStatusChange: jest.fn(),
	markConversationNotificationsRead: jest.fn().mockResolvedValue(false),
}));

import * as chatRepo from '../../repositories/chatRepository.js';
import * as productRepo from '../../repositories/productRepository.js';
import * as userRepo from '../../repositories/userRepository.js';
import * as notificationService from '../notificationService.js';
import * as chatService from '../chatService.js';
import { Language, Role } from '../../constants/enums.js';

const mockChatRepo = chatRepo as jest.Mocked<typeof chatRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;
const mockUserRepo = userRepo as jest.Mocked<typeof userRepo>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

const buyer = {
	id: 'buyer-1',
	email: 'buyer@test.com',
	role: 'BUYER',
	createdAt: new Date('2025-01-01T00:00:00.000Z'),
	lastSeenAt: new Date(),
	profile: {
		firstName: 'Anna',
		lastName: 'Buyer',
		displayName: null,
		avatarUrl: null,
		city: 'Kyiv',
		country: 'Ukraine',
	},
};

const seller = {
	id: 'seller-1',
	email: 'seller@test.com',
	role: 'SELLER',
	createdAt: new Date('2024-06-01T00:00:00.000Z'),
	lastSeenAt: new Date(),
	profile: {
		firstName: 'Deja',
		lastName: 'Brady',
		displayName: 'Northern Atelier',
		avatarUrl: null,
		city: 'Kyiv',
		country: 'Ukraine',
	},
};

const chatRecord = {
	id: 'chat-1',
	type: 'MARKETPLACE',
	productId: 'prod-1',
	subject: null,
	status: null,
	requesterId: null,
	assignedToId: null,
	createdAt: new Date('2026-01-01T00:00:00.000Z'),
	updatedAt: new Date('2026-01-02T10:00:00.000Z'),
	requester: null,
	assignedTo: null,
	participants: [
		{ chatId: 'chat-1', userId: 'buyer-1', user: buyer },
		{ chatId: 'chat-1', userId: 'seller-1', user: seller },
	],
	messages: [
		{
			id: 'msg-1',
			chatId: 'chat-1',
			senderId: 'buyer-1',
		content: 'Hello',
		isDelivered: false,
		isRead: false,
			createdAt: new Date('2026-01-02T10:00:00.000Z'),
			sender: buyer,
		},
	],
} as unknown as chatRepo.ChatRecord;

describe('chatService.startConversation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns an existing conversation for the same product and participants', async () => {
		mockProductRepo.findProductById.mockResolvedValue({
			id: 'prod-1',
			sellerId: 'seller-1',
			slug: 'jacket',
			sku: 'J-1',
			basePrice: 120,
			translations: [{ language: 'EN', title: 'Jacket' }],
			media: [],
		} as never);
		mockUserRepo.findUserById.mockResolvedValue(seller as never);
		mockChatRepo.findExistingConversation.mockResolvedValue(chatRecord);
		mockChatRepo.isParticipant.mockResolvedValue(true);
		mockChatRepo.findConversationById.mockResolvedValue(chatRecord);
		mockChatRepo.countUnreadByConversation.mockResolvedValue(1);

		const result = await chatService.startConversation(
			'buyer-1',
			{ productId: 'prod-1' },
			Language.EN
		);

		expect(result.id).toBe('chat-1');
		expect(mockChatRepo.createConversation).not.toHaveBeenCalled();
	});
});

describe('chatService.createSupportConversation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('creates a support conversation when none is active', async () => {
		mockChatRepo.findActiveSupportByRequesterId.mockResolvedValue(null);
		mockChatRepo.createSupportConversation.mockResolvedValue({
			...chatRecord,
			id: 'support-1',
			type: 'SUPPORT',
			subject: 'Order issue',
			status: 'OPEN',
			requesterId: 'buyer-1',
			requester: buyer,
			participants: [{ chatId: 'support-1', userId: 'buyer-1', user: buyer }],
		} as never);
		mockChatRepo.countUnreadByConversation.mockResolvedValue(0);

		const result = await chatService.createSupportConversation(
			'buyer-1',
			{ subject: 'Order issue', message: 'Need help with my order' },
			Language.EN
		);

		expect(result.id).toBe('support-1');
		expect(mockChatRepo.createSupportConversation).toHaveBeenCalled();
		expect(mockNotificationService.notifySupportNewRequest).not.toHaveBeenCalled();
	});

	it('rejects when an active support conversation already exists', async () => {
		mockChatRepo.findActiveSupportByRequesterId.mockResolvedValue({
			...chatRecord,
			type: 'SUPPORT',
			status: 'OPEN',
		} as never);

		await expect(
			chatService.createSupportConversation('buyer-1', {
				subject: 'Another issue',
				message: 'Help',
			})
		).rejects.toThrow('You already have an open support request');
	});
});

describe('chatService.getSupportQueue', () => {
	it('returns support queue items for staff', async () => {
		mockChatRepo.findSupportQueue.mockResolvedValue({
			items: [
				{
					...chatRecord,
					id: 'support-1',
					type: 'SUPPORT',
					subject: 'Help',
					status: 'OPEN',
					requesterId: 'buyer-1',
					requester: buyer,
					participants: [{ chatId: 'support-1', userId: 'buyer-1', user: buyer }],
				},
			],
			total: 1,
		});
		mockChatRepo.countUnreadByConversation.mockResolvedValue(0);

		const result = await chatService.getSupportQueue(
			'mod-1',
			Role.MODERATOR,
			{ page: 1, pageSize: 25 },
			Language.EN
		);

		expect(result.items).toHaveLength(1);
		expect(result.total).toBe(1);
	});
});

describe('chatService.sendMessage', () => {
	it('creates a message for a participant', async () => {
		mockChatRepo.findConversationById.mockResolvedValue(chatRecord);
		mockChatRepo.isParticipant.mockResolvedValue(true);
		mockChatRepo.createMessage.mockResolvedValue({
			id: 'msg-2',
			chatId: 'chat-1',
			senderId: 'buyer-1',
			content: 'New message',
			isRead: false,
			createdAt: new Date('2026-01-02T11:00:00.000Z'),
			sender: buyer,
		} as never);
		mockChatRepo.findConversationById.mockResolvedValue(chatRecord);

		const result = await chatService.sendMessage('buyer-1', {
			conversationId: 'chat-1',
			content: 'New message',
		});

		expect(result.content).toBe('New message');
	});
});

describe('chatService.markConversationRead', () => {
	it('marks unread messages as read', async () => {
		mockChatRepo.findConversationById.mockResolvedValue(chatRecord);
		mockChatRepo.isParticipant.mockResolvedValue(true);
		mockChatRepo.markMessagesRead.mockResolvedValue(2);

		const result = await chatService.markConversationRead('seller-1', 'chat-1');
		expect(result).toBe(true);
		expect(mockChatRepo.markMessagesRead).toHaveBeenCalledWith('chat-1', 'seller-1');
	});
});

describe('chatService.getUnreadMessageCount', () => {
	it('returns total unread messages for the user', async () => {
		mockChatRepo.countUnreadTotal.mockResolvedValue(5);

		const result = await chatService.getUnreadMessageCount('buyer-1');
		expect(result).toBe(5);
		expect(mockChatRepo.countUnreadTotal).toHaveBeenCalledWith('buyer-1');
	});
});
