import fixture from '../fixtures/adminProducts.json';

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
		} else if (op === 'AdminProductStats') {
			req.reply({ data: { adminProductStats: fixture.adminProductStats } });
		} else if (op === 'AllProducts') {
			req.reply({ data: { allProducts: fixture.allProducts } });
		} else if (op === 'ChangeAdminProductStatus') {
			req.reply({
				data: {
					changeAdminProductStatus: {
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

describe('ProductsManagementPage — Admin', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/manage/products', {
			onBeforeLoad: (win) => stubAuth(win),
		});
	});

	it('renders page title and stat row', () => {
		cy.contains('All products').should('be.visible');
		cy.contains('Full catalog overview').should('be.visible');
		cy.contains('Approved').should('be.visible');
		cy.contains('Pending review').should('be.visible');
	});

	it('renders products table with seller info', () => {
		cy.contains('Wireless Headphones Pro').should('be.visible');
		cy.contains('Tech Store UA').should('be.visible');
		cy.contains('WH-001').should('be.visible');
	});

	it('changes product status via dropdown', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').click();
		cy.get('[role="listbox"]').contains('Blocked').click();
		cy.wait('@graphql');
		cy.contains('Product status updated').should('be.visible');
	});
});

describe('ProductsManagementPage — Moderator', () => {
	beforeEach(() => {
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({
					data: {
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
					},
				});
			} else if (op === 'Me') {
				req.reply({
					data: {
						me: {
							id: 'mod-1',
							email: 'mod1@krydix.dev',
							role: 'MODERATOR',
							isEmailVerified: true,
							profile: { firstName: 'Sofia', lastName: 'Kovalenko', avatarUrl: null },
						},
					},
				});
			} else if (op === 'AdminProductStats') {
				req.reply({ data: { adminProductStats: fixture.adminProductStats } });
			} else if (op === 'AllProducts') {
				req.reply({ data: { allProducts: fixture.allProducts } });
			} else if (op === 'ChangeAdminProductStatus') {
				req.reply({
					data: {
						changeAdminProductStatus: {
							id: req.body.variables?.id,
							status: req.body.variables?.status,
						},
					},
				});
			} else {
				req.continue();
			}
		}).as('graphql');

		cy.visit('/manage/products', {
			onBeforeLoad: (win) => {
				win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
				win.localStorage.setItem('krydix_stub_role', 'MODERATOR');
			},
		});
	});

	it('shows products page for moderator', () => {
		cy.contains('All products').should('be.visible');
		cy.contains('Wireless Headphones Pro').should('be.visible');
	});

	it('does not show soft delete action for moderator', () => {
		cy.get('table tbody tr').first().find('button').should('not.exist');
	});

	it('allows moderator to change product status', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').click();
		cy.get('[role="listbox"]').contains('Blocked').click();
		cy.wait('@graphql');
		cy.contains('Product status updated').should('be.visible');
	});
});
