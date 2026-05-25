import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@apollo/client';
import {
	Box,
	Checkbox,
	Collapse,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	Stack,
	Switch,
	Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { AppBreadcrumbs } from '@/components/ui/AppBreadcrumbs';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppTextarea } from '@/components/ui/AppTextarea';
import { AppLoader } from '@/components/ui/AppLoader';
import { useAppToast } from '@/components/ui/AppToast';
import { CATEGORIES_QUERY, type CategoriesQueryResult } from '@/graphql/operations/catalog';
import {
	CREATE_PRODUCT_MUTATION,
	UPDATE_PRODUCT_MUTATION,
	UPLOAD_PRODUCT_MEDIA_MUTATION,
	DELETE_PRODUCT_MEDIA_MUTATION,
	MY_PRODUCT_QUERY,
} from '@/graphql/operations/sellerProducts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MediaItem {
	id: string;
	url: string;
	publicId: string;
	type: string;
	isMain: boolean;
	sortOrder: number;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const VariantOptionSchema = z.object({
	key: z.string().min(1),
	value: z.string().min(1),
});

const VariantSchema = z.object({
	sku: z.string().optional(),
	options: z.array(VariantOptionSchema).min(1, 'Add at least one option'),
	price: z.coerce.number().positive().optional().or(z.literal('')),
	stock: z.coerce.number().int().min(0).default(0),
});

const ProductFormSchema = z.object({
	titleEn: z.string().min(1).max(500),
	titleUk: z.string().min(1).max(500),
	descriptionEn: z.string().min(1).max(10000),
	descriptionUk: z.string().min(1).max(10000),
	slug: z
		.string()
		.min(1)
		.max(255)
		.regex(/^[a-z0-9-]+$/, 'Lowercase letters and hyphens only'),
	sku: z.string().min(1).max(100),
	brand: z.string().max(200).optional(),
	basePrice: z.coerce.number().positive(),
	comparePrice: z.coerce.number().positive().optional().or(z.literal('')),
	isAvailable: z.boolean().default(true),
	categoryIds: z.array(z.string()).min(1, 'At least one category required'),
	variants: z.array(VariantSchema).optional(),
	metaTitleEn: z.string().max(200).optional(),
	metaTitleUk: z.string().max(200).optional(),
	metaDescriptionEn: z.string().max(500).optional(),
	metaDescriptionUk: z.string().max(500).optional(),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 255);
}

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionCardProps {
	title: string;
	subtitle?: string;
	headerAction?: React.ReactNode;
	children: React.ReactNode;
}
function SectionCard({ title, subtitle, headerAction, children }: SectionCardProps) {
	return (
		<AppCard title={title} subtitle={subtitle} headerAction={headerAction}>
			{children}
		</AppCard>
	);
}

interface MediaThumbProps {
	media: MediaItem;
	onDelete: (id: string) => void;
	onSetMain: (id: string) => void;
	isMain: boolean;
	deleting: boolean;
}
function MediaThumb({ media, onDelete, onSetMain, isMain, deleting }: MediaThumbProps) {
	const { t } = useTranslation();
	return (
		<Box
			sx={{
				position: 'relative',
				width: 88,
				height: 88,
				borderRadius: 1.5,
				overflow: 'hidden',
				border: '2px solid',
				borderColor: isMain ? 'primary.main' : 'divider',
				flexShrink: 0,
			}}
		>
			<Box
				component="img"
				src={media.url}
				alt=""
				sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
			/>
			{isMain && (
				<Box
					sx={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						bgcolor: 'primary.main',
						color: '#fff',
						fontSize: 9,
						fontWeight: 700,
						textAlign: 'center',
						textTransform: 'uppercase',
						letterSpacing: '0.08em',
						py: 0.3,
					}}
				>
					Main
				</Box>
			)}
			<Box
				sx={{
					position: 'absolute',
					top: 2,
					right: 2,
					display: 'flex',
					gap: 0.5,
				}}
			>
				{!isMain && (
					<IconButton
						size="small"
						onClick={() => onSetMain(media.id)}
						title={t('sellerProduct.media.setMain')}
						sx={{
							width: 20,
							height: 20,
							bgcolor: 'rgba(0,0,0,0.55)',
							color: '#fff',
							'&:hover': { bgcolor: 'primary.main' },
						}}
					>
						<FontAwesomeIcon icon={Icons.star} style={{ fontSize: 9 }} />
					</IconButton>
				)}
				<IconButton
					size="small"
					disabled={deleting}
					onClick={() => onDelete(media.id)}
					title={t('sellerProduct.media.removeImage')}
					sx={{
						width: 20,
						height: 20,
						bgcolor: 'rgba(0,0,0,0.55)',
						color: '#fff',
						'&:hover': { bgcolor: 'error.main' },
					}}
				>
					<FontAwesomeIcon icon={Icons.close} style={{ fontSize: 9 }} />
				</IconButton>
			</Box>
		</Box>
	);
}

