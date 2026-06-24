import { prisma } from '../utils/prisma.js';

export async function findProfileByUserId(userId: string) {
	return prisma.userProfile.findUnique({ where: { userId } });
}

export async function updateProfileByUserId(
	userId: string,
	data: {
		firstName?: string;
		lastName?: string;
		displayName?: string | null;
		bio?: string | null;
		phone?: string | null;
		country?: string | null;
		city?: string | null;
		avatarUrl?: string | null;
	}
) {
	return prisma.userProfile.update({
		where: { userId },
		data,
	});
}
