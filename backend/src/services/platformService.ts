import { GraphQLError } from 'graphql';
import * as repo from '../repositories/platformRepository.js';
import * as auditLog from './auditLogService.js';
import { PayoutSchedule } from '../constants/platform.js';

function toNumber(value: unknown): number {
	if (value === null || value === undefined) return 0;
	return Number(value);
}

function pickCategoryName(rule: repo.RawCommissionRule): string | null {
	return rule.category?.translations[0]?.name ?? null;
}

function computeNextPayoutDate(schedule: string): string {
	const now = new Date();
	if (schedule === PayoutSchedule.MONTHLY_FIRST) {
		const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		return next.toISOString();
	}
	if (schedule === PayoutSchedule.BIWEEKLY) {
		const next = new Date(now);
		next.setDate(now.getDate() + 14);
		return next.toISOString();
	}
	if (schedule === PayoutSchedule.ON_DEMAND) {
		return now.toISOString();
	}
	const next = new Date(now);
	const day = now.getDay();
	const daysUntilTuesday = (2 - day + 7) % 7 || 7;
	next.setDate(now.getDate() + daysUntilTuesday);
	return next.toISOString();
}

function derivePromoStatus(promo: {
	isActive: boolean;
	expiresAt: Date | null;
	maxUses: number | null;
	usedCount: number;
}): string {
	if (!promo.isActive) return 'DISABLED';
	if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return 'EXPIRED';
	if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return 'EXPIRED';
	return 'ACTIVE';
}

function serializeCommissionRule(rule: repo.RawCommissionRule) {
	return {
		id: rule.id,
		categoryId: rule.categoryId,
		categoryName: pickCategoryName(rule),
		categorySlug: rule.category?.slug ?? null,
		isDefault: rule.isDefault,
		percent: toNumber(rule.percent),
		fixedFee: toNumber(rule.fixedFee),
		currency: rule.currency,
	};
}

function serializePromoCode(promo: Awaited<ReturnType<typeof repo.findAdminPromoCodes>>[number]) {
	return {
		id: promo.id,
		code: promo.code,
		description: promo.description,
		discountPercent: promo.discountPercent ? toNumber(promo.discountPercent) : null,
		discountFixed: promo.discountFixed ? toNumber(promo.discountFixed) : null,
		minOrderAmount: promo.minOrderAmount ? toNumber(promo.minOrderAmount) : null,
		maxUses: promo.maxUses,
		usedCount: promo.usedCount,
		expiresAt: promo.expiresAt?.toISOString() ?? null,
		isActive: promo.isActive,
		status: derivePromoStatus(promo),
	};
}

export async function getPlatformOverview() {
	const now = new Date();
	const since30 = new Date(now);
	since30.setDate(now.getDate() - 30);
	const since60 = new Date(now);
	since60.setDate(now.getDate() - 60);

	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	const [current, previous, config, activeSellers, newSellers, pendingRaw, defaultRule] =
		await Promise.all([
			repo.getOverviewOrderStats(since30, now),
			repo.getOverviewOrderStats(since60, since30),
			repo.getPlatformConfig(),
			repo.countActiveSellers(),
			repo.countNewSellersSince(monthStart),
			repo.sumPendingPayoutOrders(3),
			repo.findCommissionRules().then((rules) => rules.find((r) => r.isDefault)),
		]);

	const gmvCurrent = toNumber(current._sum.totalAmount);
	const gmvPrevious = toNumber(previous._sum.totalAmount);
	const gmvDelta = gmvPrevious > 0 ? ((gmvCurrent - gmvPrevious) / gmvPrevious) * 100 : 0;
	const takeRate = defaultRule ? toNumber(defaultRule.percent) : toNumber(config.defaultPlatformFeePercent) || 2;
	const platformRevenue = gmvCurrent * (takeRate / 100);
	const pendingPayouts = toNumber(pendingRaw);

	return {
		grossMerchandiseValue30d: gmvCurrent,
		gmvDeltaPercent: Math.round(gmvDelta * 10) / 10,
		platformRevenue30d: Math.round(platformRevenue * 100) / 100,
		averageTakeRate: takeRate,
		pendingPayouts,
		nextPayoutDate: computeNextPayoutDate(config.payoutSchedule),
		activeSellers,
		newSellersThisMonth: newSellers,
	};
}

export async function getCommissionRules() {
	const rules = await repo.findCommissionRules();
	return rules.map(serializeCommissionRule);
}

