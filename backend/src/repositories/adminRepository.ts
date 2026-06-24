import { prisma } from '../utils/prisma.js';
import type { Prisma, Role } from '@prisma/client';

export type AdminUserRoleFilter = 'ALL' | 'BUYER' | 'SELLER' | 'MODERATOR' | 'ADMIN' | 'BLOCKED';
export type AdminUserStatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_EMAIL' | 'BLOCKED';

const USER_INCLUDE = {
	profile: {
		select: {
			firstName: true,
			lastName: true,
			avatarUrl: true,
			country: true,
		},
	},
} as const;

export type RawAdminUser = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

function buildSearchFilter(search?: string): Prisma.UserWhereInput | undefined {
	if (!search?.trim()) return undefined;
	const q = search.trim();
	return {
		OR: [
			{ email: { contains: q, mode: 'insensitive' } },
			{ id: { contains: q, mode: 'insensitive' } },
			{
				profile: {
					OR: [
						{ firstName: { contains: q, mode: 'insensitive' } },
						{ lastName: { contains: q, mode: 'insensitive' } },
					],
				},
			},
		],
	};
}

function buildStatusFilter(
	statusFilter?: AdminUserStatusFilter
): Prisma.UserWhereInput | undefined {
	if (!statusFilter || statusFilter === 'ALL') return undefined;
	if (statusFilter === 'ACTIVE') return { isActive: true, isEmailVerified: true };
	if (statusFilter === 'PENDING_EMAIL') return { isActive: true, isEmailVerified: false };
	if (statusFilter === 'BLOCKED') return { isActive: false };
	return undefined;
}

function buildRoleFilter(roleFilter?: AdminUserRoleFilter): Prisma.UserWhereInput | undefined {
	if (!roleFilter || roleFilter === 'ALL') return undefined;
	if (roleFilter === 'BLOCKED') return { isActive: false };
	return { role: roleFilter as Role };
}

export async function getAdminUserStats() {
	const base = { deletedAt: null };
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const [total, buyers, sellers, moderators, administrators, blocked, newThisMonth] =
		await Promise.all([
			prisma.user.count({ where: base }),
			prisma.user.count({ where: { ...base, role: 'BUYER' } }),
			prisma.user.count({ where: { ...base, role: 'SELLER' } }),
			prisma.user.count({ where: { ...base, role: 'MODERATOR' } }),
			prisma.user.count({ where: { ...base, role: 'ADMIN' } }),
			prisma.user.count({ where: { ...base, isActive: false } }),
			prisma.user.count({ where: { ...base, createdAt: { gte: monthStart } } }),
		]);

	return { total, buyers, sellers, moderators, administrators, blocked, newThisMonth };
}

export async function getAdminUserTabCounts() {
	const base = { deletedAt: null };
	const [all, buyers, sellers, moderators, administrators, blocked] = await Promise.all([
		prisma.user.count({ where: base }),
		prisma.user.count({ where: { ...base, role: 'BUYER' } }),
		prisma.user.count({ where: { ...base, role: 'SELLER' } }),
		prisma.user.count({ where: { ...base, role: 'MODERATOR' } }),
		prisma.user.count({ where: { ...base, role: 'ADMIN' } }),
		prisma.user.count({ where: { ...base, isActive: false } }),
	]);
	return { all, buyers, sellers, moderators, administrators, blocked };
}

export async function findAllUsers({
	roleFilter = 'ALL',
	statusFilter,
	search,
	page = 1,
	pageSize = 25,
}: {
	roleFilter?: AdminUserRoleFilter;
	statusFilter?: AdminUserStatusFilter;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const skip = (page - 1) * pageSize;
	const where: Prisma.UserWhereInput = {
		deletedAt: null,
		...buildRoleFilter(roleFilter),
		...buildStatusFilter(statusFilter),
		...buildSearchFilter(search),
	};

	const [items, total] = await Promise.all([
		prisma.user.findMany({
			where,
			include: USER_INCLUDE,
			orderBy: { createdAt: 'desc' },
			skip,
			take: pageSize,
		}),
		prisma.user.count({ where }),
	]);

	return { items, total, page, pageSize };
}

export async function findAdminUserById(id: string) {
	return prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
}

export async function updateUserRole(id: string, role: Role) {
	return prisma.user.update({
		where: { id },
		data: { role },
		include: USER_INCLUDE,
	});
}

export async function softDeleteUserRecord(id: string) {
	return prisma.user.update({
		where: { id },
		data: { deletedAt: new Date(), isActive: false },
		include: USER_INCLUDE,
	});
}

export async function setUserActive(id: string, isActive: boolean) {
	return prisma.user.update({
		where: { id },
		data: { isActive },
		include: USER_INCLUDE,
	});
}
