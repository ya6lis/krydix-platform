import { jest } from '@jest/globals';

jest.mock('../../repositories/auditLogRepository.js');

import * as repo from '../../repositories/auditLogRepository.js';
import * as service from '../adminAuditService.js';
import { AuditActionKey } from '../../constants/auditActionKeys.js';

const mockActor = {
	id: 'mod-1',
	email: 'mod@krydix.dev',
	role: 'MODERATOR' as const,
	profile: { firstName: 'Sofia', lastName: 'Kovalenko', avatarUrl: null },
};

const mockLog = {
	id: 'log-1',
	actorId: 'mod-1',
	action: 'PRODUCT_STATUS_CHANGE' as const,
	targetType: 'Product',
	targetId: 'prod-abc12345',
	metadata: { from: 'PENDING_MODERATION', to: 'APPROVED' },
	createdAt: new Date('2026-05-22T10:42:18.000Z'),
	actor: mockActor,
};

beforeEach(() => {
	jest.clearAllMocks();
	(repo.findAuditLogs as jest.Mock).mockResolvedValue({
		items: [mockLog],
		total: 1,
		page: 1,
		pageSize: 50,
	});
	(repo.findAuditLogsForCounts as jest.Mock).mockResolvedValue([
		{
			action: 'PRODUCT_STATUS_CHANGE',
			targetType: 'Product',
			metadata: { to: 'APPROVED' },
			actor: { role: 'MODERATOR' },
		},
		{
			action: 'USER_ROLE_CHANGE',
			targetType: 'User',
			metadata: { to: 'MODERATOR' },
			actor: { role: 'ADMIN' },
		},
	]);
	(repo.findProductsByIds as jest.Mock).mockResolvedValue([
		{
			id: 'prod-abc12345',
			sku: 'WH-001',
			slug: 'wool-cardigan-oat',
			translations: [{ language: 'EN', title: 'Wool Cardigan — Oat' }],
		},
	]);
	(repo.findUsersByIds as jest.Mock).mockResolvedValue([]);
	(repo.findCategoriesByIds as jest.Mock).mockResolvedValue([]);
	(repo.findReviewsByIds as jest.Mock).mockResolvedValue([]);
	(repo.findSellerApplicationsByIds as jest.Mock).mockResolvedValue([]);
	(repo.findComplaintsByIds as jest.Mock).mockResolvedValue([]);
});

describe('getAuditLogs', () => {
	it('returns serialized audit logs with action key', async () => {
		const result = await service.getAuditLogs({ page: 1, pageSize: 50 });

		expect(result.items).toHaveLength(1);
		expect(result.items[0].actionKey).toBe(AuditActionKey.PRODUCT_APPROVE);
		expect(result.items[0].actionVariant).toBe('approve');
		expect(result.items[0].eventRef).toBe('#AL-OG-1');
		expect(result.items[0].rawAction).toBe('PRODUCT_STATUS_CHANGE');
		expect(result.items[0].metadata).toEqual({
			from: 'PENDING_MODERATION',
			to: 'APPROVED',
		});
		expect(result.items[0].actor.email).toBe('mod@krydix.dev');
		expect(result.items[0].targetLabel).toContain('Wool Cardigan');
		expect(result.total).toBe(1);
	});

	it('passes action key filter to repository', async () => {
		await service.getAuditLogs({
			actionKeys: [AuditActionKey.PRODUCT_APPROVE],
			page: 1,
			pageSize: 50,
		});

		expect(repo.findAuditLogs).toHaveBeenCalledWith(
			expect.objectContaining({
				actionKeys: [AuditActionKey.PRODUCT_APPROVE],
			})
		);
	});

	it('builds filter option counts from date-scoped rows', async () => {
		const result = await service.getAuditLogs({ page: 1, pageSize: 50 });

		expect(result.actionFilterOptions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ key: AuditActionKey.PRODUCT_APPROVE, count: 1 }),
				expect.objectContaining({ key: AuditActionKey.USER_ROLE_CHANGE, count: 1 }),
			])
		);
		expect(result.actorRoleFilterOptions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ role: 'MODERATOR', count: 1 }),
				expect.objectContaining({ role: 'ADMIN', count: 1 }),
			])
		);
	});
});
