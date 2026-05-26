export const profileTypeDefs = `#graphql
	input UpdateProfileInput {
		firstName: String!
		lastName: String!
		displayName: String
		bio: String
		phone: String
		country: String
		city: String
	}

	input UploadProfileAvatarInput {
		dataUrl: String!
	}

	extend type Mutation {
		updateProfile(input: UpdateProfileInput!): UserProfile!
		uploadProfileAvatar(input: UploadProfileAvatarInput!): UserProfile!
		removeProfileAvatar: UserProfile!
		closeAccount(password: String!): Boolean!
	}
`;
