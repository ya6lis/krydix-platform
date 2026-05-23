import authFixture from '../fixtures/auth.json';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Stub GraphQL so the app boots into an authenticated BUYER session:
 * - RefreshToken mutation → returns new tokens
 * - Me query → returns buyer user
 * Any other operation passes through.
 */
function stubAuthenticatedSession(
	role: 'BUYER' | 'SELLER' | 'MODERATOR' | 'ADMINISTRATOR' = 'BUYER'
) {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;
		if (operationName === 'RefreshToken') {
			req.reply({
				data: {
					refreshToken: {
						accessToken: 'at_stub',
						refreshToken: 'rt_stub',
					},
				},
			});
		} else if (operationName === 'Me') {
			req.reply({
				data: {
					me: { ...authFixture.me.me, role },
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');

	// Plant a stub refresh token so AuthInitializer triggers the token exchange
	cy.window().then((win) => {
		win.localStorage.setItem('krydix_refresh_token', 'rt_stub');
	});
}

// ─── Sidebar renders ──────────────────────────────────────────────────────────

describe('App shell — sidebar', () => {
	beforeEach(() => {
		stubAuthenticatedSession();
		cy.visit('/account');
	});

	it('shows brand mark K', () => {
		cy.contains('K').should('be.visible');
	});

	it('shows brand name Krydix', () => {
		cy.contains('Krydix').should('be.visible');
	});

	it('shows nav group labels', () => {
		cy.contains('Overview').should('be.visible');
		cy.contains('Marketplace').should('be.visible');
		cy.contains('Account').should('be.visible');
	});

	it('shows buyer-visible nav items', () => {
		cy.contains('Dashboard').should('be.visible');
		cy.contains('Catalog').should('be.visible');
		cy.contains('Orders').should('be.visible');
	});

	it('hides admin nav items for BUYER', () => {
		cy.contains('Users & roles').should('not.exist');
		cy.contains('Platform settings').should('not.exist');
		cy.contains('Audit log').should('not.exist');
	});

	it('shows user footer with name and email', () => {
		cy.contains('Jane Doe').should('be.visible');
		cy.contains('test@krydix.co').should('be.visible');
	});

	it('shows user initials in footer avatar', () => {
		cy.contains('JD').should('be.visible');
	});
});

// ─── Sidebar — MODERATOR role ─────────────────────────────────────────────────

describe('App shell — sidebar moderator role', () => {
	beforeEach(() => {
		stubAuthenticatedSession('MODERATOR');
		cy.visit('/moderator/products');
	});

	it('shows moderation nav group for MODERATOR', () => {
		cy.contains('Moderation').should('be.visible');
	});

	it('shows Queue, Complaints, Reviews for MODERATOR', () => {
		cy.contains('Queue').should('be.visible');
		cy.contains('Complaints').should('be.visible');
		cy.contains('Reviews').should('be.visible');
	});
});

// ─── Sidebar — ADMINISTRATOR role ─────────────────────────────────────────────

describe('App shell — sidebar administrator role', () => {
	beforeEach(() => {
		stubAuthenticatedSession('ADMINISTRATOR');
		cy.visit('/admin/users');
	});

	it('shows admin nav items for ADMINISTRATOR', () => {
		cy.contains('Users & roles').should('be.visible');
		cy.contains('Platform settings').should('be.visible');
		cy.contains('Audit log').should('be.visible');
	});
});

// ─── Topbar ───────────────────────────────────────────────────────────────────

describe('App shell — topbar', () => {
	beforeEach(() => {
		stubAuthenticatedSession();
		cy.visit('/account');
	});

	it('shows search bar with placeholder text', () => {
		cy.contains('Search products, orders, users').should('be.visible');
	});

	it('shows ⌘ K shortcut chip in search bar', () => {
		cy.contains('⌘ K').should('be.visible');
	});

	it('shows language switcher button', () => {
		cy.contains('EN').should('be.visible');
	});

	it('shows cart icon button', () => {
		cy.get('[aria-label="shell.cart.title"], [aria-label="Your cart"]').should('exist');
	});

	it('shows notifications icon button', () => {
		cy.get('[aria-label="shell.notif.title"], [aria-label="Notifications"]').should('exist');
	});
});

// ─── Cart mini dropdown ───────────────────────────────────────────────────────

describe('App shell — cart dropdown', () => {
	beforeEach(() => {
		stubAuthenticatedSession();
		cy.visit('/account');
	});

	it('opens cart dropdown on cart button click', () => {
		cy.get('[aria-label="shell.cart.title"], [aria-label="Your cart"]').click();
		cy.contains('Your cart').should('be.visible');
	});

	it('shows empty cart message when no items', () => {
		cy.get('[aria-label="shell.cart.title"], [aria-label="Your cart"]').click();
		cy.contains('Your cart is empty').should('be.visible');
	});
});

// ─── Notifications dropdown ───────────────────────────────────────────────────

describe('App shell — notifications dropdown', () => {
	beforeEach(() => {
		stubAuthenticatedSession();
		cy.visit('/account');
	});

	it('opens notifications dropdown on bell click', () => {
		cy.get('[aria-label="shell.notif.title"], [aria-label="Notifications"]').click();
		cy.contains('Notifications').should('be.visible');
	});

	it('shows tab filters in notifications dropdown', () => {
		cy.get('[aria-label="shell.notif.title"], [aria-label="Notifications"]').click();
		cy.contains('All').should('be.visible');
		cy.contains('Unread').should('be.visible');
		cy.contains('Orders').should('be.visible');
		cy.contains('System').should('be.visible');
	});

	it('shows view all link in notifications dropdown', () => {
		cy.get('[aria-label="shell.notif.title"], [aria-label="Notifications"]').click();
		cy.contains('View all notifications').should('be.visible');
	});
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('App shell — auth guard', () => {
	it('redirects unauthenticated user away from /account', () => {
		// No stub, no localStorage token → AuthInitializer skips refresh → ProtectedRoute redirects
		cy.visit('/account');
		cy.url().should('include', '/auth/login');
	});

	it('sidebar is NOT visible on full-screen auth pages (login/register)', () => {
		cy.visit('/auth/login');
		cy.contains('K').should('not.exist'); // login page has no AppShell
	});
});

// ─── Guest sidebar ────────────────────────────────────────────────────────────

describe('App shell — guest sidebar', () => {
	beforeEach(() => {
		// No auth stub — visit public content page with AppShell
		cy.visit('/products');
	});

	it('shows sidebar brand mark on public pages', () => {
		cy.contains('K').should('be.visible');
	});

	it('shows catalog nav item for guest', () => {
		cy.contains('Catalog').should('be.visible');
	});

	it('shows sign-in prompt in footer for guest', () => {
		cy.contains('Sign in').should('be.visible');
	});

	it('does NOT show account-only nav items for guest', () => {
		cy.contains('Dashboard').should('not.exist');
		cy.contains('Orders').should('not.exist');
		cy.contains('Users & roles').should('not.exist');
	});
});

// ─── Sidebar navigation ────────────────────────────────────────────────────────

describe('App shell — sidebar navigation', () => {
	beforeEach(() => {
		stubAuthenticatedSession();
		cy.visit('/account');
	});

	it('clicking Catalog navigates to /products', () => {
		cy.contains('a', 'Catalog').click();
		cy.url().should('include', '/products');
	});

	it('Settings link navigates to /account/profile', () => {
		cy.contains('a', 'Settings').click();
		cy.url().should('include', '/account/profile');
	});
});
