jest.mock('../../repositories/feedbackRepository.js');
jest.mock('../auditLogService.js');
jest.mock('../../config/env.js', () => ({
	env: {
		CLOUDINARY_CLOUD_NAME: undefined,
		CLOUDINARY_API_KEY: undefined,
		CLOUDINARY_API_SECRET: undefined,
	},
}));

import { GraphQLError } from 'graphql';
import * as feedbackService from '../feedbackService.js';
import * as repo from '../../repositories/feedbackRepository.js';
import * as auditLogService from '../auditLogService.js';

const mockFeedback = {
	id: 'fb-1',
	userId: 'user-1',
	category: 'BUG' as const,
	subject: 'Checkout broken',
	message: 'Payment fails on step 3 every time.',
	attachments: [{ url: 'https://cdn.example/1.jpg', publicId: 'p1' }],
	status: 'NEW' as const,
	adminNotes: null,
	handledById: null,
	handledAt: null,
	createdAt: new Date('2026-01-01T00:00:00Z'),
	updatedAt: new Date('2026-01-01T00:00:00Z'),
	user: {
		email: 'buyer@example.com',
		role: 'BUYER' as const,
		profile: { firstName: 'Anna', lastName: 'Buyer' },
	},
	handledBy: null,
};

describe('feedbackService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('submits feedback with validated input', async () => {
		jest.mocked(repo.createFeedback).mockResolvedValue(mockFeedback);

		const result = await feedbackService.submitFeedback('user-1', {
			category: 'BUG',
			subject: 'Checkout broken',
			message: 'Payment fails on step 3 every time.',
		});

		expect(repo.createFeedback).toHaveBeenCalled();
		expect(result.subject).toBe('Checkout broken');
		expect(result.authorName).toBe('Anna Buyer');
	});

	it('updates feedback status and writes audit log', async () => {
		jest.mocked(repo.findFeedbackById).mockResolvedValue(mockFeedback);
		jest.mocked(repo.updateFeedback).mockResolvedValue({
			...mockFeedback,
			status: 'ACKNOWLEDGED',
			handledById: 'admin-1',
			handledAt: new Date('2026-01-02T00:00:00Z'),
			handledBy: {
				email: 'admin@example.com',
				role: 'ADMIN' as const,
				profile: { firstName: 'Admin', lastName: 'User' },
			},
		});

		const result = await feedbackService.updateFeedbackStatus('admin-1', {
			id: 'fb-1',
			status: 'ACKNOWLEDGED',
			adminNotes: 'Thanks, we are looking into this.',
		});

		expect(auditLogService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'FEEDBACK_STATUS_CHANGE',
				targetId: 'fb-1',
			})
		);
		expect(result.status).toBe('ACKNOWLEDGED');
	});

	it('throws when feedback is missing', async () => {
		jest.mocked(repo.findFeedbackById).mockResolvedValue(null);

		await expect(
			feedbackService.updateFeedbackStatus('admin-1', {
				id: 'missing',
				status: 'RESOLVED',
			})
		).rejects.toBeInstanceOf(GraphQLError);
	});
});
