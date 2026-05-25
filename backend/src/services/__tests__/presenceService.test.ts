import { jest } from '@jest/globals';

jest.mock('../../repositories/userRepository.js');

import * as userRepo from '../../repositories/userRepository.js';
import {
	isUserOnline,
	touchLastSeen,
	resetLastSeenThrottleForTests,
} from '../presenceService.js';
import { USER_ONLINE_THRESHOLD_MS } from '../../constants/constants.js';

beforeEach(() => {
	jest.clearAllMocks();
	resetLastSeenThrottleForTests();
	(userRepo.updateUserLastSeenAt as jest.Mock).mockResolvedValue({});
});

describe('isUserOnline', () => {
	it('returns true when last seen within threshold', () => {
		const recent = new Date(Date.now() - 2 * 60 * 1000);
		expect(isUserOnline(recent, new Date(0))).toBe(true);
	});

	it('returns false when last seen beyond threshold', () => {
		const old = new Date(Date.now() - USER_ONLINE_THRESHOLD_MS - 1000);
		expect(isUserOnline(old, new Date(0))).toBe(false);
	});
});

describe('touchLastSeen', () => {
	it('updates last seen immediately when forced', () => {
		touchLastSeen('user-1', true);
		expect(userRepo.updateUserLastSeenAt).toHaveBeenCalledWith('user-1');
	});

	it('throttles repeated touches within interval', () => {
		touchLastSeen('user-1');
		touchLastSeen('user-1');
		expect(userRepo.updateUserLastSeenAt).toHaveBeenCalledTimes(1);
	});
});
