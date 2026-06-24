import { jest } from '@jest/globals';
import { PayoutStatus } from '@prisma/client';

jest.mock('../../repositories/payoutRepository.js');
jest.mock('../../repositories/platformRepository.js');
jest.mock('../../repositories/orderRepository.js');
jest.mock('../auditLogService.js');

import * as payoutRepo from '../../repositories/payoutRepository.js';
import * as platformRepo from '../../repositories/platformRepository.js';
import * as orderRepo from '../../repositories/orderRepository.js';
import * as auditLog from '../auditLogService.js';
import { getSellerFinanceSummary, withdrawSellerPayouts } from '../payoutService.js';

const sumPayoutAmountsBySeller = payoutRepo.sumPayoutAmountsBySeller as jest.MockedFunction<
	typeof payoutRepo.sumPayoutAmountsBySeller
>;
const countPayoutsBySeller = payoutRepo.countPayoutsBySeller as jest.MockedFunction<
	typeof payoutRepo.countPayoutsBySeller
>;
const withdrawReleasedPayouts = payoutRepo.withdrawReleasedPayouts as jest.MockedFunction<
	typeof payoutRepo.withdrawReleasedPayouts
>;
const getPlatformConfig = platformRepo.getPlatformConfig as jest.MockedFunction<
	typeof platformRepo.getPlatformConfig
>;
const auditLogFn = auditLog.log as jest.MockedFunction<typeof auditLog.log>;

beforeEach(() => {
	jest.clearAllMocks();
	getPlatformConfig.mockResolvedValue({
		payoutCurrency: 'UAH',
		payoutMinimum: 25,
		defaultWithdrawalFeePercent: 0,
	} as never);
});

describe('getSellerFinanceSummary', () => {
	it('aggregates payout buckets', async () => {
		sumPayoutAmountsBySeller
			.mockResolvedValueOnce(100)
			.mockResolvedValueOnce(50)
			.mockResolvedValueOnce(30)
			.mockResolvedValueOnce(500);
		countPayoutsBySeller.mockResolvedValue(1);

		const summary = await getSellerFinanceSummary('seller-1');

		expect(summary.onHold).toBe(100);
		expect(summary.withdrawable).toBe(80);
		expect(summary.minimumWithdrawal).toBe(25);
	});
});

describe('withdrawSellerPayouts', () => {
	it('throws when below minimum withdrawal', async () => {
		sumPayoutAmountsBySeller
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(10)
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(0);
		countPayoutsBySeller.mockResolvedValue(0);

		await expect(withdrawSellerPayouts('seller-1')).rejects.toMatchObject({
			extensions: { code: 'BAD_USER_INPUT' },
		});
	});

	it('withdraws eligible payouts and logs audit', async () => {
		sumPayoutAmountsBySeller
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(50)
			.mockResolvedValueOnce(30)
			.mockResolvedValueOnce(0);
		countPayoutsBySeller.mockResolvedValue(0);
		withdrawReleasedPayouts.mockResolvedValue([
			{
				id: 'pay-1',
				orderId: 'ord-1',
				orderItemId: 'item-1',
				sellerId: 'seller-1',
				amountGross: 100,
				platformFeeAmount: 2,
				withdrawalFeeAmount: 0,
				amountNet: 98,
				currency: 'UAH',
				status: PayoutStatus.WITHDRAWN,
				availableAt: new Date(),
				releasedAt: null,
				withdrawnAt: new Date(),
				createdAt: new Date(),
				order: { id: 'ord-1', status: 'DELIVERED' },
				orderItem: {
					id: 'item-1',
					productTitle: 'Test',
					totalPrice: 100,
					confirmedReceivedAt: new Date(),
				},
			},
		] as never);
		auditLogFn.mockResolvedValue(undefined);

		const result = await withdrawSellerPayouts('seller-1');

		expect(result.withdrawnCount).toBe(1);
		expect(result.totalNet).toBe(98);
		expect(auditLogFn).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'PAYOUT_WITHDRAWN', actorId: 'seller-1' })
		);
	});
});
