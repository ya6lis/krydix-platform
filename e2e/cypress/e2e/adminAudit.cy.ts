import fixture from '../fixtures/adminAudit.json';

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
		const actionKeys: string[] | undefined = req.body?.variables?.input?.actionKeys;

		if (op === 'RefreshToken') {
			req.reply({ data: adminSession.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: adminSession.me });
		} else if (op === 'AuditLogs') {
			const filtered =
				actionKeys?.includes('product.approve') && actionKeys.length === 1
					? fixture.auditLogsProductApprove
					: fixture.auditLogsAll;
			req.reply({ data: { auditLogs: filtered } });
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('AdminAuditPage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/admin/audit', {
			onBeforeLoad: (win) => stubAuth(win),
		});
		cy.wait('@graphql');
	});

	it('renders page title and audit events grouped by day', () => {
		cy.contains('Audit log').should('be.visible');
		cy.get('[data-testid="audit-log-card"]').should('be.visible');
		cy.get('[data-testid="audit-event-row"]').should('have.length', 4);
		cy.contains('Wool Cardigan — Oat').should('be.visible');
		cy.contains('changed user role').should('be.visible');
	});

	it('filters by product.approve and shows only matching events', () => {
		cy.get('[data-testid="audit-filter-action-product.approve"]').click();
		cy.wait('@graphql');

		cy.get('[data-testid="audit-event-row"]').should('have.length', 2);
		cy.get('[data-testid="audit-event-row"]').each(($row) => {
			cy.wrap($row).should('have.attr', 'data-action-key', 'product.approve');
		});
		cy.contains('Trail Runners').should('not.exist');
		cy.contains('changed user role').should('not.exist');
	});

	it('opens detail modal when event row clicked', () => {
		cy.get('[data-testid="audit-event-row"]').first().click();
		cy.get('[data-testid="audit-detail-modal"]').should('be.visible');
		cy.contains('Event details').should('be.visible');
		cy.contains('#AL-OG-1').should('be.visible');
		cy.contains('mod@krydix.dev').should('be.visible');
		cy.contains('PENDING_MODERATION').should('be.visible');
		cy.contains('APPROVED').should('be.visible');
	});
});
