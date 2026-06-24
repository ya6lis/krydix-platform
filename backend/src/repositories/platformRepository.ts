import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import * as payoutRepo from './payoutRepository.js';

const COMMISSION_INCLUDE = {
	category: {
		include: {
			translations: { where: { language: 'EN' }, take: 1 },
		},
	},
} as const;

export type RawCommissionRule = Prisma.CommissionRuleGetPayload<{
	include: typeof COMMISSION_INCLUDE;
}>;

export async function getPlatformConfig() {
	return prisma.platformConfig.upsert({
		where: { id: 'default' },
		update: {},
		create: {},
	});
}

export async function updatePlatformConfig(data: {
	payoutSchedule?: Prisma.PlatformConfigUpdateInput['payoutSchedule'];
	payoutHoldDays?: number;
	payoutMinimum?: number;
	payoutCurrency?: string;
	autoConfirmDays?: number;
}) {
	return prisma.platformConfig.upsert({
		where: { id: 'default' },
		update: data,
		create: {
			payoutSchedule: (data.payoutSchedule as never) ?? 'WEEKLY_TUESDAY',
			payoutHoldDays: data.payoutHoldDays ?? 3,
			payoutMinimum: data.payoutMinimum ?? 25,
			payoutCurrency: data.payoutCurrency ?? 'UAH',
			autoConfirmDays: data.autoConfirmDays ?? 7,
		},
	});
}

export async function findCommissionRules() {
	return prisma.commissionRule.findMany({
		include: COMMISSION_INCLUDE,
		orderBy: [{ isDefault: 'desc' }, { updatedAt: 'asc' }],
	});
}

export async function upsertCommissionRules(
	rules: Array<{
		id?: string;
		categoryId?: string | null;
		percent: number;
		fixedFee: number;
		currency: string;
		isDefault?: boolean;
	}>
) {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.commissionRule.findMany();
		const incomingIds = new Set(rules.filter((r) => r.id).map((r) => r.id!));

		for (const row of existing) {
			if (!incomingIds.has(row.id) && !row.isDefault) {
				await tx.commissionRule.delete({ where: { id: row.id } });
			}
		}

		const saved: RawCommissionRule[] = [];
		for (const rule of rules) {
			const data = {
				categoryId: rule.isDefault ? null : (rule.categoryId ?? null),
				percent: rule.percent,
				fixedFee: rule.fixedFee,
				currency: rule.currency,
				isDefault: rule.isDefault ?? false,
			};

			if (rule.isDefault) {
				const defaultExisting = existing.find((r) => r.isDefault);
				const updated = defaultExisting
					? await tx.commissionRule.update({
							where: { id: defaultExisting.id },
							data,
							include: COMMISSION_INCLUDE,
						})
					: await tx.commissionRule.create({ data, include: COMMISSION_INCLUDE });
				saved.push(updated);
				continue;
			}

			if (rule.id) {
				const updated = await tx.commissionRule.update({
					where: { id: rule.id },
					data,
					include: COMMISSION_INCLUDE,
				});
				saved.push(updated);
			} else {
				const created = await tx.commissionRule.create({
					data,
					include: COMMISSION_INCLUDE,
				});
				saved.push(created);
			}
		}

		return saved;
	});
}

export async function findAdminPromoCodes() {
	return prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createPromoCode(data: Prisma.PromoCodeCreateInput) {
	return prisma.promoCode.create({ data });
}

export async function updatePromoCode(id: string, data: Prisma.PromoCodeUpdateInput) {
	return prisma.promoCode.update({ where: { id }, data });
}

export async function getOverviewOrderStats(since: Date, until: Date) {
	return prisma.order.aggregate({
		where: {
			deletedAt: null,
			createdAt: { gte: since, lte: until },
			payment: { status: { in: ['PAID', 'IN_ESCROW'] } },
		},
		_sum: { totalAmount: true },
		_count: true,
	});
}

export async function countActiveSellers() {
	return prisma.user.count({
		where: { role: 'SELLER', isActive: true, deletedAt: null },
	});
}

export async function countNewSellersSince(since: Date) {
	return prisma.sellerApplication.count({
		where: { status: 'APPROVED', updatedAt: { gte: since } },
	});
}

export async function sumPendingPayoutOrders(_holdDays: number) {
	return payoutRepo.sumPendingPlatformPayouts();
}
