jest.mock('../../repositories/releaseNoteRepository.js');
jest.mock('../auditLogService.js');

import { GraphQLError } from 'graphql';
import * as releaseNoteService from '../releaseNoteService.js';
import * as repo from '../../repositories/releaseNoteRepository.js';
import * as auditLogService from '../auditLogService.js';

const mockNote = {
	id: 'rn-1',
	version: '1.2.0',
	status: 'PUBLISHED' as const,
	publishedAt: new Date('2026-05-20T00:00:00Z'),
	createdAt: new Date('2026-05-20T00:00:00Z'),
	updatedAt: new Date('2026-05-20T00:00:00Z'),
	createdById: 'admin-1',
	translations: [
		{ id: 't1', releaseNoteId: 'rn-1', language: 'EN' as const, title: 'New chat', body: 'Chat improvements' },
		{ id: 't2', releaseNoteId: 'rn-1', language: 'UK' as const, title: 'Новий чат', body: 'Покращення чату' },
	],
	createdBy: {
		email: 'admin@example.com',
		profile: { firstName: 'Admin', lastName: 'User' },
	},
};

describe('releaseNoteService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns latest published release note in requested language', async () => {
		jest.mocked(repo.findLatestPublishedReleaseNote).mockResolvedValue(mockNote);

		const result = await releaseNoteService.getLatestReleaseNote('UK');

		expect(result?.title).toBe('Новий чат');
		expect(result?.body).toBe('Покращення чату');
	});

	it('creates release note and writes audit log', async () => {
		jest.mocked(repo.findReleaseNoteByVersion).mockResolvedValue(null);
		jest.mocked(repo.createReleaseNote).mockResolvedValue(mockNote);

		const result = await releaseNoteService.createReleaseNote('admin-1', {
			version: '1.2.0',
			titleEn: 'New chat',
			titleUk: 'Новий чат',
			bodyEn: 'Chat improvements',
			bodyUk: 'Покращення чату',
			publish: true,
		});

		expect(auditLogService.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'RELEASE_NOTE_CHANGE',
				targetId: 'rn-1',
			}),
		);
		expect(result.version).toBe('1.2.0');
	});

	it('rejects duplicate version on create', async () => {
		jest.mocked(repo.findReleaseNoteByVersion).mockResolvedValue(mockNote);

		await expect(
			releaseNoteService.createReleaseNote('admin-1', {
				version: '1.2.0',
				titleEn: 'New chat',
				titleUk: 'Новий чат',
				bodyEn: 'Chat improvements',
				bodyUk: 'Покращення чату',
			}),
		).rejects.toThrow(GraphQLError);
	});

	it('returns published release notes history in requested language', async () => {
		jest.mocked(repo.listPublishedReleaseNotes).mockResolvedValue([mockNote]);

		const result = await releaseNoteService.getPublishedReleaseNotes('UK', 5);

		expect(repo.listPublishedReleaseNotes).toHaveBeenCalledWith(5);
		expect(result).toHaveLength(1);
		expect(result[0]?.title).toBe('Новий чат');
	});

	it('normalizes version prefix before create', async () => {
		jest.mocked(repo.findReleaseNoteByVersion).mockResolvedValue(null);
		jest.mocked(repo.createReleaseNote).mockResolvedValue(mockNote);

		await releaseNoteService.createReleaseNote('admin-1', {
			version: 'v1.2.0',
			titleEn: 'New chat',
			titleUk: 'Новий чат',
			bodyEn: 'Chat improvements here',
			bodyUk: 'Покращення чату тут',
			publish: true,
		});

		expect(repo.createReleaseNote).toHaveBeenCalledWith(
			expect.objectContaining({ version: '1.2.0' }),
		);
	});
});
