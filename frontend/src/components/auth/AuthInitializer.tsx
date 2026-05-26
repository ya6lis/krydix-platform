import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { useAuthStore } from '@/store/authStore';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import { refreshAuthSession } from '@/utils/authSession';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
	const client = useApolloClient();
	const { setAuth, clearAuth, setInitialized } = useAuthStore();

	useEffect(() => {
		const hadRefreshToken = Boolean(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY));

		refreshAuthSession(client)
			.then((result) => {
				if (result) {
					setAuth(result.user, result.accessToken, result.refreshToken);
					return;
				}
				if (hadRefreshToken) {
					clearAuth();
				}
			})
			.finally(() => {
				setInitialized();
			});
	}, [client, clearAuth, setAuth, setInitialized]);

	return <>{children}</>;
}
