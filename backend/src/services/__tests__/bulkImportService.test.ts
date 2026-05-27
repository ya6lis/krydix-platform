import { GraphQLError } from 'graphql';

jest.mock('xlsx', () => ({
	read: jest.fn(),
	utils: {
		sheet_to_json: jest.fn(),
	},
}));

jest.mock('../../utils/prisma.js', () => ({
	prisma: {
		product: {
			findFirst: jest.fn(),
		},
		media: {
			deleteMany: jest.fn(),
		},
	},
}));

jest.mock('../../repositories/sellerProductRepository.js');
jest.mock('../../repositories/categoryRepository.js');
jest.mock('../../utils/logger.js', () => ({
	logger: { error: jest.fn() },
}));

import * as xlsx from 'xlsx';
import { prisma } from '../../utils/prisma.js';
import * as repo from '../../repositories/sellerProductRepository.js';
import * as categoryRepo from '../../repositories/categoryRepository.js';
import { ImportMode } from '../../constants/importExport.js';
import * as importService from '../bulkImportService.js';

const mockXlsx = xlsx as jest.Mocked<typeof xlsx>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRepo = repo as jest.Mocked<typeof repo>;
const mockCategoryRepo = categoryRepo as jest.Mocked<typeof categoryRepo>;

const SELLER_ID = 'seller-1';
const STUB_DATA_URL =
	'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,AAAA';

const validSheetRow = {
	sku: 'SKU-001',
	name_uk: 'Тест',
	name_en: 'Test Product',
	description_uk: 'Опис UK',
	description_en: 'Desc EN',
	price: 99.99,
	currency: 'UAH',
	quantity: 10,
	category: 'electronics',
	status: 'DRAFT',
	brand: 'TestBrand',
	images: 'https://example.com/image.jpg',
	isActive: true,
};

function mockWorkbook(rows: Record<string, unknown>[]) {
	mockXlsx.read.mockReturnValue({
		SheetNames: ['Products'],
		Sheets: { Products: {} },
	} as never);
	(mockXlsx.utils.sheet_to_json as jest.Mock).mockReturnValue(rows);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockCategoryRepo.findCategoryBySlug.mockResolvedValue({ id: 'cat-1', slug: 'electronics' } as never);
	(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
	(mockPrisma.media.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
});

describe('previewImport', () => {
	it('returns parsed and validated rows using template columns', async () => {
		mockWorkbook([validSheetRow]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx', ImportMode.UPSERT, SELLER_ID);

		expect(rows).toHaveLength(1);
		expect(rows[0].nameEn).toBe('Test Product');
		expect(rows[0].sku).toBe('SKU-001');
		expect(rows[0].isValid).toBe(true);
		expect(rows[0].willCreate).toBe(true);
	});

	it('supports legacy column aliases', async () => {
		mockWorkbook([
			{
				titleEn: 'Legacy Product',
				titleUk: 'Старий',
				descriptionEn: 'Desc',
				descriptionUk: 'Опис',
				basePrice: 49.99,
				sku: 'LEG-001',
				currency: 'UAH',
				quantity: 5,
				category: 'electronics',
				status: 'DRAFT',
				brand: 'Brand',
				images: '',
				isActive: true,
			},
		]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx', ImportMode.UPSERT, SELLER_ID);

		expect(rows[0].nameEn).toBe('Legacy Product');
		expect(rows[0].price).toBe(49.99);
		expect(rows[0].isValid).toBe(true);
	});

	it('marks row invalid when required fields missing', async () => {
		mockWorkbook([{ ...validSheetRow, sku: '', name_en: '' }]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx', ImportMode.UPSERT, SELLER_ID);

		expect(rows[0].isValid).toBe(false);
		expect(rows[0].errors.length).toBeGreaterThan(0);
	});

	it('marks row invalid when price is not positive', async () => {
		mockWorkbook([{ ...validSheetRow, price: -5 }]);

		const rows = await importService.previewImport(STUB_DATA_URL, 'xlsx', ImportMode.UPSERT, SELLER_ID);

		expect(rows[0].isValid).toBe(false);
		expect(rows[0].errors).toContain('price must be a positive number');
	});

	it('rejects create-only rows when SKU already exists', async () => {
		mockWorkbook([validSheetRow]);
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

		const rows = await importService.previewImport(
			STUB_DATA_URL,
			'xlsx',
			ImportMode.CREATE_ONLY,
			SELLER_ID,
		);

		expect(rows[0].isValid).toBe(false);
		expect(rows[0].errors.some((error) => error.includes('create-only'))).toBe(true);
	});

	it('throws when data URL is invalid', async () => {
		await expect(importService.previewImport('not-a-data-url', 'xlsx')).rejects.toThrow(GraphQLError);
	});
});

describe('confirmImport', () => {
	const validRow = {
		rowIndex: 2,
		nameEn: 'New Product',
		nameUk: 'Новий товар',
		descriptionEn: 'Desc EN',
		descriptionUk: 'Опис UK',
		slug: 'new-product',
		sku: 'NP-001',
		brand: 'Brand',
		price: 79.99,
		currency: 'UAH',
		quantity: 12,
		category: 'electronics',
		status: 'DRAFT',
		images: '',
		isActive: true,
		discountPrice: null,
		seoTitle: null,
		seoDescription: null,
	};

	it('creates new product when SKU not found', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValue(false);
		mockRepo.createProduct.mockResolvedValue({ id: 'prod-1' } as never);

		const result = await importService.confirmImport(SELLER_ID, [validRow], ImportMode.UPSERT);

		expect(mockRepo.createProduct).toHaveBeenCalledTimes(1);
		expect(result.created).toBe(1);
		expect(result.updated).toBe(0);
	});

	it('updates existing product when SKU already exists', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-prod' });
		mockRepo.updateProduct.mockResolvedValue({ id: 'existing-prod' } as never);

		const result = await importService.confirmImport(SELLER_ID, [validRow], ImportMode.UPSERT);

		expect(mockRepo.updateProduct).toHaveBeenCalledTimes(1);
		expect(result.updated).toBe(1);
	});

	it('skips existing SKU in create-only mode', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-prod' });

		const result = await importService.confirmImport(SELLER_ID, [validRow], ImportMode.CREATE_ONLY);

		expect(result.skipped).toBe(1);
		expect(mockRepo.createProduct).not.toHaveBeenCalled();
	});

	it('counts failed row on repo error', async () => {
		(mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(null);
		mockRepo.slugExists.mockResolvedValue(false);
		mockRepo.createProduct.mockRejectedValue(new Error('DB error'));

		const result = await importService.confirmImport(SELLER_ID, [validRow], ImportMode.UPSERT);

		expect(result.failed).toBe(1);
		expect(result.errors[0].error).toBe('DB error');
	});
});
