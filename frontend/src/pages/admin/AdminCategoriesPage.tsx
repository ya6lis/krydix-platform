import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { AppButton, ConfirmDialog, PageSectionWrapper, useAppToast } from '@/components/ui';
import { CategoryTreePanel } from '@/components/categories/CategoryTreePanel';
import {
	CategoryEditForm,
	type CategoryFormValues,
} from '@/components/categories/CategoryEditForm';
import {
	CATEGORY_TREE_QUERY,
	CREATE_CATEGORY_MUTATION,
	UPDATE_CATEGORY_MUTATION,
	MOVE_CATEGORY_MUTATION,
	DELETE_CATEGORY_MUTATION,
	type CategoryTreeItem,
} from '@/graphql/operations/categories';
import { findCategoryById } from '@/utils/categoryTree';

import styles from './AdminCategoriesPage.module.scss';

type FormMode = { type: 'create'; parentId: string | null } | { type: 'edit'; id: string } | null;

export default function AdminCategoriesPage() {
	const { t } = useTranslation();
	const { showToast } = useAppToast();

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [formMode, setFormMode] = useState<FormMode>(null);
	const [displayLanguage, setDisplayLanguage] = useState<'EN' | 'UK'>('EN');
	const [deleteTarget, setDeleteTarget] = useState<CategoryTreeItem | null>(null);

	const { data, loading, refetch } = useQuery(CATEGORY_TREE_QUERY, {
		fetchPolicy: 'cache-and-network',
	});

	const tree = data?.categoryTree ?? [];

	const selectedCategory = useMemo(() => {
		if (formMode?.type === 'edit') return findCategoryById(tree, formMode.id) ?? null;
		if (selectedId) return findCategoryById(tree, selectedId) ?? null;
		return null;
	}, [formMode, selectedId, tree]);

	const activeFormMode = formMode?.type ?? (selectedCategory ? 'edit' : null);
	const createParentId = formMode?.type === 'create' ? formMode.parentId : null;

	const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY_MUTATION, {
		onCompleted: () => {
			showToast(t('adminCategories.toast.created'), 'success');
			setFormMode(null);
			refetch();
		},
		onError: () => showToast(t('adminCategories.toast.createError'), 'error'),
	});

	const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY_MUTATION, {
		onCompleted: () => {
			showToast(t('adminCategories.toast.updated'), 'success');
			refetch();
		},
		onError: () => showToast(t('adminCategories.toast.updateError'), 'error'),
	});

	const [moveCategory] = useMutation(MOVE_CATEGORY_MUTATION, {
		onCompleted: () => refetch(),
		onError: () => showToast(t('adminCategories.toast.moveError'), 'error'),
	});

	const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY_MUTATION, {
		onCompleted: () => {
			showToast(t('adminCategories.toast.deleted'), 'success');
			setDeleteTarget(null);
			setSelectedId(null);
			setFormMode(null);
			refetch();
		},
		onError: (err) =>
			showToast(err.message || t('adminCategories.toast.deleteError'), 'error'),
	});

	const handleSelect = useCallback((id: string) => {
		setSelectedId(id);
		setFormMode({ type: 'edit', id });
	}, []);

	const handleNewTopLevel = () => {
		setSelectedId(null);
		setFormMode({ type: 'create', parentId: null });
	};

	const handleAddChild = (parentId: string) => {
		setSelectedId(null);
		setFormMode({ type: 'create', parentId });
	};

	const handleDiscard = () => {
		if (formMode?.type === 'create') {
			setFormMode(null);
		}
	};

	const buildMutationInput = (values: CategoryFormValues) => ({
		slug: values.slug,
		parentId: values.parentId || null,
		icon: values.icon || null,
		nameEn: values.nameEn,
		nameUk: values.nameUk || null,
		metaTitleEn: values.metaTitleEn || null,
		metaTitleUk: values.metaTitleUk || null,
		metaDescriptionEn: values.metaDescriptionEn || null,
		metaDescriptionUk: values.metaDescriptionUk || null,
	});

	const handleSubmit = (values: CategoryFormValues) => {
		const input = buildMutationInput(values);
		if (activeFormMode === 'create') {
			void createCategory({ variables: { input } });
			return;
		}
		if (selectedCategory) {
			void updateCategory({ variables: { id: selectedCategory.id, input } });
		}
	};

	const handleToggleActive = (id: string, isActive: boolean) => {
		void updateCategory({
			variables: { id, input: { isActive } },
		});
	};

	const handleMove = (id: string, parentId: string | null, sortOrder: number) => {
		void moveCategory({ variables: { input: { id, parentId, sortOrder } } });
	};

	const handleConfirmDelete = () => {
		if (deleteTarget) {
			void deleteCategory({ variables: { id: deleteTarget.id } });
		}
	};

	return (
		<Box data-testid="admin-categories-page" className={styles.page}>
			<PageSectionWrapper
				title={t('adminCategories.pageTitle')}
				subtitle={t('adminCategories.pageSubtitle')}
				actions={
					<AppButton
						tone="accent"
						size="small"
						data-testid="new-top-level-btn"
						startIcon={<FontAwesomeIcon icon={Icons.add} />}
						onClick={handleNewTopLevel}
					>
						{t('adminCategories.newTopLevel')}
					</AppButton>
				}
			>
				<Box className={styles.grid}>
					<CategoryTreePanel
						tree={tree}
						loading={loading}
						selectedId={selectedCategory?.id ?? null}
						displayLanguage={displayLanguage}
						onDisplayLanguageChange={setDisplayLanguage}
						onSelect={handleSelect}
						onAddChild={handleAddChild}
						onToggleActive={handleToggleActive}
						onMove={handleMove}
					/>

					{(activeFormMode === 'create' || selectedCategory) && (
						<CategoryEditForm
							mode={activeFormMode === 'create' ? 'create' : 'edit'}
							category={activeFormMode === 'create' ? null : selectedCategory}
							parentId={createParentId}
							tree={tree}
							saving={creating || updating}
							onSubmit={handleSubmit}
							onDelete={
								selectedCategory
									? () => setDeleteTarget(selectedCategory)
									: undefined
							}
							onDiscard={handleDiscard}
						/>
					)}
				</Box>
			</PageSectionWrapper>

			<ConfirmDialog
				open={!!deleteTarget}
				title={t('adminCategories.delete.title')}
				message={t('adminCategories.delete.message', {
					name: deleteTarget
						? deleteTarget.translations.find((tr) => tr.language === 'EN')?.name ??
							deleteTarget.slug
						: '',
				})}
				confirmLabel={t('adminCategories.delete.confirm')}
				cancelLabel={t('adminCategories.delete.cancel')}
				confirmColor="error"
				loading={deleting}
				onConfirm={handleConfirmDelete}
				onClose={() => setDeleteTarget(null)}
			/>
		</Box>
	);
}
