import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import { AppButton, AppCard, AppPagination, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { PRODUCT_REVIEWS_QUERY, REVIEW_ELIGIBILITY_QUERY } from '@/graphql/operations/reviews';
import type { ProductReviewsData, ReviewEligibilityData } from '@/graphql/operations/reviews';
import { ReviewCard } from './ReviewCard';
import { StarRating } from './StarRating';
import { WriteReviewModal } from './WriteReviewModal';

interface ProductReviewsSectionProps {
	productId: string;
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
	const { t } = useTranslation();
	const { isAuthenticated } = useAuth();
	const [page, setPage] = useState(1);
	const [modalOpen, setModalOpen] = useState(false);
	const pageSize = 6;

	const { data, loading, refetch } = useQuery<ProductReviewsData>(PRODUCT_REVIEWS_QUERY, {
		variables: { input: { productId, page, pageSize } },
		fetchPolicy: 'cache-and-network',
	});

	const { data: eligibilityData } = useQuery<ReviewEligibilityData>(REVIEW_ELIGIBILITY_QUERY, {
		variables: { productId },
		skip: !isAuthenticated,
	});

	const reviews = data?.productReviews;
	const items = reviews?.items ?? [];
	const total = reviews?.total ?? 0;
	const averageRating = reviews?.averageRating ?? 0;
	const reviewCount = reviews?.reviewCount ?? 0;
	const canWrite = eligibilityData?.reviewEligibility.canWrite ?? false;
	const orderId = eligibilityData?.reviewEligibility.orderId ?? null;

	return (
		<>
			<AppCard title={t('product.reviewsTitle')}>
				{/* Summary row */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 2,
						flexWrap: 'wrap',
						mb: items.length > 0 || canWrite ? 3 : 0,
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
						<Box>
							<Typography
								sx={{
									fontSize: 48,
									fontWeight: 800,
									letterSpacing: '-0.03em',
									lineHeight: 1,
									color: tokens.ink1,
								}}
							>
								{averageRating.toFixed(1)}
							</Typography>
							<Box sx={{ mt: 0.5 }}>
								<StarRating rating={averageRating} size={16} />
							</Box>
							<Typography sx={{ color: tokens.ink3, fontSize: 13, mt: 0.5 }}>
								{t('product.reviewsSummary', { count: reviewCount })}
							</Typography>
						</Box>
					</Box>

					{canWrite && orderId && (
						<AppButton
							tone="primary"
							startIcon={<FontAwesomeIcon icon={Icons.edit} />}
							onClick={() => setModalOpen(true)}
						>
							{t('reviews.writeBtn')}
						</AppButton>
					)}
				</Box>

				{/* Review list */}
				{loading && items.length === 0 ? (
					<Typography sx={{ fontSize: 13, color: tokens.ink3, py: 2 }}>
						{t('reviews.loading')}
					</Typography>
				) : items.length === 0 ? (
					<EmptyState
						icon={Icons.starEmpty}
						title={t('product.noReviews')}
						description={t('product.noReviewsDesc')}
					/>
				) : (
					<Stack spacing={2}>
						{items.map((review) => (
							<ReviewCard key={review.id} review={review} />
						))}
					</Stack>
				)}

				{total > pageSize && (
					<Box sx={{ mt: 3 }}>
						<AppPagination
							page={page}
							pageSize={pageSize}
							total={total}
							onChange={(p) => setPage(p)}
						/>
					</Box>
				)}
			</AppCard>

			{canWrite && orderId && (
				<WriteReviewModal
					open={modalOpen}
					onClose={() => setModalOpen(false)}
					productId={productId}
					orderId={orderId}
					onSuccess={() => refetch()}
				/>
			)}
		</>
	);
}
