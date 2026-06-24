import { useTranslation } from 'react-i18next';
import { Box, Skeleton, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { ROUTES } from '@/constants/routes';
import { AppAvatar, AppButton, AppImage } from '@/components/ui';
import { StarRating } from '@/components/reviews/StarRating';
import type { ModerationReviewItem } from '@/graphql/operations/reviewModeration';

function formatRelativeTime(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

interface ModerationReviewCardProps {
	review: ModerationReviewItem;
	onApprove: (id: string) => void;
	onHide: (id: string) => void;
	approving?: boolean;
	hiding?: boolean;
	showActions?: boolean;
}

export function ModerationReviewCard({
	review,
	onApprove,
	onHide,
	approving = false,
	hiding = false,
	showActions = true,
}: ModerationReviewCardProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const relTime = formatRelativeTime(review.submittedAt);

	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${review.isFlagged ? `color-mix(in srgb, ${tokens.coral} 30%, ${tokens.line})` : tokens.line}`,
				borderRadius: '12px',
				p: '20px',
				display: 'flex',
				flexDirection: 'column',
				gap: 1.75,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
				<AppAvatar
					name={review.reviewerName}
					size="md"
					src={review.reviewerAvatarUrl ?? undefined}
				/>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{review.reviewerName}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
						{t('reviewModeration.card.role', { count: review.reviewerReviewCount })}
					</Typography>
				</Box>
				<StarRating rating={review.rating} size={14} />
			</Box>

			<Box
				component={RouterLink}
				to={ROUTES.PRODUCT(review.targetSlug)}
				sx={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 1,
					px: 1.25,
					py: 0.75,
					bgcolor: tokens.bg,
					border: `1px solid ${tokens.line}`,
					borderRadius: '8px',
					fontSize: 12.5,
					textDecoration: 'none',
					color: 'inherit',
					width: 'fit-content',
					maxWidth: '100%',
					'&:hover': { borderColor: tokens.accent },
				}}
			>
				<Box
					sx={{
						width: 22,
						height: 22,
						borderRadius: '5px',
						border: `1px solid ${tokens.line}`,
						overflow: 'hidden',
						flexShrink: 0,
						bgcolor: tokens.surface2,
					}}
				>
					{review.targetImageUrl && (
						<AppImage
							src={review.targetImageUrl}
							sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
						/>
					)}
				</Box>
				<Typography sx={{ fontWeight: 600, fontSize: 12.5, color: tokens.ink1 }} noWrap>
					{review.targetTitle}
				</Typography>
				<Typography
					sx={{
						fontFamily: 'JetBrains Mono, monospace',
						fontSize: 11,
						color: tokens.ink3,
						flexShrink: 0,
					}}
				>
					#{review.targetRef}
				</Typography>
			</Box>

			{review.text && (
				<Typography sx={{ fontSize: 13.5, color: tokens.ink2, lineHeight: 1.6 }}>
					{review.text}
				</Typography>
			)}

			{review.photos.length > 0 && (
				<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
					{review.photos.map((url, i) => (
						<AppImage
							key={url}
							src={url}
							gallery={review.photos}
							galleryIndex={i}
							sx={{
								width: 60,
								height: 60,
								borderRadius: '8px',
								border: `1px solid ${tokens.line}`,
								objectFit: 'cover',
							}}
						/>
					))}
				</Box>
			)}

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 1.5,
					flexWrap: 'wrap',
					fontSize: 12,
					color: tokens.ink3,
					pt: 1.5,
					borderTop: `1px solid ${tokens.line2}`,
				}}
			>
				<span>{t('reviewModeration.card.submitted', { time: relTime })}</span>
				{review.orderId && (
					<>
						<Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3 }} />
						<span>{t('reviewModeration.card.viaOrder', { orderId: review.orderId })}</span>
					</>
				)}
				{review.photos.length > 0 && (
					<>
						<Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3 }} />
						<span>
							{t('reviewModeration.card.photosAttached', { count: review.photos.length })}
						</span>
					</>
				)}
				{review.isFlagged && review.flagReason && (
					<>
						<Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3 }} />
						<Box
							component="span"
							sx={{
								color: tokens.coral,
								fontWeight: 700,
								display: 'inline-flex',
								alignItems: 'center',
								gap: 0.5,
							}}
						>
							<FontAwesomeIcon icon={Icons.warning} style={{ fontSize: 12 }} />
							{review.flagReason}
						</Box>
					</>
				)}
			</Box>

			{showActions && (
				<Box sx={{ display: 'flex', gap: 1 }}>
					<AppButton
						tone="ghost"
						size="small"
						fullWidth
						onClick={() => navigate(ROUTES.PRODUCT(review.targetSlug))}
					>
						{t('reviewModeration.card.viewProduct')}
					</AppButton>
					<AppButton
						tone="danger"
						size="small"
						fullWidth
						loading={hiding}
						onClick={() => onHide(review.id)}
					>
						{t('reviewModeration.card.hideBtn')}
					</AppButton>
					<AppButton
						tone="success"
						size="small"
						fullWidth
						loading={approving}
						onClick={() => onApprove(review.id)}
					>
						{t('reviewModeration.card.approveBtn')}
					</AppButton>
				</Box>
			)}
		</Box>
	);
}

export function ModerationReviewCardSkeleton() {
	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${tokens.line}`,
				borderRadius: '12px',
				p: '20px',
				display: 'flex',
				flexDirection: 'column',
				gap: 1.75,
			}}
		>
			<Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
				<Skeleton variant="circular" width={40} height={40} />
				<Box sx={{ flex: 1 }}>
					<Skeleton width={140} height={16} sx={{ mb: 0.5 }} />
					<Skeleton width={100} height={12} />
				</Box>
				<Skeleton width={80} height={14} />
			</Box>
			<Skeleton width="60%" height={28} sx={{ borderRadius: 1 }} />
			<Skeleton width="100%" height={48} />
			<Skeleton width="100%" height={36} />
		</Box>
	);
}