interface UploadZoneProps {
	label: string;
	hint: string;
	accept?: string;
	disabled?: boolean;
	loading?: boolean;
	onFile: (file: File) => void;
}
function UploadZone({
	label,
	hint,
	accept = 'image/*',
	disabled,
	loading,
	onFile,
}: UploadZoneProps) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<Box
			onClick={() => !disabled && !loading && inputRef.current?.click()}
			sx={{
				width: 88,
				height: 88,
				borderRadius: 1.5,
				border: '1.5px dashed',
				borderColor: disabled ? 'divider' : 'primary.light',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 0.5,
				cursor: disabled || loading ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.5 : 1,
				bgcolor: 'background.paper',
				transition: 'all 0.15s',
				'&:hover':
					disabled || loading ? {} : { bgcolor: 'primary.50', borderColor: 'primary.main' },
				flexShrink: 0,
			}}
		>
			<FontAwesomeIcon
				icon={loading ? Icons.spinner : Icons.upload}
				spin={loading}
				style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }}
			/>
			<Typography
				sx={{
					fontSize: 9.5,
					color: 'text.secondary',
					textAlign: 'center',
					px: 0.5,
					lineHeight: 1.3,
				}}
			>
				{loading ? t('sellerProduct.media.uploading') : label}
			</Typography>
			<Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center', px: 0.5 }}>
				{hint}
			</Typography>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				style={{ display: 'none' }}
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onFile(file);
					e.target.value = '';
				}}
			/>
		</Box>
	);
}

// ─── Category Tree ────────────────────────────────────────────────────────────

interface CategoryNode {
	id: string;
	slug: string;
	name: string;
	productCount: number;
	parentId?: string | null;
	children?: CategoryNode[];
}

