import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import {
	Box,
	Checkbox,
	Chip,
	Divider,
	FormControlLabel,
	Grid,
	Radio,
	RadioGroup,
	Skeleton,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tabs,
	Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import {
	AppButton,
	AppAvatar,
	AppCard,
	AppInput,
	AppTabs,
	StatusBadge,
	EmptyState,
} from '@/components/ui';
import { useAppToast } from '@/components/ui/AppToast';
import {
	MODERATION_QUEUE_QUERY,
	APPROVE_PRODUCT_MUTATION,
	REJECT_PRODUCT_MUTATION,
	BULK_APPROVE_MUTATION,
} from '@/graphql/operations/moderation';
import type {
	ModerationItem,
	ModerationQueueData,
	ModerationQueueVars,
	ModerationFilterType,
} from '@/graphql/operations/moderation';
import { ROUTES } from '@/constants/routes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function getWaitingLabel(isoString: string): string | null {
	const diff = Date.now() - new Date(isoString).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 120) return null;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

const REJECT_REASONS = [
	'lowQualityPhotos',
	'misleadingDescription',
	'wrongCategory',
	'restrictedProduct',
	'other',
] as const;
type RejectReasonKey = (typeof REJECT_REASONS)[number];

type ActiveTab = 'pending' | 'approved' | 'rejected';
const TAB_FILTER: Record<ActiveTab, ModerationFilterType> = {
	pending: 'PENDING',
	approved: 'APPROVED_TODAY',
	rejected: 'REJECTED_TODAY',
};

// ─── QueueRow ─────────────────────────────────────────────────────────────────

interface QueueRowProps {
	item: ModerationItem;
	selected: boolean;
	checked: boolean;
	onSelect: () => void;
	onCheck: (checked: boolean) => void;
	isPending: boolean;
}

