import cartFixture from '../fixtures/cart.json';
import authFixture from '../fixtures/auth.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CART_ITEM = {
	id: 'ci-1',
	productId: 'p-1',
	variantId: null,
	sellerId: 's-1',
	sellerName: 'John Doe',
	name: 'Heritage Field Jacket',
	price: 100,
	qty: 2,
	imageUrl: null,
};

function setCart(win: Window, items = [CART_ITEM]) {
	win.localStorage.setItem(
		'krydix-cart',
		JSON.stringify({ state: { items, promoCode: null }, version: 0 })
	);
}

function setRefreshToken(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

/** Intercept GraphQL and stub RefreshToken + Me so ProtectedRoute renders. */
function stubAuth() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;
		if (operationName === 'RefreshToken') {
			req.reply({ data: cartFixture.refreshToken });
		} else if (operationName === 'Me') {
			req.reply({ data: authFixture.me });
		} else {
			req.continue();
		}
	}).as('graphql');
}

/** Like stubAuth but also handles CreateOrder. */
function stubCheckout() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;
		if (operationName === 'RefreshToken') {
			req.reply({ data: cartFixture.refreshToken });
		} else if (operationName === 'Me') {
			req.reply({ data: authFixture.me });
		} else if (operationName === 'CreateOrder') {
			req.reply({ data: cartFixture.createOrder });
		} else {
			req.continue();
		}
	}).as('graphql');
}

/** Like stubAuth but also handles ApplyPromoCode with code-based dispatch. */
function stubCartWithPromo() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;
		if (operationName === 'RefreshToken') {
			req.reply({ data: cartFixture.refreshToken });
		} else if (operationName === 'Me') {
			req.reply({ data: authFixture.me });
		} else if (operationName === 'ApplyPromoCode') {
			const code: string = req.body.variables?.code ?? '';
			if (code === 'SAVE10') {
				req.reply({ data: cartFixture.applyPromoValid });
			} else {
				req.reply({ data: cartFixture.applyPromoInvalid });
			}
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Cart page ────────────────────────────────────────────────────────────────

describe('Cart page — guest view', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
	});

	it('renders items pre-populated in localStorage', () => {
		cy.visit('/cart', {
			onBeforeLoad: (win) => setCart(win),
		});

		cy.contains('Your cart').should('be.visible');
		cy.contains('Heritage Field Jacket').should('be.visible');
		cy.contains('100,00').should('be.visible');
		cy.contains('Order summary').should('be.visible');
		cy.contains('Proceed to checkout').should('be.visible');
	});

	it('shows seller name and group total', () => {
		cy.visit('/cart', {
			onBeforeLoad: (win) => setCart(win),
		});

		cy.contains('John Doe').should('be.visible');
		cy.contains('200,00').should('be.visible'); // 100 × 2
	});

	it('shows empty state when cart is empty', () => {
		cy.visit('/cart');

		cy.contains('Your cart is empty').should('be.visible');
		cy.contains('Browse products').should('be.visible');
	});

	it('navigates to catalog when "Browse products" is clicked on empty cart', () => {
		cy.visit('/cart');
		cy.contains('Browse products').click();
		cy.url().should('include', '/catalog');
	});

	it('updates item total when quantity is increased', () => {
		cy.visit('/cart', {
			onBeforeLoad: (win) => setCart(win),
		});

		// Initial total: 200,00 (qty=2)
		cy.contains('200,00').should('be.visible');

		// Increase qty by 1
		cy.get('[aria-label="Increase quantity"]').click();

		// New total: 300,00 (qty=3)
		cy.contains('300,00').should('be.visible');
	});

	it('removes item when remove button is clicked', () => {
		cy.visit('/cart', {
			onBeforeLoad: (win) => setCart(win),
		});

		cy.contains('Heritage Field Jacket').should('be.visible');
		cy.get('[aria-label="Remove item"]').click();
		cy.contains('Your cart is empty').should('be.visible');
	});
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('Cart → Checkout auth guard', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
	});

	it('redirects unauthenticated user to login when visiting /checkout', () => {
		cy.visit('/checkout');
		cy.url().should('include', '/auth/login');
	});

	it('"Proceed to checkout" button on cart navigates to /checkout', () => {
		cy.visit('/cart', {
			onBeforeLoad: (win) => setCart(win),
		});

		cy.contains('Proceed to checkout').click();
		// Guest has no auth → ProtectedRoute redirects to login
		cy.url().should('include', '/auth/login');
	});
});

