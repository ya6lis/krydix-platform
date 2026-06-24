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
			})
		);
		expect(mockEmit).toHaveBeenCalledWith(
			'seller-1',
			'notification:new',
			expect.objectContaining({ unreadCount: 1 })
		);
	});
});

describe('notificationService.notifySupportAssigned', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockRepo.isNotificationEnabled.mockResolvedValue(true);
		mockRepo.createNotification.mockResolvedValue({
			id: 'notif-support-1',
			userId: 'buyer-1',
			event: 'SUPPORT_UPDATE',
			title: 'Support request in progress',
			body: 'Mod is working',
			isRead: false,
			metadata: { action: 'ASSIGNED' },
			createdAt: new Date('2026-01-02T10:00:00.000Z'),
		});
		mockRepo.countUnreadByUserId.mockResolvedValue(1);
	});

	it('creates a support assignment notification', async () => {
		await notificationService.notifySupportAssigned({
			requesterId: 'buyer-1',
			conversationId: 'support-1',
			subject: 'Order issue',
			staffName: 'Mod User',
		});

		expect(mockRepo.createNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'buyer-1',
				event: 'SUPPORT_UPDATE',
			})
		);
	});
});

describe('notificationService.deleteNotification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('delegates to repository and returns result', async () => {
		mockRepo.deleteNotification.mockResolvedValue(true);
		const result = await notificationService.deleteNotification('user-1', 'notif-1');
		expect(mockRepo.deleteNotification).toHaveBeenCalledWith('notif-1', 'user-1');
		expect(result).toBe(true);
	});
});

describe('notificationService.deleteReadNotifications', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('delegates to repository and returns deleted count', async () => {
		mockRepo.deleteReadNotifications.mockResolvedValue(3);
		const result = await notificationService.deleteReadNotifications('user-1');
		expect(mockRepo.deleteReadNotifications).toHaveBeenCalledWith('user-1');
		expect(result).toBe(3);
	});
});