interface CategoryCheckboxProps {
	node: CategoryNode;
	selected: string[];
	depth?: number;
	onChange: (id: string, checked: boolean) => void;
}
function CategoryCheckbox({ node, selected, depth = 0, onChange }: CategoryCheckboxProps) {
	const [open, setOpen] = useState(depth < 1);
	const hasChildren = node.children && node.children.length > 0;

	return (
		<Box>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: depth * 2.5, py: 0.25 }}>
				{hasChildren ? (
					<IconButton
						size="small"
						onClick={() => setOpen((v) => !v)}
						sx={{ width: 22, height: 22, color: 'text.secondary' }}
					>
						<FontAwesomeIcon
							icon={open ? Icons.angleDown : Icons.angleRight}
							style={{ fontSize: 11 }}
						/>
					</IconButton>
				) : (
					<Box sx={{ width: 22 }} />
				)}
				<FormControlLabel
					sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13.5 } }}
					control={
						<Checkbox
							size="small"
							checked={selected.includes(node.id)}
							onChange={(e) => onChange(node.id, e.target.checked)}
							sx={{ py: 0.5 }}
						/>
					}
					label={`${node.name} (${node.productCount})`}
				/>
			</Box>
			{hasChildren && (
				<Collapse in={open}>
					{node.children!.map((child) => (
						<CategoryCheckbox
							key={child.id}
							node={child}
							selected={selected}
							depth={depth + 1}
							onChange={onChange}
						/>
					))}
				</Collapse>
			)}
		</Box>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SellerProductFormPage() {
	const { t, i18n } = useTranslation();
	const { id } = useParams<{ id?: string }>();
	const navigate = useNavigate();
	const { showToast } = useAppToast();
	const isEdit = Boolean(id);

	// Track slug was manually edited
	const slugManualRef = useRef(false);
	// Media items state (returned by server after upload)
	const [media, setMedia] = useState<MediaItem[]>([]);
	const [uploadingMedia, setUploadingMedia] = useState(false);
	const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
	const [productStatus, setProductStatus] = useState<string | null>(null);

	// ── Form ────────────────────────────────────────────────────────────────

	const {
		control,
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<ProductFormValues>({
		resolver: zodResolver(ProductFormSchema),
		defaultValues: {
			titleEn: '',
			titleUk: '',
			descriptionEn: '',
			descriptionUk: '',
			slug: '',
			sku: '',
			brand: '',
			basePrice: undefined,
			comparePrice: '',
			isAvailable: true,
			categoryIds: [],
			variants: [],
			metaTitleEn: '',
			metaTitleUk: '',
			metaDescriptionEn: '',
			metaDescriptionUk: '',
		},
	});

	const {
		fields: variantFields,
		append: appendVariant,
		remove: removeVariant,
	} = useFieldArray({
		control,
		name: 'variants',
	});

	// Auto-generate slug from titleEn
	const titleEn = watch('titleEn');
	useEffect(() => {
		if (!isEdit && !slugManualRef.current && titleEn) {
			setValue('slug', slugify(titleEn), { shouldValidate: false });
		}
	}, [titleEn, isEdit, setValue]);

	// ── Queries ─────────────────────────────────────────────────────────────

	const { data: categoriesData, loading: categoriesLoading } = useQuery<CategoriesQueryResult>(
		CATEGORIES_QUERY,
		{ variables: { language: i18n.language.toUpperCase() } }
	);

	const { loading: productLoading } = useQuery(MY_PRODUCT_QUERY, {
		variables: { id },
		skip: !isEdit,
		onCompleted: (data) => {
			if (!data?.myProduct) return;
			const p = data.myProduct;
			slugManualRef.current = true;
			setProductStatus(p.status ?? null);
			reset({
				titleEn: p.titleEn,
				titleUk: p.titleUk,
				descriptionEn: p.descriptionEn,
				descriptionUk: p.descriptionUk,
				slug: p.slug,
				sku: p.sku,
				brand: p.brand ?? '',
				basePrice: p.basePrice,
				comparePrice: p.comparePrice ?? '',
				isAvailable: p.isAvailable,
				categoryIds: p.categories.map((c: { id: string }) => c.id),
				variants: p.variants.map(
					(v: {
						sku?: string | null;
						options: Record<string, string>;
						price?: number | null;
						stock: number;
					}) => ({
						sku: v.sku ?? '',
						options: Object.entries(v.options).map(([key, value]) => ({ key, value })),
						price: v.price ?? '',
						stock: v.stock,
					})
				),
				metaTitleEn: p.metaTitleEn ?? '',
				metaTitleUk: p.metaTitleUk ?? '',
				metaDescriptionEn: p.metaDescriptionEn ?? '',
				metaDescriptionUk: p.metaDescriptionUk ?? '',
			});
			setMedia(p.media);
		},
	});

	// ── Mutations ────────────────────────────────────────────────────────────

	const [createProduct] = useMutation(CREATE_PRODUCT_MUTATION);
	const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION);
	const [uploadMedia] = useMutation(UPLOAD_PRODUCT_MEDIA_MUTATION);
	const [deleteMedia] = useMutation(DELETE_PRODUCT_MEDIA_MUTATION);

	// ── Submit ───────────────────────────────────────────────────────────────

	const buildPayload = (
		values: ProductFormValues,
		options?: { submitForReview?: boolean; statusAction?: 'SUBMIT_FOR_REVIEW' | 'MAKE_DRAFT' }
	) => ({
		titleEn: values.titleEn,
		titleUk: values.titleUk,
		descriptionEn: values.descriptionEn,
		descriptionUk: values.descriptionUk,
		slug: values.slug,
		sku: values.sku,
		brand: values.brand || null,
		basePrice: Number(values.basePrice),
		comparePrice: values.comparePrice ? Number(values.comparePrice) : null,
		isAvailable: values.isAvailable,
		...(options?.submitForReview !== undefined
			? { submitForReview: options.submitForReview }
			: {}),
		...(options?.statusAction ? { statusAction: options.statusAction } : {}),
		categoryIds: values.categoryIds,
		variants: values.variants?.map((v) => ({
			sku: v.sku || null,
			options: Object.fromEntries(v.options.map((o) => [o.key, o.value])),
			price: v.price ? Number(v.price) : null,
			stock: Number(v.stock),
		})),
		metaTitleEn: values.metaTitleEn || null,
		metaTitleUk: values.metaTitleUk || null,
		metaDescriptionEn: values.metaDescriptionEn || null,
		metaDescriptionUk: values.metaDescriptionUk || null,
	});

	const onSubmit = async (
		values: ProductFormValues,
		options?: { submitForReview?: boolean; statusAction?: 'SUBMIT_FOR_REVIEW' | 'MAKE_DRAFT' }
	) => {
		try {
			if (isEdit && id) {
				await updateProduct({ variables: { id, input: buildPayload(values, options) } });
				showToast(t('sellerProduct.updateSuccess'), 'success');
			} else {
				const { data } = await createProduct({
					variables: { input: buildPayload(values, options) },
				});
				if (data?.createProduct?.slug && data.createProduct.slug !== values.slug) {
					showToast(
						t('sellerProduct.slugAutoUpdated', { slug: data.createProduct.slug }),
						'warning'
					);
				}
				showToast(
					options?.submitForReview
						? t('sellerProduct.updateSuccess')
						: t('sellerProduct.createSuccess'),
					'success'
				);
				navigate(ROUTES.SELLER_PRODUCT_EDIT(data.createProduct.id));
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('SLUG_TAKEN')) {
				showToast(t('sellerProduct.slugTaken'), 'error');
			} else {
				showToast(t('common.error'), 'error');
			}
		}
	};

	// ── Media handlers ────────────────────────────────────────────────────────

	const handleMediaUpload = useCallback(
		async (file: File, isMain = false) => {
			setUploadingMedia(true);
			try {
				const dataUrl = await fileToDataUrl(file);
				const { data } = await uploadMedia({
					variables: {
						productId: id,
						dataUrl,
						isMain,
						mediaType: file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
					},
				});
				const newItem: MediaItem = data.uploadProductMedia;
				setMedia((prev) => {
					if (isMain || prev.length === 0) {
						return [{ ...newItem, isMain: true }, ...prev.map((m) => ({ ...m, isMain: false }))];
					}
					return [...prev, newItem];
				});
			} catch {
				showToast(t('common.error'), 'error');
			} finally {
				setUploadingMedia(false);
			}
		},
		[id, uploadMedia, showToast, t]
	);

	const handleDeleteMedia = useCallback(
		async (mediaId: string) => {
			setDeletingMediaId(mediaId);
			try {
				await deleteMedia({ variables: { mediaId } });
				setMedia((prev) => prev.filter((m) => m.id !== mediaId));
				showToast(t('sellerProduct.deleteMediaSuccess'), 'success');
			} catch {
				showToast(t('common.error'), 'error');
			} finally {
				setDeletingMediaId(null);
			}
		},
		[deleteMedia, showToast, t]
	);

	const handleSetMain = useCallback((mediaId: string) => {
		setMedia((prev) => prev.map((m) => ({ ...m, isMain: m.id === mediaId })));
	}, []);

	const handleCategoryChange = useCallback(
		(catId: string, checked: boolean) => {
			const current = watch('categoryIds') ?? [];
			setValue('categoryIds', checked ? [...current, catId] : current.filter((c) => c !== catId), {
				shouldValidate: true,
			});
		},
		[watch, setValue]
	);

	// ── Render ────────────────────────────────────────────────────────────────

	if (isEdit && productLoading) return <AppLoader />;

	const categories = categoriesData?.categories ?? [];
	const watchedCategoryIds = watch('categoryIds') ?? [];
	const mainImage = media.find((m) => m.isMain);
	const gallery = media.filter((m) => !m.isMain && m.type === 'IMAGE');
	const canUploadMore = media.filter((m) => m.type === 'IMAGE').length < 9;
	const isDraftEdit = isEdit && productStatus === 'DRAFT';
	const isNonDraftEdit = isEdit && productStatus && productStatus !== 'DRAFT';

	return (
		<Box sx={{ maxWidth: 860, mx: 'auto' }}>
			{/* ── Page head ──────────────────────────────────────────────── */}
			<Box sx={{ mb: 3 }}>
				<AppBreadcrumbs
					items={[
						{ label: t('sellerProduct.breadcrumbProducts'), href: ROUTES.SELLER_PRODUCTS },
						{
							label: isEdit ? t('sellerProduct.breadcrumbEdit') : t('sellerProduct.breadcrumbNew'),
						},
					]}
				/>
				<Box
					sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}
				>
					<Typography variant="h5" sx={{ fontWeight: 700, fontSize: 22 }}>
						{isEdit ? t('sellerProduct.editTitle') : t('sellerProduct.newTitle')}
					</Typography>
					<Stack direction="row" spacing={1}>
						<AppButton
							variant="outlined"
							color="inherit"
							disabled={isSubmitting}
							onClick={() => navigate(ROUTES.SELLER_PRODUCTS)}
						>
							{t('common.cancel')}
						</AppButton>
						{!isEdit && (
							<AppButton
								variant="outlined"
								loading={isSubmitting}
								onClick={handleSubmit((values) => onSubmit(values, { submitForReview: false }))}
							>
								{t('sellerProduct.saveDraft')}
							</AppButton>
						)}
						{isDraftEdit && (
							<AppButton
								variant="outlined"
								loading={isSubmitting}
								onClick={handleSubmit((values) => onSubmit(values))}
							>
								{t('sellerProduct.updateProduct')}
							</AppButton>
						)}
						{isNonDraftEdit && (
							<AppButton
								variant="outlined"
								loading={isSubmitting}
								onClick={handleSubmit((values) => onSubmit(values))}
							>
								{t('sellerProduct.updateProduct')}
							</AppButton>
						)}
						<AppButton
							variant="contained"
							loading={isSubmitting}
							onClick={handleSubmit((values) =>
								onSubmit(
									values,
									isNonDraftEdit
										? { statusAction: 'MAKE_DRAFT' }
										: isEdit
											? { statusAction: 'SUBMIT_FOR_REVIEW' }
											: { submitForReview: true }
								)
							)}
						>
							{isNonDraftEdit
								? t('sellerProduct.makeDraft')
								: t('sellerProduct.submitForReview')}
						</AppButton>
					</Stack>
				</Box>
			</Box>

			<Stack spacing={3}>
				{/* ── 1. Basic Information ──────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.basic')}
					subtitle={t('sellerProduct.section.basicSub')}
				>
					<Grid container spacing={2.5}>
						<Grid item xs={12} md={6}>
							<AppInput
								label={t('sellerProduct.field.titleEn')}
								required
								{...register('titleEn')}
								error={Boolean(errors.titleEn)}
								helperText={errors.titleEn?.message}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppInput
								label={t('sellerProduct.field.titleUk')}
								required
								{...register('titleUk')}
								error={Boolean(errors.titleUk)}
								helperText={errors.titleUk?.message}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppTextarea
								label={t('sellerProduct.field.descriptionEn')}
								required
								rows={5}
								maxLength={10000}
								{...register('descriptionEn')}
								error={Boolean(errors.descriptionEn)}
								helperText={errors.descriptionEn?.message}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppTextarea
								label={t('sellerProduct.field.descriptionUk')}
								required
								rows={5}
								maxLength={10000}
								{...register('descriptionUk')}
								error={Boolean(errors.descriptionUk)}
								helperText={errors.descriptionUk?.message}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppInput
								label={t('sellerProduct.field.slug')}
								required
								helperText={errors.slug?.message ?? t('sellerProduct.field.slugHint')}
								error={Boolean(errors.slug)}
								{...register('slug', {
									onChange: () => {
										slugManualRef.current = true;
									},
								})}
								inputProps={{ style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 13 } }}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<AppInput
								label={t('sellerProduct.field.sku')}
								required
								{...register('sku')}
								error={Boolean(errors.sku)}
								helperText={errors.sku?.message}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<AppInput label={t('sellerProduct.field.brand')} {...register('brand')} />
						</Grid>
					</Grid>
				</SectionCard>

				{/* ── 2. Pricing ───────────────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.pricing')}
					subtitle={t('sellerProduct.section.pricingSub')}
				>
					<Grid container spacing={2.5} alignItems="flex-start">
						<Grid item xs={12} md={4}>
							<AppInput
								label={t('sellerProduct.field.basePrice')}
								required
								type="number"
								inputProps={{ step: '0.01', min: '0' }}
								{...register('basePrice')}
								error={Boolean(errors.basePrice)}
								helperText={errors.basePrice?.message}
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<AppInput
								label={t('sellerProduct.field.comparePrice')}
								type="number"
								inputProps={{ step: '0.01', min: '0' }}
								helperText={
									errors.comparePrice?.message ?? t('sellerProduct.field.comparePriceHint')
								}
								error={Boolean(errors.comparePrice)}
								{...register('comparePrice')}
							/>
						</Grid>
						<Grid item xs={12} md={4} sx={{ pt: '22px !important' }}>
							<Controller
								name="isAvailable"
								control={control}
								render={({ field }) => (
									<FormControlLabel
										control={
											<Switch
												checked={field.value}
												onChange={(e) => field.onChange(e.target.checked)}
											/>
										}
										label={
											<Typography sx={{ fontSize: 13.5 }}>
												{t('sellerProduct.field.isAvailable')}
											</Typography>
										}
									/>
								)}
							/>
						</Grid>
					</Grid>
				</SectionCard>

				{/* ── 3. Categories ─────────────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.categories')}
					subtitle={t('sellerProduct.section.categoriesSub')}
				>
					{categoriesLoading ? (
						<AppLoader size="sm" />
					) : (
						<>
							{errors.categoryIds && (
								<Typography color="error" sx={{ fontSize: 12.5, mb: 1 }}>
									{errors.categoryIds.message}
								</Typography>
							)}
							<Box
								sx={{
									maxHeight: 320,
									overflowY: 'auto',
									border: '1px solid',
									borderColor: errors.categoryIds ? 'error.main' : 'divider',
									borderRadius: 1.5,
									p: 1,
								}}
							>
								{categories.map((cat) => (
									<CategoryCheckbox
										key={cat.id}
										node={cat}
										selected={watchedCategoryIds}
										onChange={handleCategoryChange}
									/>
								))}
							</Box>
						</>
					)}
				</SectionCard>

				{/* ── 4. Variants ───────────────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.variants')}
					subtitle={t('sellerProduct.section.variantsSub')}
					headerAction={
						<AppButton
							size="small"
							variant="outlined"
							startIcon={<FontAwesomeIcon icon={Icons.add} />}
							onClick={() =>
								appendVariant({
									sku: '',
									options: [{ key: '', value: '' }],
									price: '',
									stock: 0,
								})
							}
						>
							{t('sellerProduct.variant.add')}
						</AppButton>
					}
				>
					{variantFields.length === 0 ? (
						<Typography color="text.secondary" sx={{ fontSize: 13.5, py: 1 }}>
							{t('sellerProduct.variant.add')} — no variants yet
						</Typography>
					) : (
						<Stack divider={<Divider sx={{ my: 2 }} />} spacing={0}>
							{variantFields.map((field, varIdx) => (
								<VariantRow
									key={field.id}
									varIdx={varIdx}
									control={control}
									register={register}
									errors={errors}
									onRemove={() => removeVariant(varIdx)}
								/>
							))}
						</Stack>
					)}
				</SectionCard>

				{/* ── 5. Media ──────────────────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.media')}
					subtitle={t('sellerProduct.section.mediaSub')}
				>
					{!isEdit && (
						<Typography color="text.secondary" sx={{ fontSize: 12.5, mb: 2 }}>
							Save the product first before uploading images.
						</Typography>
					)}

					{isEdit && (
						<>
							{/* Main image row */}
							<Typography
								sx={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'text.secondary',
									mb: 1,
								}}
							>
								{t('sellerProduct.media.mainLabel')}
							</Typography>
							<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
								{mainImage ? (
									<MediaThumb
										media={mainImage}
										isMain
										onDelete={handleDeleteMedia}
										onSetMain={handleSetMain}
										deleting={deletingMediaId === mainImage.id}
									/>
								) : (
									<UploadZone
										label={t('sellerProduct.media.uploadMain')}
										hint={t('sellerProduct.media.sizeHint')}
										loading={uploadingMedia && media.length === 0}
										onFile={(f) => handleMediaUpload(f, true)}
									/>
								)}
							</Box>

							<Divider sx={{ mb: 2 }} />

							{/* Gallery row */}
							<Typography
								sx={{
									fontSize: 12,
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'text.secondary',
									mb: 1,
								}}
							>
								{t('sellerProduct.media.galleryLabel')}
							</Typography>
							<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
								{gallery.map((m) => (
									<MediaThumb
										key={m.id}
										media={m}
										isMain={false}
										onDelete={handleDeleteMedia}
										onSetMain={handleSetMain}
										deleting={deletingMediaId === m.id}
									/>
								))}
								{canUploadMore && (
									<UploadZone
										label={t('sellerProduct.media.uploadGallery')}
										hint={t('sellerProduct.media.sizeHint')}
										loading={uploadingMedia && media.length > 0}
										disabled={!canUploadMore}
										onFile={(f) => handleMediaUpload(f, false)}
									/>
								)}
								{!canUploadMore && (
									<Typography color="text.secondary" sx={{ fontSize: 12.5, alignSelf: 'center' }}>
										{t('sellerProduct.media.limitReached')}
									</Typography>
								)}
							</Box>
						</>
					)}
				</SectionCard>

				{/* ── 6. SEO ────────────────────────────────────────────────── */}
				<SectionCard
					title={t('sellerProduct.section.seo')}
					subtitle={t('sellerProduct.section.seoSub')}
				>
					<Grid container spacing={2.5}>
						<Grid item xs={12} md={6}>
							<AppInput
								label={t('sellerProduct.field.metaTitleEn')}
								{...register('metaTitleEn')}
								inputProps={{ maxLength: 200 }}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppInput
								label={t('sellerProduct.field.metaTitleUk')}
								{...register('metaTitleUk')}
								inputProps={{ maxLength: 200 }}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppTextarea
								label={t('sellerProduct.field.metaDescriptionEn')}
								rows={3}
								maxLength={500}
								{...register('metaDescriptionEn')}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<AppTextarea
								label={t('sellerProduct.field.metaDescriptionUk')}
								rows={3}
								maxLength={500}
								{...register('metaDescriptionUk')}
							/>
						</Grid>
					</Grid>
				</SectionCard>

				{/* ── Bottom action bar ──────────────────────────────────────── */}
				<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pb: 4 }}>
					<AppButton
						variant="outlined"
						color="inherit"
						disabled={isSubmitting}
						onClick={() => navigate(ROUTES.SELLER_PRODUCTS)}
					>
						{t('common.cancel')}
					</AppButton>
					{!isEdit && (
						<AppButton
							variant="outlined"
							loading={isSubmitting}
							onClick={handleSubmit((values) => onSubmit(values, { submitForReview: false }))}
						>
							{t('sellerProduct.saveDraft')}
						</AppButton>
					)}
					{isDraftEdit && (
						<AppButton
							variant="outlined"
							loading={isSubmitting}
							onClick={handleSubmit((values) => onSubmit(values))}
						>
							{t('sellerProduct.updateProduct')}
						</AppButton>
					)}
					{isNonDraftEdit && (
						<AppButton
							variant="outlined"
							loading={isSubmitting}
							onClick={handleSubmit((values) => onSubmit(values))}
						>
							{t('sellerProduct.updateProduct')}
						</AppButton>
					)}
					<AppButton
						variant="contained"
						loading={isSubmitting}
						onClick={handleSubmit((values) =>
							onSubmit(
								values,
								isNonDraftEdit
									? { statusAction: 'MAKE_DRAFT' }
									: isEdit
										? { statusAction: 'SUBMIT_FOR_REVIEW' }
										: { submitForReview: true }
							)
						)}
					>
						{isNonDraftEdit
							? t('sellerProduct.makeDraft')
							: t('sellerProduct.submitForReview')}
					</AppButton>
				</Box>
			</Stack>
		</Box>
	);
}

