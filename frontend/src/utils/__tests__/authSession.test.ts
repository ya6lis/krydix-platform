import type { ApolloClient } from '@apollo/client';
import { AUTH_REFRESH_TOKEN_KEY } from '@/constants/constants';
import { REFRESH_TOKEN_MUTATION, ME_QUERY } from '@/graphql/operations/auth';
import { refreshAuthSession } from '../authSession';

const user = {
	id: 'user-1',
	email: 'user@test.com',
	role: 'BUYER',
	isEmailVerified: true,
	profile: { firstName: 'Anna', lastName: 'Buyer', avatarUrl: null },
};

function createClient(handlers: {
	refresh?: (token: string) => Promise<{ accessToken: string; refreshToken: string } | null>;
	me?: () => Promise<typeof user | null>;
}): ApolloClient<unknown> {
	return {
		mutate: jest.fn(async ({ variables }) => {
			const token = variables?.token as string;
			const payload = handlers.refresh ? await handlers.refresh(token) : null;
			return { data: payload ? { refreshToken: payload } : null };
		}),
		query: jest.fn(async () => ({
			data: handlers.me ? { me: await handlers.me() } : null,
		})),
	} as unknown as ApolloClient<unknown>;
}

describe('refreshAuthSession', () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
	});

	it('returns null when no refresh token is stored', async () => {
		const client = createClient({});
		await expect(refreshAuthSession(client)).resolves.toBeNull();
	});

	it('stores the rotated refresh token before loading the user', async () => {
		const order: string[] = [];
		const client = createClient({
			refresh: async () => {
				order.push('refresh');
				return { accessToken: 'access-1', refreshToken: 'refresh-2' };
			},
			me: async () => {
				order.push('me');
				expect(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)).toBe('refresh-2');
				return user;
			},
		});

		localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, 'refresh-1');
		const result = await refreshAuthSession(client);

		expect(result).toEqual({
			user,
			accessToken: 'access-1',
			refreshToken: 'refresh-2',
		});
		expect(order).toEqual(['refresh', 'me']);
	});

	it('deduplicates concurrent refresh calls', async () => {
		let refreshCalls = 0;
		const client = createClient({
			refresh: async () => {
				refreshCalls += 1;
				await new Promise((resolve) => setTimeout(resolve, 20));
				return { accessToken: 'access-1', refreshToken: 'refresh-2' };
			},
			me: async () => user,
		});

		localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, 'refresh-1');
		const [first, second] = await Promise.all([
			refreshAuthSession(client),
			refreshAuthSession(client),
		]);

		expect(refreshCalls).toBe(1);
		expect(first).toEqual(second);
	});

	it('retries with the updated token when the first attempt raced a rotation', async () => {
		const client = createClient({
			refresh: async (token) => {
				if (token === 'refresh-stale') {
					localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, 'refresh-new');
					throw new Error('INVALID_TOKEN');
				}
				return { accessToken: 'access-1', refreshToken: 'refresh-new' };
			},
			me: async () => user,
		});

		localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, 'refresh-stale');
		const result = await refreshAuthSession(client);

		expect(result?.refreshToken).toBe('refresh-new');
		expect(client.mutate).toHaveBeenCalledTimes(2);
		expect(client.mutate).toHaveBeenNthCalledWith(1, {
			mutation: REFRESH_TOKEN_MUTATION,
			variables: { token: 'refresh-stale' },
		});
		expect(client.mutate).toHaveBeenNthCalledWith(2, {
			mutation: REFRESH_TOKEN_MUTATION,
			variables: { token: 'refresh-new' },
		});
	});

	it('clears the refresh token after a genuine refresh failure', async () => {
		const client = createClient({
			refresh: async () => {
				throw new Error('INVALID_TOKEN');
			},
		});

		localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, 'refresh-1');
		await expect(refreshAuthSession(client)).resolves.toBeNull();
		expect(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)).toBeNull();
		expect(client.query).not.toHaveBeenCalled();
	});
});
