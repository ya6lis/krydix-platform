import fixture from '../fixtures/adminPlatform.json';

const adminSession = {
	refreshToken: {
		refreshToken: {
			accessToken: 'stub-access',
			refreshToken: 'stub-rt',
			user: {
				id: 'admin-1',
				email: 'admin@krydix.dev',
				role: 'ADMIN',
				isEmailVerified: true,
				profile: { firstName: 'Alex', lastName: 'Admin', avatarUrl: null },
			},
		},
	},
	me: {
		me: {
			id: 'admin-1',
			email: 'admin@krydix.dev',
			role: 'ADMIN',
			isEmailVerified: true,
			profile: { firstName: 'Alex', lastName: 'Admin', avatarUrl: null },
		},
	},
};

function stubAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
	win.localStorage.setItem('krydix_stub_role', 'ADMIN');
}

function stubGraphQL() {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: adminSession.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: adminSession.me });
		} else if (op === 'PlatformOverview') {
			req.reply({ data: { platformOverview: fixture.platformOverview } });
		} else if (op === 'CommissionRules') {
			req.reply({ data: { commissionRules: fixture.commissionRules } });
		} else if (op === 'PayoutConfig') {
			req.reply({ data: { payoutConfig: fixture.payoutConfig } });
		} else if (op === 'AdminPromoCodes') {
			req.reply({ data: { adminPromoCodes: fixture.adminPromoCodes } });
		} else if (op === 'CategoryTree') {
			req.reply({
				data: {
					categoryTree: [
						{
							id: 'cat-outerwear',
							slug: 'outerwear',
							parentId: null,
							icon: null,
							isActive: true,
							sortOrder: 0,
							depth: 1,
							productCount: 10,
							translations: [{ language: 'EN', name: 'Outerwear', description: null, metaTitle: null, metaDescription: null }],
							children: [],
						},
					],
				},
			});
		} else if (op === 'SaveCommissionRules' || op === 'SavePayoutConfig') {
			req.reply({ data: {} });
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('AdminPlatformPage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/settings', {
			onBeforeLoad: (win) => stubAuth(win),
		});
		cy.wait('@graphql');
	});

	it('renders overview stats and four nav sections', () => {
		cy.get('[data-testid="admin-platform-page"]').should('be.visible');
		cy.contains('Platform settings').should('be.visible');
		cy.get('[data-testid="platform-overview"]').should('be.visible');
		cy.get('[data-testid="platform-nav-overview"]').should('be.visible');
		cy.get('[data-testid="platform-nav-commissions"]').should('be.visible');
		cy.get('[data-testid="platform-nav-promos"]').should('be.visible');
		cy.get('[data-testid="platform-nav-payouts"]').should('be.visible');
	});

	it('shows commission rules and promo codes', () => {
		cy.get('[data-testid="platform-commissions"]').should('be.visible');
		cy.contains('Default rate').should('be.visible');
		cy.get('[data-testid="platform-add-category-override"]').should('be.visible');
		cy.get('[data-testid="platform-promos"]').should('be.visible');
		cy.get('[data-testid="platform-promo-row"]').should('have.length', 1);
		cy.contains('WELCOME10').should('be.visible');
	});

	it('opens add category override modal', () => {
		cy.get('[data-testid="platform-add-category-override"]').click();
		cy.get('[data-testid="platform-confirm-add-category"]').should('be.visible').and('be.disabled');
	});

	it('navigates to payout section', () => {
		cy.get('[data-testid="platform-nav-payouts"]').click();
		cy.get('[data-testid="platform-payouts"]').should('be.visible');
		cy.contains('Payout cycle').should('be.visible');
	});
});