// ─── Variant Row ─────────────────────────────────────────────────────────────

interface VariantRowProps {
	varIdx: number;
	control: ReturnType<typeof useForm<ProductFormValues>>['control'];
	register: ReturnType<typeof useForm<ProductFormValues>>['register'];
	errors: ReturnType<typeof useForm<ProductFormValues>>['formState']['errors'];
	onRemove: () => void;
}

function VariantRow({ varIdx, control, register, errors, onRemove }: VariantRowProps) {
	const { t } = useTranslation();
	const {
		fields: optionFields,
		append: appendOption,
		remove: removeOption,
	} = useFieldArray({
		control,
		name: `variants.${varIdx}.options` as const,
	});

	return (
		<Box>
			<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
				<Typography sx={{ fontWeight: 600, fontSize: 14 }}>Variant #{varIdx + 1}</Typography>
				<AppButton
					size="small"
					variant="text"
					color="error"
					startIcon={<FontAwesomeIcon icon={Icons.delete} />}
					onClick={onRemove}
				>
					{t('sellerProduct.variant.remove')}
				</AppButton>
			</Box>

			{/* Options */}
			<Stack spacing={1} sx={{ mb: 1.5 }}>
				{optionFields.map((opt, optIdx) => (
					<Box key={opt.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
						<AppInput
							label={t('sellerProduct.variant.optionKey')}
							size="small"
							sx={{ flex: 1 }}
							{...register(`variants.${varIdx}.options.${optIdx}.key`)}
						/>
						<AppInput
							label={t('sellerProduct.variant.optionValue')}
							size="small"
							sx={{ flex: 1 }}
							{...register(`variants.${varIdx}.options.${optIdx}.value`)}
						/>
						{optionFields.length > 1 && (
							<IconButton
								size="small"
								onClick={() => removeOption(optIdx)}
								sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
							>
								<FontAwesomeIcon icon={Icons.close} style={{ fontSize: 12 }} />
							</IconButton>
						)}
					</Box>
				))}
				<AppButton
					size="small"
					variant="text"
					startIcon={<FontAwesomeIcon icon={Icons.add} />}
					onClick={() => appendOption({ key: '', value: '' })}
					sx={{ alignSelf: 'flex-start' }}
				>
					{t('sellerProduct.variant.addOption')}
				</AppButton>
			</Stack>

			{/* SKU + Price + Stock */}
			<Grid container spacing={2}>
				<Grid item xs={12} md={4}>
					<AppInput
						label={t('sellerProduct.variant.sku')}
						size="small"
						{...register(`variants.${varIdx}.sku`)}
					/>
				</Grid>
				<Grid item xs={12} md={4}>
					<AppInput
						label={t('sellerProduct.variant.price')}
						size="small"
						type="number"
						inputProps={{ step: '0.01', min: '0' }}
						{...register(`variants.${varIdx}.price`)}
						error={Boolean(errors.variants?.[varIdx]?.price)}
					/>
				</Grid>
				<Grid item xs={12} md={4}>
					<AppInput
						label={t('sellerProduct.variant.stock')}
						size="small"
						type="number"
						inputProps={{ step: '1', min: '0' }}
						{...register(`variants.${varIdx}.stock`)}
						error={Boolean(errors.variants?.[varIdx]?.stock)}
					/>
				</Grid>
			</Grid>
		</Box>
	);
}
