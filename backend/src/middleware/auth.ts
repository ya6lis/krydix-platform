import { decodeAccessToken } from '../utils/jwt.js';
import type { AuthUser } from '../types/context.js';

interface AuthRequest {
	headers: { authorization?: string };
}

export function extractAuthUser(req: AuthRequest): AuthUser | null {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith('Bearer ')) return null;

	const token = authHeader.slice(7);
	const payload = decodeAccessToken(token);
	if (!payload) return null;

	return { id: payload.userId, role: payload.role, email: payload.email };
}
