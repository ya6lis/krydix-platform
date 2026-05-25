import { randomBytes } from 'crypto';
import { GraphQLError } from 'graphql';
import * as userRepo from '../repositories/userRepository.js';
import * as tokenRepo from '../repositories/tokenRepository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccessToken } from '../utils/jwt.js';
import { sendVerificationEmail } from '../utils/email.js';
import { env } from '../config/env.js';
import { Role } from '../constants/enums.js';
import { touchLastSeen } from './presenceService.js';

function generateToken(): string {
	return randomBytes(32).toString('hex');
}

export async function register(
	email: string,
	password: string,
	firstName: string,
	lastName: string
) {
	const existing = await userRepo.findUserByEmail(email);
	if (existing) {
		throw new GraphQLError('Email already registered', {
			extensions: { code: 'EMAIL_TAKEN' },
		});
	}

	const passwordHash = await hashPassword(password);
	const user = await userRepo.createUser({ email, passwordHash, role: Role.BUYER });
	await userRepo.createUserProfile(user.id, { firstName, lastName });

	if (env.DISABLE_EMAIL) {
		await userRepo.updateUserEmailVerified(user.id);
		return true;
	}

	const verifyToken = generateToken();
	await tokenRepo.createEmailVerification(user.id, verifyToken);
	await sendVerificationEmail(email, verifyToken);

	return true;
}

export async function login(email: string, password: string) {
	const user = await userRepo.findUserByEmail(email);
	const invalid = () =>
		new GraphQLError('Invalid credentials', { extensions: { code: 'INVALID_CREDENTIALS' } });

	if (!user) throw invalid();

	const valid = await comparePassword(password, user.passwordHash);
	if (!valid) throw invalid();

	if (!user.isEmailVerified) {
		throw new GraphQLError('Email not verified', {
			extensions: { code: 'EMAIL_NOT_VERIFIED' },
		});
	}

	if (!user.isActive) {
		throw new GraphQLError('Account is inactive', {
			extensions: { code: 'ACCOUNT_INACTIVE' },
		});
	}

	const accessToken = signAccessToken({
		userId: user.id,
		role: user.role as unknown as Role,
		email: user.email,
	});
	const refreshToken = generateToken();
	await tokenRepo.createRefreshToken(user.id, refreshToken);
	touchLastSeen(user.id, true);

	return { accessToken, refreshToken, user };
}

export async function refreshToken(token: string) {
	const stored = await tokenRepo.findRefreshToken(token);

	if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
		throw new GraphQLError('Invalid refresh token', { extensions: { code: 'INVALID_TOKEN' } });
	}

	await tokenRepo.revokeRefreshToken(stored.id);

	const user = await userRepo.findUserById(stored.userId);
	if (!user || !user.isActive) {
		throw new GraphQLError('User not found', { extensions: { code: 'USER_NOT_FOUND' } });
	}

	const accessToken = signAccessToken({
		userId: user.id,
		role: user.role as unknown as Role,
		email: user.email,
	});
	const newRefreshToken = generateToken();
	await tokenRepo.createRefreshToken(user.id, newRefreshToken);
	touchLastSeen(user.id, true);

	return { accessToken, refreshToken: newRefreshToken };
}

export async function verifyEmail(token: string) {
	const verification = await tokenRepo.findEmailVerification(token);

	if (!verification) {
		throw new GraphQLError('Invalid verification token', {
			extensions: { code: 'INVALID_TOKEN' },
		});
	}

	if (verification.usedAt) {
		throw new GraphQLError('Token already used', { extensions: { code: 'TOKEN_USED' } });
	}

	if (verification.expiresAt < new Date()) {
		throw new GraphQLError('Token expired', { extensions: { code: 'TOKEN_EXPIRED' } });
	}

	await tokenRepo.markEmailVerificationUsed(verification.id);
	await userRepo.updateUserEmailVerified(verification.userId);

	return true;
}

export async function logout(refreshToken: string) {
	const stored = await tokenRepo.findRefreshToken(refreshToken);
	if (stored && !stored.revokedAt) {
		await tokenRepo.revokeRefreshToken(stored.id);
	}
	return true;
}

export async function getMe(userId: string) {
	return userRepo.findUserById(userId);
}
