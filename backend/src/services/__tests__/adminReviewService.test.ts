import { jest } from '@jest/globals';

jest.mock('../../repositories/adminReviewRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/adminReviewRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../adminReviewService.js';
import { Role } from '../../constants/enums.js';

const mockReview = {
	id: 'rev-1',
	rating: 4.5,
	text: 'Great product',
	orderId: 'order-1',
	isApproved: false,
	isBlocked: false,
	deletedAt: null,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-05-26'),
	reviewer: {
		id: 'buyer-1',
		email: 'buyer@krydix.dev',
		profile: { firstName: 'Anna', lastName: 'Bond', avatarUrl: null },
	},
	product: {
		id: 'prod-1',
		sku: 'SKU-001',
		slug: 'test-product',
		translations: [{ title: 'Test Product' }],
		media: [{ url: 'https://example.com/img.jpg' }],
	},
	complaints: [],
};

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
});

describe('changeAdminReviewStatus', () => {
	it('allows moderator to approve review', async () => {
		(repo.findAdminReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.updateAdminReviewStatus as jest.Mock).mockResolvedValue({
			...mockReview,
			isApproved: true,
		});

		const result = await service.changeAdminReviewStatus(
			'mod-1',
			Role.MODERATOR,
			'rev-1',
			'APPROVED'
		);

		expect(result.status).toBe('APPROVED');
		expect(auditLog.log).toHaveBeenCalled();
	});
});

describe('adminDeleteReview', () => {
	it('allows admin to soft delete review', async () => {
		(repo.findAdminReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.softDeleteAdminReviewRecord as jest.Mock).mockResolvedValue(mockReview);

		const result = await service.adminDeleteReview('admin-1', Role.ADMIN, 'rev-1');
		expect(result).toBe(true);
	});

	it('blocks moderator from deleting review', async () => {
		await expect(service.adminDeleteReview('mod-1', Role.MODERATOR, 'rev-1')).rejects.toMatchObject(
			{ extensions: { code: 'FORBIDDEN' } }
		);
	});
});
