import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../repositories/orderRepository.js', () => ({
	findOrdersBySeller: jest.fn(),
}));

jest.mock('../orderService.js', () => ({
	mapToSellerOrderView: jest.fn(),
}));

import { findOrdersBySeller } from '../../repositories/orderRepository.js';
import { mapToSellerOrderView } from '../orderService.js';
import { exportSellerOrders } from '../orderExportService.js';

const mockFindOrders = findOrdersBySeller as jest.Mock;
const mockMapView = mapToSellerOrderView as jest.Mock;

describe('exportSellerOrders', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('writes unitPrice and totalPrice as numbers (not empty Decimal cells)', async () => {
		mockFindOrders.mockResolvedValueOnce({
			items: [{ id: 'order-1' }],
			total: 1,
			page: 1,
			pageSize: 200,
		});
		mockFindOrders.mockResolvedValueOnce({
			items: [],
			total: 1,
			page: 2,
			pageSize: 200,
		});

		mockMapView.mockReturnValue({
			id: 'cmpokfqtg0001',
			status: 'CONFIRMED',
			sellerSubtotal: new Decimal(199.98),
			buyer: { name: 'Buyer', email: 'buyer@test.com' },
			items: [
				{
					productId: 'prod-1',
					variantId: 'var-1',
					productTitle: 'Canvas Apron',
					quantity: 1,
					unitPrice: new Decimal(89.99),
					totalPrice: new Decimal(89.99),
				},
			],
			payment: { status: 'PAID' },
			delivery: { status: 'PENDING', address: 'Kyiv' },
			createdAt: new Date('2026-05-26T10:00:00.000Z'),
		});

		const file = await exportSellerOrders('seller-1');
		const decoded = Buffer.from(file.base64, 'base64').toString('binary');

		expect(decoded).toContain('89.99');
		expect(decoded.length).toBeGreaterThan(100);
	});
});
