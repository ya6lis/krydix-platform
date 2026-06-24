import { useMemo } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { AppButton } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteForRole } from '@/utils/roleAccess';
import styles from './404Page.module.scss';

type QuickTone = 'default' | 'cyan' | 'amber' | 'coral';

interface QuickLinkItem {
	href: string;
	icon: IconDefinition;
	tone: QuickTone;
	titleKey: string;
	subtitleKey: string;
}

function dashboardRoute(role: Role | string | undefined, isAuthenticated: boolean): string {
	if (!isAuthenticated) return ROUTES.PRODUCTS;
	return getHomeRouteForRole(role);
}

function buildQuickLinks(
	role: Role | string | undefined,
	isAuthenticated: boolean
): QuickLinkItem[] {
	if (!isAuthenticated) {
		return [
			{
				href: ROUTES.PRODUCTS,
				icon: Icons.products,
				tone: 'cyan',
				titleKey: 'error404.quick.catalog.title',
				subtitleKey: 'error404.quick.catalog.subtitleGuest',
			},
			{
				href: ROUTES.CART,
				icon: Icons.cart,
				tone: 'default',
				titleKey: 'error404.quick.cart.title',
				subtitleKey: 'error404.quick.cart.subtitle',
			},
			{
				href: ROUTES.SUPPORT,
				icon: Icons.question,
				tone: 'amber',
				titleKey: 'error404.quick.support.title',
				subtitleKey: 'error404.quick.support.subtitle',
			},
			{
				href: ROUTES.LOGIN,
				icon: Icons.signIn,
				tone: 'coral',
				titleKey: 'error404.quick.signIn.title',
				subtitleKey: 'error404.quick.signIn.subtitle',
			},
		];
	}

	if (role === Role.SELLER) {
		return [
			{
				href: ROUTES.SELLER_ORDERS,
				icon: Icons.order,
				tone: 'default',
				titleKey: 'error404.quick.orders.title',
				subtitleKey: 'error404.quick.orders.subtitleSeller',
			},
			{
				href: ROUTES.PRODUCTS,
				icon: Icons.products,
				tone: 'cyan',
				titleKey: 'error404.quick.catalog.title',
				subtitleKey: 'error404.quick.catalog.subtitle',
			},
			{
				href: ROUTES.SELLER_VERIFICATION,
				icon: Icons.shield,
				tone: 'amber',
				titleKey: 'error404.quick.verification.title',
				subtitleKey: 'error404.quick.verification.subtitle',
			},
			{
				href: ROUTES.SETTINGS,
				icon: Icons.settings,
				tone: 'coral',
				titleKey: 'error404.quick.settings.title',
				subtitleKey: 'error404.quick.settings.subtitle',
			},
		];
	}

	if (role === Role.MODERATOR || role === Role.ADMIN) {
		return [
			{
				href: ROUTES.PRODUCT_MODERATION,
				icon: Icons.clipboardCheck,
				tone: 'default',
				titleKey: 'error404.quick.moderation.title',
				subtitleKey: 'error404.quick.moderation.subtitle',
			},
			{
				href: ROUTES.PRODUCTS,
				icon: Icons.products,
				tone: 'cyan',
				titleKey: 'error404.quick.catalog.title',
				subtitleKey: 'error404.quick.catalog.subtitle',
			},
			{
				href: ROUTES.STAFF_SUPPORT,
				icon: Icons.question,
				tone: 'amber',
				titleKey: 'error404.quick.support.title',
				subtitleKey: 'error404.quick.support.subtitleStaff',
			},
			{
				href: ROUTES.SETTINGS,
				icon: Icons.settings,
				tone: 'coral',
				titleKey: 'error404.quick.settings.title',
				subtitleKey: 'error404.quick.settings.subtitle',
			},
		];
	}

	return [
		{
			href: ROUTES.ORDERS,
			icon: Icons.order,
			tone: 'default',
			titleKey: 'error404.quick.orders.title',
			subtitleKey: 'error404.quick.orders.subtitleBuyer',
		},
		{
			href: ROUTES.PRODUCTS,
			icon: Icons.products,
			tone: 'cyan',
			titleKey: 'error404.quick.catalog.title',
			subtitleKey: 'error404.quick.catalog.subtitle',
		},
		{
			href: ROUTES.CHAT,
			icon: Icons.chats,
			tone: 'amber',
			titleKey: 'error404.quick.messages.title',
			subtitleKey: 'error404.quick.messages.subtitle',
		},
		{
			href: ROUTES.SETTINGS,
			icon: Icons.settings,
			tone: 'coral',
			titleKey: 'error404.quick.settings.title',
			subtitleKey: 'error404.quick.settings.subtitle',
		},
	];
}

