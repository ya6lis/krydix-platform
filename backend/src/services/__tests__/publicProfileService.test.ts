import { jest } from '@jest/globals';

jest.mock('../../repositories/publicProfileRepository.js');

import * as repo from '../../repositories/publicProfileRepository.js';
import * as service from '../publicProfileService.js';

const mockUser = {
	id: 'seller-1',
	role: 'SELLER',
	createdAt: new Date('2024-01-15'),
	profile: {
		firstName: 'Deja',
		lastName: 'Brady',
		displayName: 'Northern Atelier',
		bio: 'Small batch outerwear.',
		avatarUrl: null,
		country: 'Ukraine',
		city: 'Kyiv',
	},
	sellerApplication: {
		companyName: 'Northern Atelier LLC',
		status: 'APPROVED',
	},
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('getPublicSellerProfile', () => {
	it('returns public seller profile with stats', async () => {
		(repo.findPublicUser as jest.Mock).mockResolvedValue(mockUser);
		(repo.getSellerCatalogStats as jest.Mock).mockResolvedValue({
			productCount: 12,
			averageRating: 4.7,
			reviewCount: 86,
		});

		const result = await service.getPublicSellerProfile('seller-1');

		expect(result.displayName).toBe('Northern Atelier');
		expect(result.isVerifiedSeller).toBe(true);
		expect(result.productCount).toBe(12);
		expect(result.averageRating).toBe(4.7);
	});

	it('throws when user not found', async () => {
		(repo.findPublicUser as jest.Mock).mockResolvedValue(null);
		await expect(service.getPublicSellerProfile('missing')).rejects.toThrow('Profile not found');
	});
});