export async function getPayoutConfig() {
	const config = await repo.getPlatformConfig();
	return {
		schedule: config.payoutSchedule,
		holdPeriodDays: config.payoutHoldDays,
		autoConfirmDays: config.autoConfirmDays,
		minimumPayout: toNumber(config.payoutMinimum),
		currency: config.payoutCurrency,
	};
}

export async function getAdminPromoCodes() {
	const promos = await repo.findAdminPromoCodes();
	return promos.map(serializePromoCode);
}

export async function saveCommissionRules(
	actorId: string,
	rules: Array<{
		id?: string;
		categoryId?: string | null;
		percent: number;
		fixedFee: number;
		currency: string;
		isDefault?: boolean;
	}>,
) {
	if (!rules.some((r) => r.isDefault)) {
		throw new GraphQLError('Default commission rule is required', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const saved = await repo.upsertCommissionRules(rules);

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'PlatformConfig',
		targetId: 'commission-rules',
		metadata: { operation: 'update', count: saved.length },
	});

	return saved.map(serializeCommissionRule);
}

export async function savePayoutConfig(
	actorId: string,
	input: {
		schedule: string;
		holdPeriodDays: number;
		autoConfirmDays: number;
		minimumPayout: number;
		currency: string;
	},
) {
	if (input.holdPeriodDays < 0 || input.holdPeriodDays > 90) {
		throw new GraphQLError('Hold period must be between 0 and 90 days', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}
	if (input.autoConfirmDays < 1 || input.autoConfirmDays > 90) {
		throw new GraphQLError('Auto-confirm period must be between 1 and 90 days', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const updated = await repo.updatePlatformConfig({
		payoutSchedule: input.schedule as never,
		payoutHoldDays: input.holdPeriodDays,
		autoConfirmDays: input.autoConfirmDays,
		payoutMinimum: input.minimumPayout,
		payoutCurrency: input.currency,
	});

	await auditLog.log({
		actorId,
		action: 'PLATFORM_CONFIG_CHANGE',
		targetType: 'PlatformConfig',
		targetId: 'payout-config',
		metadata: {
			operation: 'update',
			schedule: input.schedule,
			holdPeriodDays: input.holdPeriodDays,
			autoConfirmDays: input.autoConfirmDays,
		},
	});

	return {
		schedule: updated.payoutSchedule,
		holdPeriodDays: updated.payoutHoldDays,
		autoConfirmDays: updated.autoConfirmDays,
		minimumPayout: toNumber(updated.payoutMinimum),
		currency: updated.payoutCurrency,
	};
}

export async function createAdminPromoCode(
	actorId: string,
	input: {
		code: string;
		description?: string;
		discountPercent?: number;
		discountFixed?: number;
		minOrderAmount?: number;
		maxUses?: number;
		expiresAt?: string;
		isActive?: boolean;
	},
) {
	const code = input.code.trim().toUpperCase();
	if (!code) {
		throw new GraphQLError('Promo code is required', { extensions: { code: 'BAD_USER_INPUT' } });
	}
	if (!input.discountPercent && !input.discountFixed) {
		throw new GraphQLError('Discount percent or fixed amount is required', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const created = await repo.createPromoCode({
		code,
		description: input.description?.trim() || null,
		discountPercent: input.discountPercent ?? null,
		discountFixed: input.discountFixed ?? null,
		minOrderAmount: input.minOrderAmount ?? null,
		maxUses: input.maxUses ?? null,
		expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		isActive: input.isActive ?? true,
	});

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'PromoCode',
		targetId: created.id,
		metadata: { operation: 'create', code },
	});

	return serializePromoCode(created);
}

export async function updateAdminPromoCode(
	actorId: string,
	id: string,
	input: {
		description?: string;
		discountPercent?: number;
		discountFixed?: number;
		minOrderAmount?: number;
		maxUses?: number;
		expiresAt?: string | null;
		isActive?: boolean;
	},
) {
	const updated = await repo.updatePromoCode(id, {
		...(input.description !== undefined && { description: input.description.trim() || null }),
		...(input.discountPercent !== undefined && { discountPercent: input.discountPercent }),
		...(input.discountFixed !== undefined && { discountFixed: input.discountFixed }),
		...(input.minOrderAmount !== undefined && { minOrderAmount: input.minOrderAmount }),
		...(input.maxUses !== undefined && { maxUses: input.maxUses }),
		...(input.expiresAt !== undefined && {
			expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		}),
		...(input.isActive !== undefined && { isActive: input.isActive }),
	});

	await auditLog.log({
		actorId,
		action: 'CATEGORY_CHANGE',
		targetType: 'PromoCode',
		targetId: id,
		metadata: { operation: 'update' },
	});

	return serializePromoCode(updated);
}
