import { prisma } from '../utils/prisma.js';
import { ProductStatus } from '@prisma/client';

export interface RevenueSeriesRow {
	date: Date;
	revenue: string;
}

export interface TopProductRow {
	productId: string;
	revenue: string;
	orderCount: bigint;
}

export async function getSellerRevenue(sellerId: string, periodStart: Date): Promise<number> {
	const result = await prisma.orderItem.aggregate({
		where: { sellerId, createdAt: { gte: periodStart } },
		_sum: { totalPrice: true },
	});
	return Number(result._sum.totalPrice ?? 0);
}

export async function getSellerOrderCount(sellerId: string, periodStart: Date): Promise<number> {
	const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
		SELECT COUNT(DISTINCT "orderId")::bigint AS count
		FROM "OrderItem"
		WHERE "sellerId" = ${sellerId}
		  AND "createdAt" >= ${periodStart}
	`;
	return Number(result[0]?.count ?? 0);
}

export async function getSellerProductCount(sellerId: string): Promise<number> {
	return prisma.product.count({
		where: {
			sellerId,
			deletedAt: null,
			status: { notIn: [ProductStatus.ARCHIVED, ProductStatus.BLOCKED] },
		},
	});
}

export async function getSellerAverageRating(sellerId: string): Promise<number | null> {
	const result = await prisma.sellerReview.aggregate({
		where: { sellerId, isApproved: true, isBlocked: false, deletedAt: null },
		_avg: { rating: true },
	});
	return result._avg.rating !== null ? Number(result._avg.rating) : null;
}

export async function getRevenueSeriesDay(
	sellerId: string,
	periodStart: Date
): Promise<RevenueSeriesRow[]> {
	return prisma.$queryRaw<RevenueSeriesRow[]>`
		SELECT DATE_TRUNC('day', "createdAt") AS date, SUM("totalPrice")::text AS revenue
		FROM "OrderItem"
		WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart}
		GROUP BY 1 ORDER BY 1 ASC
	`;
}

export async function getRevenueSeriesWeek(
	sellerId: string,
	periodStart: Date
): Promise<RevenueSeriesRow[]> {
	return prisma.$queryRaw<RevenueSeriesRow[]>`
		SELECT DATE_TRUNC('week', "createdAt") AS date, SUM("totalPrice")::text AS revenue
		FROM "OrderItem"
		WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart}
		GROUP BY 1 ORDER BY 1 ASC
	`;
}

export async function getRevenueSeriesMonth(
	sellerId: string,
	periodStart: Date
): Promise<RevenueSeriesRow[]> {
	return prisma.$queryRaw<RevenueSeriesRow[]>`
		SELECT DATE_TRUNC('month', "createdAt") AS date, SUM("totalPrice")::text AS revenue
		FROM "OrderItem"
		WHERE "sellerId" = ${sellerId} AND "createdAt" >= ${periodStart}
		GROUP BY 1 ORDER BY 1 ASC
	`;
}

export async function getTopProductRows(
	sellerId: string,
	limit: number
): Promise<TopProductRow[]> {
	return prisma.$queryRaw<TopProductRow[]>`
		SELECT "productId", SUM("totalPrice")::text AS revenue, COUNT(*)::bigint AS "orderCount"
		FROM "OrderItem"
		WHERE "sellerId" = ${sellerId}
		GROUP BY "productId"
		ORDER BY SUM("totalPrice") DESC
		LIMIT ${limit}
	`;
}

export async function findProductsForTopList(productIds: string[], sellerId: string) {
	return prisma.product.findMany({
		where: { id: { in: productIds }, sellerId, deletedAt: null },
		include: {
			translations: true,
			media: { where: { isMain: true }, take: 1 },
		},
	});
}

export async function getLowStockVariants(sellerId: string, threshold: number) {
	return prisma.productVariant.findMany({
		where: {
			isActive: true,
			stock: { lte: threshold },
			product: { sellerId, deletedAt: null },
		},
		include: {
			product: {
				include: {
					translations: true,
					media: { where: { isMain: true }, take: 1 },
				},
			},
		},
		orderBy: { stock: 'asc' },
		take: 20,
	});
}
