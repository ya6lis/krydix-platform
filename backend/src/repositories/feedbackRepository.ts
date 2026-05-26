import type { FeedbackCategory, FeedbackStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const feedbackInclude = {
	user: { include: { profile: true } },
	handledBy: { include: { profile: true } },
} satisfies Prisma.UserFeedbackInclude;

export type RawUserFeedback = Prisma.UserFeedbackGetPayload<{ include: typeof feedbackInclude }>;

export async function createFeedback(data: {
	userId: string;
	category: FeedbackCategory;
	subject: string;
	message: string;
	attachments: Prisma.InputJsonValue | null;
}) {
	return prisma.userFeedback.create({
		data,
		include: feedbackInclude,
	});
}

export async function findFeedbackById(id: string) {
	return prisma.userFeedback.findUnique({
		where: { id },
		include: feedbackInclude,
	});
}

export async function listFeedbacks(params: {
	page: number;
	pageSize: number;
	status?: FeedbackStatus;
	category?: FeedbackCategory;
	search?: string;
}) {
	const where: Prisma.UserFeedbackWhereInput = {};

	if (params.status) where.status = params.status;
	if (params.category) where.category = params.category;
	if (params.search) {
		where.OR = [
			{ subject: { contains: params.search, mode: 'insensitive' } },
			{ message: { contains: params.search, mode: 'insensitive' } },
			{ user: { email: { contains: params.search, mode: 'insensitive' } } },
			{
				user: {
					profile: {
						is: {
							OR: [
								{ firstName: { contains: params.search, mode: 'insensitive' } },
								{ lastName: { contains: params.search, mode: 'insensitive' } },
							],
						},
					},
				},
			},
		];
	}

	const [items, total] = await Promise.all([
		prisma.userFeedback.findMany({
			where,
			include: feedbackInclude,
			orderBy: { createdAt: 'desc' },
			skip: params.page * params.pageSize,
			take: params.pageSize,
		}),
		prisma.userFeedback.count({ where }),
	]);

	return { items, total };
}

export async function getFeedbackStats() {
	const [total, newCount, underReviewCount, acknowledgedCount, plannedCount, resolvedCount, dismissedCount] =
		await Promise.all([
			prisma.userFeedback.count(),
			prisma.userFeedback.count({ where: { status: 'NEW' } }),
			prisma.userFeedback.count({ where: { status: 'UNDER_REVIEW' } }),
			prisma.userFeedback.count({ where: { status: 'ACKNOWLEDGED' } }),
			prisma.userFeedback.count({ where: { status: 'PLANNED' } }),
			prisma.userFeedback.count({ where: { status: 'RESOLVED' } }),
			prisma.userFeedback.count({ where: { status: 'DISMISSED' } }),
		]);

	return {
		total,
		newCount,
		underReviewCount,
		acknowledgedCount,
		plannedCount,
		resolvedCount,
		dismissedCount,
	};
}

export async function updateFeedback(
	id: string,
	data: {
		status: FeedbackStatus;
		adminNotes?: string | null;
		handledById: string;
		handledAt: Date;
	},
) {
	return prisma.userFeedback.update({
		where: { id },
		data,
		include: feedbackInclude,
	});
}
