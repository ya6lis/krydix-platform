import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Icons } from '@/constants/icons';
import { Role } from '@/constants/enums';
import { ROUTES } from '@/constants/routes';
import { AppButton, AppLoader, EmptyState } from '@/components/ui';
import { PUBLIC_USER_PROFILE_QUERY } from '@/graphql/operations/publicProfile';
import { useAuthStore } from '@/store/authStore';
import { getSettingsRouteForUser } from '@/utils/roleAccess';
import sellerStyles from './PublicSellerProfilePage.module.scss';
import styles from './PublicUserProfilePage.module.scss';

function initials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'U';
}

function formatMemberSince(iso: string, locale: string): string {
	return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function formatLocation(city: string | null, country: string | null): string | null {
	if (city && country) return `${city}, ${country}`;
	return city ?? country;
}

const ROLE_LABEL_KEYS: Record<string, string> = {
	[Role.BUYER]: 'publicUserProfile.roles.buyer',
	[Role.SELLER]: 'publicUserProfile.roles.seller',
	[Role.MODERATOR]: 'publicUserProfile.roles.moderator',
	[Role.ADMIN]: 'publicUserProfile.roles.admin',
};

export default function PublicUserProfilePage() {
	const { id = '' } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const currentUser = useAuthStore((s) => s.user);
	const isOwner = currentUser?.id === id;

	const { data, loading, error } = useQuery(PUBLIC_USER_PROFILE_QUERY, {
		variables: { userId: id },
		skip: !id,
	});

	const profile = data?.publicUserProfile;

	if (loading) {
		return <AppLoader />;
	}

	if (error || !profile) {
		return (
			<div className={styles.page}>
				<EmptyState
					title={t('publicUserProfile.notFoundTitle')}
					description={t('publicUserProfile.notFoundDescription')}
					actionLabel={t('publicUserProfile.backToCatalog')}
					onAction={() => navigate(ROUTES.PRODUCTS)}
				/>
			</div>
		);
	}

	if (profile.role === Role.SELLER) {
		return <Navigate to={ROUTES.SELLER_PUBLIC(profile.id)} replace />;
	}

	const location = formatLocation(profile.city, profile.country);
	const memberSince = formatMemberSince(profile.memberSince, i18n.language);
	const roleLabelKey = ROLE_LABEL_KEYS[profile.role] ?? 'publicUserProfile.roles.member';

	return (
		<div className={styles.page} data-testid="public-user-profile-page">
			<section className={sellerStyles.hero}>
				<div className={sellerStyles.heroInner}>
					<div className={sellerStyles.avatar} data-testid="user-profile-avatar">
						{profile.avatarUrl ? (
							<img src={profile.avatarUrl} alt="" className={sellerStyles.avatarImage} />
						) : (
							initials(profile.firstName, profile.lastName)
						)}
					</div>

					<div>
						<div className={sellerStyles.nameRow}>
							<h1 className={sellerStyles.storeName}>{profile.displayName}</h1>
							<span className={styles.roleBadge}>{t(roleLabelKey)}</span>
						</div>

						<p className={sellerStyles.meta}>
							{t('publicUserProfile.memberSince', { date: memberSince })}
							{location ? ` · ${location}` : ''}
						</p>

						{profile.bio ? <p className={sellerStyles.bio}>{profile.bio}</p> : null}
					</div>

					<div className={sellerStyles.heroActions}>
						{!isOwner ? (
							<AppButton
								tone="ghost"
								startIcon={<FontAwesomeIcon icon={Icons.chat} />}
								onClick={() => {
									if (!currentUser) {
										navigate(ROUTES.LOGIN);
										return;
									}
									navigate(`${ROUTES.CHAT}?userId=${id}`);
								}}
							>
								{t('publicUserProfile.contact')}
							</AppButton>
						) : null}
					</div>
				</div>

				{isOwner ? (
					<div className={sellerStyles.ownerBanner} data-testid="user-profile-owner-banner">
						<span>{t('publicUserProfile.ownerHint')}</span>
						<RouterLink to={getSettingsRouteForUser(currentUser)}>
							<AppButton tone="accent">{t('publicUserProfile.editProfile')}</AppButton>
						</RouterLink>
					</div>
				) : null}
			</section>

			<section className={styles.body}>
				<div className={styles.bodyCard}>
					<h2 className={styles.bodyTitle}>{t('publicUserProfile.aboutTitle')}</h2>
					<p className={`${styles.bodyText} ${profile.bio ? '' : styles.emptyBio}`}>
						{profile.bio || t('publicUserProfile.emptyBio')}
					</p>
				</div>
			</section>
		</div>
	);
}
