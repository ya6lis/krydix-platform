import { RegisterInputSchema, LoginInputSchema } from '../authValidators.js';

describe('RegisterInputSchema', () => {
	const valid = {
		email: 'user@example.com',
		password: 'ValidPass12!',
		firstName: 'Jane',
		lastName: 'Doe',
	};

	it('accepts valid input', () => {
		expect(() => RegisterInputSchema.parse(valid)).not.toThrow();
	});

	it('rejects invalid email', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, email: 'not-an-email' })).toThrow();
	});

	it('rejects password shorter than 12 characters', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, password: 'Short1!' })).toThrow(
			/at least 12/
		);
	});

	it('accepts password of exactly 12 characters', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, password: 'Exactly12Chr' })).not.toThrow();
	});

	it('rejects empty firstName', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, firstName: '' })).toThrow();
	});

	it('rejects firstName longer than 50 characters', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, firstName: 'A'.repeat(51) })).toThrow();
	});

	it('rejects empty lastName', () => {
		expect(() => RegisterInputSchema.parse({ ...valid, lastName: '' })).toThrow();
	});
});

describe('LoginInputSchema', () => {
	const valid = { email: 'user@example.com', password: 'anypassword' };

	it('accepts valid input', () => {
		expect(() => LoginInputSchema.parse(valid)).not.toThrow();
	});

	it('rejects invalid email', () => {
		expect(() => LoginInputSchema.parse({ ...valid, email: 'bad' })).toThrow();
	});

	it('rejects empty password', () => {
		expect(() => LoginInputSchema.parse({ ...valid, password: '' })).toThrow();
	});
});
