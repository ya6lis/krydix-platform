import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { SupportChatThread } from '@/components/support/SupportChatThread';
import { AppButton, AppInput, AppLoader, StatusBadge } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { ROUTES } from '@/constants/routes';
import { SUPPORT_FAQ_ARTICLE_IDS, type SupportFaqArticleId } from '@/constants/support';
import { useAuthStore } from '@/store/authStore';
import {
	CREATE_SUPPORT_CONVERSATION_MUTATION,
	MY_SUPPORT_CONVERSATION_QUERY,
	MY_SUPPORT_HISTORY_QUERY,
} from '@/graphql/operations/chat';
import type { ConversationDetail, ConversationSummary } from '@/types/chat';
import styles from './SupportPage.module.scss';

const FAQ_ICONS: Record<SupportFaqArticleId, typeof Icons.sync> = {
	refunds: Icons.sync,
	verificationDocs: Icons.shield,
	payoutsFees: Icons.wallet,
	bulkImport: Icons.upload,
	cancelOrder: Icons.cart,
};

function formatTicketDate(iso: string, locale: string): string {
	return new Date(iso).toLocaleDateString(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export default function SupportPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const language = i18n.language === 'uk' ? 'UK' : 'EN';
	const locale = i18n.language;

	const chatRef = useRef<HTMLDivElement>(null);

	const [subject, setSubject] = useState('');
	const [firstMessage, setFirstMessage] = useState('');
	const [selectedFaq, setSelectedFaq] = useState<SupportFaqArticleId>(SUPPORT_FAQ_ARTICLE_IDS[0]);

	const {
		data: activeData,
		loading: activeLoading,
		refetch: refetchActive,
	} = useQuery<{ mySupportConversation: ConversationDetail | null }>(
		MY_SUPPORT_CONVERSATION_QUERY,
		{
			variables: { language },
			skip: !user,
			fetchPolicy: 'cache-and-network',
		}
	);

	const { data: historyData, refetch: refetchHistory } = useQuery<{
		mySupportHistory: ConversationSummary[];
	}>(MY_SUPPORT_HISTORY_QUERY, {
		variables: { language, limit: 8 },
		skip: !user,
		fetchPolicy: 'cache-and-network',
	});

	const [createSupportConversation, { loading: creating }] = useMutation(
		CREATE_SUPPORT_CONVERSATION_MUTATION,
		{
			onCompleted: () => {
				setSubject('');
				setFirstMessage('');
				void refetchActive();
				void refetchHistory();
			},
		}
	);

	const activeConversation = activeData?.mySupportConversation ?? null;
	const history = historyData?.mySupportHistory ?? [];

	const handleStartConversation = async () => {
		if (!user) {
			navigate(ROUTES.LOGIN);
			return;
		}
		const trimmedSubject = subject.trim();
		const trimmedMessage = firstMessage.trim();
		if (!trimmedSubject || !trimmedMessage) return;

		await createSupportConversation({
			variables: {
				language,
				input: { subject: trimmedSubject, message: trimmedMessage },
			},
		});
	};

	return (
		<section className={styles.page}>
			<div className={styles.pageHead}>
				<div>
					<h1 className={styles.pageTitle}>{t('support.pageTitle')}</h1>
					<p className={styles.pageSub}>{t('support.pageSubtitle')}</p>
				</div>
			</div>

			<div className={styles.chatPanel} id="support-chat" ref={chatRef}>
				{!user ? (
					<div className={styles.loginPrompt}>
						<p>{t('support.loginRequired')}</p>
						<AppButton onClick={() => navigate(ROUTES.LOGIN)}>{t('auth.login')}</AppButton>
					</div>
				) : activeLoading && !activeConversation ? (
					<AppLoader />
				) : activeConversation ? (
					<SupportChatThread
						conversation={activeConversation}
						onConversationUpdated={() => {
							void refetchActive();
							void refetchHistory();
						}}
					/>
				) : (
					<div className={styles.newRequest}>
						<div className={styles.newRequestHead}>
							<h2>{t('support.newRequest.title')}</h2>
							<p>{t('support.newRequest.subtitle')}</p>
						</div>
						<div className={styles.newRequestForm}>
							<AppInput
								label={t('support.newRequest.subjectLabel')}
								value={subject}
								onChange={(event) => setSubject(event.target.value)}
								placeholder={t('support.newRequest.subjectPlaceholder')}
							/>
							<label className={styles.textareaLabel} htmlFor="support-first-message">
								{t('support.newRequest.messageLabel')}
							</label>
							<textarea
								id="support-first-message"
								className={styles.newRequestTextarea}
								value={firstMessage}
								onChange={(event) => setFirstMessage(event.target.value)}
								placeholder={t('support.newRequest.messagePlaceholder')}
								rows={5}
							/>
							<AppButton
								onClick={() => void handleStartConversation()}
								loading={creating}
								disabled={!subject.trim() || !firstMessage.trim()}
							>
								{t('support.newRequest.startChat')}
							</AppButton>
						</div>
					</div>
				)}
			</div>

			<aside className={styles.side}>
				<section className={styles.sideCard} id="support-faq">
					<h4 className={styles.sideCardTitle}>{t('support.faq.title')}</h4>
					<div className={styles.faqList}>
						{SUPPORT_FAQ_ARTICLE_IDS.map((id) => (
							<button
								key={id}
								type="button"
								className={`${styles.faqLink} ${selectedFaq === id ? styles.faqLinkActive : ''}`}
								onClick={() => setSelectedFaq(id)}
							>
								<span className={styles.faqIcon}>
									<FontAwesomeIcon icon={FAQ_ICONS[id]} />
								</span>
								<span>{t(`support.faq.articles.${id}.title`)}</span>
								<FontAwesomeIcon icon={Icons.chevronRight} className={styles.faqArrow} />
							</button>
						))}
					</div>
					<div className={styles.faqBody}>{t(`support.faq.articles.${selectedFaq}.body`)}</div>
				</section>

				<section className={styles.sideCard}>
					<h4 className={styles.sideCardTitle}>{t('support.tickets.title')}</h4>
					{history.length === 0 ? (
						<p className={styles.ticketsEmpty}>{t('support.tickets.empty')}</p>
					) : (
						<ul className={styles.ticketList}>
							{history.map((ticket) => (
								<li key={ticket.id} className={styles.ticketItem}>
									<div className={styles.ticketTop}>
										<span className={styles.ticketSubject}>
											{ticket.supportMeta?.subject ?? t('support.tickets.unnamed')}
										</span>
										{ticket.supportMeta?.status ? (
											<StatusBadge
												status={ticket.supportMeta.status}
												label={t(`support.statuses.${ticket.supportMeta.status}`)}
											/>
										) : null}
									</div>
									<div className={styles.ticketMeta}>
										{formatTicketDate(ticket.updatedAt, locale)}
									</div>
								</li>
							))}
						</ul>
					)}
				</section>

				<section className={`${styles.sideCard} ${styles.sideCardAccent}`}>
					<h4 className={styles.sideCardTitle}>{t('support.status.title')}</h4>
					<div className={styles.statusRow}>
						<span className={styles.statusDot} />
						{t('support.status.operational')}
					</div>
					<div className={styles.statusSub}>{t('support.status.updated')}</div>
				</section>
			</aside>
		</section>
	);
}
