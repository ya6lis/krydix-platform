import type { ApolloClient } from '@apollo/client';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import { REFRESH_TOKEN_MUTATION, ME_QUERY } from '@/graphql/operations/auth';
import type { AuthUser } from '@/store/authStore';

export type RefreshSessionResult = {
	user: AuthUser;
	accessToken: string;
	refreshToken: string;
};

let refreshSessionPromise: Promise<RefreshSessionResult | null> | null = null;

async function performRefresh(
	client: ApolloClient<unknown>,
	attemptedToken: string
): Promise<RefreshSessionResult | null> {
	const { data } = await client.mutate<{
		refreshToken: { accessToken: string; refreshToken: string };
	}>({
		mutation: REFRESH_TOKEN_MUTATION,
		variables: { token: attemptedToken },
	});

	const payload = data?.refreshToken;
	if (!payload) return null;

	const { accessToken, refreshToken: newRefreshToken } = payload;
	localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);

	const { data: meData } = await client.query<{ me: AuthUser }>({
		query: ME_QUERY,
		fetchPolicy: 'network-only',
		context: { headers: { authorization: `Bearer ${accessToken}` } },
	});

	if (!meData?.me) return null;

	return {
		user: meData.me,
		accessToken,
		refreshToken: newRefreshToken,
	};
}

export function refreshAuthSession(
	client: ApolloClient<unknown>
): Promise<RefreshSessionResult | null> {
	if (refreshSessionPromise) {
		return refreshSessionPromise;
	}

	refreshSessionPromise = (async () => {
		const attemptedToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
		if (!attemptedToken) return null;

		try {
			return await performRefresh(client, attemptedToken);
		} catch {
			const currentToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
			if (currentToken && currentToken !== attemptedToken) {
				return performRefresh(client, currentToken);
			}
			localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
			return null;
		}
	})().finally(() => {
		refreshSessionPromise = null;
	});

	return refreshSessionPromise;
}
