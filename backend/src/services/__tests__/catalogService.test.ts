jest.mock('../../repositories/categoryRepository.js');
jest.mock('../../repositories/productRepository.js');
jest.mock('../../utils/prisma.js', () => ({
	prisma: { productReview: { groupBy: jest.fn() } },
}));

import * as categoryRepo from '../../repositories/categoryRepository.js';
import * as productRepo from '../../repositories/productRepository.js';
import * as catalogService from '../catalogService.js';
import { Language, ProductSort } from '../../constants/enums.js';

const mockCategoryRepo = categoryRepo as jest.Mocked<typeof categoryRepo>;
const mockProductRepo = productRepo as jest.Mocked<typeof productRepo>;

function makeCategory(id: string, slug: string, parentId: string | null, name: string) {
	return {
		id,
		slug,
		parentId,
		sortOrder: 0,
		isActive: true,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		translations: [
			{
				id: `${id}-t`,
				categoryId: id,
				language: 'EN',
				name,
				description: null,
				metaTitle: null,
				metaDescription: null,
			},
		],
		_count: { products: 3 },
	} as unknown as categoryRepo.CategoryRecord;
}

function makeProduct(id: string, slug: string, title: string) {
	return {
		id,
		slug,
		sku: `SKU-${id}`,
		brand: 'Heritage Co.',
		basePrice: 184,
		comparePrice: null,
		status: 'APPROVED',
		isAvailable: true,
		sellerId: 's1',
		deletedAt: null,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-01T00:00:00Z'),
		translations: [
			{
				id: `${id}-t`,
				productId: id,
				language: 'EN',
				title,
				description: 'Desc',
				metaTitle: null,
				metaDescription: null,
			},
		],
		media: [
			{
				id: `${id}-m`,
				productId: id,
				url: 'https://img/1',
				publicId: 'x',
				type: 'IMAGE',
				isMain: true,
				sortOrder: 0,
				createdAt: new Date(),
			},
		],
		variants: [
			{
				id: `${id}-v`,
				productId: id,
				sku: 'V1',
				options: { size: 'M' },
				price: null,
				stock: 5,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
		categories: [
			{
				productId: id,
				categoryId: 'c1',
				category: {
					id: 'c1',
					slug: 'outerwear',
					translations: [
						{
							id: 'c1-t',
							categoryId: 'c1',
							language: 'EN',
							name: 'Outerwear',
							description: null,
							metaTitle: null,
							metaDescription: null,
						},
					],
				},
			},
		],
		seller: { id: 's1', email: 's@example.com', profile: { firstName: 'Jane', lastName: 'Doe' } },
	} as unknown as productRepo.ProductRecord;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('catalogService.getCategories', () => {
	it('builds a nested tree from a flat list', async () => {
		mockCategoryRepo.findAllCategories.mockResolvedValue([
			makeCategory('c1', 'outerwear', null, 'Outerwear'),
			makeCategory('c2', 'jackets', 'c1', 'Jackets'),
		]);
		const tree = await catalogService.getCategories(Language.EN);
		expect(tree).toHaveLength(1);
		expect(tree[0].slug).toBe('outerwear');
		expect(tree[0].children).toHaveLength(1);
		expect(tree[0].children[0].slug).toBe('jackets');
	});
});

describe('catalogService.getProducts', () => {
	it('returns mapped products with totals and ratings', async () => {
		mockProductRepo.findProducts.mockResolvedValue([
			makeProduct('p1', 'field-jacket', 'Field Jacket'),
		]);
		mockProductRepo.countProducts.mockResolvedValue(1);
		mockProductRepo.ratingsByProductIds.mockResolvedValue([
			{ productId: 'p1', _avg: { rating: 4.8 }, _count: { _all: 12 } },
		] as unknown as Awaited<ReturnType<typeof productRepo.ratingsByProductIds>>);

		const result = await catalogService.getProducts(
			{ sort: ProductSort.NEWEST, page: 1, pageSize: 20 },
			Language.EN
		);
		expect(result.total).toBe(1);
		expect(result.items[0].title).toBe('Field Jacket');
		expect(result.items[0].rating).toBe(4.8);
		expect(result.items[0].reviewCount).toBe(12);
		expect(result.items[0].mainImage).toBe('https://img/1');
		expect(result.items[0].totalStock).toBe(5);
	});

	it('defaults rating to 0 when product has no reviews', async () => {
		mockProductRepo.findProducts.mockResolvedValue([makeProduct('p2', 'tote', 'Canvas Tote')]);
		mockProductRepo.countProducts.mockResolvedValue(1);
		mockProductRepo.ratingsByProductIds.mockResolvedValue([]);

		const result = await catalogService.getProducts(
			{ sort: ProductSort.NEWEST, page: 1, pageSize: 20 },
			Language.EN
		);
		expect(result.items[0].rating).toBe(0);
		expect(result.items[0].reviewCount).toBe(0);
	});
});

describe('catalogService.getProductBySlug', () => {
	it('returns null when the product does not exist', async () => {
		mockProductRepo.findProductBySlug.mockResolvedValue(null);
		const product = await catalogService.getProductBySlug('missing', Language.EN);
		expect(product).toBeNull();
	});

	it('maps a found product with its seller name', async () => {
		mockProductRepo.findProductBySlug.mockResolvedValue(
			makeProduct('p1', 'field-jacket', 'Field Jacket')
		);
		mockProductRepo.ratingsByProductIds.mockResolvedValue([]);
		const product = await catalogService.getProductBySlug('field-jacket', Language.EN);
		expect(product?.slug).toBe('field-jacket');
		expect(product?.seller.name).toBe('Jane Doe');
		expect(product?.categories[0].name).toBe('Outerwear');
	});
});

describe('catalogService.getProductBrands', () => {
	it('returns distinct brands from the repository', async () => {
		mockProductRepo.distinctBrands.mockResolvedValue(['Heritage Co.', 'Maru Studio']);
		const brands = await catalogService.getProductBrands();
		expect(brands).toEqual(['Heritage Co.', 'Maru Studio']);
	});
});

describe('catalogService.getProductBrandsWithCounts', () => {
	it('returns brands with product counts', async () => {
		mockProductRepo.brandsWithCounts.mockResolvedValue([
			{ name: 'Heritage Co.', count: 12 },
			{ name: 'Maru Studio', count: 5 },
		]);
		const result = await catalogService.getProductBrandsWithCounts();
		expect(result).toEqual([
			{ name: 'Heritage Co.', count: 12 },
			{ name: 'Maru Studio', count: 5 },
		]);
	});

	it('scopes brand counts to a seller when sellerId is provided', async () => {
		mockProductRepo.brandsWithCounts.mockResolvedValue([{ name: 'Heritage Co.', count: 2 }]);
		const result = await catalogService.getProductBrandsWithCounts('seller-1');
		expect(mockProductRepo.brandsWithCounts).toHaveBeenCalledWith(
			expect.objectContaining({ sellerId: 'seller-1' })
		);
		expect(result).toEqual([{ name: 'Heritage Co.', count: 2 }]);
	});
});

describe('catalogService.getProducts — comparePrice mapping', () => {
	it('maps comparePrice as null when not set', async () => {
		mockProductRepo.findProducts.mockResolvedValue([makeProduct('p1', 'jacket', 'Jacket')]);
		mockProductRepo.countProducts.mockResolvedValue(1);
		mockProductRepo.ratingsByProductIds.mockResolvedValue([]);
		const result = await catalogService.getProducts(
			{ sort: 'NEWEST' as never, page: 1, pageSize: 20 },
			Language.EN
		);
		expect(result.items[0].comparePrice).toBeNull();
	});

	it('maps comparePrice as number when set on product', async () => {
		const p = makeProduct('p2', 'vest', 'Vest');
		(p as unknown as Record<string, unknown>).comparePrice = 220;
		mockProductRepo.findProducts.mockResolvedValue([p]);
		mockProductRepo.countProducts.mockResolvedValue(1);
		mockProductRepo.ratingsByProductIds.mockResolvedValue([]);
		const result = await catalogService.getProducts(
			{ sort: 'NEWEST' as never, page: 1, pageSize: 20 },
			Language.EN
		);
		expect(result.items[0].comparePrice).toBe(220);
	});
});
