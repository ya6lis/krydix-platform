import { gql } from '@apollo/client';

export const ADMIN_STATS_QUERY = gql`
	query AdminStats {
		adminStats {
			total
			buyers
			sellers
			moderators
			administrators
			blocked
			newThisMonth
		}
	}
`;

export const ALL_USERS_QUERY = gql`
	query AllUsers($input: AllUsersInput) {
		allUsers(input: $input) {
			total
			page
			pageSize
			tabCounts {
				all
				buyers
				sellers
				moderators
				administrators
				blocked
			}
			items {
				id
				email
				displayName
				initials
				avatarUrl
				role
				country
				joinedAt
				lastSeenAt
				isOnline
				status
				userRef
				isActive
				isEmailVerified
			}
		}
	}
`;

export const CHANGE_USER_ROLE_MUTATION = gql`
	mutation ChangeUserRole($id: ID!, $role: String!) {
		changeUserRole(id: $id, role: $role) {
			id
			role
		}
	}
`;

export const SOFT_DELETE_USER_MUTATION = gql`
	mutation SoftDeleteUser($id: ID!) {
		softDeleteUser(id: $id)
	}
`;

export const SOFT_BAN_USER_MUTATION = gql`
	mutation SoftBanUser($id: ID!, $reason: String) {
		softBanUser(id: $id, reason: $reason) {
			id
			isActive
			status
		}
	}
`;

export const SOFT_UNBAN_USER_MUTATION = gql`
	mutation SoftUnbanUser($id: ID!) {
		softUnbanUser(id: $id) {
			id
			isActive
			status
		}
	}
`;

export const INVITE_USER_MUTATION = gql`
	mutation InviteUser($input: InviteUserInput!) {
		inviteUser(input: $input) {
			id
			email
			role
		}
	}
`;

export type AdminUserRoleFilter = 'ALL' | 'BUYER' | 'SELLER' | 'MODERATOR' | 'ADMIN' | 'BLOCKED';
export type AdminUserStatusFilter = 'ALL' | 'ACTIVE' | 'PENDING_EMAIL' | 'BLOCKED';

export interface AdminUserItem {
	id: string;
	email: string;
	displayName: string;
	initials: string;
	avatarUrl: string | null;
	role: string;
	country: string | null;
	joinedAt: string;
	lastSeenAt: string;
	isOnline: boolean;
	status: string;
	userRef: string;
	isActive: boolean;
	isEmailVerified: boolean;
}

export interface AdminStatsData {
	adminStats: {
		total: number;
		buyers: number;
		sellers: number;
		moderators: number;
		administrators: number;
		blocked: number;
		newThisMonth: number;
	};
}

export interface AllUsersData {
	allUsers: {
		items: AdminUserItem[];
		total: number;
		page: number;
		pageSize: number;
		tabCounts: {
			all: number;
			buyers: number;
			sellers: number;
			moderators: number;
			administrators: number;
			blocked: number;
		};
	};
}

export interface AllUsersVars {
	input?: {
		roleFilter?: AdminUserRoleFilter;
		statusFilter?: AdminUserStatusFilter;
		search?: string;
		page?: number;
		pageSize?: number;
	};
}
