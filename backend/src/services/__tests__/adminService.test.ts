import { jest } from '@jest/globals';

jest.mock('../../repositories/adminRepository.js');
jest.mock('../../repositories/userRepository.js');
jest.mock('../../repositories/tokenRepository.js');
jest.mock('../auditLogService.js');
jest.mock('../userEnforcementService.js');
jest.mock('../../utils/hash.js');
jest.mock('../../utils/email.js');

import * as repo from '../../repositories/adminRepository.js';
import * as auditLog from '../auditLogService.js';
import * as userEnforcement from '../userEnforcementService.js';
import * as service from '../adminService.js';
import { Role } from '../../constants/enums.js';

const mockUser = {
	id: 'user-1',
	email: 'buyer@krydix.dev',
	role: 'BUYER',
	isActive: true,
	isEmailVerified: true,
	deletedAt: null,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-05-26'),
	profile: { firstName: 'Anna', lastName: 'Bond', avatarUrl: null, country: 'Ukraine' },
};

beforeEach(() => {
	jest.clearAllMocks();
	(auditLog.log as jest.Mock).mockResolvedValue(undefined);
	(userEnforcement.enforceSoftBan as jest.Mock).mockResolvedValue({
		productsAffected: 0,
		ordersCancelled: 0,
		ordersRefunded: 0,
	});
	(userEnforcement.enforceSoftDelete as jest.Mock).mockResolvedValue({
		productsAffected: 0,
		ordersCancelled: 0,
		ordersRefunded: 0,
	});
});

describe('changeUserRole', () => {
	it('allows admin to promote buyer to moderator', async () => {
		(repo.findAdminUserById as jest.Mock).mockResolvedValue(mockUser);
		(repo.updateUserRole as jest.Mock).mockResolvedValue({ ...mockUser, role: 'MODERATOR' });

		const result = await service.changeUserRole('admin-1', Role.ADMIN, 'user-1', Role.MODERATOR);
		expect(result.role).toBe('MODERATOR');
		expect(auditLog.log).toHaveBeenCalled();
	});

	it('blocks moderator from changing roles', async () => {
		await expect(
			service.changeUserRole('mod-1', Role.MODERATOR, 'user-1', Role.MODERATOR)
		).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
	});

	it('blocks promoting to admin when actor is not admin', async () => {
		(repo.findAdminUserById as jest.Mock).mockResolvedValue(mockUser);

		await expect(
			service.changeUserRole('mod-1', Role.MODERATOR, 'user-1', Role.ADMIN)
		).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
	});
});

describe('softBanUser', () => {
	it('allows moderator to soft-ban buyer', async () => {
		(repo.findAdminUserById as jest.Mock).mockResolvedValue(mockUser);
		(repo.setUserActive as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

		const result = await service.softBanUser('mod-1', Role.MODERATOR, 'user-1', 'Spam');
		expect(result.isActive).toBe(false);
		expect(userEnforcement.enforceSoftBan).toHaveBeenCalledWith('user-1');
	});

	it('blocks moderator from banning admin', async () => {
		(repo.findAdminUserById as jest.Mock).mockResolvedValue({ ...mockUser, role: 'ADMIN' });

		await expect(service.softBanUser('mod-1', Role.MODERATOR, 'user-1')).rejects.toMatchObject({
			extensions: { code: 'FORBIDDEN' },
		});
	});
});

describe('softDeleteUser', () => {
	it('blocks moderator from soft deleting', async () => {
		await expect(service.softDeleteUser('mod-1', Role.MODERATOR, 'user-1')).rejects.toMatchObject({
			extensions: { code: 'FORBIDDEN' },
		});
	});

	it('allows admin to soft delete buyer', async () => {
		(repo.findAdminUserById as jest.Mock).mockResolvedValue(mockUser);
		(repo.softDeleteUserRecord as jest.Mock).mockResolvedValue(mockUser);

		const result = await service.softDeleteUser('admin-1', Role.ADMIN, 'user-1');
		expect(result).toBe(true);
		expect(userEnforcement.enforceSoftDelete).toHaveBeenCalledWith('user-1');
	});
});

describe('inviteUser', () => {
	it('blocks moderator from inviting', async () => {
		await expect(
			service.inviteUser('mod-1', Role.MODERATOR, {
				email: 'new@test.dev',
				firstName: 'New',
				lastName: 'User',
				role: Role.BUYER,
			})
		).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
	});
});
