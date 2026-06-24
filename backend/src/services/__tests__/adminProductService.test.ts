import { jest } from '@jest/globals';

jest.mock('../../repositories/adminProductRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/adminProductRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../adminProductService.js';
import { Role } from '../../constants/enums.js';

const mockProduct = {
	id: 'prod-1',
	sku: 'SKU-001',
	slug: 'test-product',
	brand: 'TestBrand',
	basePrice: 99.99,
	status: 'APPROVED',
	isAvailable: true,
	deletedAt: null,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-05-26'),
	translations: [{ language: 'EN', title: 'Test Product' }],
	seller: {
		id: 'seller-1',
		email: 'seller@krydix.dev',
		profile: { firstName: 'John', lastName: 'Seller', avatarUrl: null },
	},
	media: [{ url: 'https://example.com/img.jpg' }],
	categories: [],
	variants: [{ stock: 10 }],
};

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
});

describe('changeAdminProductStatus', () => {
	it('allows admin to change product status', async () => {
		(repo.findAdminProductById as jest.Mock).mockResolvedValue(mockProduct);
		(repo.updateAdminProductStatus as jest.Mock).mockResolvedValue({
			...mockProduct,
			status: 'BLOCKED',
		});

		const result = await service.changeAdminProductStatus(
			'admin-1',
			Role.ADMIN,
			'prod-1',
			'BLOCKED'
		);

		expect(result.status).toBe('BLOCKED');
		expect(auditLog.log).toHaveBeenCalled();
	});

	it('allows moderator to change product status', async () => {
		(repo.findAdminProductById as jest.Mock).mockResolvedValue(mockProduct);
		(repo.updateAdminProductStatus as jest.Mock).mockResolvedValue({
			...mockProduct,
			status: 'BLOCKED',
		});

		const result = await service.changeAdminProductStatus(
			'mod-1',
			Role.MODERATOR,
			'prod-1',
			'BLOCKED'
		);

		expect(result.status).toBe('BLOCKED');
	});
});

describe('adminDeleteProduct', () => {
	it('allows admin to soft delete product', async () => {
		(repo.findAdminProductById as jest.Mock).mockResolvedValue(mockProduct);
		(repo.softDeleteAdminProductRecord as jest.Mock).mockResolvedValue(mockProduct);

		const result = await service.adminDeleteProduct('admin-1', Role.ADMIN, 'prod-1');
		expect(result).toBe(true);
		expect(repo.softDeleteAdminProductRecord).toHaveBeenCalledWith('prod-1');
	});

	it('blocks moderator from deleting product', async () => {
		await expect(
			service.adminDeleteProduct('mod-1', Role.MODERATOR, 'prod-1')
		).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
	});
});
