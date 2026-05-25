import { GraphQLError } from 'graphql';

// Mock xlsx module
jest.mock('xlsx', () => ({
	read: jest.fn(),
	utils: {
		sheet_to_json: jest.fn(),
	},
}));

// Mock prisma
jest.mock('../../utils/prisma.js', () => ({
	prisma: {
		product: {
			findFirst: jest.fn(),
		},
	},
}));

// Mock repo
jest.mock('../../repositories/sellerProductRepository.js');

import * as xlsx from 'xlsx';
import { prisma } from '../../utils/prisma.js';
import * as repo from '../../repositories/sellerProductRepository.js';
import * as importService from '../bulkImportService.js';

const mockXlsx = xlsx as jest.Mocked<typeof xlsx>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRepo = repo as jest.Mocked<typeof repo>;

const SELLER_ID = 'seller-1';

// Valid base64 data URL used as stub for xlsx buffer
const STUB_DATA_URL = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,AAAA';

beforeEach(() => {
	jest.clearAllMocks();
});

// ─── previewImport ────────────────────────────────────────────────────────────

describe('previewImport', () => {
	it('returns parsed + validated rows', async () => {
		mockXlsx.read.mockReturnValue({
			SheetNames: ['Sheet1'],
			Sheets: { Sheet1: {} },
		} as never);

		(mockXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([
			{
				titleEn: 'Test Product',
				titleUk: 'Тест',
				sku: 'SKU-001',
				slug: 'test-product',
				basePrice: 99.99,
				brand: 'TestBrand',
				descriptionEn: 'Desc EN',
				descriptionUk: 'Desc UK',
			},
		]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx');

		expect(rows).toHaveLength(1);
		expect(rows[0].titleEn).toBe('Test Product');
		expect(rows[0].sku).toBe('SKU-001');
		expect(rows[0].isValid).toBe(true);
		expect(rows[0].errors).toHaveLength(0);
	});

	it('marks row invalid when required fields missing', async () => {
		mockXlsx.read.mockReturnValue({
			SheetNames: ['Sheet1'],
			Sheets: { Sheet1: {} },
		} as never);

		(mockXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([
			{
				titleEn: '',  // missing
				titleUk: 'Тест',
				sku: '',      // missing
				slug: 'test-product',
				basePrice: 99.99,
				descriptionEn: 'Desc EN',
				descriptionUk: 'Desc UK',
			},
		]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx');

		expect(rows[0].isValid).toBe(false);
		expect(rows[0].errors.length).toBeGreaterThan(0);
	});

	it('marks row invalid when basePrice is not a positive number', async () => {
		mockXlsx.read.mockReturnValue({
			SheetNames: ['Sheet1'],
			Sheets: { Sheet1: {} },
		} as never);

		(mockXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([
			{
				titleEn: 'Product',
				titleUk: 'Товар',
				sku: 'SKU-001',
				slug: 'product',
				basePrice: -5,
				descriptionEn: 'Desc',
				descriptionUk: 'Опис',
			},
		]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx');

		expect(rows[0].isValid).toBe(false);
		expect(rows[0].errors).toContain('basePrice must be a positive number');
	});

	it('throws when data URL is invalid', async () => {
		await expect(importService.previewImport('not-a-data-url', 'xlsx')).rejects.toThrow(GraphQLError);
	});

	it('auto-generates slug from titleEn when slug missing', async () => {
		mockXlsx.read.mockReturnValue({
			SheetNames: ['Sheet1'],
			Sheets: { Sheet1: {} },
		} as never);

		(mockXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([
			{
				titleEn: 'My New Product',
				titleUk: 'Товар',
				sku: 'SKU-001',
				slug: '',
				basePrice: 49.99,
				descriptionEn: 'Desc',
				descriptionUk: 'Опис',
			},
		]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx');

		expect(rows[0].slug).toBe('my-new-product');
	});
});

// ─── confirmImport ────────────────────────────────────────────────────────────

describe('confirmImport', () => {
	const validRow = {
		titleEn: 'New Product',
		titleUk: 'Новий товар',
		descriptionEn: 'Desc EN',
		descriptionUk: 'Опис UK',
		slug: 'new-product',
		sku: 'NP-001',
		brand: null,
		basePrice: 79.99,
	};

	it('creates new product when SKU not found', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValue(false);
		mockRepo.createProduct.mockResolvedValue({} as never);

		const result = await importService.confirmImport(SELLER_ID, [validRow]);

		expect(mockRepo.createProduct).toHaveBeenCalledTimes(1);
		expect(result.created).toBe(1);
		expect(result.updated).toBe(0);
		expect(result.failed).toBe(0);
	});

	it('updates existing product when SKU already exists', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-prod' });
		mockRepo.updateProduct.mockResolvedValue({} as never);

		const result = await importService.confirmImport(SELLER_ID, [validRow]);

		expect(mockRepo.updateProduct).toHaveBeenCalledTimes(1);
		expect(result.updated).toBe(1);
		expect(result.created).toBe(0);
	});

	it('appends numeric suffix to slug when slug taken', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		mockRepo.createProduct.mockResolvedValue({} as never);

		await importService.confirmImport(SELLER_ID, [validRow]);

		const createCall = mockRepo.createProduct.mock.calls[0][0];
		expect(createCall.slug).toBe('new-product-1');
	});

	it('counts failed row on repo error', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValue(false);
		mockRepo.createProduct.mockRejectedValue(new Error('DB error'));

		const result = await importService.confirmImport(SELLER_ID, [validRow]);

		expect(result.failed).toBe(1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].error).toBe('DB error');
	});

	it('processes multiple rows independently', async () => {
		const rows = [
			{ ...validRow, sku: 'A-001', slug: 'product-a' },
			{ ...validRow, sku: 'B-001', slug: 'product-b' },
		];

		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValue(false);
		mockRepo.createProduct.mockResolvedValue({} as never);

		const result = await importService.confirmImport(SELLER_ID, rows);

		expect(result.created).toBe(2);
		expect(result.failed).toBe(0);
	});
});
