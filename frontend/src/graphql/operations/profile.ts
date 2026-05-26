import { gql } from '@apollo/client';

export const UPDATE_PROFILE_MUTATION = gql`
	mutation UpdateProfile($input: UpdateProfileInput!) {
		updateProfile(input: $input) {
			id
			firstName
			lastName
			displayName
			bio
			phone
			avatarUrl
			country
			city
		}
	}
`;

export const UPLOAD_PROFILE_AVATAR_MUTATION = gql`
	mutation UploadProfileAvatar($input: UploadProfileAvatarInput!) {
		uploadProfileAvatar(input: $input) {
			id
			avatarUrl
		}
	}
`;

export const REMOVE_PROFILE_AVATAR_MUTATION = gql`
	mutation RemoveProfileAvatar {
		removeProfileAvatar {
			id
			avatarUrl
		}
	}
`;

export interface UpdateProfileInput {
	firstName: string;
	lastName: string;
	displayName?: string | null;
	bio?: string | null;
	phone?: string | null;
	country?: string | null;
	city?: string | null;
}

export interface UserProfileData {
	id: string;
	firstName: string;
	lastName: string;
	displayName: string | null;
	bio: string | null;
	phone: string | null;
	avatarUrl: string | null;
	country: string | null;
	city: string | null;
}
