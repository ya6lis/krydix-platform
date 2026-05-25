import fixture from '../fixtures/reviewModeration.json';

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
		} else if (op === 'ModerationReviews') {
			req.reply({
				data: overrides['ModerationReviews'] ?? { moderationReviews: fixture.moderationReviews },
			});
		} else if (op === 'ApproveReview') {
			req.reply({
				data: overrides['ApproveReview'] ?? {
					approveReview: { id: req.body.variables?.id, isApproved: true, isBlocked: false },
				},
			});
		} else if (op === 'HideReview') {
			req.reply({
				data: overrides['HideReview'] ?? {
					hideReview: { id: req.body.variables?.id, isApproved: false, isBlocked: true },
				},
			});
		} else {
			req.continue();
		}
	}).as('graphql');
}

describe('ReviewModerationPage', () => {
	beforeEach(() => {
		stubGraphQL();
		cy.visit('/moderator/review-moderation', {
			onBeforeLoad: stubAuth,
		});
	});

	it('renders page title and tabs with counts', () => {
		cy.contains('Review moderation').should('be.visible');
		cy.contains('Approve, block, and browse product reviews.').should('be.visible');
		cy.contains('Pending').should('be.visible');
		cy.contains('Flagged').should('be.visible');
		cy.contains('Approved').should('be.visible');
		cy.contains('Hidden').should('be.visible');
	});

	it('renders review cards in grid', () => {
		cy.contains('Jaymes Sorrento').should('be.visible');
		cy.contains('Lucia O\'Brien').should('be.visible');
		cy.contains('Looks nothing like the photos').should('be.visible');
		cy.contains('Heritage Field Jacket — Olive').should('be.visible');
	});

	it('shows flagged indicator on flagged review', () => {
		cy.contains('Flagged by seller').should('be.visible');
	});

	it('approves a review', () => {
		cy.contains('button', 'Approve').first().click();
		cy.wait('@graphql');
		cy.contains('Review approved successfully').should('be.visible');
	});

	it('hides a review', () => {
		cy.contains('button', 'Hide').first().click();
		cy.wait('@graphql');
		cy.contains('Review hidden').should('be.visible');
	});

	it('filters by search', () => {
		cy.get('input[placeholder*="Search by reviewer"]').type('Lucia');
		cy.wait('@graphql');
	});
});
