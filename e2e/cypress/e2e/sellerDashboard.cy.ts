import fixture from '../fixtures/sellerDashboard.json';
import sellerFixture from '../fixtures/sellerProducts.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stubAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: sellerFixture.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: sellerFixture.me });
		} else if (op === 'SellerStats') {
			req.reply({ data: overrides['SellerStats'] ?? { sellerStats: fixture.sellerStats } });
		} else if (op === 'SellerRevenueSeries') {
			req.reply({ data: { sellerRevenueSeries: fixture.sellerRevenueSeries } });
		} else if (op === 'SellerTopProducts') {
			req.reply({ data: { sellerTopProducts: fixture.sellerTopProducts } });
		} else if (op === 'SellerLowStockAlerts') {
			req.reply({
				data: overrides['SellerLowStockAlerts'] ?? {
					sellerLowStockAlerts: fixture.sellerLowStockAlerts,
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('SellerDashboardPage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/seller-cabinet/dashboard', { onBeforeLoad: stubAuth });
	});

	it('renders the page title and subtitle', () => {
		cy.contains('Anna').should('exist');
	});

	it('renders the dark hero banner with stats', () => {
		cy.contains('sellerDashboard.hero.statOrders').should('exist');
		cy.contains('sellerDashboard.hero.statRevenue').should('exist');
		cy.contains('sellerDashboard.hero.cta').should('exist');
	});

	it('renders the 4 stat cards', () => {
		cy.contains('sellerDashboard.stats.activeProducts').should('exist');
		cy.contains('sellerDashboard.stats.orders').should('exist');
		cy.contains('sellerDashboard.stats.revenue').should('exist');
		cy.contains('sellerDashboard.stats.avgRating').should('exist');
	});

	it('renders the revenue chart section', () => {
		cy.contains('sellerDashboard.chart.title').should('exist');
		cy.contains('sellerDashboard.chart.legendRevenue').should('exist');
		// chart granularity controls
		cy.contains('sellerDashboard.chart.granularity.DAY').should('exist');
		cy.contains('sellerDashboard.chart.granularity.WEEK').should('exist');
		cy.contains('sellerDashboard.chart.granularity.MONTH').should('exist');
	});

	it('renders the top products table with rows', () => {
		cy.contains('sellerDashboard.topProducts.title').should('exist');
		cy.contains('Heritage Field Jacket').should('exist');
		cy.contains('Canvas Tote Bag').should('exist');
		cy.contains('Wool Beanie').should('exist');
	});

	it('renders low stock alerts in the side card', () => {
		cy.contains('sellerDashboard.lowStock.title').should('exist');
		cy.contains('Heritage Field Jacket').should('exist');
	});

	it('shows "All stocked up" when no low stock alerts', () => {
		stubGraphQL({ SellerLowStockAlerts: { sellerLowStockAlerts: [] } });
		cy.visit('/seller-cabinet/dashboard', { onBeforeLoad: stubAuth });
		cy.contains('sellerDashboard.featureCard.okTitle').should('exist');
		cy.contains('sellerDashboard.lowStock.empty').should('exist');
	});

	it('switching period triggers refetch and updates the period label', () => {
		// default is MONTH
		cy.contains('sellerDashboard.period.MONTH').should('exist');
		// switch to YEAR
		cy.contains('sellerDashboard.period.YEAR').click();
		cy.wait('@graphql');
		cy.contains('sellerDashboard.period.YEAR').should('exist');
	});

	it('switching chart granularity updates the segmented control', () => {
		cy.contains('sellerDashboard.chart.granularity.WEEK').click();
		cy.wait('@graphql');
		// after clicking WEEK, it should be selected (active segment)
		cy.contains('sellerDashboard.chart.granularity.WEEK')
			.closest('button')
			.should('have.attr', 'aria-selected', 'true');
	});

	it('hero CTA navigates to products page', () => {
		cy.contains('sellerDashboard.hero.cta').click();
		cy.url().should('include', '/seller-cabinet/products');
	});

	it('top products "View all" navigates to products page', () => {
		cy.contains('sellerDashboard.topProducts.viewAll').click();
		cy.url().should('include', '/seller-cabinet/products');
	});
});
