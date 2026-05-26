import { jest } from '@jest/globals';

jest.mock('../../repositories/wishlistRepository.js');
jest.mock('../../repositories/productRepository.js');

import * as wishlistRepo from '../../repositories/wishlistRepository.js';
import * as productRepo from '../../repositories/productRepository.js';
import * as service from '../wishlistService.js';

const mockProduct = {
	id: 'product-1',
	sellerId: 'seller-1',
	slug: 'test-product',
	basePrice: 100,
	comparePrice: null,
	isAvailable: true,
	deletedAt: null,
	translations: [{ language: 'EN', title: 'Test Product' }],
	media: [{ url: 'https://img.test/main.jpg' }],
	variants: [{ stock: 5 }],
	seller: { profile: { firstName: 'Jane', lastName: 'Doe' } },
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('toggleWishlist', () => {
	it('adds product when not already saved', async () => {
		(wishlistRepo.findWishlistItem as jest.Mock).mockResolvedValue(null);
		(productRepo.findProductById as jest.Mock).mockResolvedValue(mockProduct);
		(wishlistRepo.addWishlistItem as jest.Mock).mockResolvedValue(undefined);
		(wishlistRepo.findWishlistByUser as jest.Mock).mockResolvedValue([
			{
				id: 'w1',
				productId: 'product-1',
				product: mockProduct,
			},
		]);

		const result = await service.toggleWishlist('user-1', 'product-1', 'EN' as never);

		expect(wishlistRepo.addWishlistItem).toHaveBeenCalledWith('user-1', 'product-1');
		expect(result.count).toBe(1);
		expect(result.items[0].productTitle).toBe('Test Product');
	});
});
