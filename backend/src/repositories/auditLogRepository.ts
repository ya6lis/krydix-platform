import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { actionKeyToWhere } from '../utils/auditLogHelpers.js';
import type { AuditActionKeyValue } from '../constants/auditActionKeys.js';

export type AuditActorRoleFilter = 'ADMIN' | 'MODERATOR';

export type AuditDateRangePreset = 'LAST_24_HOURS' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

const ACTOR_INCLUDE = {
	profile: {
		select: {
			firstName: true,
			lastName: true,
			avatarUrl: true,
		},
	},
} as const;

export type RawAuditLog = Prisma.AuditLogGetPayload<{
	include: { actor: { include: typeof ACTOR_INCLUDE } };
}>;

function resolveDateRange(input: {
	datePreset?: AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
}): { from?: Date; to?: Date } {
	const now = new Date();
	if (input.datePreset === 'LAST_24_HOURS') {
		return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
	}
	if (input.datePreset === 'LAST_7_DAYS' || !input.datePreset) {
		return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
	}
	if (input.datePreset === 'LAST_30_DAYS') {
		return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
	}
	return {
		from: input.dateFrom ? new Date(input.dateFrom) : undefined,
		to: input.dateTo ? new Date(input.dateTo) : now,
	};
}

function buildDateWhere(input: {
	datePreset?: AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
}): Prisma.AuditLogWhereInput | undefined {
	const { from, to } = resolveDateRange(input);
	if (!from && !to) return undefined;
	const createdAt: Prisma.DateTimeFilter = {};
	if (from) createdAt.gte = from;
	if (to) createdAt.lte = to;
	return { createdAt };
}

function buildActorRoleWhere(
	actorRoles?: AuditActorRoleFilter[]
): Prisma.AuditLogWhereInput | undefined {
	if (!actorRoles?.length) return undefined;
	return {
		actor: {
			role: { in: actorRoles as Role[] },
		},
	};
}

function buildActionKeyWhere(
	actionKeys?: AuditActionKeyValue[]
): Prisma.AuditLogWhereInput | undefined {
	if (!actionKeys?.length) return undefined;
	const clauses = actionKeys.map((key) => actionKeyToWhere(key));
	return clauses.length === 1 ? clauses[0] : { OR: clauses };
}

function combineWhere(
	...parts: Array<Prisma.AuditLogWhereInput | undefined>
): Prisma.AuditLogWhereInput {
	const AND = parts.filter(Boolean) as Prisma.AuditLogWhereInput[];
	return AND.length === 1 ? AND[0] : { AND };
}

export async function findAuditLogs(input: {
	actorId?: string;
	actorRoles?: AuditActorRoleFilter[];
	actionKeys?: AuditActionKeyValue[];
	datePreset?: AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
	page: number;
	pageSize: number;
}) {
	const where = combineWhere(
		buildDateWhere(input),
		input.actorId ? { actorId: input.actorId } : undefined,
		buildActorRoleWhere(input.actorRoles),
		buildActionKeyWhere(input.actionKeys)
	);

	const skip = (input.page - 1) * input.pageSize;

	const [items, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			include: { actor: { include: ACTOR_INCLUDE } },
			orderBy: { createdAt: 'desc' },
			skip,
			take: input.pageSize,
		}),
		prisma.auditLog.count({ where }),
	]);

	return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function findAuditLogsForCounts(input: {
	datePreset?: AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
}) {
	const dateWhere = buildDateWhere(input);
	return prisma.auditLog.findMany({
		where: dateWhere,
		select: {
			action: true,
			targetType: true,
			metadata: true,
			actor: { select: { role: true } },
		},
	});
}

export async function findProductsByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.product.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			sku: true,
			slug: true,
			translations: { select: { language: true, title: true } },
		},
	});
}

export async function findUsersByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.user.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			email: true,
			profile: { select: { firstName: true, lastName: true } },
		},
	});
}

export async function findCategoriesByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.category.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			slug: true,
			translations: { select: { language: true, name: true } },
		},
	});
}

export async function findReviewsByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.productReview.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			product: {
				select: {
					slug: true,
					translations: { select: { language: true, title: true } },
				},
			},
		},
	});
}

export async function findSellerApplicationsByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.sellerApplication.findMany({
		where: { id: { in: ids } },
		select: { id: true, companyName: true },
	});
}

export async function findComplaintsByIds(ids: string[]) {
	if (!ids.length) return [];
	return prisma.complaint.findMany({
		where: { id: { in: ids } },
		select: { id: true, reason: true },
	});
}
