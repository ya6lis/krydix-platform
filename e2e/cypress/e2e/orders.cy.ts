import ordersFixture from '../fixtures/orders.json';
import authFixture from '../fixtures/auth.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setRefreshToken(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

/**
 * Intercept all GraphQL requests and stub:
 * - RefreshToken, Me (auth)
 * - MyOrderStats, MyOrders (list), MyOrder (detail)
 * - Optionally: CancelOrder, ConfirmDelivery mutations
 */
function stubOrders(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: ordersFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: authFixture.me });
		} else if (op === 'MyOrderStats') {
			req.reply({ data: ordersFixture.orderStats });
		} else if (op === 'MyOrders') {
			const status: string | undefined = req.body?.variables?.filter?.status;
			if (status === 'PENDING') {
				req.reply({ data: ordersFixture.ordersPending });
			} else {
				req.reply({ data: ordersFixture.ordersAll });
			}
		} else if (op === 'MyOrder') {
			const id: string = req.body?.variables?.id ?? '';
			if (id === 'order-shipped-002') {
				const override = overrides['MyOrder'];
				req.reply({ data: override ?? ordersFixture.orderDetailShipped });
			} else {
				req.reply({ data: ordersFixture.orderDetail });
			}
		} else if (op === 'CancelOrder') {
			req.reply({ data: ordersFixture.cancelOrder });
		} else if (op === 'ConfirmDelivery') {
			req.reply({ data: ordersFixture.confirmDelivery });
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Orders list ──────────────────────────────────────────────────────────────

describe('Buyer orders list — /account/orders', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		stubOrders();
		cy.visit('/account/orders', {
			onBeforeLoad: setRefreshToken,
		});
	});

	it('renders page title', () => {
		cy.contains('My Orders').should('be.visible');
	});

	it('renders 4 stat cards', () => {
		cy.contains('All Orders').should('be.visible');
		cy.contains('4').should('be.visible'); // all
		cy.contains('1').should('be.visible'); // pending
	});

	it('renders orders in table', () => {
		cy.contains('Heritage Field Jacket').should('be.visible');
		cy.contains('Canvas Tote Bag').should('be.visible');
	});

	it('shows order status badge', () => {
		cy.contains('Pending').should('be.visible');
		cy.contains('Shipped').should('be.visible');
	});

	it('renders status tabs', () => {
		cy.contains('All').should('be.visible');
		cy.contains('Pending').should('be.visible');
		cy.contains('Delivered').should('be.visible');
	});

	it('filters orders when Pending tab is clicked', () => {
		cy.contains('[role="tab"]', 'Pending').click();
		cy.contains('Heritage Field Jacket').should('be.visible');
		// Shipped order should not appear under Pending filter
		cy.contains('Canvas Tote Bag').should('not.exist');
	});

	it('navigates to order detail when order link clicked', () => {
		cy.contains('#001').click(); // short id suffix
		cy.url().should('include', '/account/orders/order-pending-001');
	});

	it('renders search input', () => {
		cy.get('input[placeholder*="Search"]').should('be.visible');
	});
});

// ─── Order detail — PENDING ───────────────────────────────────────────────────

describe('Buyer order detail — PENDING order', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		stubOrders();
		cy.visit('/account/orders/order-pending-001', {
			onBeforeLoad: setRefreshToken,
		});
	});

	it('renders back to orders link', () => {
		cy.contains('Back to orders').should('be.visible');
	});

	it('renders order heading with short ID', () => {
		cy.contains(/001/i).should('be.visible');
	});

	it('renders Pending status badge', () => {
		cy.contains('Pending').should('be.visible');
	});

	it('renders product title in items list', () => {
		cy.contains('Heritage Field Jacket').should('be.visible');
	});

	it('renders formatted total', () => {
		cy.contains('$184.00').should('be.visible');
	});

	it('shows Cancel button for PENDING order', () => {
		cy.contains('Cancel order').should('be.visible');
	});

	it('does not show Confirm Delivery for PENDING order', () => {
		cy.contains('Confirm delivery').should('not.exist');
	});

	it('opens cancel dialog when Cancel button clicked', () => {
		cy.contains('Cancel order').click();
		cy.contains('Are you sure').should('be.visible');
	});

	it('cancels order — status badge updates to CANCELLED', () => {
		cy.contains('Cancel order').click();
		cy.contains('Are you sure').should('be.visible');
		// Confirm in dialog
		cy.get('[role="dialog"]').contains('button', 'Close account').should('not.exist');
		cy.get('[role="dialog"]').find('button').last().click();
		// After cancel, status updates
		cy.contains('Cancelled').should('be.visible');
	});
});

