import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export type PromoCodeRecord = Prisma.PromoCodeGetPayload<Record<string, never>>;

export async function findPromoByCode(code: string): Promise<PromoCodeRecord | null> {
	return prisma.promoCode.findUnique({ where: { code } });
}

export async function incrementPromoUsage(id: string): Promise<void> {
	await prisma.promoCode.update({
		where: { id },
		data: { usedCount: { increment: 1 } },
	});
}
