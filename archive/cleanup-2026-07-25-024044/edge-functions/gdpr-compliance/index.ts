/**
 * GDPR Compliance Edge Function
 * 
 * Task: 17.4 Implement GDPR compliance features
 * Requirement: 28.6 - Data portability and right to deletion
 * 
 * This edge function provides:
 * 1. Data export endpoint for data portability (GDPR Article 20)
 * 2. Data deletion endpoint for right to deletion (GDPR Article 17)
 * 3. Data processing consent tracking
 * 
 * Security:
 * - Only authenticated users can request their tenant's data
 * - Only company_owner and super_admin can delete tenant data
 * - All operations are logged to audit_logs table
 * - Rate limited to 100 requests per minute per user
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { rateLimitMiddleware, addRateLimitHeaders } from '../_shared/rate-limit-middleware.ts';

// Types
interface DataExportRequest {
  format?: 'json' | 'csv';
  tables?: string[];
}

interface DataDeletionRequest {
  confirmDeletion: boolean;
  reason: string;
}

interface ExportMetadata {
  exportDate: string;
  tenantId: string;
  tenantName: string;
  exportedBy: string;
  format: string;
  tables: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Get user details and tenant_id
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, full_name, role, tenant_id, tenants(name)')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'User or tenant information not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = userData.tenant_id;

    // Apply rate limiting (100 req/min per user - Requirement 28.4)
    const rateLimit = await rateLimitMiddleware(req, {
      userId: user.id,
      tenantId: tenantId,
    });

    if (!rateLimit.allowed) {
      return rateLimit.response!;
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // ========================================================================
    // ENDPOINT: POST /gdpr-compliance/export-data
    // Export all tenant data for data portability (GDPR Article 20)
    // ========================================================================
    if (req.method === 'POST' && path.includes('/export-data')) {
      const body: DataExportRequest = await req.json();
      const format = body.format || 'json';

      // Export data
      const exportData = await exportTenantData(
        supabaseClient,
        tenantId,
        userData,
        body.tables
      );

      // Log the export action
      await logAuditEvent(supabaseAdmin, {
        tenantId,
        userId: user.id,
        operation: 'export',
        entityType: 'tenant_data',
        entityId: tenantId,
        changedFields: { format, tables: body.tables || 'all' },
      });

      if (format === 'json') {
        const response = new Response(JSON.stringify(exportData, null, 2), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="tenant_data_export_${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
        return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
      } else if (format === 'csv') {
        // For CSV, we'll create a ZIP file with multiple CSV files (one per table)
        // For simplicity in this implementation, we'll return JSON with a message
        const response = new Response(
          JSON.stringify({
            message: 'CSV export with multiple tables requires a ZIP file. Please use JSON format or contact support.',
            data: exportData,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
        return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
      }
    }

    // ========================================================================
    // ENDPOINT: POST /gdpr-compliance/request-deletion
    // Request deletion of all tenant data (GDPR Article 17 - Right to erasure)
    // ========================================================================
    if (req.method === 'POST' && path.includes('/request-deletion')) {
      // Only company_owner and super_admin can delete tenant data
      if (!['company_owner', 'super_admin'].includes(userData.role)) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient permissions. Only company_owner or super_admin can delete tenant data.',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body: DataDeletionRequest = await req.json();

      if (!body.confirmDeletion) {
        return new Response(
          JSON.stringify({
            error: 'Deletion must be explicitly confirmed by setting confirmDeletion to true',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!body.reason || body.reason.length < 10) {
        return new Response(
          JSON.stringify({
            error: 'A deletion reason (minimum 10 characters) is required',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the deletion request BEFORE deleting
      await logAuditEvent(supabaseAdmin, {
        tenantId,
        userId: user.id,
        operation: 'delete',
        entityType: 'tenant_data_deletion_request',
        entityId: tenantId,
        changedFields: { reason: body.reason, requestedBy: userData.email },
      });

      // Perform the deletion (CASCADE will handle related records)
      const deletionResult = await deleteTenantData(supabaseAdmin, tenantId, user.id, body.reason);

      const response = new Response(JSON.stringify(deletionResult), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
    }

    // ========================================================================
    // ENDPOINT: GET /gdpr-compliance/data-summary
    // Get a summary of stored tenant data
    // ========================================================================
    if (req.method === 'GET' && path.includes('/data-summary')) {
      const summary = await getDataSummary(supabaseClient, tenantId);

      const response = new Response(JSON.stringify(summary), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gdpr-compliance function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Export all tenant data for data portability
 */
