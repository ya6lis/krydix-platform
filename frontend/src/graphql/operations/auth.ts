import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
	mutation Register($input: RegisterInput!) {
		register(input: $input)
	}
`;

export const LOGIN_MUTATION = gql`
	mutation Login($input: LoginInput!) {
		login(input: $input) {
			accessToken
			refreshToken
			user {
				id
				email
				role
				isEmailVerified
				profile {
					firstName
					lastName
					avatarUrl
				}
			}
		}
	}
`;

export const REFRESH_TOKEN_MUTATION = gql`
	mutation RefreshToken($token: String!) {
		refreshToken(token: $token) {
			accessToken
			refreshToken
		}
	}
`;

export const VERIFY_EMAIL_MUTATION = gql`
	mutation VerifyEmail($token: String!) {
		verifyEmail(token: $token)
	}
`;

export const LOGOUT_MUTATION = gql`
	mutation Logout($refreshToken: String!) {
		logout(refreshToken: $refreshToken)
	}
`;

export const ME_QUERY = gql`
	query Me {
		me {
			id
			email
			role
			isEmailVerified
			profile {
				firstName
				lastName
				avatarUrl
			}
		}
	}
`;
