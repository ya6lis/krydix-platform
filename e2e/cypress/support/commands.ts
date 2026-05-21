// Custom Cypress commands — add here as features are built

Cypress.Commands.add('login', (email: string, password: string) => {
	cy.visit('/auth/login');
	cy.get('[data-cy="email"]').type(email);
	cy.get('[data-cy="password"]').type(password);
	cy.get('[data-cy="submit"]').click();
});

declare global {
	namespace Cypress {
		interface Chainable {
			login(email: string, password: string): Chainable<void>;
		}
	}
}
