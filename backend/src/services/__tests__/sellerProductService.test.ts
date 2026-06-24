import { GraphQLError } from 'graphql';
import { ProductStatus } from '@prisma/client';

jest.mock('../../repositories/sellerProductRepository.js');
jest.mock('../../repositories/categoryRepository.js', () => ({}));

import * as repo from '../../repositories/sellerProductRepository.js';
import * as service from '../sellerProductService.js';

const mockRepo = repo as jest.Mocked<typeof repo>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'prod-1',
		sellerId: 'seller-1',
		slug: 'test-product',
		sku: 'TEST-001',
		brand: 'TestBrand',
		basePrice: 100,
		comparePrice: null,
		status: ProductStatus.DRAFT,
		isAvailable: true,
		deletedAt: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		translations: [
			{
				id: 't-en',
				productId: 'prod-1',
				language: 'EN',
				title: 'Test Product',
				description: 'Test desc',
				metaTitle: null,
				metaDescription: null,
			},
			{
				id: 't-uk',
				productId: 'prod-1',
				language: 'UK',
				title: 'Тест',
				description: 'Тест опис',
				metaTitle: null,
				metaDescription: null,
			},
		],
		categories: [
			{
				categoryId: 'cat-1',
				productId: 'prod-1',
				category: {
					id: 'cat-1',
					slug: 'electronics',
					translations: [
						{ language: 'EN', name: 'Electronics' },
						{ language: 'UK', name: 'Електроніка' },
					],
				},
			},
		],
		variants: [
			{
				id: 'var-1',
				productId: 'prod-1',
				sku: 'TEST-001-M',
				options: { Size: 'M' },
				price: null,
				stock: 10,
				isActive: true,
			},
		],
		media: [],
		...overrides,
	};
}

const SELLER_ID = 'seller-1';
const PRODUCT_ID = 'prod-1';

beforeEach(() => {
	jest.clearAllMocks();
});

// ─── getMyProducts ────────────────────────────────────────────────────────────

describe('getMyProducts', () => {
	it('returns paginated list', async () => {
		const products = [makeProduct()];
		mockRepo.findSellerProducts.mockResolvedValue(products as never);
		mockRepo.countSellerProducts.mockResolvedValue(1);

		const result = await service.getMyProducts(SELLER_ID, {}, { page: 1, pageSize: 20 });

		expect(mockRepo.findSellerProducts).toHaveBeenCalledWith(SELLER_ID, {}, 0, 20);
		expect(result.total).toBe(1);
		expect(result.page).toBe(1);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('prod-1');
	});

	it('applies status filter', async () => {
		mockRepo.findSellerProducts.mockResolvedValue([]);
		mockRepo.countSellerProducts.mockResolvedValue(0);

		await service.getMyProducts(SELLER_ID, { status: 'APPROVED' }, { page: 1, pageSize: 20 });

		expect(mockRepo.findSellerProducts).toHaveBeenCalledWith(
			SELLER_ID,
			{ status: 'APPROVED' },
			0,
			20
		);
	});

	it('applies search filter', async () => {
		mockRepo.findSellerProducts.mockResolvedValue([]);
		mockRepo.countSellerProducts.mockResolvedValue(0);

		await service.getMyProducts(SELLER_ID, { search: 'jacket' }, { page: 1, pageSize: 20 });

		const callArg = mockRepo.findSellerProducts.mock.calls[0][1];
		expect(callArg).toHaveProperty('OR');
	});

	it('calculates correct skip for page 2', async () => {
		mockRepo.findSellerProducts.mockResolvedValue([]);
		mockRepo.countSellerProducts.mockResolvedValue(0);

		await service.getMyProducts(SELLER_ID, {}, { page: 2, pageSize: 10 });

		expect(mockRepo.findSellerProducts).toHaveBeenCalledWith(SELLER_ID, expect.anything(), 10, 10);
	});
});

