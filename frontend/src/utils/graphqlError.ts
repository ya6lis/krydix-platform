import { ApolloError } from '@apollo/client';
import type { TFunction } from 'i18next';

const AUTH_ERROR_KEYS: Record<string, string> = {
	INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
	EMAIL_NOT_VERIFIED: 'auth.errors.emailNotVerified',
	ACCOUNT_INACTIVE: 'auth.errors.accountInactive',
	ACCOUNT_CLOSED: 'auth.errors.accountClosed',
	EMAIL_TAKEN: 'auth.errors.emailTaken',
	INTERNAL_SERVER_ERROR: 'common.error',
};

const INTERNAL_MESSAGE_PATTERNS = [
	/prisma\./i,
	/Invalid `prisma/i,
	/does not exist in the current database/i,
];

function isInternalMessage(message: string): boolean {
	return INTERNAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

/** Maps GraphQL / network errors to a user-facing i18n message. */
export function getGraphQLErrorMessage(error: unknown, t: TFunction): string {
	if (error instanceof ApolloError) {
		const gqlError = error.graphQLErrors[0];
		const code = gqlError?.extensions?.code;
		if (typeof code === 'string' && AUTH_ERROR_KEYS[code]) {
			return t(AUTH_ERROR_KEYS[code]);
		}

		const message = gqlError?.message ?? error.message;
		if (message && !isInternalMessage(message)) {
			return message;
		}

		return t('common.error');
	}

	if (error instanceof Error && !isInternalMessage(error.message)) {
		return error.message;
	}

	return t('common.error');
}
