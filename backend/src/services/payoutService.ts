import { PaymentStatus, PayoutStatus } from '@prisma/client';
import { GraphQLError } from 'graphql';
import * as payoutRepo from '../repositories/payoutRepository.js';
import * as platformRepo from '../repositories/platformRepository.js';
import { findOrderById } from '../repositories/orderRepository.js';
import * as auditLog from './auditLogService.js';

function toNumber(value: unknown): number {
	if (value === null || value === undefined) return 0;
	return Number(value);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export async function createPayoutsForOrder(orderId: string, confirmedAt: Date): Promise<number> {
	const order = await findOrderById(orderId);
	if (!order) return 0;

	const config = await platformRepo.getPlatformConfig();
	const holdUntil = addDays(confirmedAt, config.payoutHoldDays);
	let created = 0;

	for (const item of order.items) {
		if (item.confirmedReceivedAt) continue;

		const existing = await payoutRepo.findPayoutByOrderItem(item.id);
		if (existing) continue;

		const gross = toNumber(item.sellerPayoutAmountSnapshot) || toNumber(item.totalPrice);
		const platformFee = toNumber(item.platformFeeAmountSnapshot);
		const net = Math.max(0, gross);

		await payoutRepo.createPayout({
			orderId: order.id,
			orderItemId: item.id,
			sellerId: item.sellerId,
			amountGross: toNumber(item.totalPrice),
			platformFeeAmount: platformFee,
			amountNet: net,
			currency: item.currencySnapshot,
			availableAt: holdUntil,
		});
		created += 1;
	}

	await payoutRepo.confirmOrderItemsReceipt(orderId, confirmedAt, holdUntil);

	if (order.delivery && !order.delivery.confirmedReceivedAt) {
		const { prisma } = await import('../utils/prisma.js');
		await prisma.deliveryRecord.update({
			where: { orderId },
			data: { confirmedReceivedAt: confirmedAt },
		});
	}

	return created;
}

export async function blockPayoutsForOrder(orderId: string, sellerId?: string): Promise<void> {
	await payoutRepo.markPayoutsBlockedForOrder(orderId, sellerId);
}

export async function restorePayoutsForOrder(orderId: string, sellerId?: string): Promise<void> {
	await payoutRepo.restoreBlockedPayoutsForOrder(orderId, sellerId);
}

export async function refundPayoutsForOrder(orderId: string, sellerId?: string): Promise<void> {
	await payoutRepo.markPayoutsRefundedForOrder(orderId, sellerId);
}

export async function runPayoutReleaseJobs(): Promise<{ promoted: number; released: number }> {
	const promoted = await payoutRepo.promoteEligiblePayouts();
	const released = await payoutRepo.releaseEligiblePayouts();
	return { promoted, released };
}

export async function runAutoConfirmReceipts(): Promise<number> {
	const config = await platformRepo.getPlatformConfig();
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - config.autoConfirmDays);

	const orders = await payoutRepo.findOrdersPendingAutoConfirm(cutoff);
	let confirmed = 0;

	for (const order of orders) {
		if (order.payment?.status !== PaymentStatus.IN_ESCROW && order.payment?.status !== PaymentStatus.PAID) {
			continue;
		}
		await createPayoutsForOrder(order.id, new Date());
		confirmed += 1;
	}

	return confirmed;
}

export async function getSellerFinanceSummary(sellerId: string) {
	const config = await platformRepo.getPlatformConfig();
	const [onHold, eligible, released, withdrawn, blocked] = await Promise.all([
		payoutRepo.sumPayoutAmountsBySeller(sellerId, [PayoutStatus.ON_HOLD]),
		payoutRepo.sumPayoutAmountsBySeller(sellerId, [PayoutStatus.ELIGIBLE_FOR_RELEASE]),
		payoutRepo.sumPayoutAmountsBySeller(sellerId, [PayoutStatus.RELEASED]),
		payoutRepo.sumPayoutAmountsBySeller(sellerId, [PayoutStatus.WITHDRAWN]),
		payoutRepo.countPayoutsBySeller(sellerId, [PayoutStatus.BLOCKED]),
	]);

	const withdrawable = eligible + released;

	return {
		currency: config.payoutCurrency,
		onHold,
		eligibleForRelease: eligible,
		released,
		withdrawable,
		withdrawnLifetime: withdrawn,
		minimumWithdrawal: toNumber(config.payoutMinimum),
		blockedCount: blocked,
	};
}

export async function getSellerPayouts(
	sellerId: string,
	filter?: { status?: PayoutStatus },
	pagination?: { page: number; pageSize: number }
) {
	const result = await payoutRepo.findPayoutsBySeller(
		sellerId,
		filter?.status ? { status: filter.status } : undefined,
		pagination
	);

	return {
		...result,
		items: result.items.map(serializePayout),
	};
}

function serializePayout(payout: payoutRepo.PayoutRecord) {
	return {
		id: payout.id,
		orderId: payout.orderId,
		orderItemId: payout.orderItemId,
		productTitle: payout.orderItem.productTitle,
		amountGross: toNumber(payout.amountGross),
		platformFeeAmount: toNumber(payout.platformFeeAmount),
		withdrawalFeeAmount: toNumber(payout.withdrawalFeeAmount),
		amountNet: toNumber(payout.amountNet),
		currency: payout.currency,
		status: payout.status,
		availableAt: payout.availableAt?.toISOString() ?? null,
		releasedAt: payout.releasedAt?.toISOString() ?? null,
		withdrawnAt: payout.withdrawnAt?.toISOString() ?? null,
		createdAt: payout.createdAt.toISOString(),
	};
}

export async function withdrawSellerPayouts(
	sellerId: string,
	payoutIds?: string[]
) {
	const summary = await getSellerFinanceSummary(sellerId);
	if (summary.withdrawable < summary.minimumWithdrawal) {
		throw new GraphQLError(
			`Minimum withdrawal amount is ${summary.minimumWithdrawal} ${summary.currency}.`,
			{ extensions: { code: 'BAD_USER_INPUT' } }
		);
	}

	const config = await platformRepo.getPlatformConfig();
	const withdrawalFeePercent = toNumber(config.defaultWithdrawalFeePercent);
	const payouts = await payoutRepo.withdrawReleasedPayouts(sellerId, payoutIds);

	if (payouts.length === 0) {
		throw new GraphQLError('No payouts available for withdrawal.', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	const totalNet = payouts.reduce((sum, p) => sum + toNumber(p.amountNet), 0);
	const withdrawalFee = Math.round(((totalNet * withdrawalFeePercent) / 100) * 100) / 100;

	await auditLog.log({
		actorId: sellerId,
		action: 'PAYOUT_WITHDRAWN',
		targetType: 'SellerPayout',
		targetId: sellerId,
		metadata: {
			payoutIds: payouts.map((p) => p.id),
			totalNet,
			withdrawalFee,
			withdrawalFeePercent,
		},
	});

	return {
		withdrawnCount: payouts.length,
		totalNet,
		withdrawalFee,
		netReceived: Math.max(0, totalNet - withdrawalFee),
		currency: config.payoutCurrency,
		payouts: payouts.map(serializePayout),
	};
}
