import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import BuyerOrdersPage from '../BuyerOrdersPage';
import { AppToastProvider } from '@/components/ui';
import { MY_ORDERS_QUERY, MY_ORDER_STATS_QUERY } from '@/graphql/operations/orders';
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
function makeOrder(id: string, status: string = 'PENDING'): Order {
	return {
		id,
		status: status as Order['status'],
		totalAmount: 184.0,
		discount: 0,
		notes: null,
		createdAt: '2026-05-01T10:00:00.000Z',
		updatedAt: '2026-05-01T10:00:00.000Z',
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
			transactionId: 'txn-001',
			createdAt: '2026-05-01T10:00:00.000Z',
		},
		delivery: null,
		promoCode: null,
	};
}

const statsMock: MockedResponse = {
	request: { query: MY_ORDER_STATS_QUERY, variables: {} },
	result: {
		data: {
			myOrderStats: {
				all: 10,
				pending: 3,
				confirmed: 0,
				shipped: 0,
				delivered: 6,
				cancelled: 0,
				refunded: 1,
			},
		},
	},
};

function makeOrdersMock(items: Order[] = [], total = items.length): MockedResponse {
	return {
		request: {
			query: MY_ORDERS_QUERY,
			variables: { filter: { page: 1, pageSize: 8 } },
		},
		result: {
			data: {
				myOrders: { items, total, page: 1, pageSize: 8 },
			},
		},
	};
}

function renderPage(mocks: MockedResponse[]) {
	return render(
		<AppToastProvider>
			<MockedProvider mocks={mocks} addTypename={false}>
				<MemoryRouter>
					<BuyerOrdersPage />
				</MemoryRouter>
			</MockedProvider>
		</AppToastProvider>
	);
}

// ── tests ────────────────────────────────────────────────────────────────────
describe('BuyerOrdersPage', () => {
	it('shows loader while fetching', () => {
		renderPage([statsMock, makeOrdersMock()]);
		expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});

	it('renders stat cards after stats load', async () => {
		renderPage([statsMock, makeOrdersMock()]);
		await waitFor(() => {
			// stat values may appear in multiple places (stat card + tab badge) — use getAllByText
			expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
		});
	});

	it('renders stat card labels', async () => {
		renderPage([statsMock, makeOrdersMock()]);
		await waitFor(() => {
			expect(screen.getByText('orders.stats.all')).toBeInTheDocument();
			expect(screen.getByText('orders.stats.pending')).toBeInTheDocument();
			expect(screen.getByText('orders.stats.completed')).toBeInTheDocument();
			expect(screen.getByText('orders.stats.refunded')).toBeInTheDocument();
		});
	});

	it('renders orders table after data loads', async () => {
		renderPage([statsMock, makeOrdersMock([makeOrder('abc123'), makeOrder('def456')])]);
		await waitFor(() => {
			// Short IDs derived from last 6 chars
			expect(screen.getByText('#ABC123')).toBeInTheDocument();
			expect(screen.getByText('#DEF456')).toBeInTheDocument();
		});
	});

	it('renders product title in seller column', async () => {
		renderPage([statsMock, makeOrdersMock([makeOrder('order1')])]);
		await waitFor(() => {
			expect(screen.getByText('Heritage Jacket')).toBeInTheDocument();
		});
	});

	it('renders payment status badge', async () => {
		renderPage([statsMock, makeOrdersMock([makeOrder('order1')])]);
		await waitFor(() => {
			expect(screen.getByText('status.payment.PAID')).toBeInTheDocument();
		});
	});

	it('renders order status badge', async () => {
		renderPage([statsMock, makeOrdersMock([makeOrder('order1', 'PENDING')])]);
		await waitFor(() => {
			expect(screen.getByText('status.order.PENDING')).toBeInTheDocument();
		});
	});

	it('shows empty state when no orders', async () => {
		renderPage([statsMock, makeOrdersMock([])]);
		await waitFor(() => {
			expect(screen.getByText('orders.empty.title')).toBeInTheDocument();
		});
	});

	it('shows page title', () => {
		renderPage([statsMock, makeOrdersMock()]);
		expect(screen.getByText('orders.title')).toBeInTheDocument();
	});

	it('renders status tabs', () => {
		renderPage([statsMock, makeOrdersMock()]);
		expect(screen.getByText('orders.tabs.all')).toBeInTheDocument();
		expect(screen.getByText('orders.tabs.pending')).toBeInTheDocument();
		expect(screen.getByText('orders.tabs.delivered')).toBeInTheDocument();
	});

	it('renders search input', () => {
		renderPage([statsMock, makeOrdersMock()]);
		expect(screen.getByPlaceholderText('orders.search')).toBeInTheDocument();
	});

	it('renders pagination when total exceeds page size', async () => {
		renderPage([statsMock, makeOrdersMock([makeOrder('o1')], 50)]);
		await waitFor(() => {
			expect(screen.getByText('#O1')).toBeInTheDocument();
		});
		// Pagination shows "pagination.showing" text (i18n key returned as-is in tests)
		await waitFor(() => {
			expect(screen.getByText('pagination.showing')).toBeInTheDocument();
		});
	});

	it('tab click triggers filtered query', async () => {
		const pendingMock: MockedResponse = {
			request: {
				query: MY_ORDERS_QUERY,
				variables: { filter: { status: 'PENDING', page: 1, pageSize: 8 } },
			},
			result: {
				data: {
					myOrders: { items: [makeOrder('pend1', 'PENDING')], total: 1, page: 1, pageSize: 8 },
				},
			},
		};
		renderPage([statsMock, makeOrdersMock([]), pendingMock]);
		await waitFor(() => {
			expect(screen.getByText('orders.empty.title')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('orders.tabs.pending'));
		await waitFor(() => {
			expect(screen.getByText('#PEND1')).toBeInTheDocument();
		});
	});

	it('shows filtered empty state when tab active and no results', async () => {
		const cancelledMock: MockedResponse = {
			request: {
				query: MY_ORDERS_QUERY,
				variables: { filter: { status: 'CANCELLED', page: 1, pageSize: 8 } },
			},
			result: {
				data: { myOrders: { items: [], total: 0, page: 1, pageSize: 8 } },
			},
		};
		renderPage([statsMock, makeOrdersMock([]), cancelledMock]);
		await waitFor(() => screen.getByText('orders.empty.title'));
		fireEvent.click(screen.getByText('orders.tabs.cancelled'));
		await waitFor(() => {
			expect(screen.getByText('orders.emptyFiltered.title')).toBeInTheDocument();
		});
	});
});
