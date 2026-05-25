import { jest } from '@jest/globals';

jest.mock('../../repositories/moderationRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/moderationRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../moderationService.js';

const mockProduct = {
	id: 'prod-1',
	sku: 'SKU-001',
	brand: 'TestBrand',
	basePrice: 50,
	status: 'PENDING_MODERATION' as const,
	updatedAt: new Date('2026-01-01T12:00:00Z'),
	seller: {
		id: 'seller-1',
		profile: { firstName: 'John', lastName: 'Doe', avatarUrl: null },
	},
	translations: [{ language: 'EN' as const, title: 'Test Product', description: 'Desc' }],
	media: [{ url: 'https://img.com/main.jpg', isMain: true }],
	variants: [{ stock: 5 }, { stock: 10 }],
	categories: [],
};

const mockApproved = { ...mockProduct, status: 'APPROVED' as const };
const mockRejected = { ...mockProduct, status: 'REJECTED' as const };

const getModerationItem = repo.getModerationItem as jest.MockedFunction<
	typeof repo.getModerationItem
>;
const setProductStatus = repo.setProductStatus as jest.MockedFunction<typeof repo.setProductStatus>;
const auditLogFn = auditLog.log as jest.MockedFunction<typeof auditLog.log>;

beforeEach(() => {
	jest.clearAllMocks();
});

describe('getModerationItem', () => {
	it('returns serialized item when found', async () => {
		getModerationItem.mockResolvedValue(mockProduct as never);
		const result = await service.getModerationItem('prod-1');
		expect(result.id).toBe('prod-1');
		expect(result.titleEn).toBe('Test Product');
		expect(result.totalStock).toBe(15);
		expect(result.sellerName).toBe('John Doe');
		expect(result.sellerInitials).toBe('JD');
	});

	it('throws NOT_FOUND when product does not exist', async () => {
		getModerationItem.mockResolvedValue(null);
		await expect(service.getModerationItem('bad-id')).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});

describe('approveProduct', () => {
	it('approves a pending product and logs audit', async () => {
		getModerationItem.mockResolvedValue(mockProduct as never);
		setProductStatus.mockResolvedValue(mockApproved as never);
		auditLogFn.mockResolvedValue(undefined);

		const result = await service.approveProduct('prod-1', 'mod-1');

		expect(setProductStatus).toHaveBeenCalledWith('prod-1', 'APPROVED');
		expect(auditLogFn).toHaveBeenCalledWith(
			expect.objectContaining({
				actorId: 'mod-1',
				action: 'PRODUCT_STATUS_CHANGE',
				targetId: 'prod-1',
				metadata: expect.objectContaining({ to: 'APPROVED' }),
			})
		);
		expect(result.status).toBe('APPROVED');
	});

	it('throws when product is not pending', async () => {
		getModerationItem.mockResolvedValue(mockApproved as never);
		await expect(service.approveProduct('prod-1', 'mod-1')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
		expect(setProductStatus).not.toHaveBeenCalled();
	});
});

describe('rejectProduct', () => {
	it('rejects a pending product with reason and logs audit', async () => {
		getModerationItem.mockResolvedValue(mockProduct as never);
		setProductStatus.mockResolvedValue(mockRejected as never);
		auditLogFn.mockResolvedValue(undefined);

		const result = await service.rejectProduct('prod-1', 'mod-1', 'Low-quality photos');

		expect(setProductStatus).toHaveBeenCalledWith('prod-1', 'REJECTED');
		expect(auditLogFn).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ to: 'REJECTED', reason: 'Low-quality photos' }),
			})
		);
		expect(result.status).toBe('REJECTED');
	});

	it('throws BAD_USER_INPUT when reason is empty', async () => {
		await expect(service.rejectProduct('prod-1', 'mod-1', '   ')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
		expect(getModerationItem).not.toHaveBeenCalled();
	});

	it('throws when product is not pending', async () => {
		getModerationItem.mockResolvedValue(mockRejected as never);
		await expect(service.rejectProduct('prod-1', 'mod-1', 'reason')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});
});
