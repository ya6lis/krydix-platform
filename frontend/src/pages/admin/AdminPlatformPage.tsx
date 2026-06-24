import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { Stack } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { PayoutSchedule, type PlatformNavSection } from '@/constants/platform';
import {
	AppButton,
	AppInput,
	AppLoader,
	AppModal,
	AppSelect,
	ConfirmDialog,
	useAppToast,
} from '@/components/ui';
import { CATEGORY_TREE_QUERY, type CategoryTreeItem } from '@/graphql/operations/categories';
import {
	PLATFORM_OVERVIEW_QUERY,
	COMMISSION_RULES_QUERY,
	PAYOUT_CONFIG_QUERY,
	ADMIN_PROMO_CODES_QUERY,
	SAVE_COMMISSION_RULES_MUTATION,
	SAVE_PAYOUT_CONFIG_MUTATION,
	CREATE_ADMIN_PROMO_CODE_MUTATION,
	UPDATE_ADMIN_PROMO_CODE_MUTATION,
	type CommissionRuleItem,
	type PayoutConfig,
	type AdminPromoCodeItem,
} from '@/graphql/operations/adminPlatform';
import { findCategoryById, getTranslationName } from '@/utils/categoryTree';
import { formatMoney } from '@/utils/formatMoney';
import styles from './AdminPlatformPage.module.scss';

type EditableRule = CommissionRuleItem & { isNew?: boolean };

const NAV_ITEMS: Array<{ id: PlatformNavSection; labelKey: string; icon: typeof Icons.wallet }> = [
	{ id: 'overview', labelKey: 'adminPlatform.nav.overview', icon: Icons.wallet },
	{ id: 'commissions', labelKey: 'adminPlatform.nav.commissions', icon: Icons.chartLine },
	{ id: 'promos', labelKey: 'adminPlatform.nav.promos', icon: Icons.tag },
	{ id: 'payouts', labelKey: 'adminPlatform.nav.payouts', icon: Icons.chart },
];

const PAYOUT_OPTIONS = Object.values(PayoutSchedule);

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function promoDiscountLabel(promo: AdminPromoCodeItem): string {
	if (promo.discountPercent) return `${promo.discountPercent}%`;
	if (promo.discountFixed) return formatMoney(promo.discountFixed);
	return '—';
}

function promoStatusClass(status: string): string {
	switch (status) {
		case 'ACTIVE':
			return styles.statusActive;
		case 'EXPIRED':
			return styles.statusExpired;
		default:
			return styles.statusDisabled;
	}
}

function buildCategoryOptions(
	tree: CategoryTreeItem[],
	usedCategoryIds: Set<string>,
	language: 'EN' | 'UK'
): Array<{ value: string; label: string }> {
	const options: Array<{ value: string; label: string }> = [];

	const walk = (nodes: CategoryTreeItem[], prefix = '') => {
		for (const node of nodes) {
			if (usedCategoryIds.has(node.id)) continue;
			const name = getTranslationName(node, language);
			const label = prefix ? `${prefix} › ${name}` : name;
			options.push({ value: node.id, label });
			walk(node.children, label);
		}
	};

	walk(tree);
	return options;
}

