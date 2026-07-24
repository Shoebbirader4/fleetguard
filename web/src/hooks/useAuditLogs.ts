/**
 * React Hook for Audit Logs
 * 
 * Task: 15.7 Implement audit logging
 * Requirements: 23.3, 23.4, 23.6
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLogFilters, AuditLogSearchResponse } from '../types/auditLog';

export function useAuditLogs(filters: AuditLogFilters) {
  const [data, setData] = useState<AuditLogSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [
    filters.startDate,
    filters.endDate,
    filters.userId,
    filters.entityType,
    filters.operation,
    filters.page,
    filters.pageSize,
  ]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.operation) params.append('operation', filters.operation);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-logs?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch audit logs');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchAuditLogs();
  };

  return { data, loading, error, refetch };
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsToCSV(filters: AuditLogFilters): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.operation) params.append('operation', filters.operation);

    // Call Edge Function export endpoint
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-logs/export?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export audit logs');
    }

    // Download the CSV file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    throw err;
  }
}
