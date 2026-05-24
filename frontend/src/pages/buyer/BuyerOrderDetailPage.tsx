import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Grid, Typography, Divider, Link } from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppLoader,
	EmptyState,
	StatusBadge,
	AppButton,
	ConfirmDialog,
	AppCard,
} from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import {
	MY_ORDER_QUERY,
	CANCEL_ORDER_MUTATION,
	CONFIRM_DELIVERY_MUTATION,
	REQUEST_REFUND_MUTATION,
	MY_ORDERS_QUERY,
	MY_ORDER_STATS_QUERY,
} from '@/graphql/operations/orders';
import type { Order } from '@/types/orders';
import { useAppToast } from '@/components/ui';

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

function formatDateTime(iso: string) {
	const d = new Date(iso);
	return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatAmount(n: number) {
	return `$${n.toFixed(2)}`;
}

interface TimelineEvent {
	label: string;
	date: string;
	done: boolean;
}

function buildOrderTimeline(order: Order, t: (k: string) => string): TimelineEvent[] {
	const isDelivered =
		order.status === 'DELIVERED' || order.status === 'REFUNDED' || order.status === 'CANCELLED';
	return [
		{
			label: t('orderDetail.timeline.orderPlaced'),
			date: formatDateTime(order.createdAt),
			done: true,
		},
		{
			label: t('orderDetail.timeline.paymentTime'),
			date: order.payment?.createdAt ? formatDateTime(order.payment.createdAt) : '',
			done: !!order.payment,
		},
		{
			label: t('orderDetail.timeline.deliveryForCarrier'),
			date: order.delivery?.createdAt ? formatDateTime(order.delivery.createdAt) : '',
			done: ['SHIPPED', 'DELIVERED', 'REFUNDED'].includes(order.status),
		},
		{
			label: t('orderDetail.timeline.completionTime'),
			date: order.updatedAt ? formatDateTime(order.updatedAt) : '',
			done: isDelivered,
		},
	];
}

function buildDeliveryTimeline(order: Order, t: (k: string) => string): TimelineEvent[] {
	const deliveryStatus = order.delivery?.status ?? 'PENDING';
	const statuses = ['PENDING', 'PACKED', 'SENT', 'IN_TRANSIT', 'DELIVERED'];
	const currentIdx = statuses.indexOf(deliveryStatus);
	return [
		{
			label: t('orderDetail.timeline.deliverySuccessful'),
			date: deliveryStatus === 'DELIVERED' ? formatDateTime(order.updatedAt) : '',
			done: deliveryStatus === 'DELIVERED',
		},
		{
			label: t('orderDetail.timeline.pickedUpByCarrier'),
			date: currentIdx >= 2 ? formatDateTime(order.createdAt) : '',
			done: currentIdx >= 2,
		},
		{
			label: t('orderDetail.timeline.orderCreated'),
			date: formatDateTime(order.createdAt),
			done: true,
		},
	];
}

type DialogType = 'cancel' | 'confirmDelivery' | 'refund' | null;

export default function BuyerOrderDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [dialog, setDialog] = useState<DialogType>(null);

	const { data, loading } = useQuery<{ myOrder: Order }>(MY_ORDER_QUERY, {
		variables: { id },
		skip: !id,
	});

	const refetchQueries = [
		{ query: MY_ORDER_QUERY, variables: { id } },
		{ query: MY_ORDERS_QUERY },
		{ query: MY_ORDER_STATS_QUERY },
	];

	const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER_MUTATION, {
		refetchQueries,
		onCompleted: () => {
			showToast(t('common.success'), 'success');
			setDialog(null);
		},
		onError: (err) => showToast(err.message, 'error'),
	});

	const [confirmDelivery, { loading: confirming }] = useMutation(CONFIRM_DELIVERY_MUTATION, {
		refetchQueries,
		onCompleted: () => {
			showToast(t('common.success'), 'success');
			setDialog(null);
		},
		onError: (err) => showToast(err.message, 'error'),
	});

	const [requestRefund, { loading: refunding }] = useMutation(REQUEST_REFUND_MUTATION, {
		refetchQueries,
		onCompleted: () => {
			showToast(t('common.success'), 'success');
			setDialog(null);
		},
		onError: (err) => showToast(err.message, 'error'),
	});

	if (loading) return <AppLoader />;

	const order = data?.myOrder;

	if (!order) {
		return (
			<EmptyState
				icon={Icons.order}
				title={t('product.notFound.title')}
				description={t('product.notFound.description')}
			/>
		);
	}

	const subtotal = order.items.reduce((s, i) => s + i.totalPrice, 0);
	const discount = order.discount ?? 0;

	const orderTimeline = buildOrderTimeline(order, t);
	const deliveryTimeline = buildDeliveryTimeline(order, t);

	const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
	const canConfirmDelivery = order.status === 'SHIPPED';
	const canRefund = ['DELIVERED', 'CONFIRMED'].includes(order.status);

	return (
		<Box sx={{ maxWidth: 1300 }}>
			{/* ── page head ── */}
			<Box sx={{ mb: 3 }}>
				<Link
					component={RouterLink}
					to={ROUTES.ACCOUNT_ORDERS}
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 0.75,
						fontSize: 13,
						color: tokens.ink3,
						textDecoration: 'none',
						mb: 1,
						'&:hover': { color: tokens.ink1 },
					}}
				>
					<FontAwesomeIcon icon={Icons.chevronLeft} />
					{t('orderDetail.backToOrders')}
				</Link>

				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						flexWrap: 'wrap',
						gap: 2,
					}}
				>
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
							<Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
								Order #{order.id.slice(-6).toUpperCase()}
							</Typography>
							<StatusBadge status={order.status} label={t(`status.order.${order.status}`)} />
						</Box>
						<Typography
							sx={{
								fontFamily: 'JetBrains Mono, monospace',
								fontSize: 12.5,
								color: tokens.ink3,
								mt: 0.5,
							}}
						>
							{formatDate(order.createdAt)}
						</Typography>
					</Box>

					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
						{canCancel && (
							<AppButton variant="outlined" size="small" onClick={() => setDialog('cancel')}>
								{t('orderDetail.actions.cancel')}
							</AppButton>
						)}
						{canConfirmDelivery && (
							<AppButton
								variant="contained"
								size="small"
								onClick={() => setDialog('confirmDelivery')}
							>
								{t('orderDetail.actions.confirmDelivery')}
							</AppButton>
						)}
						{canRefund && (
							<AppButton variant="outlined" size="small" onClick={() => setDialog('refund')}>
								{t('orderDetail.actions.requestRefund')}
							</AppButton>
						)}
					</Box>
				</Box>
			</Box>

			{/* ── main grid ── */}
			<Grid container spacing={3} alignItems="flex-start">
				{/* ── LEFT ── */}
				<Grid item xs={12} md={8} lg={9}>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
						{/* items card */}
						<AppCard>
							<Box sx={{ p: 2.5, borderBottom: `1px solid ${tokens.line}` }}>
								<Typography sx={{ fontWeight: 700, fontSize: 16 }}>
									{t('orderDetail.details')}
								</Typography>
								<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.25 }}>
									{t('orderDetail.detailsSub', { count: order.items.length })}
								</Typography>
							</Box>
							<Box sx={{ p: 2.5 }}>
								{/* items list */}
								<Box sx={{ display: 'flex', flexDirection: 'column' }}>
									{order.items.map((item, idx) => (
										<Box
											key={item.id}
											sx={{
												display: 'grid',
												gridTemplateColumns: '56px 1fr auto auto',
												gap: 2,
												alignItems: 'center',
												py: 2,
												borderBottom:
													idx < order.items.length - 1 ? `1px solid ${tokens.line}` : 'none',
											}}
										>
											{/* thumb */}
											<Box
												sx={{
													width: 56,
													height: 56,
													borderRadius: 1.5,
													background: tokens.surface2,
													border: `1px solid ${tokens.line}`,
													flexShrink: 0,
												}}
											/>
											{/* info */}
											<Box>
												<Typography sx={{ fontWeight: 600, fontSize: 14 }}>
													{item.productTitle}
												</Typography>
												<Typography
													sx={{
														fontFamily: 'JetBrains Mono, monospace',
														fontSize: 11.5,
														color: tokens.ink3,
														mt: 0.375,
													}}
												>
													{t('orderDetail.sku')}: {item.productId.slice(0, 8).toUpperCase()}
												</Typography>
											</Box>
											{/* qty */}
											<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
												{t('orderDetail.qty', { count: item.quantity })}
											</Typography>
											{/* price */}
											<Typography sx={{ fontWeight: 700, fontSize: 14 }}>
												{formatAmount(item.totalPrice)}
											</Typography>
										</Box>
									))}
								</Box>

								{/* price summary */}
								<Box sx={{ pt: 2 }}>
									<Box
										sx={{ display: 'flex', justifyContent: 'space-between', py: 1, fontSize: 13.5 }}
									>
										<Typography sx={{ fontSize: 'inherit', color: tokens.ink3 }}>
											{t('orderDetail.summary.subtotal')}
										</Typography>
										<Typography sx={{ fontSize: 'inherit', fontWeight: 500 }}>
											{formatAmount(subtotal)}
										</Typography>
									</Box>
									{discount > 0 && (
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'space-between',
												py: 1,
												fontSize: 13.5,
											}}
										>
											<Typography sx={{ fontSize: 'inherit', color: tokens.ink3 }}>
												{t('orderDetail.summary.discount', {
													code: order.promoCode?.code ?? '',
												})}
											</Typography>
											<Typography
												sx={{ fontSize: 'inherit', fontWeight: 500, color: tokens.coral }}
											>
												−{formatAmount(discount)}
											</Typography>
										</Box>
									)}
									<Divider sx={{ my: 1.5 }} />
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											py: 0.5,
											fontSize: 16,
											fontWeight: 800,
										}}
									>
										<Typography sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>
											{t('orderDetail.summary.total')}
										</Typography>
										<Typography sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>
											{formatAmount(order.totalAmount)}
										</Typography>
									</Box>
								</Box>
							</Box>
						</AppCard>

						{/* history / timeline card */}
						<AppCard>
							<Box sx={{ p: 2.5, borderBottom: `1px solid ${tokens.line}` }}>
								<Typography sx={{ fontWeight: 700, fontSize: 16 }}>
									{t('orderDetail.history')}
								</Typography>
							</Box>
							<Box sx={{ p: 2.5 }}>
								<Grid container spacing={3}>
									{/* delivery timeline */}
									<Grid item xs={12} sm={6}>
										<TimelineColumn events={deliveryTimeline} />
									</Grid>
									{/* order timeline */}
									<Grid item xs={12} sm={6}>
										<TimelineColumn events={orderTimeline} />
									</Grid>
								</Grid>
							</Box>
						</AppCard>
					</Box>
				</Grid>

				{/* ── RIGHT sidebar ── */}
				<Grid item xs={12} md={4} lg={3}>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{/* delivery card */}
						{order.delivery && (
							<SideCard title={t('orderDetail.sidebar.delivery')}>
								<KVRow label={t('orderDetail.delivery.shipBy')} value={order.delivery.method} />
								<KVRow
									label={t('orderDetail.delivery.tracking')}
									value={
										order.delivery.trackingCode ? (
											<Typography
												sx={{
													fontFamily: 'JetBrains Mono, monospace',
													color: tokens.accentInk,
													fontSize: 12.5,
												}}
											>
												{order.delivery.trackingCode}
											</Typography>
										) : (
											'—'
										)
									}
								/>
							</SideCard>
						)}

						{/* shipping card */}
						{order.delivery?.address && (
							<SideCard title={t('orderDetail.sidebar.shipping')}>
								<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.6 }}>
									{order.delivery.address}
								</Typography>
							</SideCard>
						)}

						{/* payment card */}
						{order.payment && (
							<SideCard title={t('orderDetail.sidebar.payment')}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontSize: 13.5 }}>
									<Box
										sx={{
											width: 28,
											height: 18,
											borderRadius: 0.5,
											background: 'linear-gradient(90deg, #FFAB00 0 50%, #FF5630 50% 100%)',
										}}
									/>
									<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
										{order.payment.method}
									</Typography>
								</Box>
								<Box sx={{ mt: 1.5 }}>
									<StatusBadge
										status={order.payment.status}
										label={t(`status.payment.${order.payment.status}`)}
									/>
								</Box>
							</SideCard>
						)}
					</Box>
				</Grid>
			</Grid>

			{/* ── Dialogs ── */}
			<ConfirmDialog
				open={dialog === 'cancel'}
				title={t('orderDetail.cancelConfirm.title')}
				message={t('orderDetail.cancelConfirm.message')}
				onConfirm={() => cancelOrder({ variables: { orderId: order.id } })}
				onClose={() => setDialog(null)}
				loading={cancelling}
			/>
			<ConfirmDialog
				open={dialog === 'confirmDelivery'}
				title={t('orderDetail.confirmDeliveryConfirm.title')}
				message={t('orderDetail.confirmDeliveryConfirm.message')}
				onConfirm={() => confirmDelivery({ variables: { orderId: order.id } })}
				onClose={() => setDialog(null)}
				loading={confirming}
			/>
			<ConfirmDialog
				open={dialog === 'refund'}
				title={t('orderDetail.refundConfirm.title')}
				message={t('orderDetail.refundConfirm.message')}
				onConfirm={() => requestRefund({ variables: { orderId: order.id } })}
				onClose={() => setDialog(null)}
				loading={refunding}
			/>
		</Box>
	);
}

