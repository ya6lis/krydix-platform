import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import SellerOrdersPage from '../SellerOrdersPage';
import { AppToastProvider } from '@/components/ui';
import {
	MY_SELLER_ORDERS_QUERY,
	MY_SELLER_ORDER_STATS_QUERY,
} from '@/graphql/operations/sellerOrders';
import type { SellerOrder } from '@/types/orders';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

function makeSellerOrder(id: string, status: string = 'CONFIRMED'): SellerOrder {
	return {
		id,
		status: status as SellerOrder['status'],
		sellerSubtotal: 184,
		itemCount: 2,
		createdAt: '2026-05-01T10:00:00.000Z',
		updatedAt: '2026-05-01T10:00:00.000Z',
		buyer: {
			id: 'buyer-1',
			name: 'Jane Doe',
			email: 'buyer@test.com',
		},
		items: [
			{
				id: `item-${id}`,
				productId: 'p1',
				variantId: null,
				sellerId: 's1',
				quantity: 2,
				unitPrice: 92,
				totalPrice: 184,
				productTitle: 'Heritage Jacket',
			},
		],
		payment: {
			id: `pay-${id}`,
			amount: 184,
			method: 'CARD',
			status: 'PAID',
			createdAt: '2026-05-01T10:00:00.000Z',
		},
		delivery: null,
		returnRequest: null,
	};
}

const statsMock: MockedResponse = {
	request: { query: MY_SELLER_ORDER_STATS_QUERY, variables: {} },
	result: {
		data: {
			mySellerOrderStats: {
				all: 5,
				pending: 1,
				confirmed: 2,
				shipped: 1,
				delivered: 1,
				cancelled: 0,
				refunded: 0,
			},
		},
	},
};

function makeOrdersMock(items: SellerOrder[] = [], total = items.length): MockedResponse {
	return {
		request: {
			query: MY_SELLER_ORDERS_QUERY,
			variables: { filter: { page: 1, pageSize: 8 } },
		},
		result: {
			data: {
				mySellerOrders: { items, total, page: 1, pageSize: 8 },
			},
		},
	};
}

function renderPage(mocks: MockedResponse[]) {
	return render(
		<AppToastProvider>
			<MockedProvider mocks={mocks} addTypename={false}>
				<MemoryRouter>
					<SellerOrdersPage />
				</MemoryRouter>
			</MockedProvider>
		</AppToastProvider>
	);
}

describe('SellerOrdersPage', () => {
	it('renders page title and order rows', async () => {
		const order = makeSellerOrder('order-abc123');
		renderPage([statsMock, makeOrdersMock([order], 1)]);

		expect(screen.getByText('sellerOrders.title')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
			expect(screen.getByText('#KX-C123')).toBeInTheDocument();
		});
	});

	it('shows empty state when no orders', async () => {
		renderPage([statsMock, makeOrdersMock([], 0)]);

		await waitFor(() => {
			expect(screen.getByText('sellerOrders.empty.title')).toBeInTheDocument();
		});
	});

	it('shows return request badge on order row', async () => {
		const order = makeSellerOrder('order-abc123', 'DELIVERED');
		order.returnRequest = {
			id: 'rr-1',
			orderId: order.id,
			buyerId: 'buyer-1',
			sellerId: 's1',
			status: 'UNDER_REVIEW',
			reason: 'Defective item',
			details: null,
			resolution: null,
			reviewedAt: null,
			refundedAt: null,
			createdAt: '2026-05-02T12:00:00.000Z',
			updatedAt: '2026-05-02T12:00:00.000Z',
		};
		renderPage([statsMock, makeOrdersMock([order], 1)]);

		await waitFor(() => {
			expect(screen.getByText('status.returnRequest.UNDER_REVIEW')).toBeInTheDocument();
		});
	});
});
