import { useMutation } from '@apollo/client';
import { useAuthStore } from '@/store/authStore';
import { LOGOUT_MUTATION } from '@/graphql/operations/auth';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import { Role } from '@/constants/enums';

export function useAuth() {
	const { user, accessToken, clearAuth } = useAuthStore();
	const [logoutMutation] = useMutation(LOGOUT_MUTATION);

	const isAuthenticated = !!user && !!accessToken;

	const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

	const logout = async () => {
		const rt = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
		if (rt) {
			try {
				await logoutMutation({ variables: { refreshToken: rt } });
			} catch {
				// ignore — clear locally regardless
			}
		}
		clearAuth();
	};

	return { user, isAuthenticated, hasRole, logout };
}
