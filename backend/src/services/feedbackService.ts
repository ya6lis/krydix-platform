import { GraphQLError } from 'graphql';
import { v2 as cloudinary } from 'cloudinary';
import type { FeedbackStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { AuditAction } from '../constants/enums.js';
import * as auditLogService from './auditLogService.js';
import * as repo from '../repositories/feedbackRepository.js';
import {
	AdminFeedbacksInputSchema,
	SubmitFeedbackSchema,
	UpdateFeedbackSchema,
} from '../validators/feedbackValidators.js';

type FeedbackAttachment = { url: string; publicId: string };

function configureCloudinary() {
	if (env.CLOUDINARY_CLOUD_NAME) {
		cloudinary.config({
			cloud_name: env.CLOUDINARY_CLOUD_NAME,
			api_key: env.CLOUDINARY_API_KEY,
			api_secret: env.CLOUDINARY_API_SECRET,
		});
	}
}

async function uploadFeedbackPhotos(dataUrls: string[]): Promise<FeedbackAttachment[]> {
	if (dataUrls.length === 0) return [];
	if (dataUrls.length > 5) {
		throw new GraphQLError('Maximum 5 feedback images allowed', {
			extensions: { code: 'BAD_USER_INPUT' },
		});
	}

	configureCloudinary();
	const uploaded: FeedbackAttachment[] = [];

	for (const dataUrl of dataUrls) {
		if (env.CLOUDINARY_CLOUD_NAME) {
			const result = await cloudinary.uploader.upload(dataUrl, {
				folder: 'krydix/feedback',
				resource_type: 'image',
			});
			uploaded.push({ url: result.secure_url, publicId: result.public_id });
		} else {
			uploaded.push({ url: dataUrl, publicId: `local_${Date.now()}_${uploaded.length}` });
		}
	}

	return uploaded;
}

function parseAttachments(raw: unknown): FeedbackAttachment[] {
	if (!raw || !Array.isArray(raw)) return [];
	return (raw as FeedbackAttachment[]).filter((item) => item?.url);
}

function buildUserName(user: repo.RawUserFeedback['user']): string {
	const profile = user.profile;
	if (!profile) return user.email;
	return `${profile.firstName} ${profile.lastName}`.trim();
}

function serializeFeedback(feedback: repo.RawUserFeedback) {
	return {
		id: feedback.id,
		category: feedback.category,
		subject: feedback.subject,
		message: feedback.message,
		attachments: parseAttachments(feedback.attachments),
		status: feedback.status,
		adminNotes: feedback.adminNotes ?? null,
		authorName: buildUserName(feedback.user),
		authorEmail: feedback.user.email,
		authorRole: feedback.user.role,
		handledByName: feedback.handledBy ? buildUserName(feedback.handledBy) : null,
		handledAt: feedback.handledAt?.toISOString() ?? null,
		createdAt: feedback.createdAt.toISOString(),
		updatedAt: feedback.updatedAt.toISOString(),
	};
}

export async function submitFeedback(userId: string, input: unknown) {
	const parsed = SubmitFeedbackSchema.parse(input);
	const attachments = await uploadFeedbackPhotos(parsed.photoDataUrls ?? []);

	const feedback = await repo.createFeedback({
		userId,
		category: parsed.category,
		subject: parsed.subject,
		message: parsed.message,
		attachments: attachments.length > 0 ? attachments : null,
	});

	return serializeFeedback(feedback);
}

export async function getAdminFeedbacks(input: unknown) {
	const parsed = AdminFeedbacksInputSchema.parse(input ?? {});
	const { items, total } = await repo.listFeedbacks(parsed);

	return {
		items: items.map(serializeFeedback),
		total,
		page: parsed.page,
		pageSize: parsed.pageSize,
	};
}

export async function getAdminFeedbackStats() {
	return repo.getFeedbackStats();
}

export async function getAdminFeedbackById(id: string) {
	const feedback = await repo.findFeedbackById(id);
	if (!feedback) return null;
	return serializeFeedback(feedback);
}

export async function updateFeedbackStatus(adminId: string, input: unknown) {
	const parsed = UpdateFeedbackSchema.parse(input);
	const existing = await repo.findFeedbackById(parsed.id);

	if (!existing) {
		throw new GraphQLError('Feedback not found', { extensions: { code: 'NOT_FOUND' } });
	}

	const previousStatus = existing.status as FeedbackStatus;
	const feedback = await repo.updateFeedback(parsed.id, {
		status: parsed.status,
		adminNotes: parsed.adminNotes ?? null,
		handledById: adminId,
		handledAt: new Date(),
	});

	if (previousStatus !== parsed.status) {
		await auditLogService.log({
			actorId: adminId,
			action: AuditAction.FEEDBACK_STATUS_CHANGE,
			targetType: 'UserFeedback',
			targetId: parsed.id,
			metadata: {
				from: previousStatus,
				to: parsed.status,
			},
		});
	}

	return serializeFeedback(feedback);
}
