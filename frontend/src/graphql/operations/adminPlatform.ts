import { gql } from '@apollo/client';

export const PLATFORM_OVERVIEW_QUERY = gql`
	query PlatformOverview {
		platformOverview {
			grossMerchandiseValue30d
			gmvDeltaPercent
			platformRevenue30d
			averageTakeRate
			pendingPayouts
			nextPayoutDate
			activeSellers
			newSellersThisMonth
		}
	}
`;

export const COMMISSION_RULES_QUERY = gql`
	query CommissionRules {
		commissionRules {
			id
			categoryId
			categoryName
			categorySlug
			isDefault
			percent
			fixedFee
			currency
		}
	}
`;

export const PAYOUT_CONFIG_QUERY = gql`
	query PayoutConfig {
		payoutConfig {
			schedule
			holdPeriodDays
			autoConfirmDays
			minimumPayout
			currency
		}
	}
`;

export const ADMIN_PROMO_CODES_QUERY = gql`
	query AdminPromoCodes {
		adminPromoCodes {
			id
			code
			description
			discountPercent
			discountFixed
			minOrderAmount
			maxUses
			usedCount
			expiresAt
			isActive
			status
		}
	}
`;

export const SAVE_COMMISSION_RULES_MUTATION = gql`
	mutation SaveCommissionRules($rules: [CommissionRuleInput!]!) {
		saveCommissionRules(rules: $rules) {
			id
			isDefault
			percent
			fixedFee
			currency
		}
	}
`;

export const SAVE_PAYOUT_CONFIG_MUTATION = gql`
	mutation SavePayoutConfig($input: PayoutConfigInput!) {
		savePayoutConfig(input: $input) {
			schedule
			holdPeriodDays
			minimumPayout
			currency
		}
	}
`;

export const CREATE_ADMIN_PROMO_CODE_MUTATION = gql`
	mutation CreateAdminPromoCode($input: CreateAdminPromoCodeInput!) {
		createAdminPromoCode(input: $input) {
			id
			code
			status
		}
	}
`;

export const UPDATE_ADMIN_PROMO_CODE_MUTATION = gql`
	mutation UpdateAdminPromoCode($id: ID!, $input: UpdateAdminPromoCodeInput!) {
		updateAdminPromoCode(id: $id, input: $input) {
			id
			isActive
			status
		}
	}
`;

export interface PlatformOverview {
	grossMerchandiseValue30d: number;
	gmvDeltaPercent: number;
	platformRevenue30d: number;
	averageTakeRate: number;
	pendingPayouts: number;
	nextPayoutDate: string;
	activeSellers: number;
	newSellersThisMonth: number;
}

export interface CommissionRuleItem {
	id: string;
	categoryId: string | null;
	categoryName: string | null;
	categorySlug: string | null;
	isDefault: boolean;
	percent: number;
	fixedFee: number;
	currency: string;
}

export interface PayoutConfig {
	schedule: string;
	holdPeriodDays: number;
	autoConfirmDays: number;
	minimumPayout: number;
	currency: string;
}

export interface AdminPromoCodeItem {
	id: string;
	code: string;
	description: string | null;
	discountPercent: number | null;
	discountFixed: number | null;
	minOrderAmount: number | null;
	maxUses: number | null;
	usedCount: number;
	expiresAt: string | null;
	isActive: boolean;
	status: string;
}
