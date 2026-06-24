import { jest } from '@jest/globals';

jest.mock('../../repositories/reviewModerationRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/reviewModerationRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../reviewModerationService.js';
import { Role } from '../../constants/enums.js';

const mockReview = {
	id: 'rev-1',
	rating: 2,
	text: 'Bad product',
	photos: null,
	isApproved: false,
	isBlocked: false,
	deletedAt: null,
	orderId: 'order-1',
	createdAt: new Date('2026-01-01'),
	reviewerId: 'buyer-1',
	reviewer: {
		id: 'buyer-1',
		profile: { firstName: 'Jaymes', lastName: 'Sorrento', avatarUrl: null },
	},
	product: {
		id: 'prod-1',
		sku: 'NA-HFJ-OLV',
		slug: 'heritage-field-jacket-olive',
		translations: [{ title: 'Heritage Field Jacket — Olive' }],
		media: [{ url: 'https://img.com/1.jpg' }],
	},
	complaints: [{ id: 'c1', reason: 'Flagged by seller', status: 'NEW', complainantId: 'seller-1' }],
};

beforeEach(() => {
	jest.clearAllMocks();
	(repo.countReviewerApprovedReviews as jest.Mock).mockResolvedValue(3);
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
});

describe('getModerationReviews', () => {
	it('returns serialized items with tab counts', async () => {
		(repo.findModerationReviews as jest.Mock).mockResolvedValue({
			items: [mockReview],
			total: 1,
			page: 1,
			pageSize: 6,
		});
		(repo.countModerationReviewsByTab as jest.Mock).mockResolvedValue({
			pending: 9,
			flagged: 3,
			approved: 1284,
			hidden: 12,
		});

		const result = await service.getModerationReviews({ tab: 'PENDING' });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].targetTitle).toBe('Heritage Field Jacket — Olive');
		expect(result.items[0].isFlagged).toBe(true);
		expect(result.pendingCount).toBe(9);
	});
});

describe('approveReview', () => {
	it('approves review and logs audit', async () => {
		(repo.findModerationReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.approveReviewRecord as jest.Mock).mockResolvedValue({ ...mockReview, isApproved: true });

		const result = await service.approveReview('rev-1', 'mod-1');
		expect(result.isApproved).toBe(true);
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ actorId: 'mod-1', metadata: { action: 'APPROVED' } })
		);
	});

	it('throws when review not found', async () => {
		(repo.findModerationReviewById as jest.Mock).mockResolvedValue(null);
		await expect(service.approveReview('bad', 'mod-1')).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});

describe('hideReview', () => {
	it('blocks review and logs audit', async () => {
		(repo.findModerationReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.hideReviewRecord as jest.Mock).mockResolvedValue({ ...mockReview, isBlocked: true });

		const result = await service.hideReview('rev-1', 'mod-1');
		expect(result.isBlocked).toBe(true);
		expect(auditLog.log).toHaveBeenCalled();
	});
});

describe('deleteReview', () => {
	it('soft deletes review as admin', async () => {
		(repo.findModerationReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.softDeleteReviewRecord as jest.Mock).mockResolvedValue(mockReview);

		const result = await service.deleteReview('rev-1', 'admin-1', Role.ADMIN);
		expect(result).toBe(true);
		expect(repo.softDeleteReviewRecord).toHaveBeenCalledWith('rev-1');
	});

	it('blocks moderator from deleting review', async () => {
		await expect(service.deleteReview('rev-1', 'mod-1', Role.MODERATOR)).rejects.toMatchObject({
			extensions: { code: 'FORBIDDEN' },
		});
	});
});
