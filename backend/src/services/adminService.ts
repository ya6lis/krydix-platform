import { randomBytes } from 'crypto';
import { GraphQLError } from 'graphql';
import * as repo from '../repositories/adminRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import * as tokenRepo from '../repositories/tokenRepository.js';
import * as auditLog from './auditLogService.js';
import * as userEnforcement from './userEnforcementService.js';
import { hashPassword } from '../utils/hash.js';
import { sendVerificationEmail } from '../utils/email.js';
import { env } from '../config/env.js';
import { Role } from '../constants/enums.js';
import { isUserOnline } from './presenceService.js';

const STAFF_ROLES: Role[] = [Role.MODERATOR, Role.ADMIN];
const MODERATOR_BAN_ROLES: Role[] = [Role.BUYER, Role.SELLER];

function generateToken(): string {
	return randomBytes(32).toString('hex');
}

function generateTempPassword(): string {
	return randomBytes(9).toString('base64url');
}

function buildDisplayName(user: repo.RawAdminUser): string {
	const p = user.profile;
	if (!p) return user.email;
	return `${p.firstName} ${p.lastName}`.trim();
}

function buildInitials(user: repo.RawAdminUser): string {
	const p = user.profile;
	if (!p) return '??';
	return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

function buildUserRef(id: string): string {
	return `#US-${id.slice(-4).toUpperCase()}`;
}

function buildUserStatus(user: repo.RawAdminUser): string {
	if (user.deletedAt) return 'DELETED';
	if (!user.isActive) return 'BLOCKED';
	if (!user.isEmailVerified) return 'PENDING_EMAIL';
	return 'ACTIVE';
}

export function serializeAdminUser(user: repo.RawAdminUser) {
	const lastSeen = user.lastSeenAt ?? user.updatedAt;
	return {
		id: user.id,
		email: user.email,
		displayName: buildDisplayName(user),
		initials: buildInitials(user),
		avatarUrl: user.profile?.avatarUrl ?? null,
		role: user.role,
		country: user.profile?.country ?? null,
		joinedAt: user.createdAt.toISOString(),
		lastSeenAt: lastSeen.toISOString(),
		isOnline: isUserOnline(user.lastSeenAt, user.updatedAt),
		status: buildUserStatus(user),
		userRef: buildUserRef(user.id),
		isActive: user.isActive,
		isEmailVerified: user.isEmailVerified,
	};
}

function assertStaffRole(actorRole: Role) {
	if (!STAFF_ROLES.includes(actorRole)) {
		throw new GraphQLError('Staff access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function assertAdminRole(actorRole: Role) {
	if (actorRole !== Role.ADMIN) {
		throw new GraphQLError('Administrator access required', { extensions: { code: 'FORBIDDEN' } });
	}
}

function assertCanManageTarget(actorRole: Role, targetRole: Role, actorId: string, targetId: string) {
	if (actorId === targetId) {
		throw new GraphQLError('You cannot modify your own account', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}
	if (actorRole === Role.MODERATOR) {
		if (!MODERATOR_BAN_ROLES.includes(targetRole as Role)) {
			throw new GraphQLError('Moderators can only manage buyers and sellers', {
				extensions: { code: 'FORBIDDEN' },
			});
		}
	}
}

export async function getAdminStats() {
	return repo.getAdminUserStats();
}

export async function getAllUsers(input: {
	roleFilter?: repo.AdminUserRoleFilter;
	statusFilter?: repo.AdminUserStatusFilter;
	search?: string;
	page?: number;
	pageSize?: number;
}) {
	const [data, tabCounts] = await Promise.all([
		repo.findAllUsers(input),
		repo.getAdminUserTabCounts(),
	]);

	return {
		items: data.items.map(serializeAdminUser),
		total: data.total,
		page: data.page,
		pageSize: data.pageSize,
		tabCounts,
	};
}

export async function changeUserRole(
	actorId: string,
	actorRole: Role,
	userId: string,
	newRole: Role,
) {
	assertAdminRole(actorRole);

	if (!Object.values(Role).includes(newRole)) {
		throw new GraphQLError('Invalid role', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const target = await repo.findAdminUserById(userId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
	}

	assertCanManageTarget(actorRole, target.role as Role, actorId, userId);

	if (newRole === Role.ADMIN && actorRole !== Role.ADMIN) {
		throw new GraphQLError('Only administrators can assign administrator role', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	const updated = await repo.updateUserRole(userId, newRole as never);

	await auditLog.log({
		actorId,
		action: 'USER_ROLE_CHANGE',
		targetType: 'User',
		targetId: userId,
		metadata: { from: target.role, to: newRole },
	});

	return serializeAdminUser(updated);
}

export async function softDeleteUser(actorId: string, actorRole: Role, userId: string) {
	assertAdminRole(actorRole);

	const target = await repo.findAdminUserById(userId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (target.role === Role.ADMIN) {
		throw new GraphQLError('Administrators cannot be soft-deleted via this action', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	assertCanManageTarget(actorRole, target.role as Role, actorId, userId);

	const enforcement = await userEnforcement.enforceSoftDelete(userId);
	await repo.softDeleteUserRecord(userId);

	await auditLog.log({
		actorId,
		action: 'HARD_DELETE',
		targetType: 'User',
		targetId: userId,
		metadata: { action: 'SOFT_DELETE', enforcement },
	});

	return true;
}

export async function softBanUser(
	actorId: string,
	actorRole: Role,
	userId: string,
	reason?: string,
) {
	assertStaffRole(actorRole);

	const target = await repo.findAdminUserById(userId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
	}

	assertCanManageTarget(actorRole, target.role as Role, actorId, userId);

	const enforcement = await userEnforcement.enforceSoftBan(userId);
	const updated = await repo.setUserActive(userId, false);

	await auditLog.log({
		actorId,
		action: 'USER_ROLE_CHANGE',
		targetType: 'User',
		targetId: userId,
		metadata: { action: 'SOFT_BAN', reason: reason?.trim() || null, enforcement },
	});

	return serializeAdminUser(updated);
}

export async function softUnbanUser(actorId: string, actorRole: Role, userId: string) {
	assertStaffRole(actorRole);

	const target = await repo.findAdminUserById(userId);
	if (!target || target.deletedAt) {
		throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
	}

	assertCanManageTarget(actorRole, target.role as Role, actorId, userId);

	const updated = await repo.setUserActive(userId, true);
	return serializeAdminUser(updated);
}

export async function inviteUser(
	actorId: string,
	actorRole: Role,
	input: { email: string; firstName: string; lastName: string; role: Role },
) {
	assertAdminRole(actorRole);

	if (![Role.BUYER, Role.SELLER, Role.MODERATOR].includes(input.role)) {
		throw new GraphQLError('Invalid invite role', { extensions: { code: 'BAD_USER_INPUT' } });
	}

	const existing = await userRepo.findUserByEmail(input.email);
	if (existing) {
		throw new GraphQLError('Email already registered', { extensions: { code: 'EMAIL_TAKEN' } });
	}

	const tempPassword = generateTempPassword();
	const passwordHash = await hashPassword(tempPassword);
	const user = await userRepo.createUser({
		email: input.email,
		passwordHash,
		role: input.role,
	});
	await userRepo.createUserProfile(user.id, {
		firstName: input.firstName,
		lastName: input.lastName,
	});

	if (!env.DISABLE_EMAIL) {
		const verifyToken = generateToken();
		await tokenRepo.createEmailVerification(user.id, verifyToken);
		await sendVerificationEmail(input.email, verifyToken);
	} else {
		await userRepo.updateUserEmailVerified(user.id);
	}

	await auditLog.log({
		actorId,
		action: 'USER_ROLE_CHANGE',
		targetType: 'User',
		targetId: user.id,
		metadata: { action: 'INVITE', role: input.role },
	});

	const full = await repo.findAdminUserById(user.id);
	return serializeAdminUser(full!);
}
