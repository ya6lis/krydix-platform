import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';

import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import styles from './AccountSettingsNav.module.scss';

export type AccountSettingsSection = 'profile' | 'security' | 'danger';

const ACCOUNT_ITEMS: Array<{
	id: AccountSettingsSection;
	labelKey: string;
	icon: typeof Icons.user;
	href: string;
}> = [
	{
		id: 'profile',
		labelKey: 'account.settings.nav.profile',
		icon: Icons.user,
		href: ROUTES.PROFILE,
	},
	{
		id: 'security',
		labelKey: 'account.settings.nav.security',
		icon: Icons.lock,
		href: `${ROUTES.SETTINGS}#security`,
	},
	{
		id: 'danger',
		labelKey: 'account.settings.nav.closeAccount',
		icon: Icons.ban,
		href: `${ROUTES.SETTINGS}#danger`,
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
