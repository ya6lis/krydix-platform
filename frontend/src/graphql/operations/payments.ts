import { gql } from '@apollo/client';

export const SELLER_FINANCE_SUMMARY_QUERY = gql`
	query SellerFinanceSummary {
		sellerFinanceSummary {
			currency
			onHold
			eligibleForRelease
			released
			withdrawable
			withdrawnLifetime
			minimumWithdrawal
			blockedCount
		}
	}
`;

export const SELLER_PAYOUTS_QUERY = gql`
	query SellerPayouts($filter: SellerPayoutsFilter) {
		sellerPayouts(filter: $filter) {
			items {
				id
				orderId
				orderItemId
				productTitle
				amountGross
				platformFeeAmount
				amountNet
				currency
				status
				availableAt
				releasedAt
				withdrawnAt
				createdAt
			}
			total
			page
			pageSize
		}
	}
`;

export const WITHDRAW_SELLER_PAYOUTS_MUTATION = gql`
	mutation WithdrawSellerPayouts($payoutIds: [ID!]) {
		withdrawSellerPayouts(payoutIds: $payoutIds) {
			withdrawnCount
			totalNet
			withdrawalFee
			netReceived
			currency
		}
	}
`;

export type SellerFinanceSummary = {
	currency: string;
	onHold: number;
	eligibleForRelease: number;
	released: number;
	withdrawable: number;
	withdrawnLifetime: number;
	minimumWithdrawal: number;
	blockedCount: number;
};

export type SellerPayout = {
	id: string;
	orderId: string;
	orderItemId: string;
	productTitle: string;
	amountGross: number;
	platformFeeAmount: number;
	amountNet: number;
	currency: string;
	status: string;
	availableAt: string | null;
	releasedAt: string | null;
	withdrawnAt: string | null;
	createdAt: string;
};

export type PaginatedSellerPayouts = {
	items: SellerPayout[];
	total: number;
	page: number;
	pageSize: number;
};
