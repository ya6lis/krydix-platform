import { jest } from '@jest/globals';

jest.mock('../../repositories/reviewRepository.js');

import * as repo from '../../repositories/reviewRepository.js';
import * as service from '../reviewService.js';

const mockReview = {
	id: 'rev-1',
	productId: 'prod-1',
	reviewerId: 'buyer-1',
	orderId: 'order-1',
	rating: 4.5,
	text: 'Great product',
	photos: [{ url: 'https://img.com/1.jpg', publicId: 'p1' }],
	sellerReply: null,
	isApproved: false,
	isBlocked: false,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	reviewer: {
		id: 'buyer-1',
		profile: { firstName: 'Anna', lastName: 'Buyer', avatarUrl: null },
	},
	product: { id: 'prod-1', sellerId: 'seller-1', slug: 'test-product' },
};

beforeEach(() => {
	jest.clearAllMocks();
	(repo.countReviewerReviews as jest.Mock).mockResolvedValue(3);
});

describe('getReviewEligibility', () => {
	it('returns canWrite true when delivered order exists and no review', async () => {
		(repo.findDeliveredOrderForProduct as jest.Mock).mockResolvedValue({ id: 'order-1' });
		(repo.findExistingReview as jest.Mock).mockResolvedValue(null);

		const result = await service.getReviewEligibility('prod-1', 'buyer-1');
		expect(result.canWrite).toBe(true);
		expect(result.orderId).toBe('order-1');
	});

	it('returns canWrite false when review already exists', async () => {
		(repo.findDeliveredOrderForProduct as jest.Mock).mockResolvedValue({ id: 'order-1' });
		(repo.findExistingReview as jest.Mock).mockResolvedValue(mockReview);

		const result = await service.getReviewEligibility('prod-1', 'buyer-1');
		expect(result.canWrite).toBe(false);
		expect(result.existingReviewId).toBe('rev-1');
	});

	it('returns canWrite false when no delivered order', async () => {
		(repo.findDeliveredOrderForProduct as jest.Mock).mockResolvedValue(null);

		const result = await service.getReviewEligibility('prod-1', 'buyer-1');
		expect(result.canWrite).toBe(false);
	});
});

describe('createProductReview', () => {
	it('creates review when order is delivered', async () => {
		(repo.findDeliveredOrderForProduct as jest.Mock).mockResolvedValue({ id: 'order-1' });
		(repo.findExistingReview as jest.Mock).mockResolvedValue(null);
		(repo.createProductReview as jest.Mock).mockResolvedValue(mockReview);

		const result = await service.createProductReview('buyer-1', {
			productId: 'prod-1',
			orderId: 'order-1',
			rating: 4.5,
			text: 'Great product',
		});

		expect(repo.createProductReview).toHaveBeenCalled();
		expect(result.rating).toBe(4.5);
		expect(result.isPending).toBe(true);
	});

	it('throws when order is not delivered', async () => {
		(repo.findDeliveredOrderForProduct as jest.Mock).mockResolvedValue(null);

		await expect(
			service.createProductReview('buyer-1', {
				productId: 'prod-1',
				orderId: 'order-1',
				rating: 4,
			})
		).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
	});

	it('throws when rating out of range', async () => {
		await expect(
			service.createProductReview('buyer-1', {
				productId: 'prod-1',
				orderId: 'order-1',
				rating: 6,
			})
		).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
	});
});

describe('respondToReview', () => {
	it('allows seller to respond once', async () => {
		(repo.findReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.setSellerReply as jest.Mock).mockResolvedValue({ ...mockReview, sellerReply: 'Thanks!' });

		const result = await service.respondToReview('seller-1', 'rev-1', 'Thanks!');
		expect(result.sellerReply).toBe('Thanks!');
	});

	it('throws when non-seller tries to respond', async () => {
		(repo.findReviewById as jest.Mock).mockResolvedValue(mockReview);

		await expect(service.respondToReview('other-user', 'rev-1', 'Hi')).rejects.toMatchObject({
			extensions: { code: 'FORBIDDEN' },
		});
	});

	it('throws when reply already exists', async () => {
		(repo.findReviewById as jest.Mock).mockResolvedValue({ ...mockReview, sellerReply: 'Already' });

		await expect(service.respondToReview('seller-1', 'rev-1', 'Again')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});
});

describe('flagReview', () => {
	it('creates complaint for valid review', async () => {
		(repo.findReviewById as jest.Mock).mockResolvedValue(mockReview);
		(repo.createReviewComplaint as jest.Mock).mockResolvedValue({ id: 'c1' });

		const result = await service.flagReview('buyer-2', 'rev-1', 'Inappropriate content');
		expect(result).toBe(true);
		expect(repo.createReviewComplaint).toHaveBeenCalled();
	});

	it('throws when reason is empty', async () => {
		await expect(service.flagReview('buyer-2', 'rev-1', '  ')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});
});
