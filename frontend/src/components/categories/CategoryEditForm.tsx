import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography, Alert } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { AppButton, AppInput, AppSelect, AppTextarea } from '@/components/ui';
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from '@/components/categories/CategoryIcon';
import type { CategoryTreeItem } from '@/graphql/operations/categories';
import {
	buildParentOptions,
	buildParentPath,
	collectDescendantIds,
	getTranslationName,
	slugifyName,
} from '@/utils/categoryTree';

import styles from './CategoryEditForm.module.scss';

const categoryFormSchema = z.object({
	nameEn: z.string().min(1),
	nameUk: z.string().optional(),
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	icon: z.string().optional(),
	parentId: z.string().optional(),
	metaTitleEn: z.string().optional(),
	metaTitleUk: z.string().optional(),
	metaDescriptionEn: z.string().optional(),
	metaDescriptionUk: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type CategoryFormServerError = { message: string; slugField?: boolean };

interface CategoryEditFormProps {
	mode: 'create' | 'edit';
	category: CategoryTreeItem | null;
	parentId: string | null;
	tree: CategoryTreeItem[];
	saving?: boolean;
	serverError?: CategoryFormServerError | null;
	onSubmit: (values: CategoryFormValues) => void;
	onDelete?: () => void;
	onDiscard: () => void;
}

function getDefaultValues(
	category: CategoryTreeItem | null,
	parentId: string | null,
): CategoryFormValues {
	if (!category) {
		return {
			nameEn: '',
			nameUk: '',
			slug: '',
			icon: '',
			parentId: parentId ?? '',
			metaTitleEn: '',
			metaTitleUk: '',
			metaDescriptionEn: '',
			metaDescriptionUk: '',
		};
	}

	const en = category.translations.find((tr) => tr.language === 'EN');
	const uk = category.translations.find((tr) => tr.language === 'UK');

	return {
		nameEn: en?.name ?? '',
		nameUk: uk?.name ?? '',
		slug: category.slug,
		icon: category.icon ?? '',
		parentId: category.parentId ?? '',
		metaTitleEn: en?.metaTitle ?? '',
		metaTitleUk: uk?.metaTitle ?? '',
		metaDescriptionEn: en?.metaDescription ?? '',
		metaDescriptionUk: uk?.metaDescription ?? '',
	};
}

function renderIconPreview(iconKey: string, label: string) {
	return (
		<Box className={styles.iconOption}>
			<CategoryIcon icon={iconKey || null} fallbackName={label} level={1} />
			<span>{label}</span>
		</Box>
	);
}

export function CategoryEditForm({
	mode,
	category,
	parentId,
	tree,
	saving,
	serverError,
	onSubmit,
	onDelete,
	onDiscard,
}: CategoryEditFormProps) {
	const { t } = useTranslation();

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors, isDirty },
	} = useForm<CategoryFormValues>({
		resolver: zodResolver(categoryFormSchema),
		defaultValues: getDefaultValues(category, parentId),
	});

	useEffect(() => {
		reset(getDefaultValues(category, parentId));
	}, [category, parentId, reset]);

	const nameEn = watch('nameEn');
	useEffect(() => {
		if (mode === 'create' && nameEn && !watch('slug')) {
			setValue('slug', slugifyName(nameEn), { shouldDirty: true });
		}
	}, [mode, nameEn, setValue, watch]);

	const excludeIds = category ? collectDescendantIds(tree, category.id) : new Set<string>();
	const parentOptions = buildParentOptions(tree, excludeIds).map((opt) => ({
		value: opt.value,
		label: opt.value === '' ? t('adminCategories.form.noParent') : opt.label,
	}));

	const iconOptions = CATEGORY_ICON_OPTIONS.map((opt) => ({
		value: opt.value,
		label: t(opt.labelKey),
	}));

	const title =
		mode === 'create'
			? parentId
				? t('adminCategories.form.createChildTitle')
				: t('adminCategories.form.createTitle')
			: getTranslationName(category!, 'EN');

	const subtitle =
		mode === 'edit' && category
			? t('adminCategories.form.editingMeta', {
					level: category.depth,
					path: buildParentPath(tree, category.id),
				})
			: t('adminCategories.form.createSubtitle');

	const iconValue = watch('icon') ?? '';
	const parentValue = watch('parentId') ?? '';
	const slugFieldError = serverError?.slugField ? serverError.message : errors.slug?.message;

	return (
		<Box
			component="form"
			className={styles.form}
			onSubmit={handleSubmit(onSubmit)}
			data-testid="category-form"
			sx={serverError ? { borderColor: 'error.main' } : undefined}
		>
			{serverError && (
				<Alert severity="error" className={styles.formError} data-testid="category-form-error">
					{serverError.message}
				</Alert>
			)}

			<Box>
				<Typography className={styles.headerTitle}>{title}</Typography>
				<Typography className={styles.headerDesc}>{subtitle}</Typography>
			</Box>

			<AppInput
				label={t('adminCategories.form.nameEn')}
				required
				error={!!errors.nameEn}
				helperText={errors.nameEn?.message}
				{...register('nameEn')}
			/>
			<AppInput label={t('adminCategories.form.nameUk')} {...register('nameUk')} />
			<AppInput
				label={t('adminCategories.form.slug')}
				required
				error={!!slugFieldError}
				helperText={slugFieldError}
				inputProps={{ style: { fontFamily: 'JetBrains Mono, monospace' } }}
				{...register('slug')}
			/>
			<FormControl fullWidth size="small">
				<InputLabel id="category-icon-label">{t('adminCategories.form.icon')}</InputLabel>
				<Select
					labelId="category-icon-label"
					label={t('adminCategories.form.icon')}
					displayEmpty
					value={iconValue}
					onChange={(e) => setValue('icon', e.target.value as string, { shouldDirty: true })}
					renderValue={(selected) =>
						renderIconPreview(
							selected as string,
							iconOptions.find((opt) => opt.value === selected)?.label ??
								t('adminCategories.form.iconNone'),
						)
					}
				>
					{iconOptions.map((opt) => (
						<MenuItem key={opt.value || 'none'} value={opt.value}>
							{renderIconPreview(opt.value, opt.label)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<AppSelect
				label={t('adminCategories.form.parent')}
				options={parentOptions}
				value={parentValue}
				onChange={(e) => setValue('parentId', e.target.value as string, { shouldDirty: true })}
			/>

			<AppInput label={t('adminCategories.form.metaTitleEn')} {...register('metaTitleEn')} />
			<AppInput label={t('adminCategories.form.metaTitleUk')} {...register('metaTitleUk')} />
			<AppTextarea
				label={t('adminCategories.form.metaDescriptionEn')}
				rows={3}
				{...register('metaDescriptionEn')}
			/>
			<AppTextarea
				label={t('adminCategories.form.metaDescriptionUk')}
				rows={3}
				{...register('metaDescriptionUk')}
			/>

			<Box className={styles.divider} />

			<Box className={styles.footer}>
				{mode === 'edit' && onDelete ? (
					<AppButton
						tone="danger"
						size="small"
						type="button"
						onClick={onDelete}
						startIcon={<FontAwesomeIcon icon={Icons.delete} />}
					>
						{t('adminCategories.form.delete')}
					</AppButton>
				) : (
					<Box />
				)}
				<Stack direction="row" className={styles.footerActions}>
					<AppButton tone="ghost" size="small" type="button" onClick={onDiscard} disabled={!isDirty}>
						{t('adminCategories.form.discard')}
					</AppButton>
					<AppButton
						tone="accent"
						size="small"
						type="submit"
						loading={saving}
						data-testid="save-category-btn"
					>
						{t('adminCategories.form.save')}
					</AppButton>
				</Stack>
			</Box>
		</Box>
	);
}
