import { DeliveryMethod } from '@/constants/enums';
import { Role } from '@/constants/enums';
import {
	computeCheckoutTotal,
	computeShippingAmount,
	getCheckoutContactDefaults,
	isValidCardCvv,
	isValidCardExpiry,
	isValidCardNumber,
} from '../checkoutUtils';

describe('checkoutUtils', () => {
	it('prefills checkout contact from user and draft data', () => {
		const result = getCheckoutContactDefaults(
			{
				id: 'u1',
				email: 'jane@example.com',
				role: Role.BUYER,
				isEmailVerified: true,
				profile: {
					firstName: 'Jane',
					lastName: 'Doe',
					avatarUrl: null,
				},
			},
			{ phone: '+380501112233' }
		);

		expect(result).toEqual({
			firstName: 'Jane',
			lastName: 'Doe',
			email: 'jane@example.com',
			phone: '+380501112233',
		});
	});

	it('calculates mock shipping by delivery method', () => {
		expect(computeShippingAmount(DeliveryMethod.SELF_PICKUP, 100)).toBe(0);
		expect(computeShippingAmount(DeliveryMethod.COURIER, 100)).toBe(79);
		expect(computeShippingAmount(DeliveryMethod.BRANCH_PICKUP, 100)).toBe(49);
		expect(computeShippingAmount(DeliveryMethod.COURIER, 1600)).toBe(0);
		expect(computeShippingAmount(DeliveryMethod.BRANCH_PICKUP, 1200)).toBe(0);
	});

	it('calculates final total with shipping and promo discount', () => {
		expect(computeCheckoutTotal(200, 49, 30)).toBe(219);
		expect(computeCheckoutTotal(50, 79, 200)).toBe(0);
	});

	it('validates mock card details', () => {
		expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
		expect(isValidCardNumber('1111 1111 1111 1111')).toBe(false);
		expect(isValidCardExpiry('12/30', new Date('2026-01-01T00:00:00Z'))).toBe(true);
		expect(isValidCardExpiry('01/20', new Date('2026-01-01T00:00:00Z'))).toBe(false);
		expect(isValidCardCvv('123')).toBe(true);
		expect(isValidCardCvv('12')).toBe(false);
	});
});
