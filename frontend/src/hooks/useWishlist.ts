import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canBuyAsUser, isStaffRole } from '@/utils/roleAccess';
import { useAppToast } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import {
	MY_WISHLIST_PRODUCT_IDS_QUERY,
	TOGGLE_WISHLIST_MUTATION,
} from '@/graphql/operations/wishlist';

export function useWishlist() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { showToast } = useAppToast();
	const user = useAuthStore((s) => s.user);

	const { data, refetch } = useQuery<{ myWishlistProductIds: string[] }>(
		MY_WISHLIST_PRODUCT_IDS_QUERY,
		{
			skip: !user,
			fetchPolicy: 'cache-and-network',
		}
	);

	const [toggleWishlistMutation, { loading: toggling }] = useMutation(TOGGLE_WISHLIST_MUTATION, {
		refetchQueries: [{ query: MY_WISHLIST_PRODUCT_IDS_QUERY }, 'MyWishlist'],
	});

	const productIds = data?.myWishlistProductIds ?? [];
	const count = productIds.length;

	const isWishlisted = (productId: string) => productIds.includes(productId);

	const toggleWishlist = async (productId: string, productTitle?: string) => {
		if (!user) {
			showToast(t('wishlist.signInRequired'), 'info');
			navigate(ROUTES.LOGIN);
			return false;
		}

		if (!canBuyAsUser(user.role) && !isStaffRole(user.role)) {
			showToast(t('wishlist.sellerNotAllowed'), 'info');
			return false;
		}

		const wasWishlisted = isWishlisted(productId);
		try {
			await toggleWishlistMutation({ variables: { productId } });
			showToast(
				wasWishlisted
					? t('wishlist.removed', { name: productTitle ?? '' })
					: t('wishlist.added', { name: productTitle ?? '' }),
				'success'
			);
			await refetch();
			return !wasWishlisted;
		} catch {
			showToast(t('wishlist.error'), 'error');
			return wasWishlisted;
		}
	};

	return {
		productIds,
		count,
		isWishlisted,
		toggleWishlist,
		toggling,
		refetch,
		isAuthenticated: !!user,
	};
}
