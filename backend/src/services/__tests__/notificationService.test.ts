jest.mock('../../repositories/notificationRepository.js');
jest.mock('../../socket/chatSocket.js', () => ({
	emitUserNotification: jest.fn(),
}));

import * as notificationRepo from '../../repositories/notificationRepository.js';
import { emitUserNotification } from '../../socket/chatSocket.js';
import * as notificationService from '../notificationService.js';

const mockRepo = notificationRepo as jest.Mocked<typeof notificationRepo>;
const mockEmit = emitUserNotification as jest.MockedFunction<typeof emitUserNotification>;

describe('notificationService.notifyNewMessage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRepo.isNotificationEnabled.mockResolvedValue(true);
		mockRepo.createNotification.mockResolvedValue({
			id: 'notif-1',
			userId: 'seller-1',
			event: 'NEW_MESSAGE',
			title: 'New message',
			body: 'Anna: Hello',
			isRead: false,
			metadata: {},
			createdAt: new Date('2026-01-02T10:00:00.000Z'),
		});
		mockRepo.countUnreadByUserId.mockResolvedValue(1);
	});

	it('creates a notification and emits a socket event', async () => {
		await notificationService.notifyNewMessage({
			recipientId: 'seller-1',
			senderId: 'buyer-1',
			conversationId: 'chat-1',
			senderName: 'Anna Buyer',
			preview: 'Hello',
		});

		expect(mockRepo.createNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'seller-1',
				event: 'NEW_MESSAGE',
			}),
		);
		expect(mockEmit).toHaveBeenCalledWith(
			'seller-1',
			'notification:new',
			expect.objectContaining({ unreadCount: 1 }),
		);
	});
});
