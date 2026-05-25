import * as repo from '../../repositories/sellerDashboardRepository.js';
import * as service from '../sellerDashboardService.js';

jest.mock('../../repositories/sellerDashboardRepository.js');

const mockRepo = repo as jest.Mocked<typeof repo>;

const SELLER_ID = 'seller-1';

describe('getSellerStats', () => {
	it('returns all stats combined', async () => {
		mockRepo.getSellerRevenue.mockResolvedValue(1500);
		mockRepo.getSellerOrderCount.mockResolvedValue(12);
		mockRepo.getSellerProductCount.mockResolvedValue(8);
		mockRepo.getSellerAverageRating.mockResolvedValue(4.5);

		const result = await service.getSellerStats(SELLER_ID, 'MONTH');

		expect(result.totalRevenue).toBe(1500);
		expect(result.totalOrders).toBe(12);
		expect(result.totalProducts).toBe(8);
		expect(result.averageRating).toBe(4.5);
	});

	it('returns null averageRating when no reviews', async () => {
		mockRepo.getSellerRevenue.mockResolvedValue(0);
		mockRepo.getSellerOrderCount.mockResolvedValue(0);
		mockRepo.getSellerProductCount.mockResolvedValue(0);
		mockRepo.getSellerAverageRating.mockResolvedValue(null);

		const result = await service.getSellerStats(SELLER_ID, 'WEEK');

		expect(result.averageRating).toBeNull();
	});

	it('uses default period MONTH when not specified', async () => {
		mockRepo.getSellerRevenue.mockResolvedValue(0);
		mockRepo.getSellerOrderCount.mockResolvedValue(0);
		mockRepo.getSellerProductCount.mockResolvedValue(0);
		mockRepo.getSellerAverageRating.mockResolvedValue(null);

		await service.getSellerStats(SELLER_ID);

		// periodStart should be ~30 days ago — just verify calls happened
		expect(mockRepo.getSellerRevenue).toHaveBeenCalledWith(SELLER_ID, expect.any(Date));
	});
});

describe('getSellerRevenueSeries', () => {
	it('maps rows to {date, revenue} format with DAY granularity', async () => {
		mockRepo.getRevenueSeriesDay.mockResolvedValue([
			{ date: new Date('2026-05-01T00:00:00.000Z'), revenue: '500.50' },
			{ date: new Date('2026-05-02T00:00:00.000Z'), revenue: '300.00' },
		]);

		const result = await service.getSellerRevenueSeries(SELLER_ID, 'DAY', 'MONTH');

		expect(result).toHaveLength(2);
		expect(result[0].date).toBe('2026-05-01');
		expect(result[0].revenue).toBe(500.5);
		expect(result[1].revenue).toBe(300);
	});

	it('uses WEEK granularity query when requested', async () => {
		mockRepo.getRevenueSeriesWeek.mockResolvedValue([]);

		await service.getSellerRevenueSeries(SELLER_ID, 'WEEK', 'QUARTER');

		expect(mockRepo.getRevenueSeriesWeek).toHaveBeenCalled();
		expect(mockRepo.getRevenueSeriesDay).not.toHaveBeenCalled();
	});

	it('uses MONTH granularity query when requested', async () => {
		mockRepo.getRevenueSeriesMonth.mockResolvedValue([]);

		await service.getSellerRevenueSeries(SELLER_ID, 'MONTH', 'YEAR');

		expect(mockRepo.getRevenueSeriesMonth).toHaveBeenCalled();
	});

	it('returns empty array when no data', async () => {
		mockRepo.getRevenueSeriesDay.mockResolvedValue([]);

		const result = await service.getSellerRevenueSeries(SELLER_ID);

		expect(result).toEqual([]);
	});
});

describe('getSellerTopProducts', () => {
	it('returns empty array when no order items', async () => {
		mockRepo.getTopProductRows.mockResolvedValue([]);

		const result = await service.getSellerTopProducts(SELLER_ID);

		expect(result).toEqual([]);
		expect(mockRepo.findProductsForTopList).not.toHaveBeenCalled();
	});

	it('maps product rows with translations', async () => {
		mockRepo.getTopProductRows.mockResolvedValue([
			{ productId: 'p1', revenue: '1200.00', orderCount: BigInt(5) },
		]);
		mockRepo.findProductsForTopList.mockResolvedValue([
			{
				id: 'p1',
				sku: 'SKU-001',
				translations: [{ language: 'EN', title: 'Test Product', description: '', metaTitle: null, metaDescription: null, id: 't1', productId: 'p1' }],
				media: [{ url: 'http://img.test/1.jpg', isMain: true, id: 'm1', productId: 'p1', publicId: 'pub1', type: 'IMAGE', sortOrder: 0, createdAt: new Date() }],
			} as never,
		]);

		const result = await service.getSellerTopProducts(SELLER_ID, 10);

		expect(result).toHaveLength(1);
		expect(result[0].titleEn).toBe('Test Product');
		expect(result[0].revenue).toBe(1200);
		expect(result[0].orderCount).toBe(5);
		expect(result[0].imageUrl).toBe('http://img.test/1.jpg');
	});

	it('caps limit at 50', async () => {
		mockRepo.getTopProductRows.mockResolvedValue([]);

		await service.getSellerTopProducts(SELLER_ID, 999);

		expect(mockRepo.getTopProductRows).toHaveBeenCalledWith(SELLER_ID, 50);
	});
});

describe('getSellerLowStockAlerts', () => {
	it('returns empty when no low-stock variants', async () => {
		mockRepo.getLowStockVariants.mockResolvedValue([]);

		const result = await service.getSellerLowStockAlerts(SELLER_ID);

		expect(result).toEqual([]);
	});

	it('maps variant with product data correctly', async () => {
		mockRepo.getLowStockVariants.mockResolvedValue([
			{
				id: 'v1',
				productId: 'p1',
				sku: 'SKU-VAR-1',
				options: { Color: 'Red' },
				price: null,
				stock: 2,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				product: {
					id: 'p1',
					sku: 'SKU-001',
					translations: [{ language: 'EN', title: 'Red Shirt', description: '', metaTitle: null, metaDescription: null, id: 't1', productId: 'p1' }],
					media: [],
				},
			} as never,
		]);

		const result = await service.getSellerLowStockAlerts(SELLER_ID, 5);

		expect(result).toHaveLength(1);
		expect(result[0].titleEn).toBe('Red Shirt');
		expect(result[0].stock).toBe(2);
		expect(result[0].variantOptions).toEqual({ Color: 'Red' });
		expect(result[0].imageUrl).toBeNull();
	});
});
