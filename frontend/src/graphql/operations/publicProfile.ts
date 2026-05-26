import { gql } from '@apollo/client';

export const PUBLIC_SELLER_PROFILE_QUERY = gql`
	query PublicSellerProfile($sellerId: ID!) {
		publicSellerProfile(sellerId: $sellerId) {
			id
			displayName
			firstName
			lastName
			avatarUrl
			bio
			companyName
			country
			city
			isVerifiedSeller
			memberSince
			productCount
			averageRating
			reviewCount
		}
	}
`;

export interface PublicSellerProfile {
	id: string;
	displayName: string;
	firstName: string;
	lastName: string;
	avatarUrl: string | null;
	bio: string | null;
	companyName: string | null;
	country: string | null;
	city: string | null;
	isVerifiedSeller: boolean;
	memberSince: string;
	productCount: number;
	averageRating: number;
	reviewCount: number;
}
