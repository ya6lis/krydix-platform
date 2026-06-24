import * as platformRepo from '../repositories/platformRepository.js';
import {
	DEFAULT_BUYER_FEE_PERCENT,
	DEFAULT_ORDER_CURRENCY,
	DEFAULT_PLATFORM_FEE_PERCENT,
} from '../constants/monetization.js';

export interface FeeSnapshotInput {
	productId: string;
	categoryIds: string[];
	lineTotal: number;
}

export interface FeeSnapshot {
	currency: string;
	buyerFeePercent: number;
	buyerFeeAmount: number;
	sellerFeePercent: number;
	sellerFeeAmount: number;
	platformFeePercent: number;
	platformFeeAmount: number;
	sellerPayoutAmount: number;
}

interface CommissionRate {
	percent: number;
	fixedFee: number;
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100;
}

function resolveCommissionRule(
	categoryIds: string[],
	rules: Awaited<ReturnType<typeof platformRepo.findCommissionRules>>,
	fallbackPercent: number
): CommissionRate {
	for (const categoryId of categoryIds) {
		const match = rules.find((rule) => rule.categoryId === categoryId);
		if (match) {
			return { percent: Number(match.percent), fixedFee: Number(match.fixedFee) };
		}
	}

	const defaultRule = rules.find((rule) => rule.isDefault);
	if (defaultRule) {
		return { percent: Number(defaultRule.percent), fixedFee: Number(defaultRule.fixedFee) };
	}

	return { percent: fallbackPercent, fixedFee: 0 };
}

export function computeLineFeeSnapshot(
	input: FeeSnapshotInput,
	config: {
		currency: string;
		buyerFeePercent: number;
		platformFeePercent: number;
	},
	commission: CommissionRate
): FeeSnapshot {
	const buyerFeePercent = config.buyerFeePercent;
	const platformFeePercent = commission.percent || config.platformFeePercent;
	const lineTotal = input.lineTotal;

	const buyerFeeAmount = roundMoney((lineTotal * buyerFeePercent) / 100);
	const percentFee = roundMoney((lineTotal * platformFeePercent) / 100);
	const platformFeeAmount = roundMoney(percentFee + commission.fixedFee);
	const sellerPayoutAmount = roundMoney(Math.max(0, lineTotal - platformFeeAmount));

	return {
		currency: config.currency,
		buyerFeePercent,
		buyerFeeAmount,
		sellerFeePercent: platformFeePercent,
		sellerFeeAmount: platformFeeAmount,
		platformFeePercent,
		platformFeeAmount,
		sellerPayoutAmount,
	};
}

export async function buildFeeSnapshots(items: FeeSnapshotInput[]): Promise<FeeSnapshot[]> {
	const [config, rules] = await Promise.all([
		platformRepo.getPlatformConfig(),
		platformRepo.findCommissionRules(),
	]);

	const feeConfig = {
		currency: config.payoutCurrency || DEFAULT_ORDER_CURRENCY,
		buyerFeePercent: Number(config.defaultBuyerFeePercent ?? DEFAULT_BUYER_FEE_PERCENT),
		platformFeePercent: Number(config.defaultPlatformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT),
	};

	return items.map((item) => {
		const commission = resolveCommissionRule(item.categoryIds, rules, feeConfig.platformFeePercent);
		return computeLineFeeSnapshot(item, feeConfig, commission);
	});
}