// ─── Checkout flow ────────────────────────────────────────────────────────────

describe('Checkout flow', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		stubCheckout();

		cy.visit('/checkout', {
			onBeforeLoad: (win) => {
				setRefreshToken(win);
				setCart(win);
			},
		});

		// Wait for auth initializer to finish and ProtectedRoute to render
		cy.contains('h5', 'Checkout').should('be.visible');
	});

	it('shows 3-step stepper with Contact, Delivery, Payment labels', () => {
		cy.contains('Contact').should('be.visible');
		cy.contains('Delivery').should('be.visible');
		cy.contains('Payment').should('be.visible');
	});

	it('completes all 3 steps and shows order confirmation', () => {
		// ── Step 1: Contact ──────────────────────────────────────────
		cy.contains('Contact information').should('be.visible');

		// firstName and lastName are input[type="text"]
		cy.get('input').eq(0).type('Jane');
		cy.get('input').eq(1).type('Doe');
		cy.get('input[type="email"]').type('jane@krydix.co');
		cy.get('input[type="tel"]').type('+380123456789');

		cy.contains('button', 'Next step').click();

		// ── Step 2: Delivery ─────────────────────────────────────────
		cy.contains('Delivery method').should('be.visible');
		// Courier is pre-selected by default — just proceed
		cy.contains('button', 'Next step').click();

		// ── Step 3: Payment ──────────────────────────────────────────
		cy.contains('Payment method').should('be.visible');
		// Bank card is pre-selected by default
		cy.contains('button', 'Place order').click();

		// ── Confirmation ─────────────────────────────────────────────
		cy.contains('Order placed!').should('be.visible');
		// Last 8 chars of 'ord-test-12345678' uppercased = '12345678'
		cy.contains('12345678').should('be.visible');
		cy.contains('View my orders').should('be.visible');
	});

	it('shows validation errors on contact step when fields are empty', () => {
		cy.contains('Contact information').should('be.visible');
		cy.contains('button', 'Next step').click();
		cy.contains('Required').should('be.visible');
	});

	it('shows email validation error for invalid email', () => {
		cy.get('input').eq(0).type('Jane');
		cy.get('input').eq(1).type('Doe');
		cy.get('input[type="email"]').type('not-an-email');
		cy.get('input[type="tel"]').type('+380123456789');
		cy.contains('button', 'Next step').click();
		cy.contains('Invalid email').should('be.visible');
	});
});

// ─── Promo code ───────────────────────────────────────────────────────────────

describe('Promo code on cart page', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
		stubCartWithPromo();

		cy.visit('/cart', {
			onBeforeLoad: (win) => {
				setRefreshToken(win);
				setCart(win);
			},
		});
	});

	it('shows error message for an invalid promo code', () => {
		cy.get('input[placeholder="Add promo code"]').type('INVALID');
		cy.contains('button', 'Apply').click();
		cy.contains('Invalid or expired promo code').should('be.visible');
	});

	it('applies valid promo code and shows discount in order summary', () => {
		cy.get('input[placeholder="Add promo code"]').type('SAVE10');
		cy.contains('button', 'Apply').click();

		// Applied promo badge visible
		cy.contains('SAVE10').should('be.visible');
		// Discount row visible
		cy.contains('−20,00').should('be.visible');
	});
});
