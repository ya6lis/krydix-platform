import { GraphQLError } from 'graphql';
import * as adminRepo from '../repositories/adminRepository.js';
import * as tokenRepo from '../repositories/tokenRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import * as auditLog from './auditLogService.js';
import * as userEnforcement from './userEnforcementService.js';
import { comparePassword } from '../utils/hash.js';
import { Role } from '../constants/enums.js';

const STAFF_ROLES: Role[] = [Role.MODERATOR, Role.ADMIN];

export async function closeAccount(userId: string, password: string) {
	const user = await userRepo.findUserById(userId);

	if (!user || user.deletedAt) {
		throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
	}

	if (STAFF_ROLES.includes(user.role as Role)) {
		throw new GraphQLError('Staff accounts cannot be closed via self-service', {
			extensions: { code: 'FORBIDDEN' },
		});
	}

	const valid = await comparePassword(password, user.passwordHash);
	if (!valid) {
		throw new GraphQLError('Invalid password', { extensions: { code: 'INVALID_CREDENTIALS' } });
	}

	const enforcement = await userEnforcement.enforceSoftDelete(userId);
	await adminRepo.softDeleteUserRecord(userId);
	await tokenRepo.revokeAllRefreshTokensForUser(userId);

	await auditLog.log({
		actorId: userId,
		action: 'HARD_DELETE',
		targetType: 'User',
		targetId: userId,
		metadata: { action: 'SELF_CLOSE', enforcement },
	});

	return true;
}
