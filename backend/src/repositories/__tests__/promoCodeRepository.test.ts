// Mock Prisma before imports
const mockPrisma = {
	promoCode: {
		findUnique: jest.fn(),
		update: jest.fn(),
	},
};

jest.mock('../../utils/prisma.js', () => ({ prisma: mockPrisma }));

import * as promoRepo from '../promoCodeRepository.js';

beforeEach(() => {
	jest.clearAllMocks();
});

describe('promoCodeRepository.findPromoByCode', () => {
	it('finds promo by exact code', async () => {
		const fakePromo = { id: 'promo-1', code: 'WELCOME10', isActive: true };
		mockPrisma.promoCode.findUnique.mockResolvedValue(fakePromo);

		const result = await promoRepo.findPromoByCode('WELCOME10');

		expect(mockPrisma.promoCode.findUnique).toHaveBeenCalledWith({
			where: { code: 'WELCOME10' },
		});
		expect(result).toEqual(fakePromo);
	});

	it('returns null for unknown code', async () => {
		mockPrisma.promoCode.findUnique.mockResolvedValue(null);

		const result = await promoRepo.findPromoByCode('FAKE');

		expect(result).toBeNull();
	});
});

describe('promoCodeRepository.incrementPromoUsage', () => {
	it('increments usedCount by 1', async () => {
		mockPrisma.promoCode.update.mockResolvedValue({});

		await promoRepo.incrementPromoUsage('promo-1');

		expect(mockPrisma.promoCode.update).toHaveBeenCalledWith({
			where: { id: 'promo-1' },
			data: { usedCount: { increment: 1 } },
		});
	});
});
