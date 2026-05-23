import authFixture from '../fixtures/auth.json';

function stubLoginSuccess() {
	cy.intercept('POST', '**/graphql', (req) => {
		const { operationName } = req.body;
		if (operationName === 'Login') {
			req.reply({ data: authFixture.loginSuccess });
		} else if (operationName === 'Me') {
			req.reply({ data: authFixture.me });
		} else {
			req.continue();
		}
	}).as('graphql');
}

function stubLoginError() {
	cy.intercept('POST', '**/graphql', (req) => {
		if (req.body.operationName === 'Login') {
			req.reply({ body: authFixture.loginError });
		} else {
			req.continue();
		}
	}).as('graphql');
}

function stubRegisterSuccess() {
	cy.intercept('POST', '**/graphql', (req) => {
		if (req.body.operationName === 'Register') {
			req.reply({ data: authFixture.registerSuccess });
		} else {
			req.continue();
		}
	}).as('graphql');
}

function stubVerifyEmailSuccess() {
	cy.intercept('POST', '**/graphql', (req) => {
		if (req.body.operationName === 'VerifyEmail') {
			req.reply({ data: authFixture.verifyEmailSuccess });
		} else {
			req.continue();
		}
	}).as('graphql');
}

// ─── Login page ───────────────────────────────────────────────────────────────

describe('Login page', () => {
	beforeEach(() => {
		cy.visit('/auth/login');
	});

	it('renders the sign-in heading', () => {
		cy.get('h1').should('contain', 'Sign in');
	});

	it('has email and password fields', () => {
		cy.get('input[type="text"], input[type="email"]').should('exist');
		cy.get('input[type="password"]').should('exist');
	});

	it('has a submit button', () => {
		cy.contains('button', 'Sign In').should('exist');
	});

	it('shows a link to register', () => {
		cy.contains('Create one').should('exist');
	});

	it('successful login redirects away from login page', () => {
		stubLoginSuccess();
		cy.get('input[type="text"], input[autocomplete="email"]').first().type('test@krydix.co');
		cy.get('input[type="password"]').type('Password1!');
		cy.contains('button', 'Sign In').click();
		cy.url().should('not.include', '/auth/login');
	});

	it('shows error message on invalid credentials', () => {
		stubLoginError();
		cy.get('input[type="text"], input[autocomplete="email"]').first().type('bad@bad.co');
		cy.get('input[type="password"]').type('wrongpass');
		cy.contains('button', 'Sign In').click();
		cy.contains('Invalid credentials').should('be.visible');
	});

	it('navigates to register page when clicking create account link', () => {
		cy.contains('Create one').click();
		cy.url().should('include', '/auth/register');
	});
});

// ─── Register page ────────────────────────────────────────────────────────────

describe('Register page', () => {
	beforeEach(() => {
		cy.visit('/auth/register');
	});

	it('renders the create account heading', () => {
		cy.get('h1').should('contain', 'Create your account');
	});

	it('has role chooser with buyer and seller options', () => {
		cy.contains('Buy on Krydix').should('be.visible');
		cy.contains('Sell on Krydix').should('be.visible');
	});

	it('has first name, last name, email, password fields', () => {
		cy.get('input[autocomplete="given-name"]').should('exist');
		cy.get('input[autocomplete="family-name"]').should('exist');
		cy.get('input[autocomplete="email"]').should('exist');
		cy.get('input[autocomplete="new-password"]').should('exist');
	});

	it('blocks submit when terms checkbox not checked', () => {
		stubRegisterSuccess();
		cy.get('input[autocomplete="given-name"]').type('Jane');
		cy.get('input[autocomplete="family-name"]').type('Doe');
		cy.get('input[autocomplete="email"]').type('jane@krydix.co');
		cy.get('input[autocomplete="new-password"]').type('Password1!');
		cy.contains('button', 'Sign Up').click();
		cy.contains('You must accept the terms').should('be.visible');
	});

	it('successful registration shows success state', () => {
		stubRegisterSuccess();
		cy.get('input[autocomplete="given-name"]').type('Jane');
		cy.get('input[autocomplete="family-name"]').type('Doe');
		cy.get('input[autocomplete="email"]').type('jane@krydix.co');
		cy.get('input[autocomplete="new-password"]').type('Password1!');
		cy.contains('I agree').parent().find('input[type="checkbox"]').check({ force: true });
		cy.contains('button', 'Sign Up').click();
		cy.contains('Account created').should('be.visible');
	});

	it('navigates to login page when clicking sign-in link', () => {
		cy.contains('Already have one').click();
		cy.url().should('include', '/auth/login');
	});
});

// ─── Verify email page ────────────────────────────────────────────────────────

describe('Verify email page', () => {
	it('shows success state with valid token', () => {
		stubVerifyEmailSuccess();
		cy.visit('/auth/verify-email?token=valid-token-123');
		cy.contains('Email verified').should('be.visible');
	});

	it('shows error state with no token', () => {
		cy.visit('/auth/verify-email');
		cy.contains('Invalid').should('be.visible');
	});
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('Auth guard', () => {
	it('redirects unauthenticated user to login when visiting /account', () => {
		cy.visit('/account');
		cy.url().should('include', '/auth/login');
	});
});