export default function AdminPlatformPage() {
	const { t, i18n } = useTranslation();
	const { showToast } = useAppToast();
	const [searchParams] = useSearchParams();
	const contentLanguage = i18n.language === 'uk' ? 'UK' : 'EN';

	const [activeSection, setActiveSection] = useState<PlatformNavSection>('overview');
	const [rulesDraft, setRulesDraft] = useState<EditableRule[]>([]);
	const [payoutDraft, setPayoutDraft] = useState<PayoutConfig | null>(null);
	const [promoModalOpen, setPromoModalOpen] = useState(false);
	const [categoryModalOpen, setCategoryModalOpen] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState('');
	const [removeRuleTarget, setRemoveRuleTarget] = useState<EditableRule | null>(null);
	const [promoForm, setPromoForm] = useState({
		code: '',
		description: '',
		discountPercent: '',
		maxUses: '',
	});

	const { data: overviewData, loading: overviewLoading } = useQuery(PLATFORM_OVERVIEW_QUERY);
	const { data: rulesData, loading: rulesLoading } = useQuery(COMMISSION_RULES_QUERY);
	const { data: payoutData, loading: payoutLoading } = useQuery(PAYOUT_CONFIG_QUERY);
	const {
		data: promosData,
		loading: promosLoading,
		refetch: refetchPromos,
	} = useQuery(ADMIN_PROMO_CODES_QUERY);
	const { data: categoryData } = useQuery(CATEGORY_TREE_QUERY);

	useEffect(() => {
		if (rulesData?.commissionRules) setRulesDraft(rulesData.commissionRules);
	}, [rulesData]);

	useEffect(() => {
		if (payoutData?.payoutConfig) {
			const { schedule, holdPeriodDays, autoConfirmDays, minimumPayout, currency } =
				payoutData.payoutConfig;
			setPayoutDraft({ schedule, holdPeriodDays, autoConfirmDays, minimumPayout, currency });
		}
	}, [payoutData]);

	useEffect(() => {
		const section = searchParams.get('section');
		if (section === 'payouts') {
			setActiveSection('payouts');
			requestAnimationFrame(() => {
				document.getElementById('payouts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			});
		}
	}, [searchParams]);

	const [saveRules, { loading: savingRules }] = useMutation(SAVE_COMMISSION_RULES_MUTATION, {
		refetchQueries: [{ query: COMMISSION_RULES_QUERY }],
	});
	const [savePayout, { loading: savingPayout }] = useMutation(SAVE_PAYOUT_CONFIG_MUTATION, {
		refetchQueries: [{ query: PAYOUT_CONFIG_QUERY }],
	});
	const [createPromo, { loading: creatingPromo }] = useMutation(CREATE_ADMIN_PROMO_CODE_MUTATION);
	const [updatePromo] = useMutation(UPDATE_ADMIN_PROMO_CODE_MUTATION);

	const overview = overviewData?.platformOverview;
	const promos = promosData?.adminPromoCodes ?? [];
	const categoryTree = categoryData?.categoryTree ?? [];
	const loading = overviewLoading || rulesLoading || payoutLoading || promosLoading;

	const usedCategoryIds = useMemo(
		() =>
			new Set(
				rulesDraft
					.filter((rule) => !rule.isDefault && rule.categoryId)
					.map((rule) => rule.categoryId!)
			),
		[rulesDraft]
	);

	const categoryOptions = useMemo(
		() => buildCategoryOptions(categoryTree, usedCategoryIds, contentLanguage),
		[categoryTree, usedCategoryIds, contentLanguage]
	);

	const defaultRule = useMemo(() => rulesDraft.find((rule) => rule.isDefault), [rulesDraft]);

	const scrollTo = useCallback((id: PlatformNavSection) => {
		setActiveSection(id);
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, []);

	const updateRule = (id: string, patch: Partial<EditableRule>) => {
		setRulesDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	};

	const buildPayoutInput = useCallback(() => {
		if (!payoutDraft) return null;
		return {
			schedule: payoutDraft.schedule,
			holdPeriodDays: payoutDraft.holdPeriodDays,
			autoConfirmDays: payoutDraft.autoConfirmDays,
			minimumPayout: payoutDraft.minimumPayout,
			currency: payoutDraft.currency,
		};
	}, [payoutDraft]);

	const handleSavePayout = async () => {
		const input = buildPayoutInput();
		if (!input) return;
		try {
			await savePayout({ variables: { input } });
			showToast(t('adminPlatform.toast.payoutSaved'), 'success');
		} catch {
			showToast(t('adminPlatform.toast.saveError'), 'error');
		}
	};

	const handleSave = async () => {
		if (!payoutDraft) return;
		const input = buildPayoutInput();
		if (!input) return;
		try {
			await Promise.all([
				saveRules({
					variables: {
						rules: rulesDraft.map((r) => ({
							id: r.isNew ? undefined : r.id,
							categoryId: r.categoryId,
							percent: r.percent,
							fixedFee: r.fixedFee,
							currency: r.currency,
							isDefault: r.isDefault,
						})),
					},
				}),
				savePayout({ variables: { input } }),
			]);
			showToast(t('adminPlatform.toast.saved'), 'success');
		} catch {
			showToast(t('adminPlatform.toast.saveError'), 'error');
		}
	};

	const handleDiscard = () => {
		if (rulesData?.commissionRules) setRulesDraft(rulesData.commissionRules);
		if (payoutData?.payoutConfig) {
			const { schedule, holdPeriodDays, autoConfirmDays, minimumPayout, currency } =
				payoutData.payoutConfig;
			setPayoutDraft({ schedule, holdPeriodDays, autoConfirmDays, minimumPayout, currency });
		}
	};

	const handleOpenCategoryModal = () => {
		setSelectedCategoryId('');
		setCategoryModalOpen(true);
	};

	const handleAddCategoryOverride = () => {
		if (!selectedCategoryId) {
			showToast(t('adminPlatform.commissions.categoryRequired'), 'error');
			return;
		}

		const category = findCategoryById(categoryTree, selectedCategoryId);
		if (!category) return;

		const base = defaultRule ?? {
			percent: 12,
			fixedFee: 0.5,
			currency: 'USD',
		};

		setRulesDraft((prev) => [
			...prev,
			{
				id: `new-${selectedCategoryId}`,
				isNew: true,
				categoryId: selectedCategoryId,
				categoryName: getTranslationName(category, contentLanguage),
				categorySlug: category.slug,
				isDefault: false,
				percent: base.percent,
				fixedFee: base.fixedFee,
				currency: base.currency,
			},
		]);
		setCategoryModalOpen(false);
	};

	const handleRemoveRule = () => {
		if (!removeRuleTarget) return;
		setRulesDraft((prev) => prev.filter((rule) => rule.id !== removeRuleTarget.id));
		setRemoveRuleTarget(null);
	};

	const handleCreatePromo = async () => {
		try {
			await createPromo({
				variables: {
					input: {
						code: promoForm.code,
						description: promoForm.description || undefined,
						discountPercent: promoForm.discountPercent
							? Number(promoForm.discountPercent)
							: undefined,
						maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
						isActive: true,
					},
				},
			});
			setPromoModalOpen(false);
			setPromoForm({ code: '', description: '', discountPercent: '', maxUses: '' });
			refetchPromos();
			showToast(t('adminPlatform.toast.promoCreated'), 'success');
		} catch {
			showToast(t('adminPlatform.toast.promoCreateError'), 'error');
		}
	};

	const togglePromo = async (promo: AdminPromoCodeItem) => {
		await updatePromo({
			variables: { id: promo.id, input: { isActive: !promo.isActive } },
		});
		refetchPromos();
	};

	const nextPayoutLabel = useMemo(
		() => (overview ? formatDate(overview.nextPayoutDate) : '—'),
		[overview]
	);

	if (loading && !overview) {
		return <AppLoader />;
	}

	return (
		<div className={styles.page} data-testid="admin-platform-page">
			<div className={styles.pageHead}>
				<div>
					<h1 className={styles.pageTitle}>{t('adminPlatform.pageTitle')}</h1>
					<p className={styles.pageSub}>{t('adminPlatform.pageSubtitle')}</p>
				</div>
				<div className={styles.pageActions}>
					<span className={styles.healthBadge}>{t('adminPlatform.healthStatus')}</span>
				</div>
			</div>

			<aside className={styles.nav}>
				<div className={styles.navGroupLabel}>{t('adminPlatform.nav.groupMonetization')}</div>
				{NAV_ITEMS.map((item) => (
					<button
						key={item.id}
						type="button"
						className={`${styles.navLink} ${activeSection === item.id ? styles.navLinkActive : ''}`}
						onClick={() => scrollTo(item.id)}
						data-testid={`platform-nav-${item.id}`}
					>
						<FontAwesomeIcon icon={item.icon} className={styles.navIcon} />
						{t(item.labelKey)}
					</button>
				))}
			</aside>

			<div className={styles.body}>
				<section id="overview" className={styles.hero} data-testid="platform-overview">
					<div className={styles.heroGrid}>
						<div className={styles.heroStat}>
							<div className={styles.heroLabel}>{t('adminPlatform.overview.gmv')}</div>
							<div className={styles.heroValue}>
								{formatMoney(overview?.grossMerchandiseValue30d ?? 0)}
							</div>
							<div className={styles.heroDelta}>
								<span className={styles.heroUp}>+{overview?.gmvDeltaPercent ?? 0}%</span>{' '}
								{t('adminPlatform.overview.vsLast30d')}
							</div>
						</div>
						<div className={styles.heroStat}>
							<div className={styles.heroLabel}>{t('adminPlatform.overview.revenue')}</div>
							<div className={styles.heroValue}>
								{formatMoney(overview?.platformRevenue30d ?? 0)}
							</div>
							<div className={styles.heroDelta}>
								{t('adminPlatform.overview.takeRate', {
									rate: overview?.averageTakeRate ?? 0,
								})}
							</div>
						</div>
						<div className={styles.heroStat}>
							<div className={styles.heroLabel}>{t('adminPlatform.overview.pendingPayouts')}</div>
							<div className={styles.heroValue}>{formatMoney(overview?.pendingPayouts ?? 0)}</div>
							<div className={styles.heroDelta}>
								{t('adminPlatform.overview.nextRun', { date: nextPayoutLabel })}
							</div>
						</div>
						<div className={styles.heroStat}>
							<div className={styles.heroLabel}>{t('adminPlatform.overview.activeSellers')}</div>
							<div className={styles.heroValue}>{overview?.activeSellers ?? 0}</div>
							<div className={styles.heroDelta}>
								<span className={styles.heroUp}>+{overview?.newSellersThisMonth ?? 0}</span>{' '}
								{t('adminPlatform.overview.thisMonth')}
							</div>
						</div>
					</div>
				</section>

				<section id="commissions" className={styles.section} data-testid="platform-commissions">
					<div className={styles.sectionHead}>
						<div>
							<h2 className={styles.sectionTitle}>{t('adminPlatform.commissions.title')}</h2>
							<p className={styles.sectionSub}>{t('adminPlatform.commissions.subtitle')}</p>
						</div>
					</div>
					<div className={styles.ruleList}>
						<div className={styles.ruleHead}>
							<span>{t('adminPlatform.commissions.scope')}</span>
							<span className={styles.textRight}>{t('adminPlatform.commissions.percent')}</span>
							<span className={styles.textCenter}>{t('adminPlatform.commissions.fixedFee')}</span>
							<span className={styles.textCenter}>{t('adminPlatform.commissions.currency')}</span>
							<span />
						</div>
						{rulesDraft.map((rule) => (
							<div key={rule.id} className={styles.ruleRow} data-testid="platform-commission-row">
								<div className={styles.ruleCat}>
									{rule.isDefault ? t('adminPlatform.commissions.defaultRate') : rule.categoryName}
									{rule.isDefault ? (
										<span className={styles.inlineBadge}>
											{t('adminPlatform.commissions.baseline')}
										</span>
									) : null}
									<div className={styles.ruleRef}>
										{rule.isDefault
											? t('adminPlatform.commissions.defaultHint')
											: rule.categorySlug
												? `/${rule.categorySlug}`
												: ''}
									</div>
								</div>
								<div className={styles.pctInput}>
									<input
										className={styles.compactField}
										type="number"
										value={String(rule.percent)}
										onChange={(e) => updateRule(rule.id, { percent: Number(e.target.value) || 0 })}
										step={0.1}
										min={0}
										max={100}
									/>
									<span className={styles.inputSuffix}>%</span>
								</div>
								<div className={styles.fixedInput}>
									<input
										className={styles.compactField}
										type="number"
										value={String(rule.fixedFee)}
										onChange={(e) => updateRule(rule.id, { fixedFee: Number(e.target.value) || 0 })}
										step={0.01}
										min={0}
									/>
								</div>
								<div className={styles.currencyCell}>{rule.currency}</div>
								{rule.isDefault ? (
									<span />
								) : (
									<button
										type="button"
										className={styles.rowAction}
										onClick={() => setRemoveRuleTarget(rule)}
										aria-label={t('adminPlatform.commissions.removeOverride')}
									>
										<FontAwesomeIcon icon={Icons.more} />
									</button>
								)}
							</div>
						))}
					</div>
					<button
						type="button"
						className={styles.addCategoryBtn}
						onClick={handleOpenCategoryModal}
						data-testid="platform-add-category-override"
					>
						<FontAwesomeIcon icon={Icons.add} />
						{t('adminPlatform.commissions.addCategoryOverride')}
					</button>
				</section>

				<section id="promos" className={styles.section} data-testid="platform-promos">
					<div className={styles.sectionHead}>
						<div>
							<h2 className={styles.sectionTitle}>{t('adminPlatform.promos.title')}</h2>
							<p className={styles.sectionSub}>{t('adminPlatform.promos.subtitle')}</p>
						</div>
						<button
							type="button"
							className={styles.compactAccentBtn}
							onClick={() => setPromoModalOpen(true)}
						>
							<FontAwesomeIcon icon={Icons.add} />
							{t('adminPlatform.promos.newPromo')}
						</button>
					</div>
					<div className={styles.promoHead}>
						<span>{t('adminPlatform.promos.code')}</span>
						<span className={styles.textRight}>{t('adminPlatform.promos.discount')}</span>
						<span>{t('adminPlatform.promos.scope')}</span>
						<span className={styles.textRight}>{t('adminPlatform.promos.uses')}</span>
						<span>{t('adminPlatform.promos.expires')}</span>
						<span className={styles.textCenter}>{t('adminPlatform.promos.status')}</span>
						<span />
					</div>
					{promos.map((promo: AdminPromoCodeItem) => (
						<div key={promo.id} className={styles.promoRow} data-testid="platform-promo-row">
							<div className={styles.promoCodeWrap}>
								<span className={styles.promoCode}>{promo.code}</span>
								<span className={styles.promoDesc}>{promo.description ?? '—'}</span>
							</div>
							<div className={styles.promoDiscount}>{promoDiscountLabel(promo)}</div>
							<div>
								{promo.minOrderAmount
									? t('adminPlatform.promos.minCart', {
											amount: formatMoney(promo.minOrderAmount),
										})
									: t('adminPlatform.promos.allCategories')}
							</div>
							<div className={styles.promoUses}>
								{promo.usedCount}
								<span className={styles.promoUsesTotal}> / {promo.maxUses ?? '∞'}</span>
							</div>
							<div>{promo.expiresAt ? formatDate(promo.expiresAt) : '—'}</div>
							<div className={styles.promoStatusCell}>
								<span className={`${styles.statusPill} ${promoStatusClass(promo.status)}`}>
									{t(`adminPlatform.promos.statuses.${promo.status}`)}
								</span>
							</div>
							<button
								type="button"
								className={styles.rowAction}
								onClick={() => togglePromo(promo)}
								aria-label="Actions"
							>
								<FontAwesomeIcon icon={Icons.more} />
							</button>
						</div>
					))}
				</section>

				<section id="payouts" className={styles.section} data-testid="platform-payouts">
					<div className={styles.sectionHead}>
						<div>
							<h2 className={styles.sectionTitle}>{t('adminPlatform.payouts.title')}</h2>
							<p className={styles.sectionSub}>{t('adminPlatform.payouts.subtitle')}</p>
						</div>
						<AppButton
							tone="accent"
							loading={savingPayout}
							onClick={handleSavePayout}
							data-testid="platform-save-payout-btn"
						>
							{t('adminPlatform.payouts.saveHold')}
						</AppButton>
					</div>
					{payoutDraft ? (
						<div className={styles.sectionBody}>
							<div className={styles.payoutGrid}>
								<div className={styles.payoutField}>
									<AppSelect
										id="payout-schedule"
										label={t('adminPlatform.payouts.schedule')}
										value={payoutDraft.schedule}
										onChange={(e) =>
											setPayoutDraft({
												...payoutDraft,
												schedule: e.target.value as PayoutConfig['schedule'],
											})
										}
										options={PAYOUT_OPTIONS.map((value) => ({
											value,
											label: t(`adminPlatform.payouts.schedules.${value}`),
										}))}
										helperText={t('adminPlatform.payouts.scheduleHelp')}
									/>
								</div>
								<div className={styles.payoutField}>
									<AppInput
										id="payout-hold"
										label={t('adminPlatform.payouts.holdDays')}
										type="number"
										inputProps={{ min: 0, max: 90 }}
										value={String(payoutDraft.holdPeriodDays)}
										onChange={(e) =>
											setPayoutDraft({
												...payoutDraft,
												holdPeriodDays: Number(e.target.value) || 0,
											})
										}
										helperText={t('adminPlatform.payouts.holdHelp')}
									/>
								</div>
								<div className={styles.payoutField}>
									<AppInput
										id="payout-auto-confirm"
										label={t('adminPlatform.payouts.autoConfirmDays')}
										type="number"
										inputProps={{ min: 1, max: 90 }}
										value={String(payoutDraft.autoConfirmDays)}
										onChange={(e) =>
											setPayoutDraft({
												...payoutDraft,
												autoConfirmDays: Number(e.target.value) || 1,
											})
										}
										helperText={t('adminPlatform.payouts.autoConfirmHelp')}
									/>
								</div>
								<div className={styles.payoutField}>
									<AppInput
										id="payout-minimum"
										label={t('adminPlatform.payouts.minimum')}
										type="number"
										inputProps={{ min: 0 }}
										value={String(payoutDraft.minimumPayout)}
										onChange={(e) =>
											setPayoutDraft({
												...payoutDraft,
												minimumPayout: Number(e.target.value) || 0,
											})
										}
										helperText={t('adminPlatform.payouts.minimumHelp')}
									/>
								</div>
							</div>
						</div>
					) : null}
				</section>

				<div className={styles.saveBar}>
					<AppButton tone="ghost" onClick={handleDiscard}>
						{t('common.discard')}
					</AppButton>
					<AppButton
						tone="accent"
						loading={savingRules || savingPayout}
						onClick={handleSave}
						data-testid="platform-save-btn"
					>
						{t('adminPlatform.saveChanges')}
					</AppButton>
				</div>
			</div>

			<AppModal
				open={categoryModalOpen}
				onClose={() => setCategoryModalOpen(false)}
				title={t('adminPlatform.commissions.addCategoryTitle')}
				footer={
					<Stack direction="row" spacing={1} width="100%">
						<AppButton tone="ghost" fullWidth onClick={() => setCategoryModalOpen(false)}>
							{t('common.cancel')}
						</AppButton>
						<AppButton
							tone="accent"
							fullWidth
							onClick={handleAddCategoryOverride}
							disabled={!selectedCategoryId}
							data-testid="platform-confirm-add-category"
						>
							{t('adminPlatform.commissions.addCategory')}
						</AppButton>
					</Stack>
				}
			>
				<AppSelect
					label={t('adminPlatform.commissions.selectCategory')}
					value={selectedCategoryId}
					onChange={(e) => setSelectedCategoryId(String(e.target.value))}
					options={[
						{ value: '', label: t('adminPlatform.commissions.selectCategoryPlaceholder') },
						...categoryOptions,
					]}
				/>
			</AppModal>

			<ConfirmDialog
				open={!!removeRuleTarget}
				title={t('adminPlatform.commissions.removeConfirmTitle')}
				message={t('adminPlatform.commissions.removeConfirmMessage')}
				confirmLabel={t('adminPlatform.commissions.removeOverride')}
				cancelLabel={t('common.cancel')}
				confirmColor="error"
				onConfirm={handleRemoveRule}
				onClose={() => setRemoveRuleTarget(null)}
			/>

			<AppModal
				open={promoModalOpen}
				onClose={() => setPromoModalOpen(false)}
				title={t('adminPlatform.promos.createTitle')}
				footer={
					<Stack direction="row" spacing={1} width="100%">
						<AppButton tone="ghost" fullWidth onClick={() => setPromoModalOpen(false)}>
							{t('common.cancel')}
						</AppButton>
						<AppButton tone="accent" fullWidth loading={creatingPromo} onClick={handleCreatePromo}>
							{t('adminPlatform.promos.create')}
						</AppButton>
					</Stack>
				}
			>
				<Stack spacing={2}>
					<AppInput
						label={t('adminPlatform.promos.form.code')}
						value={promoForm.code}
						onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
					/>
					<AppInput
						label={t('adminPlatform.promos.form.description')}
						value={promoForm.description}
						onChange={(e) => setPromoForm((f) => ({ ...f, description: e.target.value }))}
					/>
					<AppInput
						label={t('adminPlatform.promos.form.discountPercent')}
						type="number"
						value={promoForm.discountPercent}
						onChange={(e) => setPromoForm((f) => ({ ...f, discountPercent: e.target.value }))}
					/>
					<AppInput
						label={t('adminPlatform.promos.form.maxUses')}
						type="number"
						value={promoForm.maxUses}
						onChange={(e) => setPromoForm((f) => ({ ...f, maxUses: e.target.value }))}
					/>
				</Stack>
			</AppModal>
		</div>
	);
}
