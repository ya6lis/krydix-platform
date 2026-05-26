import { prisma } from '../utils/prisma.js';

const REFRESH_TOKEN_DAYS = 30;
const EMAIL_VERIFY_HOURS = 24;

export async function createRefreshToken(userId: string, token: string) {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
	return prisma.refreshToken.create({ data: { userId, token, expiresAt } });
}

export async function findRefreshToken(token: string) {
	return prisma.refreshToken.findUnique({ where: { token } });
}

export async function revokeRefreshToken(id: string) {
	return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
}

export async function revokeAllRefreshTokensForUser(userId: string) {
	return prisma.refreshToken.updateMany({
		where: { userId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

export async function createEmailVerification(userId: string, token: string) {
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFY_HOURS);
	return prisma.emailVerification.create({ data: { userId, token, expiresAt } });
}

export async function findEmailVerification(token: string) {
	return prisma.emailVerification.findUnique({ where: { token } });
}

export async function markEmailVerificationUsed(id: string) {
	return prisma.emailVerification.update({ where: { id }, data: { usedAt: new Date() } });
}
