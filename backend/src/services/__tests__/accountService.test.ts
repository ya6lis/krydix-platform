import { jest } from '@jest/globals';

jest.mock('../../repositories/adminRepository.js');
jest.mock('../../repositories/tokenRepository.js');
jest.mock('../../repositories/userRepository.js');
jest.mock('../auditLogService.js');
jest.mock('../userEnforcementService.js');
jest.mock('../../utils/hash.js');

import * as adminRepo from '../../repositories/adminRepository.js';
import * as tokenRepo from '../../repositories/tokenRepository.js';
import * as userRepo from '../../repositories/userRepository.js';
import * as auditLog from '../auditLogService.js';
import * as userEnforcement from '../userEnforcementService.js';
import { comparePassword } from '../../utils/hash.js';
import * as service from '../accountService.js';
import { Role } from '../../constants/enums.js';

const mockUser = {
	id: 'user-1',
	email: 'buyer@krydix.dev',
	role: Role.BUYER,
	isActive: true,
	isEmailVerified: true,
	deletedAt: null,
	passwordHash: 'hash',
	profile: { firstName: 'Anna', lastName: 'Bond' },
};

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
	(userEnforcement.enforceSoftDelete as jest.Mock).mockResolvedValue({
		productsAffected: 2,
		ordersCancelled: 1,
		ordersRefunded: 1,
	});
	(adminRepo.softDeleteUserRecord as jest.Mock).mockResolvedValue({});
	(tokenRepo.revokeAllRefreshTokensForUser as jest.Mock).mockResolvedValue({ count: 1 });
	(comparePassword as jest.Mock).mockResolvedValue(true);
});

describe('closeAccount', () => {
	it('cancels/refunds orders, soft-deletes user, and revokes tokens', async () => {
		(userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);

		const result = await service.closeAccount('user-1', 'correct-password');

		expect(result).toBe(true);
		expect(userEnforcement.enforceSoftDelete).toHaveBeenCalledWith('user-1');
		expect(adminRepo.softDeleteUserRecord).toHaveBeenCalledWith('user-1');
		expect(tokenRepo.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				actorId: 'user-1',
				targetId: 'user-1',
				metadata: expect.objectContaining({ action: 'SELF_CLOSE' }),
			}),
		);
	});

	it('rejects invalid password', async () => {
		(userRepo.findUserById as jest.Mock).mockResolvedValue(mockUser);
		(comparePassword as jest.Mock).mockResolvedValue(false);

		await expect(service.closeAccount('user-1', 'wrong')).rejects.toMatchObject({
			extensions: { code: 'INVALID_CREDENTIALS' },
		});
	});

	it('blocks staff from self-closing', async () => {
		(userRepo.findUserById as jest.Mock).mockResolvedValue({
			...mockUser,
			role: Role.MODERATOR,
		});

		await expect(service.closeAccount('user-1', 'password')).rejects.toMatchObject({
			extensions: { code: 'FORBIDDEN' },
		});
	});

	it('rejects already deleted user', async () => {
		(userRepo.findUserById as jest.Mock).mockResolvedValue({
			...mockUser,
			deletedAt: new Date(),
		});

		await expect(service.closeAccount('user-1', 'password')).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' },
		});
	});
});
