export const authTypeDefs = `#graphql
	enum Role {
		GUEST
		BUYER
		SELLER
		MODERATOR
		ADMIN
	}

	type UserProfile {
		id: ID!
		firstName: String!
		lastName: String!
		displayName: String
		bio: String
		phone: String
		avatarUrl: String
		country: String
		city: String
	}

	type User {
		id: ID!
		email: String!
		role: Role!
		isEmailVerified: Boolean!
		isActive: Boolean!
		profile: UserProfile
		createdAt: String!
		updatedAt: String!
	}

	type AuthPayload {
		accessToken: String!
		refreshToken: String!
		user: User!
	}

	type RefreshPayload {
		accessToken: String!
		refreshToken: String!
	}

	input RegisterInput {
		email: String!
		password: String!
		firstName: String!
		lastName: String!
	}

	input LoginInput {
		email: String!
		password: String!
	}

	extend type Query {
		me: User
	}

	extend type Mutation {
		register(input: RegisterInput!): Boolean!
		login(input: LoginInput!): AuthPayload!
		refreshToken(token: String!): RefreshPayload!
		verifyEmail(token: String!): Boolean!
		logout(refreshToken: String!): Boolean!
	}
`;
