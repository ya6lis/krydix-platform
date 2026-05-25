import { prisma } from '../utils/prisma.js';
import type { Role } from '../constants/enums.js';

export async function findUserByEmail(email: string) {
	return prisma.user.findUnique({ where: { email }, include: { profile: true } });
}

export async function findUserById(id: string) {
	return prisma.user.findUnique({ where: { id }, include: { profile: true } });
}

export async function createUser(data: { email: string; passwordHash: string; role?: Role }) {
	return prisma.user.create({ data });
}

export async function createUserProfile(
	userId: string,
	data: { firstName: string; lastName: string }
) {
	return prisma.userProfile.create({ data: { userId, ...data } });
}

export async function updateUserEmailVerified(userId: string) {
	return prisma.user.update({
		where: { id: userId },
		data: { isEmailVerified: true },
	});
}

export async function updateUserLastSeenAt(userId: string) {
	return prisma.user.update({
		where: { id: userId },
		data: { lastSeenAt: new Date() },
	});
}
