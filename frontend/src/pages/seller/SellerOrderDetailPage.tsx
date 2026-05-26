import { useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Typography, Link, Menu, MenuItem } from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	AppLoader,
	EmptyState,
	StatusBadge,
	AppButton,
	AppCard,
	AppInput,
	AppTextarea,
	useAppToast,
	AppImage,
	ConfirmDialog,
	AppModal,
} from '@/components/ui';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import {
	MY_SELLER_ORDER_QUERY,
	MY_SELLER_ORDERS_QUERY,
	MY_SELLER_ORDER_STATS_QUERY,
	CONFIRM_SELLER_ORDER_MUTATION,
	MARK_SELLER_ORDER_PACKED_MUTATION,
	SHIP_SELLER_ORDER_MUTATION,
	MARK_SELLER_ORDER_IN_TRANSIT_MUTATION,
	MARK_SELLER_ORDER_DELIVERED_MUTATION,
	CANCEL_SELLER_ORDER_MUTATION,
	UPDATE_SELLER_ORDER_TRACKING_MUTATION,
	REVIEW_SELLER_RETURN_MUTATION,
	MARK_SELLER_RETURN_RECEIVED_MUTATION,
	PROCESS_SELLER_RETURN_REFUND_MUTATION,
} from '@/graphql/operations/sellerOrders';
import type { SellerOrder, DeliveryMethod, PaymentMethod } from '@/types/orders';

type DialogType =
	| 'cancel'
	| 'deliver'
	| 'ship'
	| 'tracking'
	| 'rejectReturn'
	| 'refund'
	| null;

const AVATAR_TONES = [
	{ bg: tokens.accentSoft, fg: tokens.accentInk },
	{ bg: tokens.cyanSoft, fg: tokens.cyanInk },
	{ bg: tokens.amberSoft, fg: tokens.amberInk },
	{ bg: tokens.coralSoft, fg: tokens.coralInk },
];

function formatOrderId(id: string) {
	return `KX-${id.slice(-4).toUpperCase()}`;
}