/* ── Timeline column ── */
function TimelineColumn({
	events,
}: {
	events: Array<{ label: string; date: string; done: boolean }>;
}) {
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: 2.25,
				position: 'relative',
				pl: '22px',
				'&::before': {
					content: '""',
					position: 'absolute',
					left: '5px',
					top: 8,
					bottom: 8,
					width: 1,
					bgcolor: tokens.line,
				},
			}}
		>
			{events.map((ev, i) => (
				<Box key={i} sx={{ position: 'relative' }}>
					<Box
						sx={{
							width: 11,
							height: 11,
							borderRadius: '50%',
							position: 'absolute',
							left: -22,
							top: 4,
							bgcolor: ev.done ? tokens.accent : tokens.surface,
							border: `2px solid ${ev.done ? tokens.accent : tokens.line}`,
						}}
					/>
					<Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{ev.label}</Typography>
					{ev.date && (
						<Typography sx={{ fontSize: 12, color: tokens.ink3, mt: 0.25 }}>{ev.date}</Typography>
					)}
				</Box>
			))}
		</Box>
	);
}

/* ── Side card wrapper ── */
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<AppCard>
			<Box sx={{ px: 2.75, pt: 2.5, pb: 2 }}>
				<Typography
					sx={{
						fontSize: 11.5,
						fontWeight: 700,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: tokens.ink3,
						mb: 1.75,
					}}
				>
					{title}
				</Typography>
				{children}
			</Box>
		</AppCard>
	);
}

/* ── KV row ── */
function KVRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'flex-start',
				py: 0.75,
				fontSize: 13,
				gap: 2,
			}}
		>
			<Typography sx={{ fontSize: 'inherit', color: tokens.ink3, flexShrink: 0 }}>
				{label}
			</Typography>
			{typeof value === 'string' ? (
				<Typography sx={{ fontSize: 'inherit', fontWeight: 500, textAlign: 'right' }}>
					{value}
				</Typography>
			) : (
				value
			)}
		</Box>
	);
}
