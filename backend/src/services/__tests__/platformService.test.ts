import { jest } from '@jest/globals';

jest.mock('../../repositories/platformRepository.js');
jest.mock('../auditLogService.js');

import * as repo from '../../repositories/platformRepository.js';
import * as auditLog from '../auditLogService.js';
import * as service from '../platformService.js';

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
});

describe('getCommissionRules', () => {
	it('returns serialized commission rules', async () => {
		(repo.findCommissionRules as jest.Mock).mockResolvedValue([
			{
				id: 'rule-1',
				categoryId: null,
				isDefault: true,
				percent: 12,
				fixedFee: 0.5,
				currency: 'USD',
				category: null,
			},
		]);

		const result = await service.getCommissionRules();
		expect(result[0].isDefault).toBe(true);
		expect(result[0].percent).toBe(12);
	});
});

describe('savePayoutConfig', () => {
	it('updates payout config and logs audit', async () => {
		(repo.updatePlatformConfig as jest.Mock).mockResolvedValue({
			payoutSchedule: 'WEEKLY_TUESDAY',
			payoutHoldDays: 5,
			payoutMinimum: 25,
			payoutCurrency: 'USD',
		});

		const result = await service.savePayoutConfig('admin-1', {
			schedule: 'WEEKLY_TUESDAY',
			holdPeriodDays: 5,
			minimumPayout: 25,
			currency: 'USD',
		});

		expect(result.holdPeriodDays).toBe(5);
		expect(auditLog.log).toHaveBeenCalled();
	});
});

describe('createAdminPromoCode', () => {
	it('requires discount value', async () => {
		await expect(
			service.createAdminPromoCode('admin-1', { code: 'TEST' }),
		).rejects.toThrow('Discount percent or fixed amount is required');
	});
});
