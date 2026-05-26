import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BuyerOrderDetailPage from '../BuyerOrderDetailPage';
import { AppToastProvider } from '@/components/ui';
import {
	MY_ORDER_QUERY,
	MY_ORDERS_QUERY,
	MY_ORDER_STATS_QUERY,
	CANCEL_ORDER_MUTATION,
	REQUEST_RETURN_MUTATION,
} from '@/graphql/operations/orders';
import {
	MARK_ORDER_NOTIFICATIONS_READ_MUTATION,
	MY_NOTIFICATIONS_QUERY,
	UNREAD_NOTIFICATION_COUNT_QUERY,
	UNREAD_ORDER_NOTIFICATION_COUNT_QUERY,
} from '@/graphql/operations/notifications';
import type { Order } from '@/types/orders';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: 'en' },
	}),
}));

jest.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span data-testid="icon" />,
}));

// ── fixtures ──────────────────────────────────────────────────────────────────
const ORDER_ID = 'abc123def456';

function makeOrder(status: string = 'PENDING', overrides: Partial<Order> = {}): Order {
	return {
		__typename: 'Order',
		id: ORDER_ID,
		status: status as Order['status'],
		totalAmount: 268.0,
		discount: 20,
		notes: null,
		createdAt: '2026-05-01T10:00:00.000Z',
		updatedAt: '2026-05-02T12:00:00.000Z',
		items: [
			{
				__typename: 'OrderItem',
				id: 'item-1',
				productId: 'p1',
				variantId: 'v1',
				sellerId: 's1',
				quantity: 2,
				unitPrice: 144,
				totalPrice: 288,
				productTitle: 'Heritage Field Jacket',
				productMainImage: 'https://example.com/images/p1-main.jpg',
			},
		],
		payment: {
			__typename: 'Payment',
			id: 'pay-1',
			amount: 268,
			method: 'CARD',
			status: 'PAID',
			transactionId: 'txn-001',
			cardBrand: 'Mastercard',
			cardLast4: '4242',
			createdAt: '2026-05-01T10:05:00.000Z',
		},
		returnRequest: null,
		delivery: {
			__typename: 'Delivery',
			id: 'del-1',
			method: 'COURIER',
			status: 'IN_TRANSIT',
			address: '12 Main St, Kyiv',
			trackingCode: 'TTN-001',
			createdAt: '2026-05-01T11:00:00.000Z',
		},
		promoCode: null,
		...overrides,
	};
}

function makeOrderMock(order: Order | null, id: string = ORDER_ID): MockedResponse {
	return {
		request: { query: MY_ORDER_QUERY, variables: { id } },
		result: { data: { myOrder: order } },
	};
}

const statsMock: MockedResponse = {
	request: { query: MY_ORDER_STATS_QUERY, variables: {} },
	result: {
		data: {
			myOrderStats: {
				__typename: 'OrderStats',
				all: 5,
				pending: 1,
				confirmed: 3,
				shipped: 0,
				delivered: 1,
				cancelled: 0,
				refunded: 1,
			},
		},
	},
};

const ordersMock: MockedResponse = {
	request: { query: MY_ORDERS_QUERY, variables: {} },
	result: {
		data: {
			myOrders: { __typename: 'OrderConnection', items: [], total: 0, page: 1, pageSize: 8 },
		},
	},
};

function notificationMocks(orderId: string): MockedResponse[] {
	return [
		{
			request: { query: MARK_ORDER_NOTIFICATIONS_READ_MUTATION, variables: { orderId } },
			result: { data: { markOrderNotificationsRead: true } },
		},
		{
			request: { query: MY_NOTIFICATIONS_QUERY, variables: { limit: 30 } },
			result: { data: { myNotifications: [] } },
		},
		{
			request: { query: UNREAD_NOTIFICATION_COUNT_QUERY },
			result: { data: { unreadNotificationCount: 0 } },
		},
		{
			request: { query: UNREAD_ORDER_NOTIFICATION_COUNT_QUERY },
			result: { data: { unreadOrderNotificationCount: 0 } },
		},
	];
}

function renderPage(mocks: MockedResponse[], id: string = ORDER_ID) {
	return render(
		<AppToastProvider>
			<MockedProvider mocks={[...mocks, ...notificationMocks(id)]}>
				<MemoryRouter initialEntries={[`/account/orders/${id}`]}>
					<Routes>
						<Route path="/account/orders/:id" element={<BuyerOrderDetailPage />} />
					</Routes>
				</MemoryRouter>
			</MockedProvider>
		</AppToastProvider>
	);
}

