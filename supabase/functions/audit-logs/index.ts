/**
 * Audit Logs Edge Function
 * 
 * Provides API endpoints for:
 * - Searching audit logs with filters (date range, user, entity type, operation)
 * - CSV export of audit logs
 * 
 * Task: 15.7 Implement audit logging
 * Requirements: 23.3, 23.4, 23.6
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types
interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  operation?: 'create' | 'update' | 'delete';
  page?: number;
  pageSize?: number;
}

interface AuditLogRow {
  id: string;
  tenant_id: string;
  user_id: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  changed_fields: Record<string, { old_value: string; new_value: string }> | null;
  timestamp: string;
  user_email?: string;
  user_name?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant_id from user metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID not found in user metadata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: GET /audit-logs - Search audit logs with filters
    if (req.method === 'GET' && !path.includes('/export')) {
      const filters: AuditLogFilters = {
        startDate: url.searchParams.get('startDate') || undefined,
        endDate: url.searchParams.get('endDate') || undefined,
        userId: url.searchParams.get('userId') || undefined,
        entityType: url.searchParams.get('entityType') || undefined,
        operation: url.searchParams.get('operation') as any || undefined,
        page: parseInt(url.searchParams.get('page') || '1'),
        pageSize: parseInt(url.searchParams.get('pageSize') || '50'),
      };

      const result = await searchAuditLogs(supabaseClient, tenantId, filters);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: GET /audit-logs/export - Export audit logs to CSV
    if (req.method === 'GET' && path.includes('/export')) {
      const filters: AuditLogFilters = {
        startDate: url.searchParams.get('startDate') || undefined,
        endDate: url.searchParams.get('endDate') || undefined,
        userId: url.searchParams.get('userId') || undefined,
        entityType: url.searchParams.get('entityType') || undefined,
        operation: url.searchParams.get('operation') as any || undefined,
      };

      const csv = await exportAuditLogsToCSV(supabaseClient, tenantId, filters);

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in audit-logs function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Search audit logs with filters and pagination
 */
async function searchAuditLogs(
  supabaseClient: any,
  tenantId: string,
  filters: AuditLogFilters
) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabaseClient
    .from('audit_logs')
    .select(
      `
      id,
      tenant_id,
      user_id,
      operation,
      entity_type,
      entity_id,
      changed_fields,
      timestamp,
      users!inner(email, full_name)
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false });

  // Apply filters
  if (filters.startDate) {
    query = query.gte('timestamp', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('timestamp', filters.endDate);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.operation) {
    query = query.eq('operation', filters.operation);
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  // Transform data to include user information
  const logs: AuditLogRow[] = data.map((log: any) => ({
    id: log.id,
    tenant_id: log.tenant_id,
    user_id: log.user_id,
    operation: log.operation,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    changed_fields: log.changed_fields,
    timestamp: log.timestamp,
    user_email: log.users?.email || 'System',
    user_name: log.users?.full_name || 'System',
  }));

  return {
    logs,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  };
}

/**
 * Export audit logs to CSV format
 */
async function exportAuditLogsToCSV(
  supabaseClient: any,
  tenantId: string,
  filters: AuditLogFilters
) {
  // Fetch all logs matching filters (no pagination for export)
  let query = supabaseClient
    .from('audit_logs')
    .select(
      `
      id,
      user_id,
      operation,
      entity_type,
      entity_id,
      changed_fields,
      timestamp,
      users!inner(email, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false });

  // Apply filters
  if (filters.startDate) {
    query = query.gte('timestamp', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('timestamp', filters.endDate);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.operation) {
    query = query.eq('operation', filters.operation);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs for export: ${error.message}`);
  }

  // Generate CSV
  const headers = [
    'Timestamp',
    'User Email',
    'User Name',
    'Operation',
    'Entity Type',
    'Entity ID',
    'Changed Fields',
  ];

  const rows = data.map((log: any) => [
    log.timestamp,
    log.users?.email || 'System',
    log.users?.full_name || 'System',
    log.operation.toUpperCase(),
    log.entity_type,
    log.entity_id,
    log.changed_fields ? JSON.stringify(log.changed_fields) : '',
  ]);

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map((row: string[]) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}
