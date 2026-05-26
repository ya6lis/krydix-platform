import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { AppAvatar, StatusBadge, AppImage } from '@/components/ui';
import { StarRating } from './StarRating';
import type { ProductReviewItem } from '@/graphql/operations/reviews';

function formatRelativeTime(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

interface ReviewCardProps {
	review: ProductReviewItem;
	onFlag?: (reviewId: string) => void;
}

export function ReviewCard({ review, onFlag }: ReviewCardProps) {
	const { t } = useTranslation();
	const relTime = formatRelativeTime(review.createdAt);

	return (
		<Box
			sx={{
				bgcolor: tokens.surface,
				border: `1px solid ${review.isPending ? tokens.amber : tokens.line}`,
				borderRadius: '12px',
				p: '20px',
				display: 'flex',
				flexDirection: 'column',
				gap: 1.75,
			}}
		>
			{/* Header */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
				<AppAvatar
					name={review.reviewerName}
					size="md"
					src={review.reviewerAvatarUrl ?? undefined}
				/>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography sx={{ fontWeight: 700, fontSize: 14 }}>{review.reviewerName}</Typography>
					<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
						{t('reviews.card.role', { count: review.reviewerReviewCount })}
					</Typography>
				</Box>
				<StarRating rating={review.rating} size={14} />
			</Box>

			{review.isPending && (
				<StatusBadge status="PENDING" label={t('reviews.card.pendingModeration')} />
			)}

			{/* Body */}
			{review.text && (
				<Typography sx={{ fontSize: 13.5, color: tokens.ink2, lineHeight: 1.6 }}>
					{review.text}
				</Typography>
			)}

			{/* Photos */}
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
								objectFit: 'cover',
								border: `1px solid ${tokens.line}`,
							}}
						/>
					))}
				</Box>
			)}

			{/* Seller response */}
			{review.sellerReply && (
				<Box
					sx={{
						bgcolor: tokens.bg,
						border: `1px solid ${tokens.line}`,
						borderRadius: '10px',
						p: 1.5,
					}}
				>
					<Typography
						sx={{
							fontSize: 11,
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							color: tokens.ink3,
							mb: 0.5,
						}}
					>
						{t('reviews.card.sellerResponse')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.6 }}>
						{review.sellerReply}
					</Typography>
				</Box>
			)}

			{/* Meta */}
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
				<span>{t('reviews.card.submitted', { time: relTime })}</span>
				{review.orderId && (
					<>
						<Box
							component="span"
							sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3 }}
						/>
						<span>
							{t('reviews.card.viaOrder', { orderId: review.orderId.slice(-6).toUpperCase() })}
						</span>
					</>
				)}
				{review.photos.length > 0 && (
					<>
						<Box
							component="span"
							sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: tokens.ink3 }}
						/>
						<span>{t('reviews.card.photosAttached', { count: review.photos.length })}</span>
					</>
				)}
				{onFlag && !review.isOwn && (
					<Box
						component="button"
						onClick={() => onFlag(review.id)}
						sx={{
							ml: 'auto',
							border: 0,
							bgcolor: 'transparent',
							color: tokens.coral,
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							display: 'inline-flex',
							alignItems: 'center',
							gap: 0.5,
						}}
					>
						<FontAwesomeIcon icon={Icons.flag} style={{ fontSize: 11 }} />
						{t('reviews.card.flag')}
					</Box>
				)}
			</Box>
		</Box>
	);
}