// ── tests ────────────────────────────────────────────────────────────────────
describe('BuyerOrderDetailPage — loading & not found', () => {
	it('shows loader while fetching', () => {
		renderPage([makeOrderMock(makeOrder())]);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});

	it('shows empty state when order not found', async () => {
		renderPage([makeOrderMock(null)]);
		await waitFor(() => {
			expect(screen.getByText('product.notFound.title')).toBeInTheDocument();
		});
	});
});

describe('BuyerOrderDetailPage — order loaded', () => {
	it('renders order heading with short ID', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText(/EF456/i)).toBeInTheDocument();
		});
	});

	it('renders order status badge', async () => {
		renderPage([makeOrderMock(makeOrder('CONFIRMED'))]);
		await waitFor(() => {
			expect(screen.getByText('status.order.CONFIRMED')).toBeInTheDocument();
		});
	});

	it('renders product title in items list', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText('Heritage Field Jacket')).toBeInTheDocument();
		});
	});

	it('renders formatted total amount', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getAllByText('$268.00').length).toBeGreaterThan(0);
		});
	});

	it('renders tracking code in delivery card', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText('TTN-001')).toBeInTheDocument();
		});
	});

	it('renders delivery address in shipping card', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText('12 Main St, Kyiv')).toBeInTheDocument();
		});
	});

	it('renders back to orders link', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.backToOrders')).toBeInTheDocument();
		});
	});

	it('renders payment status badge', async () => {
		renderPage([makeOrderMock(makeOrder())]);
		await waitFor(() => {
			expect(screen.getByText('status.payment.PAID')).toBeInTheDocument();
		});
	});
});

describe('BuyerOrderDetailPage — action buttons visibility', () => {
	it('shows Cancel button for PENDING order', async () => {
		renderPage([makeOrderMock(makeOrder('PENDING'))]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.actions.cancel')).toBeInTheDocument();
		});
	});

	it('shows Cancel button for CONFIRMED order', async () => {
		renderPage([makeOrderMock(makeOrder('CONFIRMED'))]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.actions.cancel')).toBeInTheDocument();
		});
	});

	it('hides Cancel button for SHIPPED order', async () => {
		renderPage([makeOrderMock(makeOrder('SHIPPED'))]);
		await waitFor(() => {
			expect(screen.queryByText('orderDetail.actions.cancel')).not.toBeInTheDocument();
		});
	});

	it('shows Confirm Delivery button only for SHIPPED order', async () => {
		renderPage([makeOrderMock(makeOrder('SHIPPED'))]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.actions.confirmDelivery')).toBeInTheDocument();
		});
	});

	it('hides Confirm Delivery button for PENDING order', async () => {
		renderPage([makeOrderMock(makeOrder('PENDING'))]);
		await waitFor(() => {
			expect(screen.queryByText('orderDetail.actions.confirmDelivery')).not.toBeInTheDocument();
		});
	});

	it('shows Request Refund button for DELIVERED order', async () => {
		renderPage([makeOrderMock(makeOrder('DELIVERED'))]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.actions.requestRefund')).toBeInTheDocument();
		});
	});

	it('hides Request Refund button for SHIPPED order', async () => {
		renderPage([makeOrderMock(makeOrder('SHIPPED'))]);
		await waitFor(() => {
			expect(screen.queryByText('orderDetail.actions.requestRefund')).not.toBeInTheDocument();
		});
	});

	it('shows Request Return button for DELIVERED order', async () => {
		renderPage([makeOrderMock(makeOrder('DELIVERED'))]);
		await waitFor(() => {
			expect(screen.getByText('orderDetail.actions.requestReturn')).toBeInTheDocument();
		});
	});
});

