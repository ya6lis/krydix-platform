import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { AUTH_ACCESS_TOKEN_KEY } from '@/constants/constants';

const httpLink = createHttpLink({
	uri: import.meta.env.VITE_GRAPHQL_URL ?? '/graphql',
});

const authLink = setContext((_, { headers }) => {
	const token = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
	return {
		headers: {
			...headers,
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
	};
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
	if (graphQLErrors) {
		graphQLErrors.forEach(({ message, locations, path }) => {
			console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
		});
	}
	if (networkError) {
		console.error(`[Network error]: ${networkError}`);
	}
});

export const apolloClient = new ApolloClient({
	link: from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: { fetchPolicy: 'cache-and-network' },
	},
});
