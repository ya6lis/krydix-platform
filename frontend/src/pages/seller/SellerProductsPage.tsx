import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import {
	Box,
	Breadcrumbs,
	Divider,
	IconButton,
	Link,
	Menu,
	MenuItem,
	Stack,
	Stepper,
	Step,
	StepLabel,
	Tab,
	Tabs,
	Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '@/constants/icons';
import { tokens } from '@/theme';
import {
	AppButton,
	AppCard,
	AppInput,
	AppModal,
	AppPagination,
	AppTable,
	AppTableColumn,
	ConfirmDialog,
	StatusBadge,
	useAppToast,
} from '@/components/ui';
import {
	MY_PRODUCTS_QUERY,
	DUPLICATE_PRODUCT_MUTATION,
	ARCHIVE_PRODUCT_MUTATION,
	DEACTIVATE_PRODUCT_MUTATION,
	ACTIVATE_PRODUCT_MUTATION,
	PREVIEW_IMPORT_MUTATION,
	CONFIRM_IMPORT_MUTATION,
	type SellerProductListItem,
	type ImportPreviewRow,
	type MyProductsResult,
} from '@/graphql/operations/sellerProducts';
// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_TABS = [
	{ value: '', labelKey: 'sellerProducts.filterAll' },
	{ value: 'DRAFT', labelKey: 'sellerProducts.filterDraft' },
	{ value: 'PENDING_MODERATION', labelKey: 'sellerProducts.filterPending' },
	{ value: 'APPROVED', labelKey: 'sellerProducts.filterApproved' },
	{ value: 'REJECTED', labelKey: 'sellerProducts.filterRejected' },
	{ value: 'ARCHIVED', labelKey: 'sellerProducts.filterArchived' },
];

const PAGE_SIZE = 20;

// ─── Row action menu ──────────────────────────────────────────────────────────

interface RowMenuProps {
	product: SellerProductListItem;
	onEdit: () => void;
	onDuplicate: () => void;
	onToggleActive: () => void;
	onArchive: () => void;
}

function RowMenu({ product, onEdit, onDuplicate, onToggleActive, onArchive }: RowMenuProps) {
	const { t } = useTranslation();
	const [anchor, setAnchor] = useState<null | HTMLElement>(null);
	const isActive = product.isAvailable;
	const isArchived = product.status === 'ARCHIVED';

	return (
		<>
			<IconButton
				size="small"
				onClick={(e) => setAnchor(e.currentTarget)}
				aria-label={t('sellerProducts.action.edit')}
			>
				<FontAwesomeIcon icon={Icons.more} size="xs" />
			</IconButton>

			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
				<MenuItem
					onClick={() => { setAnchor(null); onEdit(); }}
					sx={{ gap: 1.5, fontSize: 13 }}
				>
					<FontAwesomeIcon icon={Icons.edit} fixedWidth />
					{t('sellerProducts.action.edit')}
				</MenuItem>

				<MenuItem
					onClick={() => { setAnchor(null); onDuplicate(); }}
					sx={{ gap: 1.5, fontSize: 13 }}
				>
					<FontAwesomeIcon icon={Icons.duplicate} fixedWidth />
					{t('sellerProducts.action.duplicate')}
				</MenuItem>

				{!isArchived && (
					<MenuItem
						onClick={() => { setAnchor(null); onToggleActive(); }}
						sx={{ gap: 1.5, fontSize: 13, color: isActive ? tokens.amberInk : tokens.ink2 }}
					>
						<FontAwesomeIcon icon={isActive ? Icons.ban : Icons.check} fixedWidth />
						{t(isActive ? 'sellerProducts.action.deactivate' : 'sellerProducts.action.activate')}
					</MenuItem>
				)}

				{!isArchived && (
					<MenuItem
						onClick={() => { setAnchor(null); onArchive(); }}
						sx={{ gap: 1.5, fontSize: 13, color: tokens.coralInk }}
					>
						<FontAwesomeIcon icon={Icons.archive} fixedWidth />
						{t('sellerProducts.action.archive')}
					</MenuItem>
				)}
			</Menu>
		</>
	);
}

