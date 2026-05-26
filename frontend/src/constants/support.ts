export const SUPPORT_FAQ_ARTICLE_IDS = [
	'refunds',
	'verificationDocs',
	'payoutsFees',
	'bulkImport',
	'cancelOrder',
] as const;

export type SupportFaqArticleId = (typeof SUPPORT_FAQ_ARTICLE_IDS)[number];

export const SUPPORT_QUICK_REPLY_IDS = [
	'orderQuestion',
	'refundBuyer',
	'verificationStatus',
	'payoutsFees',
] as const;

export type SupportQuickReplyId = (typeof SUPPORT_QUICK_REPLY_IDS)[number];
