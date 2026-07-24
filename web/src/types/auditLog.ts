/**
 * Audit Log Type Definitions
 * 
 * Task: 15.7 Implement audit logging
 * Requirements: 23.1, 23.3, 23.4, 23.6
 */

export type AuditOperation = 'create' | 'update' | 'delete';

export interface ChangedField {
  old_value: string;
  new_value: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  operation: AuditOperation;
  entity_type: string;
  entity_id: string;
  changed_fields: Record<string, ChangedField> | null;
  timestamp: string;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  operation?: AuditOperation;
  page?: number;
  pageSize?: number;
}

export interface AuditLogSearchResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
