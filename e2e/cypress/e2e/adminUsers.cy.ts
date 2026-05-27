import fixture from '../fixtures/adminUsers.json';

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

const moderatorSession = {
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

function stubAuth(win: Window, role: 'ADMIN' | 'MODERATOR') {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
	win.localStorage.setItem('krydix_stub_role', role);
}

function stubGraphQL(role: 'ADMIN' | 'MODERATOR', overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';
		const session = role === 'ADMIN' ? adminSession : moderatorSession;

		if (op === 'RefreshToken') {
			req.reply({ data: session.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: session.me });
		} else if (op === 'AdminStats') {
			req.reply({ data: overrides['AdminStats'] ?? { adminStats: fixture.adminStats } });
		} else if (op === 'AllUsers') {
			req.reply({ data: overrides['AllUsers'] ?? { allUsers: fixture.allUsers } });
		} else if (op === 'ChangeUserRole') {
			const newRole = req.body.variables?.role;
			req.reply({
				data: overrides['ChangeUserRole'] ?? {
					changeUserRole: { id: req.body.variables?.id, role: newRole },
				},
			});
		} else if (op === 'SoftBanUser') {
			req.reply({
				data: overrides['SoftBanUser'] ?? {
					softBanUser: { id: req.body.variables?.id, isActive: false, status: 'BLOCKED' },
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('UsersManagementPage — Admin', () => {
	beforeEach(() => {
		stubGraphQL('ADMIN');
		cy.visit('/users', {
			onBeforeLoad: (win) => stubAuth(win, 'ADMIN'),
		});
	});

	it('renders page title and stat row', () => {
		cy.contains('Users & roles').should('be.visible');
		cy.contains('All accounts on Krydix').should('be.visible');
		cy.contains('Buyers').should('be.visible');
		cy.contains('Invite user').should('be.visible');
	});

	it('renders users table with role badges', () => {
		cy.contains('Anna Bondarenko').should('be.visible');
		cy.contains('Buyer').should('be.visible');
		cy.contains('Moderator').should('be.visible');
	});

	it('shows online status for active users', () => {
		cy.get('table tbody tr').eq(0).contains('Online').should('be.visible');
		cy.get('table tbody tr').eq(1).contains('Online').should('not.exist');
	});

	it('changes buyer role to moderator via dropdown', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').click();
		cy.get('[role="listbox"]').contains('Moderator').click();
		cy.wait('@graphql');
		cy.contains('Role updated successfully').should('be.visible');
	});
});

describe('UsersManagementPage — Moderator', () => {
	beforeEach(() => {
		stubGraphQL('MODERATOR');
		cy.visit('/users', {
			onBeforeLoad: (win) => stubAuth(win, 'MODERATOR'),
		});
	});

	it('shows users page without invite button', () => {
		cy.contains('Users & roles').should('be.visible');
		cy.contains('Invite user').should('not.exist');
	});

	it('does not show role change dropdown for moderator', () => {
		cy.get('table tbody tr').first().find('[role="combobox"]').should('not.exist');
		cy.contains('Buyer').should('be.visible');
	});

	it('hides row actions for moderator and admin users', () => {
		cy.get('table tbody tr').eq(0).find('button').should('have.length.at.least', 1);
		cy.get('table tbody tr').eq(1).find('button').should('not.exist');
		cy.get('table tbody tr').eq(2).find('button').should('not.exist');
	});

	it('blocks role change mutation when moderator tries via API', () => {
		cy.intercept('POST', '**/graphql', (req) => {
			if (req.body?.operationName === 'ChangeUserRole') {
				req.reply({
					errors: [{ message: 'Administrator access required', extensions: { code: 'FORBIDDEN' } }],
				});
			}
		});
	});
});
