import { GraphQLError } from 'graphql';
import * as repo from '../repositories/publicProfileRepository.js';

function buildDisplayName(user: NonNullable<Awaited<ReturnType<typeof repo.findPublicUser>>>) {
	const profile = user.profile;
	if (profile?.displayName?.trim()) return profile.displayName.trim();
	if (user.sellerApplication?.companyName?.trim()) return user.sellerApplication.companyName.trim();
	if (profile) return `${profile.firstName} ${profile.lastName}`.trim();
	return 'Seller';
}

export async function getPublicSellerProfile(sellerId: string) {
	const user = await repo.findPublicUser(sellerId);
	if (!user) {
		throw new GraphQLError('Profile not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const application =
		user.sellerApplication &&
		user.sellerApplication.status === 'APPROVED' &&
		!user.sellerApplication.deletedAt
			? user.sellerApplication
			: null;

	const stats = await repo.getSellerCatalogStats(sellerId);
	const profile = user.profile;
	const isVerifiedSeller = user.role === 'SELLER' && !!application;

	return {
		id: user.id,
		displayName: buildDisplayName({ ...user, sellerApplication: application }),
		firstName: profile?.firstName ?? '',
		lastName: profile?.lastName ?? '',
		avatarUrl: profile?.avatarUrl ?? null,
		bio: profile?.bio ?? null,
		companyName: application?.companyName ?? null,
		country: profile?.country ?? null,
		city: profile?.city ?? null,
		isVerifiedSeller,
		memberSince: user.createdAt.toISOString(),
		productCount: stats.productCount,
		averageRating: Math.round(stats.averageRating * 10) / 10,
		reviewCount: stats.reviewCount,
	};
}
