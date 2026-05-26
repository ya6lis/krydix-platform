import { prisma } from '../utils/prisma.js';

const VISIBLE_PRODUCT_WHERE = {
	status: 'APPROVED' as const,
	deletedAt: null,
	isAvailable: true,
};

export async function findPublicUser(userId: string) {
	return prisma.user.findFirst({
		where: { id: userId, isActive: true, deletedAt: null },
		include: {
			profile: true,
			sellerApplication: true,
		},
	});
}

export async function getSellerCatalogStats(sellerId: string) {
	const [productCount, reviewAgg] = await Promise.all([
		prisma.product.count({
			where: { sellerId, ...VISIBLE_PRODUCT_WHERE },
		}),
		prisma.productReview.aggregate({
			where: {
				isApproved: true,
				isBlocked: false,
				deletedAt: null,
				product: { sellerId, ...VISIBLE_PRODUCT_WHERE },
			},
			_avg: { rating: true },
			_count: true,
		}),
	]);

	return {
		productCount,
		averageRating: Number(reviewAgg._avg.rating ?? 0),
		reviewCount: reviewAgg._count,
	};
}
