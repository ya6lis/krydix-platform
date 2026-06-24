import { jest } from '@jest/globals';

jest.mock('../../repositories/platformRepository.js');

import * as platformRepo from '../../repositories/platformRepository.js';
import { buildFeeSnapshots, computeLineFeeSnapshot } from '../feeCalculationService.js';

const findCommissionRules = platformRepo.findCommissionRules as jest.MockedFunction<
	typeof platformRepo.findCommissionRules
>;
const getPlatformConfig = platformRepo.getPlatformConfig as jest.MockedFunction<
	typeof platformRepo.getPlatformConfig
>;

beforeEach(() => {
	jest.clearAllMocks();
	getPlatformConfig.mockResolvedValue({
		payoutCurrency: 'UAH',
		defaultBuyerFeePercent: 0,
		defaultPlatformFeePercent: 2,
	} as never);
	findCommissionRules.mockResolvedValue([
		{ id: 'default', categoryId: null, percent: 12, fixedFee: 0.5, isDefault: true },
		{ id: 'cat-rule', categoryId: 'cat-1', percent: 5, fixedFee: 1, isDefault: false },
	] as never);
});

describe('computeLineFeeSnapshot', () => {
	it('calculates percent + fixed fee from admin commission rule', () => {
		const snapshot = computeLineFeeSnapshot(
			{ productId: 'p1', categoryIds: [], lineTotal: 100 },
			{ currency: 'UAH', buyerFeePercent: 0, platformFeePercent: 2 },
			{ percent: 12, fixedFee: 0.5 }
		);

		expect(snapshot.platformFeeAmount).toBe(12.5);
		expect(snapshot.sellerPayoutAmount).toBe(87.5);
		expect(snapshot.currency).toBe('UAH');
	});
});

describe('buildFeeSnapshots', () => {
	it('uses category-specific commission rules from admin settings', async () => {
		const snapshots = await buildFeeSnapshots([
			{ productId: 'p1', categoryIds: ['cat-1'], lineTotal: 200 },
			{ productId: 'p2', categoryIds: ['cat-2'], lineTotal: 100 },
		]);

		expect(snapshots[0].platformFeePercent).toBe(5);
		expect(snapshots[0].platformFeeAmount).toBe(11);
		expect(snapshots[0].sellerPayoutAmount).toBe(189);
		expect(snapshots[1].platformFeePercent).toBe(12);
		expect(snapshots[1].platformFeeAmount).toBe(12.5);
		expect(snapshots[1].sellerPayoutAmount).toBe(87.5);
	});
});
