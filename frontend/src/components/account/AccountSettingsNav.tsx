import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import styles from './AccountSettingsNav.module.scss';

export type AccountSettingsSection = 'profile' | 'notifications' | 'security' | 'language';

const ACCOUNT_ITEMS: Array<{
	id: AccountSettingsSection;
	labelKey: string;
	icon: typeof Icons.user;
	href: string;
}> = [
	{ id: 'profile', labelKey: 'account.settings.nav.profile', icon: Icons.user, href: ROUTES.ACCOUNT_PROFILE },
	{
		id: 'notifications',
		labelKey: 'account.settings.nav.notifications',
		icon: Icons.bell,
		href: `${ROUTES.ACCOUNT_SETTINGS}#notifications`,
	},
	{
		id: 'security',
		labelKey: 'account.settings.nav.security',
		icon: Icons.lock,
		href: `${ROUTES.ACCOUNT_SETTINGS}#security`,
	},
	{
		id: 'language',
		labelKey: 'account.settings.nav.language',
		icon: Icons.globe,
		href: `${ROUTES.ACCOUNT_SETTINGS}#language`,
	},
];

interface AccountSettingsNavProps {
	active: AccountSettingsSection;
}

export function AccountSettingsNav({ active }: AccountSettingsNavProps) {
	const { t } = useTranslation();

	return (
		<nav className={styles.nav} data-testid="account-settings-nav">
			<div className={styles.groupLabel}>{t('account.settings.nav.account')}</div>
			{ACCOUNT_ITEMS.map((item) => (
					<Link
						key={item.id}
						to={item.href}
						className={`${styles.link} ${item.id === active ? styles.linkActive : ''}`}
						data-testid={`account-nav-${item.id}`}
					>
						<FontAwesomeIcon icon={item.icon} className={styles.icon} />
						{t(item.labelKey)}
					</Link>
				))}
		</nav>
	);
}
