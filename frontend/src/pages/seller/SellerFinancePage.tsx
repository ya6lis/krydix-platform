import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import {
	AppButton,
	AppLoader,
	AppPagination,
	AppTable,
	ConfirmDialog,
	PageSectionWrapper,
	StatCard,
	StatusBadge,
	useAppToast,
} from '@/components/ui';
import type { AppTableColumn } from '@/components/ui';
import {
	SELLER_FINANCE_SUMMARY_QUERY,
	SELLER_PAYOUTS_QUERY,
	WITHDRAW_SELLER_PAYOUTS_MUTATION,
	type PaginatedSellerPayouts,
	type SellerFinanceSummary,
	type SellerPayout,
} from '@/graphql/operations/payments';

const PAGE_SIZE = 10;

function formatMoney(amount: number, currency: string) {
	return `${amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string | null) {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString('uk-UA', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export default function SellerFinancePage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(PAGE_SIZE);
	const [withdrawOpen, setWithdrawOpen] = useState(false);

	const {
		data: summaryData,
		loading: summaryLoading,
		refetch: refetchSummary,
	} = useQuery<{
		sellerFinanceSummary: SellerFinanceSummary;
	}>(SELLER_FINANCE_SUMMARY_QUERY);

	const {
		data: payoutsData,
		loading: payoutsLoading,
		refetch: refetchPayouts,
	} = useQuery<{
		sellerPayouts: PaginatedSellerPayouts;
	}>(SELLER_PAYOUTS_QUERY, {
		variables: { filter: { page, pageSize } },
	});

	const [withdraw, { loading: withdrawing }] = useMutation(WITHDRAW_SELLER_PAYOUTS_MUTATION, {
		onCompleted: (result) => {
			const payload = result.withdrawSellerPayouts;
			showToast(
				t('sellerFinance.withdraw.success', {
					amount: formatMoney(payload.netReceived, payload.currency),
				}),
				'success'
			);
			setWithdrawOpen(false);
			void refetchSummary();
			void refetchPayouts();
		},
		onError: (error) => {
			showToast(error.message, 'error');
		},
	});

	const summary = summaryData?.sellerFinanceSummary;
	const payouts = payoutsData?.sellerPayouts;
	const canWithdraw = (summary?.withdrawable ?? 0) >= (summary?.minimumWithdrawal ?? 0);

	const columns: AppTableColumn<SellerPayout>[] = [
		{
			key: 'product',
			label: t('sellerFinance.table.product'),
			render: (row) => (
				<Box>
					<Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{row.productTitle}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>{row.orderId.slice(-8)}</Typography>
				</Box>
			),
		},
		{
			key: 'gross',
			label: t('sellerFinance.table.gross'),
			align: 'right',
			render: (row) => formatMoney(row.amountGross, row.currency),
		},
		{
			key: 'fee',
			label: t('sellerFinance.table.fee'),
			align: 'right',
			render: (row) => formatMoney(row.platformFeeAmount, row.currency),
		},
		{
			key: 'net',
			label: t('sellerFinance.table.net'),
			align: 'right',
			render: (row) => (
				<Typography sx={{ fontWeight: 700 }}>{formatMoney(row.amountNet, row.currency)}</Typography>
			),
		},
		{
			key: 'status',
			label: t('sellerFinance.table.status'),
			render: (row) => (
				<StatusBadge status={row.status} label={t(`sellerFinance.payoutStatus.${row.status}`)} />
			),
		},
		{
			key: 'available',
			label: t('sellerFinance.table.available'),
			render: (row) => formatDate(row.availableAt),
		},
	];

	if (summaryLoading && !summary) {
		return <AppLoader fullPage />;
	}

	return (
		<Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
			<PageSectionWrapper
				title={t('sellerFinance.title')}
				subtitle={t('sellerFinance.subtitle')}
				actions={
					<AppButton
						variant="contained"
						startIcon={<FontAwesomeIcon icon={Icons.wallet} />}
						disabled={!canWithdraw}
						onClick={() => setWithdrawOpen(true)}
					>
						{t('sellerFinance.withdraw.action')}
					</AppButton>
				}
			>
				<Grid container spacing={2} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={6} lg={3}>
						<StatCard
							label={t('sellerFinance.stats.onHold')}
							value={formatMoney(summary?.onHold ?? 0, summary?.currency ?? 'UAH')}
							icon={Icons.clock}
							tone="amber"
						/>
					</Grid>
					<Grid item xs={12} sm={6} lg={3}>
						<StatCard
							label={t('sellerFinance.stats.withdrawable')}
							value={formatMoney(summary?.withdrawable ?? 0, summary?.currency ?? 'UAH')}
							icon={Icons.wallet}
							tone="cyan"
						/>
					</Grid>
					<Grid item xs={12} sm={6} lg={3}>
						<StatCard
							label={t('sellerFinance.stats.released')}
							value={formatMoney(summary?.released ?? 0, summary?.currency ?? 'UAH')}
							icon={Icons.checkCircle}
							tone="accent"
						/>
					</Grid>
					<Grid item xs={12} sm={6} lg={3}>
						<StatCard
							label={t('sellerFinance.stats.withdrawnLifetime')}
							value={formatMoney(summary?.withdrawnLifetime ?? 0, summary?.currency ?? 'UAH')}
							icon={Icons.arrowRight}
							tone="coral"
						/>
					</Grid>
				</Grid>

				<Stack spacing={1.5} sx={{ mb: 2 }}>
					<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
						{t('sellerFinance.minimumHint', {
							amount: formatMoney(summary?.minimumWithdrawal ?? 0, summary?.currency ?? 'UAH'),
						})}
					</Typography>
					{(summary?.blockedCount ?? 0) > 0 && (
						<Typography sx={{ fontSize: 13, color: tokens.coral }}>
							{t('sellerFinance.blockedHint', { count: summary?.blockedCount })}
						</Typography>
					)}
				</Stack>

				<Box
					sx={{
						border: `1px solid ${tokens.line}`,
						borderRadius: `${tokens.radius}px`,
						overflow: 'hidden',
						bgcolor: tokens.surface,
					}}
				>
					<AppTable
						columns={columns}
						rows={payouts?.items ?? []}
						loading={payoutsLoading}
						rowKey={(row) => row.id}
						emptyTitle={t('sellerFinance.empty.title')}
						emptyDescription={t('sellerFinance.empty.description')}
					/>

					{(payouts?.total ?? 0) > 0 && (
						<Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.line}` }}>
							<AppPagination
								page={page}
								pageSize={pageSize}
								total={payouts?.total ?? 0}
								pageSizeOptions={[10, 25, 50]}
								onChange={(p, ps) => {
									setPage(p);
									setPageSize(ps);
								}}
							/>
						</Box>
					)}
				</Box>
			</PageSectionWrapper>

			<ConfirmDialog
				open={withdrawOpen}
				onClose={() => setWithdrawOpen(false)}
				title={t('sellerFinance.withdraw.confirmTitle')}
				message={t('sellerFinance.withdraw.confirmMessage', {
					amount: formatMoney(summary?.withdrawable ?? 0, summary?.currency ?? 'UAH'),
				})}
				confirmLabel={t('sellerFinance.withdraw.action')}
				loading={withdrawing}
				onConfirm={() => withdraw()}
			/>
		</Box>
	);
}
