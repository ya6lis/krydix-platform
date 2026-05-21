import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../constants/enums.js';

export interface JwtAccessPayload {
	userId: string;
	role: Role;
	email: string;
}

export function signAccessToken(payload: JwtAccessPayload): string {
	return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
		expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
	});
}

export function signRefreshToken(userId: string): string {
	return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
		expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
	});
}

export function verifyAccessToken(token: string): JwtAccessPayload {
	return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

export function decodeAccessToken(token: string): JwtAccessPayload | null {
	try {
		return verifyAccessToken(token);
	} catch {
		return null;
	}
}