// ─── Import modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
	open: boolean;
	onClose: () => void;
	onDone: () => void;
}

type ImportStep = 0 | 1 | 2;

function ImportModal({ open, onClose, onDone }: ImportModalProps) {
	const { t } = useTranslation();
	const { showToast } = useAppToast();
	const fileRef = useRef<HTMLInputElement>(null);
	const [step, setStep] = useState<ImportStep>(0);
	const [fileName, setFileName] = useState('');
	const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
	const [importResult, setImportResult] = useState<{
		created: number;
		updated: number;
		failed: number;
	} | null>(null);

	const [previewImport, { loading: previewing }] = useMutation(PREVIEW_IMPORT_MUTATION);
	const [confirmImport, { loading: confirming }] = useMutation(CONFIRM_IMPORT_MUTATION);

	const validRows = previewRows.filter((r) => r.isValid);
	const invalidCount = previewRows.length - validRows.length;

	const handleFile = async (file: File) => {
		setFileName(file.name);
		const reader = new FileReader();
		reader.onload = async (e) => {
			const dataUrl = e.target?.result as string;
			const fileType = file.name.endsWith('.csv') ? 'csv' : 'xlsx';
			try {
				const { data } = await previewImport({ variables: { dataUrl, fileType } });
				setPreviewRows(data?.previewImport ?? []);
				setStep(1);
			} catch {
				showToast(t('common.error'), 'error');
			}
		};
		reader.readAsDataURL(file);
	};

	const handleConfirm = async () => {
		try {
			const rows = validRows.map((r) => ({
				titleEn: r.titleEn,
				titleUk: r.titleUk,
				descriptionEn: r.titleEn, // fallback — import template has these columns
				descriptionUk: r.titleUk,
				slug: r.slug,
				sku: r.sku,
				brand: r.brand,
				basePrice: r.basePrice,
			}));
			const { data } = await confirmImport({ variables: { rows } });
			setImportResult(data?.confirmImport ?? { created: 0, updated: 0, failed: 0 });
			setStep(2);
		} catch {
			showToast(t('common.error'), 'error');
		}
	};

	const handleClose = () => {
		setStep(0);
		setFileName('');
		setPreviewRows([]);
		setImportResult(null);
		onClose();
	};

	const handleDone = () => {
		handleClose();
		onDone();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file);
	};

	const stepLabels = [
		t('sellerProducts.import.step1'),
		t('sellerProducts.import.step2'),
		t('sellerProducts.import.step3'),
	];

	// ── Preview table columns ──
	const previewCols: AppTableColumn<ImportPreviewRow>[] = [
		{
			key: 'rowIndex',
			label: t('sellerProducts.import.previewCol.row'),
			width: 50,
			render: (r) => (
				<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>{r.rowIndex}</Typography>
			),
		},
		{
			key: 'titleEn',
			label: t('sellerProducts.import.previewCol.titleEn'),
			render: (r) => (
				<Typography sx={{ fontSize: 13 }}>{r.titleEn || '—'}</Typography>
			),
		},
		{
			key: 'sku',
			label: t('sellerProducts.import.previewCol.sku'),
			width: 120,
			render: (r) => <Typography sx={{ fontSize: 13 }}>{r.sku}</Typography>,
		},
		{
			key: 'basePrice',
			label: t('sellerProducts.import.previewCol.price'),
			width: 80,
			align: 'right',
			render: (r) => (
				<Typography sx={{ fontSize: 13 }}>${r.basePrice.toFixed(2)}</Typography>
			),
		},
		{
			key: 'isValid',
			label: t('sellerProducts.import.previewCol.status'),
			width: 80,
			align: 'center',
			render: (r) =>
				r.isValid ? (
					<FontAwesomeIcon icon={Icons.check} color={tokens.cyan} />
				) : (
					<Box title={r.errors.join('; ')}>
						<FontAwesomeIcon icon={Icons.warning} color={tokens.amber} />
					</Box>
				),
		},
	];

	return (
		<AppModal
			open={open}
			onClose={handleClose}
			title={t('sellerProducts.import.title')}
			maxWidth="md"
			footer={
				step === 1 ? (
					<Stack direction="row" spacing={1.5} justifyContent="flex-end" width="100%">
						<AppButton variant="outlined" onClick={handleClose}>
							{t('sellerProducts.import.cancelBtn')}
						</AppButton>
						<AppButton
							variant="contained"
							onClick={handleConfirm}
							loading={confirming}
							disabled={validRows.length === 0}
						>
							{t('sellerProducts.import.confirmBtn', { count: validRows.length })}
						</AppButton>
					</Stack>
				) : step === 2 ? (
					<Stack direction="row" justifyContent="flex-end" width="100%">
						<AppButton variant="contained" onClick={handleDone}>
							{t('sellerProducts.import.doneBtn')}
						</AppButton>
					</Stack>
				) : undefined
			}
		>
			<Stepper activeStep={step} sx={{ mb: 3 }}>
				{stepLabels.map((label) => (
					<Step key={label}>
						<StepLabel>{label}</StepLabel>
					</Step>
				))}
			</Stepper>

			{/* Step 0: Upload */}
			{step === 0 && (
				<Box>
					<Box
						onDragOver={(e) => e.preventDefault()}
						onDrop={handleDrop}
						onClick={() => fileRef.current?.click()}
						sx={{
							border: `2px dashed ${tokens.line}`,
							borderRadius: 2,
							p: 5,
							textAlign: 'center',
							cursor: 'pointer',
							'&:hover': { borderColor: tokens.accent, bgcolor: tokens.accentSoft },
							transition: 'border-color 150ms, background 150ms',
						}}
					>
						<FontAwesomeIcon
							icon={Icons.fileExcel}
							size="2x"
							color={tokens.ink3}
							style={{ marginBottom: 12 }}
						/>
						<Typography sx={{ color: tokens.ink2, fontSize: 14 }}>
							{fileName || t('sellerProducts.import.dropzone')}
						</Typography>
						{previewing && (
							<Typography sx={{ color: tokens.accent, fontSize: 12, mt: 1 }}>
								{t('sellerProducts.import.previewLoading')}
							</Typography>
						)}
					</Box>
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.csv"
						style={{ display: 'none' }}
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) handleFile(file);
						}}
					/>
				</Box>
			)}

			{/* Step 1: Preview */}
			{step === 1 && (
				<Box>
					{invalidCount > 0 && (
						<Box
							sx={{
								mb: 2,
								p: 1.5,
								bgcolor: tokens.amberSoft,
								borderRadius: 1.5,
								display: 'flex',
								alignItems: 'center',
								gap: 1,
							}}
						>
							<FontAwesomeIcon icon={Icons.warning} color={tokens.amber} />
							<Typography sx={{ fontSize: 13, color: tokens.amberInk }}>
								{t('sellerProducts.import.invalidRows', { count: invalidCount })}
							</Typography>
						</Box>
					)}
					<AppTable
						columns={previewCols}
						rows={previewRows}
						rowKey={(r) => r.rowIndex}
						emptyTitle={t('sellerProducts.import.previewEmpty')}
					/>
				</Box>
			)}

			{/* Step 2: Result */}
			{step === 2 && importResult && (
				<Box sx={{ textAlign: 'center', py: 3 }}>
					<FontAwesomeIcon
						icon={Icons.success}
						size="3x"
						color={tokens.cyan}
						style={{ marginBottom: 16 }}
					/>
					<Typography variant="h6" sx={{ mb: 2 }}>
						{t('sellerProducts.import.resultTitle')}
					</Typography>
					<Stack spacing={1} alignItems="center">
						<Typography sx={{ color: tokens.ink2 }}>
							{t('sellerProducts.import.created', { count: importResult.created })}
						</Typography>
						{importResult.updated > 0 && (
							<Typography sx={{ color: tokens.ink2 }}>
								{t('sellerProducts.import.updated', { count: importResult.updated })}
							</Typography>
						)}
						{importResult.failed > 0 && (
							<Typography sx={{ color: tokens.coralInk }}>
								{t('sellerProducts.import.failed', { count: importResult.failed })}
							</Typography>
						)}
					</Stack>
				</Box>
			)}
		</AppModal>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellerProductsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { showToast } = useAppToast();

	// Filters & pagination (0-based page for AppPagination)
	const [statusFilter, setStatusFilter] = useState('');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(0);
	const [importOpen, setImportOpen] = useState(false);
	const [archiveTarget, setArchiveTarget] = useState<SellerProductListItem | null>(null);

	const { data, loading, refetch } = useQuery<MyProductsResult>(MY_PRODUCTS_QUERY, {
		variables: {
			filter: {
				...(statusFilter ? { status: statusFilter } : {}),
				...(search ? { search } : {}),
			},
			pagination: { page: page + 1, pageSize: PAGE_SIZE },
		},
		fetchPolicy: 'cache-and-network',
	});

	const [duplicateProduct] = useMutation(DUPLICATE_PRODUCT_MUTATION);
	const [archiveProduct, { loading: archiving }] = useMutation(ARCHIVE_PRODUCT_MUTATION);
	const [deactivateProduct] = useMutation(DEACTIVATE_PRODUCT_MUTATION);
	const [activateProduct] = useMutation(ACTIVATE_PRODUCT_MUTATION);

	const products = data?.myProducts?.items ?? [];
	const total = data?.myProducts?.total ?? 0;

	const handleDuplicate = useCallback(
		async (product: SellerProductListItem) => {
			try {
				await duplicateProduct({ variables: { id: product.id } });
				showToast(t('sellerProducts.duplicateSuccess'), 'success');
				refetch();
			} catch {
				showToast(t('sellerProducts.duplicateError'), 'error');
			}
		},
		[duplicateProduct, showToast, t, refetch]
	);

	const handleArchiveConfirm = useCallback(async () => {
		if (!archiveTarget) return;
		try {
			await archiveProduct({ variables: { id: archiveTarget.id } });
			showToast(t('sellerProducts.archiveSuccess'), 'success');
			setArchiveTarget(null);
			refetch();
		} catch {
			showToast(t('sellerProducts.archiveError'), 'error');
		}
	}, [archiveTarget, archiveProduct, showToast, t, refetch]);

	const handleToggleActive = useCallback(
		async (product: SellerProductListItem) => {
			try {
				if (product.isAvailable) {
					await deactivateProduct({ variables: { id: product.id } });
					showToast(t('sellerProducts.deactivateSuccess'), 'success');
				} else {
					await activateProduct({ variables: { id: product.id } });
					showToast(t('sellerProducts.activateSuccess'), 'success');
				}
				refetch();
			} catch {
				showToast(
					t(product.isAvailable ? 'sellerProducts.deactivateError' : 'sellerProducts.activateError'),
					'error'
				);
			}
		},
		[deactivateProduct, activateProduct, showToast, t, refetch]
	);

	const totalStock = useCallback(
		(p: SellerProductListItem) =>
			p.variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0),
		[]
	);

	const handleExport = useCallback(() => {
		const rows = products.map((p) => [
			p.titleEn,
			p.sku,
			p.slug,
			p.basePrice,
			p.comparePrice ?? '',
			p.status,
			p.isAvailable ? 'true' : 'false',
			p.categories.map((c) => c.nameEn).join('; '),
			totalStock(p),
			new Date(p.createdAt).toLocaleDateString(),
		]);

		const headers = ['Title EN', 'SKU', 'Slug', 'Base Price', 'Compare Price', 'Status', 'Available', 'Categories', 'Stock', 'Created'];
		const csvContent = [headers, ...rows]
			.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
			.join('\n');

		const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${t('sellerProducts.exportFilename')}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}, [products, totalStock, t]);

	const mainImage = useCallback(
		(p: SellerProductListItem) => p.media.find((m) => m.isMain) ?? p.media[0] ?? null,
		[]
	);

	// ── Table columns ──
	const columns: AppTableColumn<SellerProductListItem>[] = [
		{
			key: 'product',
			label: t('sellerProducts.col.product'),
			render: (p) => {
				const img = mainImage(p);
				return (
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Box
							sx={{
								width: 44,
								height: 44,
								borderRadius: 1.5,
								overflow: 'hidden',
								bgcolor: tokens.surface2,
								flexShrink: 0,
							}}
						>
							{img ? (
								<Box
									component="img"
									src={img.url}
									alt={p.titleEn}
									sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
								/>
							) : (
								<Box
									sx={{
										width: '100%',
										height: '100%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<FontAwesomeIcon icon={Icons.image} color={tokens.ink3} size="sm" />
								</Box>
							)}
						</Box>
						<Box>
							<Typography
								sx={{
									fontSize: 13,
									fontWeight: 600,
									color: tokens.ink1,
									cursor: 'pointer',
									'&:hover': { color: tokens.accent },
								}}
								onClick={() =>
									navigate(`/seller-cabinet/products/${p.id}/edit`)
								}
							>
								{p.titleEn}
							</Typography>
							<Typography sx={{ fontSize: 11.5, color: tokens.ink3 }}>{p.slug}</Typography>
						</Box>
					</Stack>
				);
			},
		},
		{
			key: 'sku',
			label: t('sellerProducts.col.sku'),
			width: 130,
			render: (p) => (
				<Typography sx={{ fontSize: 12.5, color: tokens.ink2, fontFamily: 'monospace' }}>
					{p.sku}
				</Typography>
			),
		},
		{
			key: 'price',
			label: t('sellerProducts.col.price'),
			width: 110,
			align: 'right',
			render: (p) => (
				<Stack alignItems="flex-end">
					<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
						${p.basePrice.toFixed(2)}
					</Typography>
					{p.comparePrice && (
						<Typography
							sx={{ fontSize: 11.5, color: tokens.ink3, textDecoration: 'line-through' }}
						>
							${p.comparePrice.toFixed(2)}
						</Typography>
					)}
				</Stack>
			),
		},
		{
			key: 'stock',
			label: t('sellerProducts.col.stock'),
			width: 80,
			align: 'center',
			render: (p) => {
				const stock = totalStock(p);
				return (
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: 600,
							color: stock === 0 ? tokens.coralInk : stock < 5 ? tokens.amberInk : tokens.ink1,
						}}
					>
						{stock}
					</Typography>
				);
			},
		},
		{
			key: 'status',
			label: t('sellerProducts.col.status'),
			width: 160,
			render: (p) => (
				<StatusBadge status={p.status} label={p.status.replace(/_/g, ' ')} />
			),
		},
		{
			key: 'createdAt',
			label: t('sellerProducts.col.createdAt'),
			width: 100,
			render: (p) => (
				<Typography sx={{ fontSize: 12, color: tokens.ink3 }}>
					{new Date(p.createdAt).toLocaleDateString()}
				</Typography>
			),
		},
		{
			key: 'actions',
			label: t('sellerProducts.col.actions'),
			width: 60,
			align: 'center',
			render: (p) => (
				<RowMenu
					product={p}
					onEdit={() => navigate(`/seller-cabinet/products/${p.id}/edit`)}
					onDuplicate={() => handleDuplicate(p)}
					onToggleActive={() => handleToggleActive(p)}
					onArchive={() => setArchiveTarget(p)}
				/>
			),
		},
	];

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			{/* Breadcrumb */}
			<Breadcrumbs sx={{ mb: 2, fontSize: 13 }}>
				<Link
					underline="hover"
					color="inherit"
					sx={{ cursor: 'pointer' }}
					onClick={() => navigate('/seller-cabinet')}
				>
					{t('nav.sellerCabinet')}
				</Link>
				<Typography sx={{ fontSize: 13 }}>{t('sellerProducts.title')}</Typography>
			</Breadcrumbs>

			{/* Header */}
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				justifyContent="space-between"
				alignItems={{ xs: 'flex-start', sm: 'center' }}
				spacing={2}
				sx={{ mb: 3 }}
			>
				<Typography variant="h5" sx={{ fontWeight: 700 }}>
					{t('sellerProducts.title')}
				</Typography>
				<Stack direction="row" spacing={1.5}>
					<AppButton
						variant="outlined"
						startIcon={<FontAwesomeIcon icon={Icons.download} />}
						onClick={handleExport}
						disabled={products.length === 0}
					>
						{t('sellerProducts.exportButton')}
					</AppButton>
					<AppButton
						variant="outlined"
						startIcon={<FontAwesomeIcon icon={Icons.upload} />}
						onClick={() => setImportOpen(true)}
					>
						{t('sellerProducts.importButton')}
					</AppButton>
					<AppButton
						variant="contained"
						startIcon={<FontAwesomeIcon icon={Icons.add} />}
						onClick={() => navigate('/seller-cabinet/products/new')}
					>
						{t('sellerProducts.createButton')}
					</AppButton>
				</Stack>
			</Stack>

			<AppCard disablePadding>
				{/* Tabs + search row */}
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					alignItems={{ md: 'center' }}
					justifyContent="space-between"
					sx={{ px: 2, pt: 1, pb: 0, borderBottom: `1px solid ${tokens.line}` }}
					spacing={1}
				>
					<Tabs
						value={statusFilter}
						onChange={(_, v) => {
							setStatusFilter(v as string);
							setPage(0);
						}}
						variant="scrollable"
						scrollButtons="auto"
						sx={{
							minHeight: 44,
							'.MuiTab-root': { minHeight: 44, fontSize: 13, fontWeight: 500, px: 2 },
						}}
					>
						{STATUS_TABS.map((tab) => (
							<Tab key={tab.value} value={tab.value} label={t(tab.labelKey)} />
						))}
					</Tabs>

					<Box sx={{ pb: 1, flexShrink: 0 }}>
						<AppInput
							size="small"
							fullWidth={false}
							placeholder={t('sellerProducts.searchPlaceholder')}
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(0);
							}}
							InputProps={{
								startAdornment: (
									<FontAwesomeIcon icon={Icons.search} color={tokens.ink3} style={{ marginRight: 8 }} />
								),
							}}
							sx={{ width: 240 }}
						/>
					</Box>
				</Stack>

				{/* Table */}
				<AppTable
					columns={columns}
					rows={products}
					loading={loading}
					rowKey={(p) => p.id}
					emptyTitle={
						search || statusFilter
							? t('sellerProducts.emptyFiltered')
							: t('sellerProducts.empty')
					}
					emptyDescription={
						search || statusFilter ? undefined : t('sellerProducts.emptyAction')
					}
				/>

				{/* Pagination */}
				{total > 0 && (
					<>
						<Divider />
						<AppPagination
							page={page}
							pageSize={PAGE_SIZE}
							total={total}
							pageSizeOptions={[10, 20, 50]}
							onChange={(newPage) => setPage(newPage)}
						/>
					</>
				)}
			</AppCard>

			{/* Import modal */}
			<ImportModal
				open={importOpen}
				onClose={() => setImportOpen(false)}
				onDone={() => {
					setImportOpen(false);
					refetch();
				}}
			/>

			{/* Archive confirm */}
			<ConfirmDialog
				open={Boolean(archiveTarget)}
				title={t('sellerProducts.action.archive')}
				message={t('sellerProducts.archiveSuccess')}
				onConfirm={handleArchiveConfirm}
				onClose={() => setArchiveTarget(null)}
				loading={archiving}
			/>
		</Box>
	);
}