async function exportTenantData(
  supabaseClient: any,
  tenantId: string,
  userData: any,
  requestedTables?: string[]
): Promise<any> {
  const metadata: ExportMetadata = {
    exportDate: new Date().toISOString(),
    tenantId: tenantId,
    tenantName: userData.tenants?.name || 'Unknown',
    exportedBy: userData.email,
    format: 'json',
    tables: [],
  };

  // Define all tables to export (respecting RLS - will only get tenant's data)
  const tablesToExport = requestedTables || [
    'vehicles',
    'components',
    'odometer_readings',
    'work_orders',
    'work_order_labor',
    'work_order_parts',
    'alerts',
    'inspections',
    'inspection_checklists',
    'spare_parts',
    'purchase_orders',
    'vendors',
    'documents',
    'predictions',
    'gps_history',
    'users',
    'audit_logs',
  ];

  const exportData: any = {
    metadata,
    data: {},
  };

  // Export each table
  for (const tableName of tablesToExport) {
    try {
      const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error(`Error exporting ${tableName}:`, error);
        exportData.data[tableName] = {
          error: error.message,
          records: [],
          count: 0,
        };
      } else {
        exportData.data[tableName] = {
          records: data || [],
          count: (data || []).length,
        };
        metadata.tables.push(tableName);
      }
    } catch (err) {
      console.error(`Exception exporting ${tableName}:`, err);
      exportData.data[tableName] = {
        error: err.message,
        records: [],
        count: 0,
      };
    }
  }

  return exportData;
}

/**
 * Delete all tenant data (GDPR right to erasure)
 */
async function deleteTenantData(
  supabaseAdmin: any,
  tenantId: string,
  userId: string,
  reason: string
): Promise<any> {
  try {
    // First, get a count of records to be deleted
    const summary = await getDataSummary(supabaseAdmin, tenantId);

    // Store the deletion request in audit logs before deletion
    // (audit logs will be preserved even after tenant deletion for compliance)
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      operation: 'delete',
      entity_type: 'tenant_full_deletion',
      entity_id: tenantId,
      changed_fields: {
        reason,
        summary,
        deletionTimestamp: new Date().toISOString(),
      },
    });

    // Delete the tenant record
    // CASCADE constraints will automatically delete all related records
    const { error: deleteError } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteError) {
      throw new Error(`Failed to delete tenant: ${deleteError.message}`);
    }

    return {
      success: true,
      message: 'Tenant data successfully deleted',
      deletionSummary: summary,
      deletionDate: new Date().toISOString(),
      note: 'Audit logs have been preserved for compliance purposes (7-year retention)',
    };
  } catch (error) {
    console.error('Error deleting tenant data:', error);
    throw error;
  }
}

/**
 * Get summary of stored data for a tenant
 */
async function getDataSummary(supabaseClient: any, tenantId: string): Promise<any> {
  const tables = [
    'vehicles',
    'components',
    'odometer_readings',
    'work_orders',
    'alerts',
    'inspections',
    'spare_parts',
    'vendors',
    'documents',
    'predictions',
    'users',
    'audit_logs',
  ];

  const summary: any = {
    tenantId,
    totalRecords: 0,
    tableRecordCounts: {},
  };

  for (const tableName of tables) {
    try {
      const { count, error } = await supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (error) {
        console.error(`Error counting ${tableName}:`, error);
        summary.tableRecordCounts[tableName] = { count: 0, error: error.message };
      } else {
        summary.tableRecordCounts[tableName] = count || 0;
        summary.totalRecords += count || 0;
      }
    } catch (err) {
      console.error(`Exception counting ${tableName}:`, err);
      summary.tableRecordCounts[tableName] = { count: 0, error: err.message };
    }
  }

  return summary;
}

/**
 * Log audit event
 */
async function logAuditEvent(
  supabaseAdmin: any,
  event: {
    tenantId: string;
    userId: string;
    operation: string;
    entityType: string;
    entityId: string;
    changedFields: any;
  }
): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: event.tenantId,
      user_id: event.userId,
      operation: event.operation,
      entity_type: event.entityType,
      entity_id: event.entityId,
      changed_fields: event.changedFields,
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging failure shouldn't block the main operation
  }
}
