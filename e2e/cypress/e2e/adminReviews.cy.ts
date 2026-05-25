import fixture from '../fixtures/adminReviews.json';

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

function stubAuth(win: Window, role: 'ADMIN' | 'MODERATOR') {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
	win.localStorage.setItem('krydix_stub_role', role);
}

function stubGraphQL(role: 'ADMIN' | 'MODERATOR') {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';
		const session = role === 'ADMIN' ? adminSession : {
			refreshToken: {
				refreshToken: {
					accessToken: 'stub-access',
					refreshToken: 'stub-rt',
					user: {
						id: 'mod-1',
						email: 'mod1@krydix.dev',
						role: 'MODERATOR',
						isEmailVerified: true,
						profile: { firstName: 'Sofia', lastName: 'Kovalenko', avatarUrl: null },
					},
				},
			},
			me: {
				me: {
					id: 'mod-1',
					email: 'mod1@krydix.dev',
					role: 'MODERATOR',
					isEmailVerified: true,
					profile: { firstName: 'Sofia', lastName: 'Kovalenko', avatarUrl: null },
				},
			},
		};

		if (op === 'RefreshToken') {
			req.reply({ data: session.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: session.me });
		} else if (op === 'AdminReviewStats') {
			req.reply({ data: { adminReviewStats: fixture.adminReviewStats } });
		} else if (op === 'AllReviews') {
			req.reply({ data: { allReviews: fixture.allReviews } });
		} else if (op === 'ChangeAdminReviewStatus') {
			req.reply({
				data: {
					changeAdminReviewStatus: {
						id: req.body.variables?.id,
						status: req.body.variables?.status,
					},
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('ReviewsManagementPage — Admin', () => {
	beforeEach(() => {
		stubGraphQL('ADMIN');
		cy.visit('/admin/reviews', {
			onBeforeLoad: (win) => stubAuth(win, 'ADMIN'),
		});
	});

	it('renders page title and stat row', () => {
		cy.contains('All reviews').should('be.visible');
		cy.contains('Product reviews across Krydix').should('be.visible');
		cy.contains('Approved').should('be.visible');
		cy.contains('Flagged').should('be.visible');
	});

	it('renders reviews table', () => {
		cy.contains('Anna Bondarenko').should('be.visible');
		cy.contains('Wireless Headphones Pro').should('be.visible');
		cy.contains('4.5').should('be.visible');
	});

	it('changes review status via dropdown', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').click();
		cy.get('[role="listbox"]').contains('Blocked').click();
		cy.wait('@graphql');
		cy.contains('Review status updated').should('be.visible');
	});
});

describe('ReviewsManagementPage — Moderator', () => {
	beforeEach(() => {
		stubGraphQL('MODERATOR');
		cy.visit('/moderator/all-reviews', {
			onBeforeLoad: (win) => stubAuth(win, 'MODERATOR'),
		});
	});

	it('shows reviews page for moderator', () => {
		cy.contains('All reviews').should('be.visible');
		cy.contains('Anna Bondarenko').should('be.visible');
	});

	it('does not show soft delete action for moderator', () => {
		cy.get('table tbody tr').first().find('button').should('not.exist');
	});

	it('allows moderator to change review status', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').click();
		cy.get('[role="listbox"]').contains('Pending').click();
		cy.wait('@graphql');
		cy.contains('Review status updated').should('be.visible');
	});
});
