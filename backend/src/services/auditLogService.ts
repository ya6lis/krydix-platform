import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export async function log({
	actorId,
	action,
	targetType,
	targetId,
	metadata,
}: {
	actorId: string;
	action: AuditAction;
	targetType: string;
	targetId: string;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	await prisma.auditLog.create({
		data: {
			actorId,
			action,
			targetType,
			targetId,
			...(metadata !== undefined && {
				metadata: metadata as Prisma.InputJsonValue,
			}),
		},
	});
}