function toneClass(tone: QuickTone): string {
	switch (tone) {
		case 'cyan':
			return styles.cyan;
		case 'amber':
			return styles.amber;
		case 'coral':
			return styles.coral;
		default:
			return '';
	}
}

export default function NotFound404Page() {
	const { t } = useTranslation();
	const location = useLocation();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const isAuthenticated = Boolean(user);
	const dashboardHref = useMemo(
		() => dashboardRoute(user?.role, isAuthenticated),
		[user?.role, isAuthenticated]
	);
	const homeHref = dashboardHref;
	const quickLinks = useMemo(
		() => buildQuickLinks(user?.role, isAuthenticated),
		[user?.role, isAuthenticated]
	);

	const attemptedPath = location.pathname === ROUTES.NOT_FOUND ? null : location.pathname;

	return (
		<main className={styles.page}>
			<div className={styles.wrap}>
				<section className={styles.left}>
					<RouterLink to={homeHref} className={styles.brand}>
						<span className={styles.brandMark}>K</span>
						<span className={styles.brandName}>
							Krydix<span className={styles.brandDot}>.</span>
						</span>
					</RouterLink>

					<span className={styles.eyebrow}>{t('error404.eyebrow')}</span>

					<h1 className={styles.title}>
						<Trans
							i18nKey="error404.title"
							components={{ em: <span className={styles.titleAccent} /> }}
						/>
					</h1>

					<p className={styles.body}>
						{t('error404.description')}
						{attemptedPath ? (
							<>
								{' '}
								<Trans
									i18nKey="error404.pathHint"
									values={{ path: attemptedPath }}
									components={{ code: <code className={styles.pathCode} /> }}
								/>
							</>
						) : null}
					</p>

					<div className={styles.actions}>
						<AppButton
							tone="primary"
							onClick={() => navigate(dashboardHref)}
							startIcon={<FontAwesomeIcon icon={Icons.chevronLeft} size="xs" />}
						>
							{t('error404.actions.dashboard')}
						</AppButton>
						<AppButton
							tone="ghost"
							onClick={() => navigate(ROUTES.PRODUCTS)}
							startIcon={<FontAwesomeIcon icon={Icons.search} size="xs" />}
						>
							{t('error404.actions.catalog')}
						</AppButton>
						<AppButton
							tone="ghost"
							onClick={() => navigate(ROUTES.SUPPORT)}
							startIcon={<FontAwesomeIcon icon={Icons.question} size="xs" />}
						>
							{t('error404.actions.support')}
						</AppButton>
					</div>

					<div className={styles.quick}>
						<span className={styles.quickTitle}>{t('error404.quick.title')}</span>
						<div className={styles.quickGrid}>
							{quickLinks.map((item) => (
								<RouterLink
									key={item.href + item.titleKey}
									to={item.href}
									className={styles.quickLink}
								>
									<span className={`${styles.quickIcon} ${toneClass(item.tone)}`}>
										<FontAwesomeIcon icon={item.icon} />
									</span>
									<div>
										<div className={styles.quickName}>{t(item.titleKey)}</div>
										<div className={styles.quickSub}>{t(item.subtitleKey)}</div>
									</div>
									<span className={styles.quickArrow} aria-hidden>
										<FontAwesomeIcon icon={Icons.chevronRight} />
									</span>
								</RouterLink>
							))}
						</div>
					</div>
				</section>

				<aside className={styles.art} aria-hidden>
					<div className={`${styles.chip} ${styles.chip1}`}>
						<span className={`${styles.pip} ${styles.a}`} />
						<span>
							<strong className={styles.chipStrong}>GET</strong>{' '}
							<span className={styles.chipMono}>{attemptedPath ?? '/unknown'}</span>
						</span>
					</div>
					<div className={`${styles.chip} ${styles.chip2}`}>
						<span className={`${styles.pip} ${styles.c}`} />
						<span className={styles.chipMono}>404 NOT_FOUND</span>
					</div>
					<div className={`${styles.chip} ${styles.chip3}`}>
						<span className={`${styles.pip} ${styles.b}`} />
						<span className={styles.chipText}>{t('error404.art.chipHint')}</span>
					</div>

					<div className={styles.artInner}>
						<div className={styles.fourOh}>404</div>
					</div>

					<div className={styles.artCaption}>{t('error404.art.caption')}</div>
				</aside>
			</div>
		</main>
	);
}
