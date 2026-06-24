import { gql } from '@apollo/client';
import type {
	AuditActionKeyValue,
	AuditActorRoleFilter,
	AuditDateRangePreset,
} from '@/constants/auditActionKeys';

const AUDIT_LOG_FIELDS = `
	id
	eventRef
	actionKey
	actionVariant
	rawAction
	description
	note
	metadata
	targetType
	targetId
	targetLabel
	targetPath
	createdAt
	actor {
		id
		displayName
		initials
		avatarUrl
		email
		role
	}
`;

export const AUDIT_LOGS_QUERY = gql`
	query AuditLogs($input: AuditLogsInput) {
		auditLogs(input: $input) {
			total
			page
			pageSize
			actionFilterOptions {
				key
				count
			}
			actorRoleFilterOptions {
				role
				count
			}
			items {
				${AUDIT_LOG_FIELDS}
			}
		}
	}
`;

export const MY_AUDIT_LOGS_QUERY = gql`
	query MyAuditLogs($limit: Int) {
		myAuditLogs(limit: $limit) {
			total
			items {
				${AUDIT_LOG_FIELDS}
			}
		}
	}
`;

export interface AuditLogActor {
	id: string;
	displayName: string;
	initials: string;
	avatarUrl: string | null;
	email: string;
	role: string;
}

export interface AuditLogItem {
	id: string;
	eventRef: string;
	actionKey: string;
	actionVariant: string;
	rawAction: string;
	description: string;
	note: string | null;
	metadata: Record<string, unknown> | null;
	targetType: string;
	targetId: string;
	targetLabel: string;
	targetPath: string | null;
	createdAt: string;
	actor: AuditLogActor;
}

export interface AuditLogList {
	items: AuditLogItem[];
	total: number;
	page: number;
	pageSize: number;
	actionFilterOptions: Array<{ key: string; count: number }>;
	actorRoleFilterOptions: Array<{ role: string; count: number }>;
}

export interface AuditLogsData {
	auditLogs: AuditLogList;
}

export interface MyAuditLogsData {
	myAuditLogs: Pick<AuditLogList, 'items' | 'total'>;
}

export interface AuditLogsInput {
	actorRoles?: AuditActorRoleFilter[];
	actionKeys?: AuditActionKeyValue[];
	datePreset?: AuditDateRangePreset;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	pageSize?: number;
}

export interface AuditLogsVars {
	input?: AuditLogsInput;
}

export interface MyAuditLogsVars {
	limit?: number;
}
