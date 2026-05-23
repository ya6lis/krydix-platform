import { ProductFilterSchema, ProductQuerySchema } from '../catalogValidators.js';
import { ProductSort } from '../../constants/enums.js';

describe('ProductFilterSchema', () => {
	it('accepts an empty object', () => {
		const result = ProductFilterSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts all valid fields', () => {
		const result = ProductFilterSchema.safeParse({
			search: 'jacket',
			categorySlug: 'outerwear',
			brands: ['Heritage Co.'],
			minPrice: 10,
			maxPrice: 500,
			minRating: 3,
			inStockOnly: true,
			sellerId: 'seller-abc',
		});
		expect(result.success).toBe(true);
	});

	it('trims whitespace from search', () => {
		const result = ProductFilterSchema.safeParse({ search: '  jacket  ' });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.search).toBe('jacket');
	});

	it('rejects search longer than 200 chars', () => {
		const result = ProductFilterSchema.safeParse({ search: 'a'.repeat(201) });
		expect(result.success).toBe(false);
	});

	it('rejects negative minPrice', () => {
		const result = ProductFilterSchema.safeParse({ minPrice: -1 });
		expect(result.success).toBe(false);
	});

	it('rejects negative maxPrice', () => {
		const result = ProductFilterSchema.safeParse({ maxPrice: -0.01 });
		expect(result.success).toBe(false);
	});

	it('rejects minRating below 1', () => {
		const result = ProductFilterSchema.safeParse({ minRating: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects minRating above 5', () => {
		const result = ProductFilterSchema.safeParse({ minRating: 5.1 });
		expect(result.success).toBe(false);
	});

	it('rejects brands array larger than 50 items', () => {
		const result = ProductFilterSchema.safeParse({ brands: Array(51).fill('Brand') });
		expect(result.success).toBe(false);
	});

	it('rejects a brand name longer than 120 chars', () => {
		const result = ProductFilterSchema.safeParse({ brands: ['b'.repeat(121)] });
		expect(result.success).toBe(false);
	});
});

describe('ProductQuerySchema', () => {
	it('applies NEWEST sort default and page defaults', () => {
		const result = ProductQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sort).toBe(ProductSort.NEWEST);
			expect(result.data.page).toBe(1);
			expect(result.data.pageSize).toBe(20);
		}
	});

	it('accepts all valid ProductSort values', () => {
		for (const sort of Object.values(ProductSort)) {
			const result = ProductQuerySchema.safeParse({ sort });
			expect(result.success).toBe(true);
		}
	});

	it('rejects an unknown sort value', () => {
		const result = ProductQuerySchema.safeParse({ sort: 'RANDOM' });
		expect(result.success).toBe(false);
	});

	it('rejects page less than 1', () => {
		const result = ProductQuerySchema.safeParse({ page: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects pageSize greater than 96', () => {
		const result = ProductQuerySchema.safeParse({ pageSize: 97 });
		expect(result.success).toBe(false);
	});

	it('rejects pageSize less than 1', () => {
		const result = ProductQuerySchema.safeParse({ pageSize: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects fractional page numbers', () => {
		const result = ProductQuerySchema.safeParse({ page: 1.5 });
		expect(result.success).toBe(false);
	});

	it('passes nested filter through', () => {
		const result = ProductQuerySchema.safeParse({ filter: { search: 'boots' }, page: 2 });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.filter?.search).toBe('boots');
			expect(result.data.page).toBe(2);
		}
	});
});