// ─── getMyProduct ─────────────────────────────────────────────────────────────

describe('getMyProduct', () => {
	it('returns mapped product', async () => {
		mockRepo.findSellerProductById.mockResolvedValue(makeProduct() as never);

		const result = await service.getMyProduct(PRODUCT_ID, SELLER_ID);

		expect(result.id).toBe(PRODUCT_ID);
		expect(result.titleEn).toBe('Test Product');
		expect(result.titleUk).toBe('Тест');
	});

	it('throws NOT_FOUND when product does not belong to seller', async () => {
		mockRepo.findSellerProductById.mockResolvedValue(null);

		await expect(service.getMyProduct(PRODUCT_ID, SELLER_ID)).rejects.toThrow(GraphQLError);
		await expect(service.getMyProduct(PRODUCT_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});

// ─── duplicateProduct ─────────────────────────────────────────────────────────

describe('duplicateProduct', () => {
	it('creates duplicate with new slug and DRAFT status', async () => {
		const original = makeProduct();
		mockRepo.findSellerProductById.mockResolvedValue(original as never);
		mockRepo.slugExists.mockResolvedValue(false);
		const duplicated = makeProduct({
			id: 'prod-2',
			slug: 'test-product-copy',
			status: ProductStatus.DRAFT,
		});
		mockRepo.duplicateProduct.mockResolvedValue(duplicated as never);

		const result = await service.duplicateProduct(PRODUCT_ID, SELLER_ID);

		expect(mockRepo.slugExists).toHaveBeenCalledWith('test-product-copy');
		expect(mockRepo.duplicateProduct).toHaveBeenCalledWith(
			PRODUCT_ID,
			'test-product-copy',
			'TEST-001-COPY'
		);
		expect(result.status).toBe(ProductStatus.DRAFT);
	});

	it('increments slug suffix when slug already taken', async () => {
		const original = makeProduct();
		mockRepo.findSellerProductById.mockResolvedValue(original as never);
		// First attempt taken, second free
		mockRepo.slugExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const duplicated = makeProduct({ id: 'prod-2', slug: 'test-product-copy-1' });
		mockRepo.duplicateProduct.mockResolvedValue(duplicated as never);

		await service.duplicateProduct(PRODUCT_ID, SELLER_ID);

		expect(mockRepo.duplicateProduct).toHaveBeenCalledWith(
			PRODUCT_ID,
			'test-product-copy-1',
			'TEST-001-COPY-1'
		);
	});

	it('throws NOT_FOUND for unknown product', async () => {
		mockRepo.findSellerProductById.mockResolvedValue(null);

		await expect(service.duplicateProduct(PRODUCT_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});

// ─── archiveProduct ───────────────────────────────────────────────────────────

describe('archiveProduct', () => {
	it('archives an active product', async () => {
		const product = makeProduct({ status: ProductStatus.APPROVED });
		mockRepo.findSellerProductById.mockResolvedValue(product as never);
		const archived = makeProduct({ status: ProductStatus.ARCHIVED });
		mockRepo.setProductStatus.mockResolvedValue(archived as never);

		const result = await service.archiveProduct(PRODUCT_ID, SELLER_ID);

		expect(mockRepo.setProductStatus).toHaveBeenCalledWith(PRODUCT_ID, ProductStatus.ARCHIVED);
		expect(result.status).toBe(ProductStatus.ARCHIVED);
	});

	it('throws when already archived', async () => {
		const product = makeProduct({ status: ProductStatus.ARCHIVED });
		mockRepo.findSellerProductById.mockResolvedValue(product as never);

		await expect(service.archiveProduct(PRODUCT_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
		expect(mockRepo.setProductStatus).not.toHaveBeenCalled();
	});

	it('throws NOT_FOUND for unknown product', async () => {
		mockRepo.findSellerProductById.mockResolvedValue(null);

		await expect(service.archiveProduct(PRODUCT_ID, SELLER_ID)).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});
