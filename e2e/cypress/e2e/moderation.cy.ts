import fixture from '../fixtures/moderation.json';

// ─── Shared auth + graphql fixture ────────────────────────────────────────────

const moderatorSession = {
	refreshToken: {
		refreshToken: {
			accessToken: 'stub-access',
			refreshToken: 'stub-rt',
			user: {
				id: 'mod-1',
				email: 'moderator@krydix.co',
				role: 'MODERATOR',
				isEmailVerified: true,
				profile: { firstName: 'Mod', lastName: 'One', avatarUrl: null },
			},
		},
	},
	me: {
		me: {
			id: 'mod-1',
			email: 'moderator@krydix.co',
			role: 'MODERATOR',
			isEmailVerified: true,
			profile: { firstName: 'Mod', lastName: 'One', avatarUrl: null },
		},
	},
};

function stubAuth(win: Window) {
	win.localStorage.setItem('krydix_refresh_token', 'stub-rt');
}

function stubGraphQL(overrides: Record<string, object> = {}) {
	cy.intercept('POST', '**/graphql', (req) => {
		const op: string = req.body?.operationName ?? '';

		if (op === 'RefreshToken') {
			req.reply({ data: moderatorSession.refreshToken });
		} else if (op === 'Me') {
			req.reply({ data: moderatorSession.me });
		} else if (op === 'ModerationQueue') {
			req.reply({
				data: overrides['ModerationQueue'] ?? { moderationQueue: fixture.moderationQueue },
			});
		} else if (op === 'ApproveProduct') {
			req.reply({
				data: overrides['ApproveProduct'] ?? {
					approveProduct: { id: req.body.variables?.id, status: 'APPROVED' },
				},
			});
		} else if (op === 'RejectProduct') {
			req.reply({
				data: overrides['RejectProduct'] ?? {
					rejectProduct: { id: req.body.variables?.id, status: 'REJECTED' },
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Specs ────────────────────────────────────────────────────────────────────

describe('ProductModerationPage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/moderation/products', {
			onBeforeLoad: stubAuth,
		});
	});

	it('renders page title and pending count', () => {
		cy.contains('Product moderation').should('be.visible');
		cy.contains('2 items pending').should('be.visible');
	});

	it('renders queue items with product name, seller and price', () => {
		cy.contains('Wool Cardigan — Oat').should('be.visible');
		cy.contains('Heritage Field Jacket — Olive').should('be.visible');
		cy.contains('Lichen Goods').should('be.visible');
		cy.contains('96,00').should('be.visible');
	});

	it('selects an item and shows preview panel', () => {
		cy.contains('Wool Cardigan — Oat').click();
		cy.contains('LG-WC-OAT-S').should('be.visible');
		cy.contains('Category').should('be.visible');
		cy.contains('Outerwear › Knitwear').should('be.visible');
		cy.contains('If rejecting').should('be.visible');
		cy.contains('Approve').should('be.visible');
		cy.contains('Reject').should('be.visible');
	});

	it('approves a product — item disappears from queue', () => {
		// Stub refetch after approve to return empty queue
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({ data: moderatorSession.refreshToken });
			} else if (op === 'Me') {
				req.reply({ data: moderatorSession.me });
			} else if (op === 'ModerationQueue') {
				// After approve, return empty queue
				req.reply({
					data: {
						moderationQueue: {
							items: [],
							total: 0,
							pendingCount: 0,
							resolvedTodayCount: 6,
						},
					},
				});
			} else if (op === 'ApproveProduct') {
				req.reply({ data: { approveProduct: { id: 'prod-1', status: 'APPROVED' } } });
			} else {
				req.continue();
			}
		}).as('graphqlAfterApprove');

		cy.visit('/moderation/products', { onBeforeLoad: stubAuth });

		cy.contains('Wool Cardigan — Oat').click();
		cy.contains('Approve').click();

		cy.contains('Product approved successfully').should('be.visible');
		cy.contains('Wool Cardigan — Oat').should('not.exist');
		cy.contains('No items in queue').should('be.visible');
	});

	it('shows validation error when rejecting without a reason', () => {
		cy.contains('Wool Cardigan — Oat').click();

		// Click Reject without entering any reason
		cy.contains('Reject').click();

		cy.contains('Please enter a rejection reason').should('be.visible');
	});

	it('rejects a product with a reason — item disappears from queue', () => {
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({ data: moderatorSession.refreshToken });
			} else if (op === 'Me') {
				req.reply({ data: moderatorSession.me });
			} else if (op === 'ModerationQueue') {
				req.reply({
					data: {
						moderationQueue: {
							items: [fixture.moderationQueue.items[1]],
							total: 1,
							pendingCount: 1,
							resolvedTodayCount: 6,
						},
					},
				});
			} else if (op === 'RejectProduct') {
				req.reply({ data: { rejectProduct: { id: 'prod-1', status: 'REJECTED' } } });
			} else {
				req.continue();
			}
		}).as('graphqlAfterReject');

		cy.visit('/moderation/products', { onBeforeLoad: stubAuth });

		cy.contains('Wool Cardigan — Oat').click();

		// Select a rejection reason
		cy.contains('Low-quality photos').click();

		cy.contains('Reject').click();

		cy.contains('Product rejected').should('be.visible');
		cy.contains('Wool Cardigan — Oat').should('not.exist');
	});

	it('shows tab counts for Pending and Resolved today', () => {
		cy.contains('Pending').should('be.visible');
		cy.contains('Resolved today').should('be.visible');
	});

	it('shows empty state when queue is empty', () => {
		cy.intercept('POST', '**/graphql', (req) => {
			const op: string = req.body?.operationName ?? '';
			if (op === 'RefreshToken') {
				req.reply({ data: moderatorSession.refreshToken });
			} else if (op === 'Me') {
				req.reply({ data: moderatorSession.me });
			} else if (op === 'ModerationQueue') {
				req.reply({
					data: {
						moderationQueue: {
							items: [],
							total: 0,
							pendingCount: 0,
							resolvedTodayCount: 0,
						},
					},
				});
			} else {
				req.continue();
			}
		}).as('emptyQueue');

		cy.visit('/moderation/products', { onBeforeLoad: stubAuth });

		cy.contains('No items in queue').should('be.visible');
		cy.contains('All product submissions have been reviewed').should('be.visible');
	});
});
