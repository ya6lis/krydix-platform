import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Link } from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppLoader,
	EmptyState,
	StatusBadge,
	AppButton,
	AppModal,
	AppTextarea,
	ConfirmDialog,
	AppCard,
	useAppToast,
	AppImage,
} from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import {
	MY_ORDER_QUERY,
	CANCEL_ORDER_MUTATION,
	CONFIRM_DELIVERY_MUTATION,
	REQUEST_REFUND_MUTATION,
	REQUEST_RETURN_MUTATION,
	MY_ORDERS_QUERY,
	MY_ORDER_STATS_QUERY,
} from '@/graphql/operations/orders';
import {
	MARK_ORDER_NOTIFICATIONS_READ_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
	UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import type { Order, DeliveryMethod, PaymentMethod } from '@/types/orders';

function formatDateTime(iso: string) {
	const d = new Date(iso);
	const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${date}, ${time}`;
}

function formatAmount(n: number) {
	return `$${n.toFixed(2)}`;
}

function formatOrderItemCode(item: Order['items'][number]) {
	return (item.variantId ?? item.productId).slice(0, 12).toUpperCase();
}

function formatDeliveryMethod(method: DeliveryMethod) {
	switch (method) {
		case 'COURIER':
			return 'orderDetail.delivery.methods.courier';
		case 'BRANCH_PICKUP':
			return 'orderDetail.delivery.methods.branchPickup';
		case 'SELF_PICKUP':
			return 'orderDetail.delivery.methods.selfPickup';
		default:
			return 'orderDetail.delivery.methods.courier';
	}
}

function formatPaymentMethod(method: PaymentMethod) {
	switch (method) {
		case 'CARD':
			return 'orderDetail.payment.methods.card';
		case 'CASH_ON_DELIVERY':
			return 'orderDetail.payment.methods.cashOnDelivery';
		case 'BANK_TRANSFER':
			return 'orderDetail.payment.methods.bankTransfer';
		default:
			return 'orderDetail.payment.methods.card';
	}
}

interface TimelineEvent {
	label: string;
	date: string;
	done: boolean;
}

function buildOrderTimeline(order: Order, t: (k: string) => string): TimelineEvent[] {
	const isDelivered = ['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.status);
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
	const currentIdx = ['PENDING', 'PACKED', 'SENT', 'IN_TRANSIT', 'DELIVERED'].indexOf(
		deliveryStatus
	);
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

type DialogType = 'cancel' | 'confirmDelivery' | 'refund' | 'return' | null;

export default function BuyerOrderDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [dialog, setDialog] = useState<DialogType>(null);
	const [returnReason, setReturnReason] = useState('');

	const { data, loading } = useQuery<{ myOrder: Order }>(MY_ORDER_QUERY, {
		variables: { id },
		skip: !id,
	});

	const [markOrderNotificationsRead] = useMutation(MARK_ORDER_NOTIFICATIONS_READ_MUTATION, {
		refetchQueries: [
			{ query: MY_NOTIFICATIONS_QUERY, variables: { limit: 30 } },
			{ query: UNREAD_NOTIFICATION_COUNT_QUERY },
			{ query: UNREAD_ORDER_NOTIFICATION_COUNT_QUERY },
		],
	});

	useEffect(() => {
		if (!id) return;
		void markOrderNotificationsRead({ variables: { orderId: id } });
	}, [id, markOrderNotificationsRead]);

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

	const [requestReturn, { loading: requestingReturn }] = useMutation(REQUEST_RETURN_MUTATION, {
		refetchQueries,
		onCompleted: () => {
			showToast(t('common.success'), 'success');
			setDialog(null);
			setReturnReason('');
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
	const shipping = Math.max(0, order.totalAmount - subtotal + discount);
	const taxes = 0;
	const orderIdShort = order.id.slice(-6).toUpperCase();
	const itemCount = order.items.length;

	const sellerName =
		// prefer top-level seller, then item-level name, then id, then fallback
		((order as any).seller && (order as any).seller.name) ||
		(order.items[0] as any)?.sellerName ||
		order.items[0]?.sellerId ||
		t('orderDetail.sidebar.seller');

	const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
	const canConfirmDelivery = order.status === 'SHIPPED';
	const canRefund = ['DELIVERED', 'CONFIRMED'].includes(order.status);
	const canRequestReturn = order.status === 'DELIVERED' && !order.returnRequest;

	const orderTimeline = buildOrderTimeline(order, t);
	const deliveryTimeline = buildDeliveryTimeline(order, t);

	return (
		<Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			{/* page head */}
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
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						flexWrap: 'wrap',
						gap: 2,
						mb: 2,
					}}
				>
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
							<Typography
								sx={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}
							>
								{t('orderDetail.orderNumberPrefix')}
								{orderIdShort}
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
							{formatDateTime(order.createdAt)}
						</Typography>
					</Box>

					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
						<AppButton
							variant="outlined"
							size="small"
							startIcon={<FontAwesomeIcon icon={Icons.print} />}
							onClick={() => window.print()}
						>
							{t('orderDetail.actions.print')}
						</AppButton>
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
						{canRequestReturn && (
							<AppButton variant="outlined" size="small" onClick={() => setDialog('return')}>
								{t('orderDetail.actions.requestReturn')}
							</AppButton>
						)}
					</Box>
				</Box>
			</Box>

			{/* 1fr 360px grid */}
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
					gap: 3,
					alignItems: 'start',
				}}
			>
				{/* LEFT — items + timeline */}
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
					{/* Details card */}
					<AppCard
						title={t('orderDetail.details')}
						subtitle={`${t('orderDetail.detailsSub', { count: itemCount })} · ${t(
							'orderDetail.shipsFromSeller',
							{
								seller: sellerName,
							}
						)}`}
					>
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
											idx < order.items.length - 1 ? `1px solid ${tokens.line2}` : 'none',
									}}
								>
									{/* thumb */}
									{(() => {
										const imageUrl =
											(item as any).imageUrl ||
											(item as any).mainImage ||
											(item as any).productImage ||
											(item as any).productMainImage ||
											undefined;
										if (imageUrl) {
											return (
												<AppImage
													src={imageUrl}
													alt={item.productTitle}
													sx={{
														width: 56,
														height: 56,
														borderRadius: 1.5,
														objectFit: 'cover',
														border: `1px solid ${tokens.line}`,
														flexShrink: 0,
													}}
												/>
											);
										}
										return (
											<Box
												sx={{
													width: 56,
													height: 56,
													borderRadius: 1.5,
													background: `repeating-linear-gradient(135deg, ${tokens.surface2} 0 6px, transparent 6px 12px), ${tokens.surface2}`,
													border: `1px solid ${tokens.line}`,
													flexShrink: 0,
												}}
											/>
										);
									})()}
									{/* info */}
									<Box>
										<Typography sx={{ fontWeight: 600, fontSize: 14 }}>
											{item.productTitle}
										</Typography>
										<Box
											sx={{
												display: 'flex',
												gap: 1,
												alignItems: 'baseline',
												mt: 0.4,
												flexWrap: 'wrap',
											}}
										>
											<Typography
												sx={{
													fontSize: 11.5,
													color: tokens.ink3,
													textTransform: 'uppercase',
													letterSpacing: '0.04em',
												}}
											>
												{t('orderDetail.sku')}
											</Typography>
											<Typography
												sx={{
													fontFamily: 'JetBrains Mono, monospace',
													fontSize: 11.5,
													color: tokens.ink3,
												}}
											>
												{formatOrderItemCode(item)}
											</Typography>
										</Box>
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
						<Box sx={{ pt: 1.75 }}>
							<SumRow label={t('orderDetail.summary.subtotal')} value={formatAmount(subtotal)} />
							{shipping > 0 && (
								<SumRow
									label={t('orderDetail.summary.shipping')}
									value={`−${formatAmount(shipping)}`}
									neg
								/>
							)}
							{discount > 0 && (
								<SumRow
									label={t('orderDetail.summary.discount', { code: order.promoCode?.code ?? '' })}
									value={`−${formatAmount(discount)}`}
									neg
								/>
							)}
							<SumRow label={t('orderDetail.summary.tax')} value={formatAmount(taxes)} />
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'space-between',
									pt: 1.75,
									mt: 0.75,
									borderTop: `1px solid ${tokens.line}`,
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
					</AppCard>

					{/* History card */}
					<AppCard title={t('orderDetail.history')}>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: 3,
								pt: 0.5,
							}}
						>
							<TimelineColumn events={deliveryTimeline} />
							<TimelineColumn events={orderTimeline} />
						</Box>
					</AppCard>
				</Box>

				{/* RIGHT — sidebar */}
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
					{/* Seller card */}
					<SideCard title={t('orderDetail.sidebar.seller')} onEdit={() => {}}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
							<Box
								sx={{
									width: 40,
									height: 40,
									borderRadius: '50%',
									background: tokens.accentSoft,
									color: tokens.accentInk,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontFamily: 'JetBrains Mono, monospace',
									fontSize: 13,
									fontWeight: 700,
									flexShrink: 0,
								}}
							>
								<FontAwesomeIcon icon={Icons.store} />
							</Box>
							<Box>
								<Typography sx={{ fontWeight: 700, fontSize: 14 }}>
									{t('orderDetail.sidebar.seller')}
								</Typography>
								<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
									{t('orderDetail.sidebar.itemCount', { count: itemCount })}
								</Typography>
							</Box>
						</Box>
					</SideCard>

					{/* Delivery card */}
					{order.delivery && (
						<SideCard title={t('orderDetail.sidebar.delivery')} onEdit={() => {}}>
							<KVRow
								label={t('orderDetail.delivery.shipBy')}
								value={t(formatDeliveryMethod(order.delivery.method))}
							/>
							<KVRow
								label={t('orderDetail.delivery.speed')}
								value={t('orderDetail.delivery.standard')}
							/>
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

					{/* Shipping card */}
					{order.delivery?.address && (
						<SideCard title={t('orderDetail.sidebar.shipping')} onEdit={() => {}}>
							<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.6 }}>
								{order.delivery.address}
							</Typography>
						</SideCard>
					)}

					{/* Payment card */}
					{order.payment && (
						<SideCard title={t('orderDetail.sidebar.payment')} onEdit={() => {}}>
							{(() => {
								const brand = (order.payment as any).cardBrand;
								const last4 = (order.payment as any).cardLast4;
								return (
									<>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
											{/* card brand + masked number when available */}
											{brand || last4 ? (
												<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
													{brand ? brand : t(formatPaymentMethod(order.payment.method))}
													{last4 ? ` • •••• ${last4}` : ''}
												</Typography>
											) : (
												<>
													<Box
														sx={{
															width: 28,
															height: 18,
															borderRadius: 0.5,
															background: 'linear-gradient(90deg, #FFAB00 0 50%, #FF5630 50% 100%)',
															flexShrink: 0,
														}}
													/>
													<Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
														{t(formatPaymentMethod(order.payment.method))}
													</Typography>
												</>
											)}
										</Box>
										<Box sx={{ mt: 1.25 }}>
											{/* If card is paid, show friendly text, otherwise show status badge */}
											{order.payment.method === 'CARD' && order.payment.status === 'PAID' ? (
												<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>
													{t(`status.payment.PAID`)}
												</Typography>
											) : (
												<StatusBadge
													status={order.payment.status}
													label={t(`status.payment.${order.payment.status}`)}
												/>
											)}
											{order.returnRequest && (
												<Box sx={{ mt: 1 }}>
													<StatusBadge
														status={order.returnRequest.status}
														label={t(`status.returnRequest.${order.returnRequest.status}`)}
													/>
													<Typography
														sx={{ mt: 0.75, fontSize: 12.5, color: tokens.ink3, lineHeight: 1.5 }}
													>
														{order.returnRequest.reason}
													</Typography>
												</Box>
											)}
										</Box>
									</>
								);
							})()}
						</SideCard>
					)}
				</Box>
			</Box>

			{/* Dialogs */}
			<ConfirmDialog
				open={dialog === 'cancel'}
				title={t('orderDetail.cancelConfirm.title')}
				message={t('orderDetail.cancelConfirm.message')}
				onConfirm={() => cancelOrder({ variables: { orderId: order.id } })}
				onClose={() => setDialog(null)}
				loading={cancelling}
				confirmColor="error"
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
			<AppModal
				open={dialog === 'return'}
				onClose={() => setDialog(null)}
				title={t('orderDetail.returnConfirm.title')}
				footer={
					<>
						<AppButton variant="outlined" onClick={() => setDialog(null)}>
							{t('common.cancel')}
						</AppButton>
						<AppButton
							variant="contained"
							disabled={!returnReason.trim()}
							loading={requestingReturn}
							onClick={() =>
								requestReturn({
									variables: {
										orderId: order.id,
										reason: returnReason.trim(),
										details: returnReason.trim(),
									},
								})
							}
						>
							{t('orderDetail.returnConfirm.submit')}
						</AppButton>
					</>
				}
			>
				<AppTextarea
					label={t('orderDetail.returnConfirm.reasonLabel')}
					placeholder={t('orderDetail.returnConfirm.reasonPlaceholder')}
					value={returnReason}
					onChange={(event) => setReturnReason(event.target.value)}
					rows={5}
					maxLength={500}
				/>
			</AppModal>
		</Box>
	);
}

/* ── Timeline column ── */
function TimelineColumn({ events }: { events: TimelineEvent[] }) {
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
					width: '1px',
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

/* ── Sidebar card ── */
function SideCard({
	title,
	children,
	onEdit,
}: {
	title: string;
	children: React.ReactNode;
	onEdit?: () => void;
}) {
	return (
		<Box
			sx={{
				background: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: 2,
				px: '22px',
				pt: '20px',
				pb: '18px',
				boxShadow: tokens.shadowSm,
			}}
		>
			<Box
				sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}
			>
				<Typography
					sx={{
						fontSize: 11.5,
						fontWeight: 700,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: tokens.ink3,
					}}
				>
					{title}
				</Typography>
				{onEdit && (
					<Box
						component="button"
						onClick={onEdit}
						sx={{
							background: 'transparent',
							border: 0,
							p: 0,
							color: tokens.ink3,
							cursor: 'pointer',
						}}
					>
						<FontAwesomeIcon icon={Icons.edit} />
					</Box>
				)}
			</Box>
			{children}
		</Box>
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

/* ── Summary row ── */
function SumRow({ label, value, neg }: { label: string; value: string; neg?: boolean }) {
	return (
		<Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, fontSize: 13.5 }}>
			<Typography sx={{ fontSize: 'inherit', color: tokens.ink3 }}>{label}</Typography>
			<Typography
				sx={{ fontSize: 'inherit', fontWeight: 500, color: neg ? tokens.coral : 'inherit' }}
			>
				{value}
			</Typography>
		</Box>
	);
}