// ─── Order detail — SHIPPED ───────────────────────────────────────────────────

describe('Buyer order detail — SHIPPED order', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		stubOrders();
		cy.visit('/account/orders/order-shipped-002', {
			onBeforeLoad: setRefreshToken,
		});
	});

	it('renders Shipped status badge', () => {
		cy.contains('Shipped').should('be.visible');
	});

	it('renders tracking code', () => {
		cy.contains('TTN-00200').should('be.visible');
	});

	it('renders delivery address', () => {
		cy.contains('12 Main St, Kyiv').should('be.visible');
	});

	it('shows Confirm Delivery button', () => {
		cy.contains('Confirm delivery').should('be.visible');
	});

	it('does not show Cancel button for SHIPPED order', () => {
		cy.contains('Cancel order').should('not.exist');
	});

	it('opens confirm delivery dialog when button clicked', () => {
		cy.contains('Confirm delivery').click();
		cy.contains('Are you sure').should('be.visible');
	});

	it('confirms delivery — status badge updates to DELIVERED', () => {
		cy.contains('Confirm delivery').click();
		cy.contains('Are you sure').should('be.visible');
		cy.get('[role="dialog"]').find('button').last().click();
		cy.contains('Delivered').should('be.visible');
	});
});

// ─── Settings ─────────────────────────────────────────────────────────────────

describe('Buyer settings — /account/settings', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({ data: ordersFixture.refreshToken });
			} else if (op === 'Me') {
				req.reply({ data: authFixture.me });
			} else {
				req.continue();
			}
		}).as('graphql');

		cy.visit('/account/settings', {
			onBeforeLoad: setRefreshToken,
		});
	});

	it('renders settings page title', () => {
		cy.contains('Settings').should('be.visible');
	});

	it('renders left navigation with Account section', () => {
		cy.contains('Account').should('be.visible');
		cy.contains('Profile').should('be.visible');
		cy.contains('Security').should('be.visible');
		cy.contains('Notifications').should('be.visible');
		cy.contains('Language & region').should('be.visible');
	});

	it('pre-fills profile form with user data', () => {
		cy.get('input[value="Jane"]').should('exist');
		cy.get('input[value="Doe"]').should('exist');
		cy.get('input[value="test@krydix.co"]').should('exist');
	});

	it('renders avatar initials from user name', () => {
		cy.contains('JD').should('be.visible');
	});

	it('renders all 8 notification toggles', () => {
		cy.contains('New order received').should('be.visible');
		cy.contains('Order status change').should('be.visible');
		cy.contains('New message in chat').should('be.visible');
		cy.contains('Weekly summary').should('be.visible');
	});

	it('toggles Weekly summary switch', () => {
		// Weekly starts OFF — find it and click
		cy.contains('Weekly summary')
			.closest('[class*="MuiBox"]')
			.parent()
			.find('input[type="checkbox"]')
			.should('not.be.checked')
			.click({ force: true })
			.should('be.checked');
	});

	it('renders Language & region selects', () => {
		cy.contains('Interface language').should('be.visible');
		cy.contains('Timezone').should('be.visible');
		cy.contains('Currency').should('be.visible');
	});

	it('renders Security section', () => {
		cy.contains('Security').should('be.visible');
		cy.contains('Current password').should('be.visible');
		cy.contains('New password').should('be.visible');
	});

	it('renders danger zone with Close account button', () => {
		cy.contains('Close account').should('be.visible');
	});

	it('opens close account dialog', () => {
		cy.contains('button', 'Close account').click();
		cy.contains('Are you sure').should('be.visible');
	});

	it('renders save bar', () => {
		cy.contains('button', 'Save changes').should('be.visible');
		cy.contains('button', 'Discard').should('be.visible');
	});
});