function formatDateTime(iso: string) {
	const d = new Date(iso);
	const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${date}, ${time}`;
}

function formatAmount(n: number) {
	return `$${n.toFixed(2)}`;
}

function formatOrderItemCode(item: SellerOrder['items'][number]) {
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

function getInitials(name: string) {
	return name
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0] ?? '')
		.join('')
		.toUpperCase();
}

function getAvatarTone(id: string) {
	const idx = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length;
	return AVATAR_TONES[idx];
}

interface TimelineEvent {
	label: string;
	date: string;
	done: boolean;
}

function buildOrderTimeline(order: SellerOrder, t: (k: string) => string): TimelineEvent[] {
	const isDone = ['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.status);
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
			done: isDone,
		},
	];
}

function buildDeliveryTimeline(order: SellerOrder, t: (k: string) => string): TimelineEvent[] {
	const deliveryStatus = order.delivery?.status ?? 'PENDING';
	const currentIdx = ['PENDING', 'PACKED', 'SENT', 'IN_TRANSIT', 'DELIVERED'].indexOf(deliveryStatus);
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

export default function SellerOrderDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const [dialog, setDialog] = useState<DialogType>(null);
	const [manageAnchor, setManageAnchor] = useState<HTMLElement | null>(null);
	const [trackingCode, setTrackingCode] = useState('');
	const [cancelReason, setCancelReason] = useState('');
	const [rejectReason, setRejectReason] = useState('');

	const { data, loading, refetch } = useQuery<{ mySellerOrder: SellerOrder }>(MY_SELLER_ORDER_QUERY, {
		variables: { id },
		skip: !id,
	});

	const refetchQueries = [
		{ query: MY_SELLER_ORDER_QUERY, variables: { id } },
		{ query: MY_SELLER_ORDERS_QUERY, variables: { filter: { page: 1, pageSize: 8 } } },
		{ query: MY_SELLER_ORDER_STATS_QUERY },
	];

	const mutationOptions = {
		refetchQueries,
		onCompleted: () => {
			showToast(t('sellerOrders.detail.success'), 'success');
			setDialog(null);
			setManageAnchor(null);
			setTrackingCode('');
			setCancelReason('');
			setRejectReason('');
			refetch();
		},
		onError: (err: Error) => showToast(err.message, 'error'),
	};

	const [confirmOrder, { loading: confirming }] = useMutation(CONFIRM_SELLER_ORDER_MUTATION, mutationOptions);
	const [markPacked, { loading: packing }] = useMutation(MARK_SELLER_ORDER_PACKED_MUTATION, mutationOptions);
	const [shipOrder, { loading: shipping }] = useMutation(SHIP_SELLER_ORDER_MUTATION, mutationOptions);
	const [markInTransit, { loading: inTransitLoading }] = useMutation(
		MARK_SELLER_ORDER_IN_TRANSIT_MUTATION,
		mutationOptions
	);
	const [markDelivered, { loading: delivering }] = useMutation(
		MARK_SELLER_ORDER_DELIVERED_MUTATION,
		mutationOptions
	);
	const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_SELLER_ORDER_MUTATION, mutationOptions);
	const [updateTracking, { loading: updatingTracking }] = useMutation(
		UPDATE_SELLER_ORDER_TRACKING_MUTATION,
		mutationOptions
	);
	const [reviewReturn, { loading: reviewingReturn }] = useMutation(REVIEW_SELLER_RETURN_MUTATION, mutationOptions);
	const [markReturnReceived, { loading: receivingReturn }] = useMutation(
		MARK_SELLER_RETURN_RECEIVED_MUTATION,
		mutationOptions
	);
	const [processRefund, { loading: refunding }] = useMutation(
		PROCESS_SELLER_RETURN_REFUND_MUTATION,
		mutationOptions
	);

	if (loading) return <AppLoader />;

	const order = data?.mySellerOrder;

	if (!order) {
		return (
			<EmptyState
				icon={Icons.cart}
				title={t('sellerOrders.detail.notFound.title')}
				description={t('sellerOrders.detail.notFound.description')}
				actionLabel={t('sellerOrders.detail.backToOrders')}
				onAction={() => navigate(ROUTES.SELLER_ORDERS)}
			/>
		);
	}

	const returnRequest = order.returnRequest;
	const orderIdShort = formatOrderId(order.id);
	const buyerTone = getAvatarTone(order.buyer.id);
	const buyerInitials = getInitials(order.buyer.name);

	const canConfirm = order.status === 'PENDING';
	const canPack = order.status === 'CONFIRMED';
	const canShip = order.status === 'CONFIRMED';
	const canMarkInTransit =
		order.status === 'SHIPPED' &&
		(order.delivery?.status === 'SENT' || order.delivery?.status === 'PACKED');
	const canMarkDelivered = order.status === 'SHIPPED';
	const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
	const canUpdateTracking = ['CONFIRMED', 'SHIPPED'].includes(order.status);
	const canReviewReturn =
		returnRequest && ['REQUESTED', 'UNDER_REVIEW'].includes(returnRequest.status);
	const canMarkReturnReceived =
		returnRequest && ['APPROVED', 'AWAITING_RETURN_SHIPPING'].includes(returnRequest.status);
	const canProcessRefund = returnRequest?.status === 'RECEIVED';

	const orderTimeline = buildOrderTimeline(order, t);
	const deliveryTimeline = buildDeliveryTimeline(order, t);

	const actionLoading =
		confirming ||
		packing ||
		shipping ||
		inTransitLoading ||
		delivering ||
		cancelling ||
		updatingTracking ||
		reviewingReturn ||
		receivingReturn ||
		refunding;

	const runMutation = (fn: () => void) => {
		if (!id || actionLoading) return;
		fn();
	};

	return (
		<Box sx={{ width: '100%', maxWidth: 1300, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
			<Box sx={{ mb: 3 }}>
				<Link
					component={RouterLink}
					to={ROUTES.SELLER_ORDERS}
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
					{t('sellerOrders.detail.backToOrders')}
				</Link>

				<Box
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						flexWrap: 'wrap',
						gap: 2,
					}}
				>
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
							<Typography
								sx={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}
							>
								{t('sellerOrders.detail.orderNumberPrefix')}
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
							{t('sellerOrders.detail.print')}
						</AppButton>
						<AppButton
							variant="contained"
							size="small"
							startIcon={<FontAwesomeIcon icon={Icons.edit} />}
							onClick={(e) => setManageAnchor(e.currentTarget)}
						>
							{t('sellerOrders.detail.manage')}
						</AppButton>
					</Box>
				</Box>
			</Box>

			{returnRequest && (
				<AppCard title={t('sellerOrders.detail.returnTitle')} sx={{ mb: 3 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
						<StatusBadge
							status={returnRequest.status}
							label={t(`status.returnRequest.${returnRequest.status}`)}
						/>
					</Box>
					<KVRow label={t('sellerOrders.detail.return.reason')} value={returnRequest.reason} />
					{returnRequest.details && (
						<KVRow label={t('sellerOrders.detail.return.details')} value={returnRequest.details} />
					)}
					{returnRequest.resolution && (
						<KVRow
							label={t('sellerOrders.detail.return.resolution')}
							value={returnRequest.resolution}
						/>
					)}
					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
						{canReviewReturn && (
							<>
								<AppButton
									variant="contained"
									size="small"
									loading={reviewingReturn}
									onClick={() =>
										runMutation(() =>
											reviewReturn({ variables: { orderId: id, approve: true } })
										)
									}
								>
									{t('sellerOrders.detail.approveReturn')}
								</AppButton>
								<AppButton
									variant="outlined"
									size="small"
									onClick={() => setDialog('rejectReturn')}
								>
									{t('sellerOrders.detail.rejectReturn')}
								</AppButton>
							</>
						)}
						{canMarkReturnReceived && (
							<AppButton
								variant="contained"
								size="small"
								loading={receivingReturn}
								onClick={() => runMutation(() => markReturnReceived({ variables: { orderId: id } }))}
							>
								{t('sellerOrders.detail.markReturnReceived')}
							</AppButton>
						)}
						{canProcessRefund && (
							<AppButton variant="contained" size="small" onClick={() => setDialog('refund')}>
								{t('sellerOrders.detail.processRefund')}
							</AppButton>
						)}
					</Box>
				</AppCard>
			)}

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
					gap: 3,
					alignItems: 'start',
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
					<AppCard
						title={t('sellerOrders.detail.itemsTitle')}
						subtitle={t('sellerOrders.detail.itemsSubtitle', { count: order.itemCount })}
					>
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
									{item.productMainImage ? (
										<AppImage
											src={item.productMainImage}
											alt={item.productTitle}
											sx={{
												width: 56,
												height: 56,
												borderRadius: 1.5,
												objectFit: 'cover',
												border: `1px solid ${tokens.line}`,
											}}
										/>
									) : (
										<Box
											sx={{
												width: 56,
												height: 56,
												borderRadius: 1.5,
												background: `repeating-linear-gradient(135deg, ${tokens.surface2} 0 6px, transparent 6px 12px), ${tokens.surface2}`,
												border: `1px solid ${tokens.line}`,
											}}
										/>
									)}
									<Box>
										<Typography sx={{ fontWeight: 600, fontSize: 14 }}>
											{item.productTitle}
										</Typography>
										<Typography
											sx={{
												fontFamily: 'JetBrains Mono, monospace',
												fontSize: 11.5,
												color: tokens.ink3,
												mt: 0.4,
											}}
										>
											{formatOrderItemCode(item)}
										</Typography>
									</Box>
									<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>
										{t('orderDetail.qty', { count: item.quantity })}
									</Typography>
									<Typography sx={{ fontWeight: 700, fontSize: 14 }}>
										{formatAmount(item.totalPrice)}
									</Typography>
								</Box>
							))}
						</Box>

						<Box sx={{ pt: 1.75 }}>
							<SumRow
								label={t('orderDetail.summary.subtotal')}
								value={formatAmount(order.sellerSubtotal)}
							/>
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
									{formatAmount(order.sellerSubtotal)}
								</Typography>
							</Box>
						</Box>
					</AppCard>

					<AppCard title={t('orderDetail.history')}>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
								gap: 3,
								pt: 0.5,
							}}
						>
							<TimelineColumn events={deliveryTimeline} />
							<TimelineColumn events={orderTimeline} />
						</Box>
					</AppCard>
				</Box>

				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
					<SideCard title={t('sellerOrders.detail.buyerTitle')}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
							<Box
								sx={{
									width: 40,
									height: 40,
									borderRadius: '50%',
									background: buyerTone.bg,
									color: buyerTone.fg,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontFamily: 'JetBrains Mono, monospace',
									fontSize: 13,
									fontWeight: 700,
									flexShrink: 0,
								}}
							>
								{buyerInitials}
							</Box>
							<Box>
								<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{order.buyer.name}</Typography>
								<Typography sx={{ fontSize: 12.5, color: tokens.ink3 }}>{order.buyer.email}</Typography>
							</Box>
						</Box>
					</SideCard>

					{order.delivery && (
						<SideCard title={t('orderDetail.sidebar.delivery')}>
							<KVRow
								label={t('orderDetail.delivery.shipBy')}
								value={t(formatDeliveryMethod(order.delivery.method))}
							/>
							<KVRow label={t('orderDetail.delivery.speed')} value={t('orderDetail.delivery.standard')} />
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

					{order.delivery?.address && (
						<SideCard title={t('orderDetail.sidebar.shipping')}>
							<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.6, mb: 1.5 }}>
								{order.delivery.address}
							</Typography>
							{order.buyer.phone && (
								<KVRow label={t('sellerOrders.detail.phone')} value={order.buyer.phone} />
							)}
						</SideCard>
					)}

					{order.payment && (
						<SideCard title={t('orderDetail.sidebar.payment')}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
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
							</Box>
							<StatusBadge
								status={order.payment.status}
								label={t(`status.payment.${order.payment.status}`)}
							/>
							{canProcessRefund && (
								<Box
									sx={{
										display: 'flex',
										gap: 1,
										mt: 1.5,
										pt: 1.5,
										borderTop: `1px solid ${tokens.line2}`,
									}}
								>
									<AppButton
										variant="contained"
										size="small"
										fullWidth
										onClick={() => setDialog('refund')}
									>
										{t('sellerOrders.detail.processRefund')}
									</AppButton>
								</Box>
							)}
						</SideCard>
					)}
				</Box>
			</Box>

			<Menu
				anchorEl={manageAnchor}
				open={Boolean(manageAnchor)}
				onClose={() => setManageAnchor(null)}
			>
				{canConfirm && (
					<MenuItem
						onClick={() => runMutation(() => confirmOrder({ variables: { orderId: id } }))}
					>
						{t('sellerOrders.detail.confirmOrder')}
					</MenuItem>
				)}
				{canPack && (
					<MenuItem onClick={() => runMutation(() => markPacked({ variables: { orderId: id } }))}>
						{t('sellerOrders.detail.markPacked')}
					</MenuItem>
				)}
				{canShip && (
					<MenuItem
						onClick={() => {
							setManageAnchor(null);
							setDialog('ship');
						}}
					>
						{t('sellerOrders.detail.confirmShipment')}
					</MenuItem>
				)}
				{canMarkInTransit && (
					<MenuItem onClick={() => runMutation(() => markInTransit({ variables: { orderId: id } }))}>
						{t('sellerOrders.detail.markInTransit')}
					</MenuItem>
				)}
				{canMarkDelivered && (
					<MenuItem
						onClick={() => {
							setManageAnchor(null);
							setDialog('deliver');
						}}
					>
						{t('sellerOrders.detail.markDelivered')}
					</MenuItem>
				)}
				{canUpdateTracking && (
					<MenuItem
						onClick={() => {
							setManageAnchor(null);
							setDialog('tracking');
						}}
					>
						{t('sellerOrders.detail.updateTracking')}
					</MenuItem>
				)}
				{canCancel && (
					<MenuItem
						onClick={() => {
							setManageAnchor(null);
							setDialog('cancel');
						}}
						sx={{ color: tokens.coral }}
					>
						{t('sellerOrders.detail.cancelOrder')}
					</MenuItem>
				)}
			</Menu>

			<AppModal
				open={dialog === 'ship'}
				onClose={() => setDialog(null)}
				title={t('sellerOrders.detail.shipForm.title')}
			>
				<Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 2 }}>
					{t('sellerOrders.detail.shipForm.description')}
				</Typography>
				<AppInput
					label={t('sellerOrders.detail.shipForm.trackingCode')}
					value={trackingCode}
					onChange={(e) => setTrackingCode(e.target.value)}
					placeholder={t('sellerOrders.detail.shipForm.trackingPlaceholder')}
					sx={{ mb: 2 }}
				/>
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					<AppButton
						variant="contained"
						loading={shipping}
						onClick={() =>
							runMutation(() =>
								shipOrder({
									variables: {
										orderId: id,
										trackingCode: trackingCode.trim() || undefined,
									},
								})
							)
						}
					>
						{t('sellerOrders.detail.shipForm.submit')}
					</AppButton>
					<AppButton variant="outlined" onClick={() => setDialog(null)}>
						{t('common.cancel')}
					</AppButton>
				</Box>
			</AppModal>

			<AppModal
				open={dialog === 'tracking'}
				onClose={() => setDialog(null)}
				title={t('sellerOrders.detail.trackingForm.title')}
			>
				<AppInput
					label={t('sellerOrders.detail.trackingForm.trackingCode')}
					value={trackingCode}
					onChange={(e) => setTrackingCode(e.target.value)}
					placeholder={t('sellerOrders.detail.trackingForm.trackingPlaceholder')}
					sx={{ mb: 2 }}
				/>
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					<AppButton
						variant="contained"
						loading={updatingTracking}
						disabled={!trackingCode.trim()}
						onClick={() =>
							runMutation(() =>
								updateTracking({
									variables: { orderId: id, trackingCode: trackingCode.trim() },
								})
							)
						}
					>
						{t('sellerOrders.detail.trackingForm.submit')}
					</AppButton>
					<AppButton variant="outlined" onClick={() => setDialog(null)}>
						{t('common.cancel')}
					</AppButton>
				</Box>
			</AppModal>

			<AppModal
				open={dialog === 'cancel'}
				onClose={() => setDialog(null)}
				title={t('sellerOrders.detail.cancelConfirm.title')}
			>
				<Typography sx={{ fontSize: 13, color: tokens.ink3, mb: 2 }}>
					{t('sellerOrders.detail.cancelConfirm.message')}
				</Typography>
				<AppTextarea
					label={t('sellerOrders.detail.cancelConfirm.reasonLabel')}
					value={cancelReason}
					onChange={(e) => setCancelReason(e.target.value)}
					placeholder={t('sellerOrders.detail.cancelConfirm.reasonPlaceholder')}
					sx={{ mb: 2 }}
				/>
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					<AppButton
						variant="contained"
						color="error"
						loading={cancelling}
						onClick={() =>
							runMutation(() =>
								cancelOrder({
									variables: {
										orderId: id,
										reason: cancelReason.trim() || undefined,
									},
								})
							)
						}
					>
						{t('sellerOrders.detail.cancelConfirm.submit')}
					</AppButton>
					<AppButton variant="outlined" onClick={() => setDialog(null)}>
						{t('common.cancel')}
					</AppButton>
				</Box>
			</AppModal>

			<AppModal
				open={dialog === 'rejectReturn'}
				onClose={() => setDialog(null)}
				title={t('sellerOrders.detail.rejectReturnConfirm.title')}
			>
				<AppTextarea
					label={t('sellerOrders.detail.rejectReturnConfirm.reasonLabel')}
					value={rejectReason}
					onChange={(e) => setRejectReason(e.target.value)}
					placeholder={t('sellerOrders.detail.rejectReturnConfirm.reasonPlaceholder')}
					sx={{ mb: 2 }}
				/>
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					<AppButton
						variant="contained"
						color="error"
						loading={reviewingReturn}
						disabled={!rejectReason.trim()}
						onClick={() =>
							runMutation(() =>
								reviewReturn({
									variables: {
										orderId: id,
										approve: false,
										resolution: rejectReason.trim(),
									},
								})
							)
						}
					>
						{t('sellerOrders.detail.rejectReturnConfirm.submit')}
					</AppButton>
					<AppButton variant="outlined" onClick={() => setDialog(null)}>
						{t('common.cancel')}
					</AppButton>
				</Box>
			</AppModal>

			<ConfirmDialog
				open={dialog === 'deliver'}
				onClose={() => setDialog(null)}
				onConfirm={() => runMutation(() => markDelivered({ variables: { orderId: id } }))}
				title={t('sellerOrders.detail.deliverConfirm.title')}
				message={t('sellerOrders.detail.deliverConfirm.message')}
				confirmLabel={t('sellerOrders.detail.markDelivered')}
				loading={delivering}
			/>

			<ConfirmDialog
				open={dialog === 'refund'}
				onClose={() => setDialog(null)}
				onConfirm={() => runMutation(() => processRefund({ variables: { orderId: id } }))}
				title={t('sellerOrders.detail.refundConfirm.title')}
				message={t('sellerOrders.detail.refundConfirm.message')}
				confirmLabel={t('sellerOrders.detail.processRefund')}
				loading={refunding}
			/>
		</Box>
	);
}

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

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
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
	);
}

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
			<Typography sx={{ fontSize: 'inherit', color: tokens.ink3, flexShrink: 0 }}>{label}</Typography>
			{typeof value === 'string' ? (
				<Typography sx={{ fontSize: 'inherit', fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
			) : (
				value
			)}
		</Box>
	);
}

function SumRow({ label, value }: { label: string; value: string }) {
	return (
		<Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, fontSize: 13.5 }}>
			<Typography sx={{ fontSize: 'inherit', color: tokens.ink3 }}>{label}</Typography>
			<Typography sx={{ fontSize: 'inherit', fontWeight: 500 }}>{value}</Typography>
		</Box>
	);
}
