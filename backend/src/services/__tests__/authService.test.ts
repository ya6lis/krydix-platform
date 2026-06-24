import { GraphQLError } from 'graphql';

// Mock all external dependencies before importing authService
jest.mock('../../repositories/userRepository.js');
jest.mock('../../repositories/tokenRepository.js');
jest.mock('../../utils/hash.js', () => ({
	hashPassword: jest.fn(),
	comparePassword: jest.fn(),
}));
jest.mock('../../utils/jwt.js', () => ({
	signAccessToken: jest.fn(),
	decodeAccessToken: jest.fn(),
}));
jest.mock('../../utils/email.js', () => ({
	sendVerificationEmail: jest.fn(),
}));

import * as userRepo from '../../repositories/userRepository.js';
import * as tokenRepo from '../../repositories/tokenRepository.js';
import * as hash from '../../utils/hash.js';
import * as jwt from '../../utils/jwt.js';
import * as email from '../../utils/email.js';
import * as authService from '../authService.js';

const mockUserRepo = userRepo as jest.Mocked<typeof userRepo>;
const mockTokenRepo = tokenRepo as jest.Mocked<typeof tokenRepo>;
const mockHash = hash as jest.Mocked<typeof hash>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockEmail = email as jest.Mocked<typeof email>;

const fakeUser = {
	id: 'user-1',
	email: 'test@example.com',
	passwordHash: 'hashed',
	role: 'BUYER' as const,
	isEmailVerified: true,
	isActive: true,
	deletedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	profile: null,
};

beforeEach(() => {
	jest.clearAllMocks();
	mockUserRepo.updateUserLastSeenAt.mockResolvedValue(fakeUser);
});

describe('authService.register', () => {
	it('throws EMAIL_TAKEN if user exists', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue(fakeUser);
		await expect(
			authService.register('test@example.com', 'password123', 'John', 'Doe')
		).rejects.toThrow(GraphQLError);
	});

	it('creates user and sends verification email', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue(null);
		mockHash.hashPassword.mockResolvedValue('hashed');
		mockUserRepo.createUser.mockResolvedValue({ ...fakeUser, isEmailVerified: false });
		mockUserRepo.createUserProfile.mockResolvedValue({
			id: 'profile-1',
			userId: 'user-1',
			firstName: 'John',
			lastName: 'Doe',
			phone: null,
			avatarUrl: null,
			country: null,
			city: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		mockTokenRepo.createEmailVerification.mockResolvedValue({
			id: 'ev-1',
			userId: 'user-1',
			token: 'tok',
			expiresAt: new Date(),
			usedAt: null,
			createdAt: new Date(),
		});
		mockEmail.sendVerificationEmail.mockResolvedValue(undefined);

		const result = await authService.register('new@example.com', 'password123', 'John', 'Doe');
		expect(result).toBe(true);
		expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
	});
});

describe('authService.login', () => {
	it('throws INVALID_CREDENTIALS if user not found', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue(null);
		await expect(authService.login('x@x.com', 'pw')).rejects.toThrow(GraphQLError);
	});

	it('throws INVALID_CREDENTIALS if password wrong', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue(fakeUser);
		mockHash.comparePassword.mockResolvedValue(false);
		await expect(authService.login('test@example.com', 'wrongpw')).rejects.toThrow(GraphQLError);
	});

	it('throws EMAIL_NOT_VERIFIED if not verified', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue({ ...fakeUser, isEmailVerified: false });
		mockHash.comparePassword.mockResolvedValue(true);
		await expect(authService.login('test@example.com', 'pw')).rejects.toThrow(GraphQLError);
	});

	it('returns tokens on success', async () => {
		mockUserRepo.findUserByEmail.mockResolvedValue(fakeUser);
		mockHash.comparePassword.mockResolvedValue(true);
		mockJwt.signAccessToken.mockReturnValue('access-token');
		mockTokenRepo.createRefreshToken.mockResolvedValue({
			id: 'rt-1',
			userId: 'user-1',
			token: 'refresh-token',
			expiresAt: new Date(),
			createdAt: new Date(),
			revokedAt: null,
		});

		const result = await authService.login('test@example.com', 'correct-pw');
		expect(result.accessToken).toBe('access-token');
		expect(result.refreshToken).toBeDefined();
		expect(result.user).toEqual(fakeUser);
	});
});

describe('authService.verifyEmail', () => {
	const fakeVerification = {
		id: 'ev-1',
		userId: 'user-1',
		token: 'valid-token',
		expiresAt: new Date(Date.now() + 3600_000),
		usedAt: null,
		createdAt: new Date(),
	};

	it('throws on invalid token', async () => {
		mockTokenRepo.findEmailVerification.mockResolvedValue(null);
		await expect(authService.verifyEmail('bad-token')).rejects.toThrow(GraphQLError);
	});

	it('throws TOKEN_USED if already used', async () => {
		mockTokenRepo.findEmailVerification.mockResolvedValue({
			...fakeVerification,
			usedAt: new Date(),
		});
		await expect(authService.verifyEmail('used-token')).rejects.toThrow(GraphQLError);
	});

	it('throws TOKEN_EXPIRED if past expiry', async () => {
		mockTokenRepo.findEmailVerification.mockResolvedValue({
			...fakeVerification,
			expiresAt: new Date(Date.now() - 1000),
		});
		await expect(authService.verifyEmail('old-token')).rejects.toThrow(GraphQLError);
	});

	it('marks token used and verifies user', async () => {
		mockTokenRepo.findEmailVerification.mockResolvedValue(fakeVerification);
		mockTokenRepo.markEmailVerificationUsed.mockResolvedValue({
			...fakeVerification,
			usedAt: new Date(),
		});
		mockUserRepo.updateUserEmailVerified.mockResolvedValue(fakeUser);

		const result = await authService.verifyEmail('valid-token');
		expect(result).toBe(true);
		expect(mockUserRepo.updateUserEmailVerified).toHaveBeenCalledWith('user-1');
	});
});

describe('authService.refreshToken', () => {
	const fakeStoredToken = {
		id: 'rt-1',
		userId: 'user-1',
		token: 'refresh-token',
		expiresAt: new Date(Date.now() + 3600_000),
		createdAt: new Date(),
		revokedAt: null,
	};

	it('throws on missing token', async () => {
		mockTokenRepo.findRefreshToken.mockResolvedValue(null);
		await expect(authService.refreshToken('bad')).rejects.toThrow(GraphQLError);
	});

	it('throws on revoked token', async () => {
		mockTokenRepo.findRefreshToken.mockResolvedValue({ ...fakeStoredToken, revokedAt: new Date() });
		await expect(authService.refreshToken('revoked')).rejects.toThrow(GraphQLError);
	});

	it('rotates token and returns new pair', async () => {
		mockTokenRepo.findRefreshToken.mockResolvedValue(fakeStoredToken);
		mockTokenRepo.revokeRefreshToken.mockResolvedValue({
			...fakeStoredToken,
			revokedAt: new Date(),
		});
		mockUserRepo.findUserById.mockResolvedValue(fakeUser);
		mockJwt.signAccessToken.mockReturnValue('new-access-token');
		mockTokenRepo.createRefreshToken.mockResolvedValue({ ...fakeStoredToken, token: 'new-rt' });

		const result = await authService.refreshToken('refresh-token');
		expect(result.accessToken).toBe('new-access-token');
		expect(result.refreshToken).toBeDefined();
		expect(mockTokenRepo.revokeRefreshToken).toHaveBeenCalledWith('rt-1');
	});
});
