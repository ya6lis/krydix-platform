import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '@/store/authStore';

const httpLink = createHttpLink({
	uri: import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
	const token = useAuthStore.getState().accessToken;
	return {
		headers: {
			...headers,
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
	};
});

const errorLink = onError(({ graphQLErrors }) => {
	if (graphQLErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
		useAuthStore.getState().clearAuth();
	}
});

export const apolloClient = new ApolloClient({
	link: from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: { fetchPolicy: 'cache-and-network' },
	},
});
