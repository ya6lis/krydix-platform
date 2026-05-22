import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ApolloProvider } from '@apollo/client';
import { theme } from '@/theme';
import { apolloClient } from '@/graphql/client';
import { router } from '@/router';
import { AppToastProvider } from '@/components/ui';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import '@/i18n';

export default function App() {
	return (
		<ApolloProvider client={apolloClient}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<AppToastProvider>
					<AuthInitializer>
						<RouterProvider router={router} />
					</AuthInitializer>
				</AppToastProvider>
			</ThemeProvider>
		</ApolloProvider>
	);
}
