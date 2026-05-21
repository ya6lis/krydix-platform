import { create } from 'zustand';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import type { Role } from '@/constants/enums';

export interface AuthUser {
	id: string;
	email: string;
	role: Role;
	isEmailVerified: boolean;
	profile: {
		firstName: string;
		lastName: string;
		avatarUrl: string | null;
	} | null;
}

interface AuthState {
	user: AuthUser | null;
	accessToken: string | null;
	isInitialized: boolean;
	setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
	setAccessToken: (accessToken: string) => void;
	clearAuth: () => void;
	setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	accessToken: null,
	isInitialized: false,

	setAuth: (user, accessToken, refreshToken) => {
		localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
		set({ user, accessToken });
	},

	setAccessToken: (accessToken) => set({ accessToken }),

	clearAuth: () => {
		localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
		set({ user: null, accessToken: null });
	},

	setInitialized: () => set({ isInitialized: true }),
}));
