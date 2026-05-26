import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ApolloProvider } from '@apollo/client';
import { theme } from '@/theme';
import { apolloClient } from '@/graphql/client';
import { router } from '@/router';
import { AppToastProvider, ImageLightboxProvider } from '@/components/ui';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { NotificationListener } from '@/components/notifications/NotificationListener';
import '@/i18n';

export default function App() {
	return (
		<ApolloProvider client={apolloClient}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<AppToastProvider>
					<ImageLightboxProvider>
						<AuthInitializer>
							<NotificationListener />
							<RouterProvider router={router} />
						</AuthInitializer>
					</ImageLightboxProvider>
				</AppToastProvider>
			</ThemeProvider>
		</ApolloProvider>
	);
}
