import { GraphQLError } from 'graphql';
import type { GraphQLFormattedError } from 'graphql';
import { logger } from './logger.js';

/** GraphQL extension codes that are safe to expose to clients as-is. */
const CLIENT_SAFE_CODES = new Set([
	'INVALID_CREDENTIALS',
	'EMAIL_NOT_VERIFIED',
	'ACCOUNT_INACTIVE',
	'ACCOUNT_CLOSED',
	'EMAIL_TAKEN',
	'INVALID_TOKEN',
	'TOKEN_USED',
	'TOKEN_EXPIRED',
	'USER_NOT_FOUND',
	'BAD_USER_INPUT',
	'NOT_FOUND',
	'FORBIDDEN',
	'UNAUTHENTICATED',
	'PAYLOAD_TOO_LARGE',
]);

const INTERNAL_MESSAGE_PATTERNS = [
	/prisma\./i,
	/Invalid `prisma/i,
	/does not exist in the current database/i,
	/ECONNREFUSED/i,
	/Unique constraint failed/i,
];

function isInternalMessage(message: string): boolean {
	return INTERNAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

export function formatGraphQLError(
	formattedError: GraphQLFormattedError,
	error: unknown
): GraphQLFormattedError {
	const code = formattedError.extensions?.code;
	if (typeof code === 'string' && CLIENT_SAFE_CODES.has(code)) {
		return formattedError;
	}

	const message = formattedError.message ?? '';
	if (!isInternalMessage(message)) {
		return formattedError;
	}

	logger.error(
		{ err: error instanceof GraphQLError ? error.originalError ?? error : error, message },
		'Sanitized internal error for client'
	);

	return {
		...formattedError,
		message: 'Something went wrong. Please try again later.',
		extensions: {
			...formattedError.extensions,
			code: 'INTERNAL_SERVER_ERROR',
		},
	};
}
