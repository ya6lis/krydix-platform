import { useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { useAuthStore } from '@/store/authStore';
import { REFRESH_TOKEN_MUTATION, ME_QUERY } from '@/graphql/operations/auth';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import type { AuthUser } from '@/store/authStore';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
	const { setAuth, clearAuth, setAccessToken, setInitialized } = useAuthStore();
	const [refreshToken] = useMutation(REFRESH_TOKEN_MUTATION);
	const [getMe] = useLazyQuery(ME_QUERY);

	useEffect(() => {
		const rt = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);

		if (!rt) {
			setInitialized();
			return;
		}

		refreshToken({ variables: { token: rt } })
			.then(async ({ data }) => {
				if (!data?.refreshToken) return;

				const { accessToken, refreshToken: newRt } = data.refreshToken as {
					accessToken: string;
					refreshToken: string;
				};

				setAccessToken(accessToken);

				const { data: meData } = await getMe({
					context: { headers: { authorization: `Bearer ${accessToken}` } },
				});

				if (meData?.me) {
					setAuth(meData.me as AuthUser, accessToken, newRt);
				}
			})
			.catch(() => {
				clearAuth();
			})
			.finally(() => {
				setInitialized();
			});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return <>{children}</>;
}
