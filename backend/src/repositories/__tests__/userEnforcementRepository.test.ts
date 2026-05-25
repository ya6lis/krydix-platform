import { jest } from '@jest/globals';

jest.mock('../../utils/prisma.js', () => ({
	prisma: {
		order: { findMany: jest.fn() },
		orderItem: { findMany: jest.fn() },
		$transaction: jest.fn(),
	},
}));

import { prisma } from '../../utils/prisma.js';
import { applySoftBanEffects, applySoftDeleteEffects } from '../userEnforcementRepository.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
	jest.clearAllMocks();
});

describe('applySoftBanEffects', () => {
	it('drafts seller products and cancels unpaid orders', async () => {
		(mockPrisma.order.findMany as jest.Mock).mockResolvedValue([{ id: 'order-1' }]);
		(mockPrisma.orderItem.findMany as jest.Mock).mockResolvedValue([]);
		(mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
			fn({
				product: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
				order: {
					findMany: jest.fn().mockResolvedValue([
						{
							id: 'order-1',
							status: 'PENDING',
							payment: { status: 'PENDING' },
						},
					]),
					update: jest.fn().mockResolvedValue({}),
				},
				paymentRecord: { updateMany: jest.fn() },
			}),
		);

		const result = await applySoftBanEffects('seller-1');

		expect(result).toEqual({
			productsAffected: 2,
			ordersCancelled: 1,
			ordersRefunded: 0,
		});
	});
});

describe('applySoftDeleteEffects', () => {
	it('soft-deletes seller products and refunds paid orders', async () => {
		(mockPrisma.order.findMany as jest.Mock).mockResolvedValue([]);
		(mockPrisma.orderItem.findMany as jest.Mock).mockResolvedValue([{ orderId: 'order-2' }]);
		(mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
			fn({
				product: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
				order: {
					findMany: jest.fn().mockResolvedValue([
						{
							id: 'order-2',
							status: 'CONFIRMED',
							payment: { status: 'PAID' },
						},
					]),
					update: jest.fn().mockResolvedValue({}),
				},
				paymentRecord: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
			}),
		);

		const result = await applySoftDeleteEffects('seller-1');

		expect(result).toEqual({
			productsAffected: 3,
			ordersCancelled: 0,
			ordersRefunded: 1,
		});
	});
});