function QueueRow({ item, selected, checked, onSelect, onCheck, isPending }: QueueRowProps) {
	const { t } = useTranslation();
	const relTime = formatRelativeTime(item.submittedAt);
	const waitingLabel = getWaitingLabel(item.submittedAt);

	return (
		<Box
			onClick={onSelect}
			sx={{
				display: 'grid',
				gridTemplateColumns: isPending ? '40px 72px minmax(0,1fr) auto' : '72px minmax(0,1fr) auto',
				gap: 1.5,
				alignItems: 'center',
				px: '16px',
				py: 1.75,
				borderBottom: `1px solid ${tokens.line2}`,
				cursor: 'pointer',
				transition: 'background 120ms',
				bgcolor: selected ? tokens.accentSoft : 'transparent',
				'&:hover': { bgcolor: selected ? tokens.accentSoft : tokens.bg },
				'&:last-child': { borderBottom: 0 },
			}}
		>
			{/* Checkbox — pending only */}
			{isPending && (
				<Checkbox
					size="small"
					checked={checked}
					onClick={(e) => e.stopPropagation()}
					onChange={(e) => onCheck(e.target.checked)}
					sx={{ p: 0.5, color: tokens.ink3, '&.Mui-checked': { color: tokens.accent } }}
				/>
			)}

			{/* Thumbnail */}
			<Box
				sx={{
					width: 72,
					height: 72,
					borderRadius: '10px',
					border: `1px solid ${tokens.line}`,
					overflow: 'hidden',
					flexShrink: 0,
				}}
			>
				{item.imageUrl ? (
					<Box
						component="img"
						src={item.imageUrl}
						alt={item.titleEn}
						sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : (
					<Box
						sx={{
							width: '100%',
							height: '100%',
							background: `repeating-linear-gradient(135deg,${tokens.surface2} 0 6px,transparent 6px 12px),${tokens.surface2}`,
						}}
					/>
				)}
			</Box>

			{/* Info */}
			<Box sx={{ minWidth: 0 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
					<StatusBadge status={item.status} label={t('moderation.queue.newProduct')} />
					<Typography variant="caption" color={tokens.ink3} sx={{ fontSize: '11.5px' }}>
						{t('moderation.queue.submitted', { time: relTime })}
					</Typography>
					{waitingLabel && (
						<Typography
							variant="caption"
							sx={{ fontSize: '11.5px', fontWeight: 700, color: tokens.amberInk }}
						>
							· {t('moderation.queue.waiting', { time: waitingLabel })}
						</Typography>
					)}
				</Box>
				<Typography sx={{ fontWeight: 700, fontSize: '14px', color: tokens.ink1, mb: 0.25 }} noWrap>
					{item.titleEn}
				</Typography>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1.5,
						fontSize: '12.5px',
						color: tokens.ink3,
						flexWrap: 'wrap',
					}}
				>
					<Box component="span">
						{t('moderation.queue.by')}{' '}
						<Box component="span" sx={{ color: tokens.ink1, fontWeight: 600 }}>
							{item.sellerName}
						</Box>
					</Box>
					{item.categoryPath && (
						<>
							<Box component="span">·</Box>
							<Box component="span">{item.categoryPath}</Box>
						</>
					)}
					<Box component="span">·</Box>
					<Box component="span" sx={{ color: tokens.ink1, fontWeight: 600 }}>
						${item.basePrice.toFixed(2)}
					</Box>
				</Box>
			</Box>

			{/* Review button */}
			<AppButton
				tone="ghost"
				size="small"
				sx={{ flexShrink: 0, fontSize: '12px' }}
				onClick={(e) => { e.stopPropagation(); onSelect(); }}
			>
				{t('moderation.queue.reviewBtn')}
			</AppButton>
		</Box>
	);
}

// ─── GalleryStrip ─────────────────────────────────────────────────────────────

function GalleryStrip({ urls, activeIdx, onSelect }: { urls: string[]; activeIdx: number; onSelect: (i: number) => void }) {
	if (urls.length <= 1) return null;
	return (
		<Box sx={{ display: 'flex', gap: 0.75, px: '20px', pb: 2, overflowX: 'auto' }}>
			{urls.map((url, i) => (
				<Box
					key={i}
					onClick={() => onSelect(i)}
					sx={{
						width: 52,
						height: 52,
						borderRadius: '8px',
						border: `2px solid ${i === activeIdx ? tokens.accent : tokens.line}`,
						overflow: 'hidden',
						flexShrink: 0,
						cursor: 'pointer',
						transition: 'border-color 120ms',
						'&:hover': { borderColor: i === activeIdx ? tokens.accent : tokens.ink3 },
					}}
				>
					<Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
				</Box>
			))}
		</Box>
	);
}

// ─── PreviewPanel ─────────────────────────────────────────────────────────────

interface PreviewPanelProps {
	item: ModerationItem | null;
	onApprove: (id: string) => void;
	onReject: (id: string, reason: string) => void;
	approving: boolean;
	rejecting: boolean;
}

function PreviewPanel({ item, onApprove, onReject, approving, rejecting }: PreviewPanelProps) {
	const { t } = useTranslation();
	const [selectedReason, setSelectedReason] = useState<RejectReasonKey | ''>('');
	const [note, setNote] = useState('');
	const [activePhotoIdx, setActivePhotoIdx] = useState(0);
	const [langTab, setLangTab] = useState<'en' | 'uk'>('en');

	const prevItemId = useRef<string | null>(null);
	if (item?.id !== prevItemId.current) {
		prevItemId.current = item?.id ?? null;
		// Note: can't call setState during render — reset happens via key prop below
	}

	if (!item) {
		return (
			<AppCard sx={{ position: 'sticky', top: 84 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
					<Typography color={tokens.ink3} fontSize="13px" textAlign="center">
						{t('moderation.preview.noSelection')}
					</Typography>
				</Box>
			</AppCard>
		);
	}

	const currentPhotoUrl = item.galleryUrls[activePhotoIdx] ?? item.imageUrl;
	const isResolved = item.status === 'APPROVED' || item.status === 'REJECTED';

	const handleApprove = () => item && onApprove(item.id);
	const handleReject = () => {
		if (!item) return;
		const reasonLabel = selectedReason
			? t(`moderation.preview.rejectSection.reasons.${selectedReason}`)
			: '';
		const fullReason = reasonLabel ? `${reasonLabel}${note ? ': ' + note : ''}` : note;
		onReject(item.id, fullReason);
	};

	// Bilingual content
	const title = langTab === 'uk' ? item.titleUk : item.titleEn;
	const description = langTab === 'uk' ? item.descriptionUk : item.descriptionEn;
	const metaTitle = langTab === 'uk' ? item.metaTitleUk : item.metaTitleEn;
	const metaDesc = langTab === 'uk' ? item.metaDescriptionUk : item.metaDescriptionEn;

	return (
		<AppCard
			key={item.id}
			disablePadding
			sx={{ position: 'sticky', top: 84, overflow: 'hidden', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
		>
			{/* Hero image */}
			<Box sx={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', bgcolor: tokens.surface2 }}>
				{currentPhotoUrl ? (
					<Box
						component="img"
						src={currentPhotoUrl}
						alt={item.titleEn}
						sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
					/>
				) : (
					<Box
						sx={{
							width: '100%', height: '100%',
							background: `repeating-linear-gradient(135deg,${tokens.surface2} 0 8px,transparent 8px 16px),${tokens.surface2}`,
							display: 'grid', placeItems: 'center', fontSize: '11.5px', color: tokens.ink3,
						}}
					>
						[ no image ]
					</Box>
				)}
				<Box sx={{ position: 'absolute', top: 12, left: 12 }}>
					<StatusBadge status={item.status} label={item.status.replace(/_/g, ' ')} />
				</Box>
				{item.galleryUrls.length > 1 && (
					<Box
						sx={{
							position: 'absolute', bottom: 10, right: 12,
							bgcolor: 'rgba(28,37,46,0.65)', color: '#fff',
							fontSize: '11px', fontWeight: 700, px: 1, py: 0.25, borderRadius: 999,
						}}
					>
						{t('moderation.gallery.photoOf', { current: activePhotoIdx + 1, total: item.galleryUrls.length })}
					</Box>
				)}
			</Box>

			{/* Gallery strip */}
			<GalleryStrip urls={item.galleryUrls} activeIdx={activePhotoIdx} onSelect={setActivePhotoIdx} />

			{/* Body */}
			<Box sx={{ px: '20px', pb: '20px', pt: item.galleryUrls.length > 1 ? 0 : '20px' }}>
				{/* Seller row */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
					<AppAvatar name={item.sellerName} size="sm" src={item.sellerAvatarUrl ?? undefined} />
					<Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: tokens.ink2 }}>
						{item.sellerName}
					</Typography>
					<Box sx={{ color: tokens.cyan, fontSize: 12 }}>
						<FontAwesomeIcon icon={Icons.checkCircle} />
					</Box>
					<Typography sx={{ fontSize: '12px', color: tokens.ink3 }}>
						{t('moderation.preview.verified')}
					</Typography>
					{/*<Box
						component="a"
						href={ROUTES.PRODUCT(item.slug)}
						target="_blank"
						rel="noopener noreferrer"
						sx={{
							ml: 'auto',
							display: 'inline-flex', alignItems: 'center', gap: 0.75,
							fontSize: '11.5px', fontWeight: 600, color: tokens.ink2,
							textDecoration: 'none',
							border: `1px solid ${tokens.line}`, borderRadius: '8px', px: 1, py: 0.5,
							'&:hover': { borderColor: tokens.ink3, color: tokens.ink1 },
						}}
					>
						<FontAwesomeIcon icon={Icons.externalLink} style={{ fontSize: 10 }} />
						{t('moderation.gallery.viewOnSite')}
					</Box>*/}
				</Box>

				{/* SKU */}
				<Typography sx={{ fontFamily: 'monospace', fontSize: '11.5px', color: tokens.ink3, mb: 1 }}>
					{item.sku}
				</Typography>

				{/* Language tabs */}
				<Tabs
					value={langTab}
					onChange={(_, v) => setLangTab(v)}
					sx={{ minHeight: 36, mb: 1.5, borderBottom: `1px solid ${tokens.line}`, '.MuiTab-root': { minHeight: 36, fontSize: 12.5, py: 0 } }}
				>
					<Tab value="en" label={t('moderation.preview.langEn')} />
					<Tab value="uk" label={t('moderation.preview.langUk')} />
				</Tabs>

				{/* Title (bilingual) */}
				<Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', mb: 0.5 }}>
					{title}
				</Typography>

				{/* Description */}
				<Typography sx={{ fontSize: 13, color: tokens.ink2, lineHeight: 1.6, mb: 2 }}>
					{description || '—'}
				</Typography>

				<Divider sx={{ mb: 2 }} />

				{/* Pricing */}
				<Box sx={{ mb: 2 }}>
					<Typography sx={{ fontSize: '11px', fontWeight: 700, color: tokens.ink3, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
						Pricing
					</Typography>
					<Box sx={{ display: 'flex', gap: 3 }}>
						<Box>
							<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>Base price</Typography>
							<Typography sx={{ fontSize: 15, fontWeight: 700 }}>${item.basePrice.toFixed(2)}</Typography>
						</Box>
						{item.comparePrice && (
							<Box>
								<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>{t('moderation.preview.comparePrice')}</Typography>
								<Typography sx={{ fontSize: 15, fontWeight: 700, textDecoration: 'line-through', color: tokens.ink3 }}>
									${item.comparePrice.toFixed(2)}
								</Typography>
							</Box>
						)}
					</Box>
				</Box>

				<Divider sx={{ mb: 2 }} />

				{/* Specs */}
				<Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
					<Typography sx={{ fontSize: '11px', fontWeight: 700, color: tokens.ink3, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
						Specs
					</Typography>
					{[
						{ k: t('moderation.preview.specs.brand'), v: item.brand || '—' },
						{ k: t('moderation.preview.allCategories'), v: item.allCategories.join(', ') || '—' },
						{ k: t('moderation.preview.specs.stock'), v: `${item.totalStock}` },
						{ k: t('moderation.preview.specs.photos'), v: `${item.photoCount}` },
					].map(({ k, v }) => (
						<Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
							<Typography sx={{ fontSize: 13, color: tokens.ink3 }}>{k}</Typography>
							<Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{v}</Typography>
						</Box>
					))}
				</Box>

				{/* Variants */}
				{item.variants.length > 0 && (
					<>
						<Divider sx={{ mb: 2 }} />
						<Box sx={{ mb: 2 }}>
							<Typography sx={{ fontSize: '11px', fontWeight: 700, color: tokens.ink3, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
								{t('moderation.preview.variants.title')} ({item.variants.length})
							</Typography>
							<Box sx={{ border: `1px solid ${tokens.line}`, borderRadius: '8px', overflow: 'hidden' }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell sx={{ fontSize: 11, py: 0.75 }}>{t('moderation.preview.variants.col.options')}</TableCell>
											<TableCell sx={{ fontSize: 11, py: 0.75 }}>{t('moderation.preview.variants.col.sku')}</TableCell>
											<TableCell align="right" sx={{ fontSize: 11, py: 0.75 }}>{t('moderation.preview.variants.col.price')}</TableCell>
											<TableCell align="right" sx={{ fontSize: 11, py: 0.75 }}>{t('moderation.preview.variants.col.stock')}</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{item.variants.map((v) => (
											<TableRow key={v.id} sx={{ opacity: v.isActive ? 1 : 0.45 }}>
												<TableCell sx={{ fontSize: 12, py: 0.5 }}>
													<Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
														{Object.entries(v.options).map(([k, val]) => (
															<Chip
																key={k}
																label={`${k}: ${val}`}
																size="small"
																sx={{ fontSize: 10.5, height: 20 }}
															/>
														))}
													</Box>
												</TableCell>
												<TableCell sx={{ fontSize: 11.5, py: 0.5, fontFamily: 'monospace', color: tokens.ink3 }}>
													{v.sku ?? '—'}
												</TableCell>
												<TableCell align="right" sx={{ fontSize: 12, py: 0.5 }}>
													{v.price != null ? `$${v.price.toFixed(2)}` : '—'}
												</TableCell>
												<TableCell
													align="right"
													sx={{
														fontSize: 12, py: 0.5, fontWeight: 700,
														color: v.stock === 0 ? tokens.coralInk : v.stock < 5 ? tokens.amberInk : tokens.ink1,
													}}
												>
													{v.stock}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Box>
						</Box>
					</>
				)}

				{/* SEO */}
				{(metaTitle || metaDesc) && (
					<>
						<Divider sx={{ mb: 2 }} />
						<Box sx={{ mb: 2 }}>
							<Typography sx={{ fontSize: '11px', fontWeight: 700, color: tokens.ink3, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1 }}>
								{t('moderation.preview.seo.title')}
							</Typography>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
								<Box>
									<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>Meta title</Typography>
									<Typography sx={{ fontSize: 12.5 }}>{metaTitle || t('moderation.preview.seo.notSet')}</Typography>
								</Box>
								<Box>
									<Typography sx={{ fontSize: 11, color: tokens.ink3 }}>Meta description</Typography>
									<Typography sx={{ fontSize: 12.5, color: tokens.ink2 }}>{metaDesc || t('moderation.preview.seo.notSet')}</Typography>
								</Box>
							</Box>
						</Box>
					</>
				)}

				<Divider sx={{ mb: 2 }} />

				{/* Action area */}
				{isResolved ? (
					<Box
						sx={{
							bgcolor: item.status === 'APPROVED' ? tokens.cyanSoft : tokens.coralSoft,
							borderRadius: '10px', p: 1.5, textAlign: 'center',
						}}
					>
						<Typography
							sx={{
								fontSize: 13, fontWeight: 700,
								color: item.status === 'APPROVED' ? tokens.cyanInk : tokens.coralInk,
							}}
						>
							{item.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
						</Typography>
					</Box>
				) : (
					<>
						{/* Rejection reasons */}
						<Box
							sx={{
								bgcolor: tokens.bg, border: `1px solid ${tokens.line}`,
								borderRadius: '10px', p: '14px', mb: 2,
							}}
						>
							<Typography
								sx={{
									fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
									textTransform: 'uppercase', color: tokens.ink3, mb: 1,
								}}
							>
								{t('moderation.preview.rejectSection.title')}
							</Typography>
							<RadioGroup
								value={selectedReason}
								onChange={(e) => setSelectedReason(e.target.value as RejectReasonKey)}
							>
								{REJECT_REASONS.map((key) => (
									<FormControlLabel
										key={key}
										value={key}
										control={
											<Radio
												size="small"
												sx={{ color: tokens.ink3, '&.Mui-checked': { color: tokens.accent }, p: 0.5 }}
											/>
										}
										label={<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>{t(`moderation.preview.rejectSection.reasons.${key}`)}</Typography>}
										sx={{ mx: 0, py: 0.25 }}
									/>
								))}
							</RadioGroup>
						</Box>

						{/* Note textarea */}
						<Box
							component="textarea"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder={t('moderation.preview.rejectSection.notePlaceholder')}
							sx={{
								width: '100%', border: `1px solid ${tokens.line}`, borderRadius: '10px',
								p: '10px 12px', fontFamily: 'inherit', fontSize: 13, resize: 'vertical',
								minHeight: 70, outline: 'none', color: tokens.ink1, bgcolor: tokens.surface,
								boxSizing: 'border-box',
								'&:focus': { borderColor: tokens.accent },
								'&::placeholder': { color: tokens.ink3 },
							}}
						/>

						{/* Action buttons */}
						<Box sx={{ display: 'flex', gap: 1, mt: '14px' }}>
							<AppButton
								tone="danger" fullWidth loading={rejecting} onClick={handleReject}
								startIcon={<FontAwesomeIcon icon={Icons.close} />}
							>
								{rejecting ? t('moderation.preview.rejecting') : t('moderation.preview.rejectBtn')}
							</AppButton>
							<AppButton
								tone="success" fullWidth loading={approving} onClick={handleApprove}
								startIcon={<FontAwesomeIcon icon={Icons.check} />}
							>
								{approving ? t('moderation.preview.approving') : t('moderation.preview.approveBtn')}
							</AppButton>
						</Box>
					</>
				)}
			</Box>
		</AppCard>
	);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function QueueSkeleton() {
	return (
		<Box>
			{Array.from({ length: 5 }).map((_, i) => (
				<Box
					key={i}
					sx={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: 2, px: '20px', py: 2, borderBottom: `1px solid ${tokens.line2}` }}
				>
					<Skeleton variant="rounded" width={72} height={72} sx={{ borderRadius: '10px' }} />
					<Box>
						<Skeleton width={160} height={16} sx={{ mb: 1 }} />
						<Skeleton width="70%" height={20} sx={{ mb: 0.75 }} />
						<Skeleton width="50%" height={14} />
					</Box>
					<Skeleton width={60} height={32} sx={{ borderRadius: 1 }} />
				</Box>
			))}
		</Box>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductModerationPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const isPendingTab = activeTab === 'pending';
	const filterType = TAB_FILTER[activeTab];

	const { data, loading, refetch } = useQuery<ModerationQueueData, ModerationQueueVars>(
		MODERATION_QUEUE_QUERY,
		{
			variables: { input: { filterType, search: search || undefined, page: 1, pageSize: 50 } },
			fetchPolicy: 'cache-and-network',
		}
	);

	const [approveProductMutation, { loading: approving }] = useMutation(APPROVE_PRODUCT_MUTATION);
	const [rejectProductMutation, { loading: rejecting }] = useMutation(REJECT_PRODUCT_MUTATION);
	const [bulkApproveMutation, { loading: bulkApproving }] = useMutation(BULK_APPROVE_MUTATION);

	const items = useMemo(() => data?.moderationQueue.items ?? [], [data]);
	const pendingCount = data?.moderationQueue.pendingCount ?? 0;
	const approvedTodayCount = data?.moderationQueue.approvedTodayCount ?? 0;
	const rejectedTodayCount = data?.moderationQueue.rejectedTodayCount ?? 0;
	const selectedItem = items.find((it) => it.id === selectedId) ?? null;

	const tabs = [
		{ value: 'pending', label: t('moderation.tabs.pending'), count: pendingCount },
		{ value: 'approved', label: t('moderation.tabs.approved'), count: approvedTodayCount },
		{ value: 'rejected', label: t('moderation.tabs.rejected'), count: rejectedTodayCount },
	];

	const handleTabChange = (tab: string) => {
		setActiveTab(tab as ActiveTab);
		setSelectedId(null);
		setSelectedIds(new Set());
	};

	const handleSelect = useCallback((id: string) => {
		setSelectedId((prev) => (prev === id ? null : id));
	}, []);

	const handleCheck = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const handleSelectAll = useCallback((checked: boolean) => {
		if (checked) setSelectedIds(new Set(items.map((it) => it.id)));
		else setSelectedIds(new Set());
	}, [items]);

	const handleApprove = useCallback(
		async (id: string) => {
			try {
				await approveProductMutation({ variables: { id } });
				showToast(t('moderation.toast.approved'), 'success');
				setSelectedId(null);
				await refetch();
			} catch {
				showToast(t('moderation.toast.approveError'), 'error');
			}
		},
		[approveProductMutation, showToast, t, refetch]
	);

	const handleReject = useCallback(
		async (id: string, reason: string) => {
			if (!reason.trim()) {
				showToast(t('moderation.toast.reasonRequired'), 'warning');
				return;
			}
			try {
				await rejectProductMutation({ variables: { id, reason } });
				showToast(t('moderation.toast.rejected'), 'info');
				setSelectedId(null);
				await refetch();
			} catch {
				showToast(t('moderation.toast.rejectError'), 'error');
			}
		},
		[rejectProductMutation, showToast, t, refetch]
	);

	const handleBulkApprove = useCallback(async () => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		try {
			const { data: result } = await bulkApproveMutation({ variables: { ids } });
			const approved = result?.bulkApproveProducts?.approved ?? 0;
			showToast(t('moderation.toast.bulkApproved', { count: approved }), 'success');
			setSelectedIds(new Set());
			setSelectedId(null);
			await refetch();
		} catch {
			showToast(t('moderation.toast.bulkApproveError'), 'error');
		}
	}, [selectedIds, bulkApproveMutation, showToast, t, refetch]);

	const allChecked = items.length > 0 && items.every((it) => selectedIds.has(it.id));
	const someChecked = selectedIds.size > 0 && !allChecked;

	return (
		<Box>
			{/* Page head */}
			<Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
				<Box>
					<Typography variant="h5" fontWeight={700} color={tokens.ink1}>
						{t('moderation.pageTitle')}
					</Typography>
					<Typography sx={{ fontSize: 13, color: tokens.ink3, mt: 0.5 }}>
						{t('moderation.pageSubtitle')}{' '}
						{pendingCount > 0 && t('moderation.pageSubtitleCount', { count: pendingCount })}
					</Typography>
				</Box>
			</Box>

			{/* Main grid */}
			<Grid container spacing={3} alignItems="flex-start" wrap="nowrap">
				{/* Queue card */}
				<Grid item sx={{ flex: 1, minWidth: 0 }}>
					<AppCard disablePadding>
						{/* Toolbar */}
						<Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
							<AppInput
								size="small"
								placeholder={t('moderation.searchPlaceholder')}
								value={search}
								onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
								InputProps={{
									startAdornment: (
										<FontAwesomeIcon icon={Icons.search} color={tokens.ink3} style={{ marginRight: 8, fontSize: 12 }} />
									),
								}}
								sx={{ flex: 1, minWidth: 200 }}
							/>
							{isPendingTab && selectedIds.size > 0 && (
								<>
									<Typography sx={{ fontSize: 13, color: tokens.ink2 }}>
										{t('moderation.bulkBar.selected', { count: selectedIds.size })}
									</Typography>
									<AppButton
										tone="primary"
										size="small"
										loading={bulkApproving}
										startIcon={<FontAwesomeIcon icon={Icons.check} />}
										onClick={handleBulkApprove}
									>
										{t('moderation.bulkBar.approveAll')}
									</AppButton>
									<AppButton
										tone="ghost"
										size="small"
										onClick={() => setSelectedIds(new Set())}
									>
										{t('moderation.bulkBar.clear')}
									</AppButton>
								</>
							)}
						</Box>

						{/* AppTabs */}
						<AppTabs tabs={tabs} value={activeTab} onChange={handleTabChange} />

						{/* Select-all row for pending */}
						{isPendingTab && items.length > 0 && (
							<Box
								sx={{
									px: 2, py: 1,
									bgcolor: tokens.bg,
									borderBottom: `1px solid ${tokens.line2}`,
									display: 'flex',
									alignItems: 'center',
									gap: 1,
								}}
							>
								<Checkbox
									size="small"
									checked={allChecked}
									indeterminate={someChecked}
									onChange={(e) => handleSelectAll(e.target.checked)}
									sx={{ p: 0.5, color: tokens.ink3, '&.Mui-checked': { color: tokens.accent } }}
								/>
								<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
									Select all ({items.length})
								</Typography>
							</Box>
						)}

						{/* List */}
						{loading ? (
							<QueueSkeleton />
						) : items.length === 0 ? (
							<EmptyState
								icon={Icons.checkCircle}
								title={t('moderation.queue.empty')}
								description={t('moderation.queue.emptyDesc')}
							/>
						) : (
							items.map((item) => (
								<QueueRow
									key={item.id}
									item={item}
									selected={item.id === selectedId}
									checked={selectedIds.has(item.id)}
									onSelect={() => handleSelect(item.id)}
									onCheck={(chk) => handleCheck(item.id, chk)}
									isPending={isPendingTab}
								/>
							))
						)}
					</AppCard>
				</Grid>

				{/* Preview panel */}
				<Grid item sx={{ width: 380, flexShrink: 0 }}>
					<PreviewPanel
						item={selectedItem}
						onApprove={handleApprove}
						onReject={handleReject}
						approving={approving}
						rejecting={rejecting}
					/>
				</Grid>
			</Grid>
		</Box>
	);
}
