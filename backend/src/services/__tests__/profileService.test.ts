import { jest } from '@jest/globals';

jest.mock('../../repositories/profileRepository.js');

import * as profileRepo from '../../repositories/profileRepository.js';
import * as service from '../profileService.js';

const baseProfile = {
	id: 'profile-1',
	userId: 'user-1',
	firstName: 'Deja',
	lastName: 'Brady',
	displayName: 'Northern Atelier',
	bio: 'Workshop bio',
	phone: null,
	avatarUrl: null,
	country: null,
	city: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('updateProfile', () => {
	it('updates profile fields', async () => {
		(profileRepo.findProfileByUserId as jest.Mock).mockResolvedValue(baseProfile);
		(profileRepo.updateProfileByUserId as jest.Mock).mockResolvedValue({
			...baseProfile,
			firstName: 'Jane',
		});

		const result = await service.updateProfile('user-1', {
			firstName: 'Jane',
			lastName: 'Brady',
			displayName: 'Northern Atelier',
			bio: 'Workshop bio',
		});

		expect(result.firstName).toBe('Jane');
		expect(profileRepo.updateProfileByUserId).toHaveBeenCalled();
	});

	it('throws when profile missing', async () => {
		(profileRepo.findProfileByUserId as jest.Mock).mockResolvedValue(null);
		await expect(
			service.updateProfile('user-1', { firstName: 'Jane', lastName: 'Brady' }),
		).rejects.toThrow('Profile not found');
	});
});

describe('removeProfileAvatar', () => {
	it('clears avatar url', async () => {
		(profileRepo.findProfileByUserId as jest.Mock).mockResolvedValue(baseProfile);
		(profileRepo.updateProfileByUserId as jest.Mock).mockResolvedValue({
			...baseProfile,
			avatarUrl: null,
		});

		const result = await service.removeProfileAvatar('user-1');
		expect(result.avatarUrl).toBeNull();
	});
});