describe('BuyerOrderDetailPage — confirm dialogs', () => {
	it('opens cancel dialog when Cancel button clicked', async () => {
		renderPage([makeOrderMock(makeOrder('PENDING'))]);
		await waitFor(() => screen.getByText('orderDetail.actions.cancel'));
		fireEvent.click(screen.getByText('orderDetail.actions.cancel'));
		await waitFor(() => {
			expect(screen.getByText('orderDetail.cancelConfirm.title')).toBeInTheDocument();
		});
	});

	it('calls cancelOrder mutation on dialog confirm', async () => {
		const cancelMock: MockedResponse = {
			request: { query: CANCEL_ORDER_MUTATION, variables: { orderId: ORDER_ID } },
			result: { data: { cancelOrder: makeOrder('CANCELLED') } },
		};
		renderPage([makeOrderMock(makeOrder('PENDING')), cancelMock, statsMock, ordersMock]);
		await waitFor(() => screen.getByText('orderDetail.actions.cancel'));
		fireEvent.click(screen.getByText('orderDetail.actions.cancel'));
		await waitFor(() => screen.getByText('orderDetail.cancelConfirm.title'));
		fireEvent.click(screen.getByText('confirmDialog.confirm'));
		await waitFor(() => {
			// dialog closes after success
			expect(screen.queryByText('orderDetail.cancelConfirm.title')).not.toBeInTheDocument();
		});
	});

	it('opens confirm delivery dialog when button clicked', async () => {
		renderPage([makeOrderMock(makeOrder('SHIPPED'))]);
		await waitFor(() => screen.getByText('orderDetail.actions.confirmDelivery'));
		fireEvent.click(screen.getByText('orderDetail.actions.confirmDelivery'));
		await waitFor(() => {
			expect(screen.getByText('orderDetail.confirmDeliveryConfirm.title')).toBeInTheDocument();
		});
	});

	it('opens refund dialog when Request Refund button clicked', async () => {
		renderPage([makeOrderMock(makeOrder('DELIVERED'))]);
		await waitFor(() => screen.getByText('orderDetail.actions.requestRefund'));
		fireEvent.click(screen.getByText('orderDetail.actions.requestRefund'));
		await waitFor(() => {
			expect(screen.getByText('orderDetail.refundConfirm.title')).toBeInTheDocument();
		});
	});

	it('opens return dialog when Request Return button clicked', async () => {
		renderPage([makeOrderMock(makeOrder('DELIVERED'))]);
		await waitFor(() => screen.getByText('orderDetail.actions.requestReturn'));
		fireEvent.click(screen.getByText('orderDetail.actions.requestReturn'));
		await waitFor(() => {
			expect(screen.getByText('orderDetail.returnConfirm.title')).toBeInTheDocument();
		});
	});

	it('submits return request with reason', async () => {
		const requestReturnMock: MockedResponse = {
			request: {
				query: REQUEST_RETURN_MUTATION,
				variables: {
					orderId: ORDER_ID,
					reason: 'Broken zipper on arrival',
					details: 'Broken zipper on arrival',
				},
			},
			result: {
				data: {
					requestReturn: {
						__typename: 'ReturnRequest',
						id: 'rr-1',
						orderId: ORDER_ID,
						buyerId: 'buyer-1',
						sellerId: 'seller-1',
						status: 'REQUESTED',
						reason: 'Broken zipper on arrival',
						details: 'Broken zipper on arrival',
						resolution: null,
						reviewedById: null,
						reviewedAt: null,
						refundedAt: null,
						closedAt: null,
						createdAt: '2026-05-02T12:00:00.000Z',
						updatedAt: '2026-05-02T12:00:00.000Z',
					},
				},
			},
		};
		renderPage([
			makeOrderMock(makeOrder('DELIVERED')),
			requestReturnMock,
			makeOrderMock(
				makeOrder('DELIVERED', {
					returnRequest: {
						__typename: 'ReturnRequest',
						id: 'rr-1',
						orderId: ORDER_ID,
						buyerId: 'buyer-1',
						sellerId: 'seller-1',
						status: 'REQUESTED',
						reason: 'Broken zipper on arrival',
						details: 'Broken zipper on arrival',
						resolution: null,
						reviewedById: null,
						reviewedAt: null,
						refundedAt: null,
						closedAt: null,
						createdAt: '2026-05-02T12:00:00.000Z',
						updatedAt: '2026-05-02T12:00:00.000Z',
					},
				})
			),
		]);
		await waitFor(() => screen.getByText('orderDetail.actions.requestReturn'));
		fireEvent.click(screen.getByText('orderDetail.actions.requestReturn'));
		await waitFor(() => screen.getByText('orderDetail.returnConfirm.title'));
		fireEvent.change(screen.getByLabelText('orderDetail.returnConfirm.reasonLabel'), {
			target: { value: 'Broken zipper on arrival' },
		});
		fireEvent.click(screen.getByText('orderDetail.returnConfirm.submit'));
		await waitFor(() => {
			expect(screen.getByText('status.returnRequest.REQUESTED')).toBeInTheDocument();
		});
	});
});
