/**
 * Document Expiry Checker Edge Function
 * 
 * Scheduled job (cron) that checks for expiring and expired documents daily
 * and generates appropriate alerts.
 * 
 * Requirements:
 * - 14.4: Generate expiry warning alert when document expiry date is within 30 days
 * - 14.5: Generate expired document alert when a document expires
 * 
 * Schedule: Daily at 3:00 AM UTC (configured in supabase/functions/document-expiry-checker/cron.yaml)
 * 
 * Input: None (scheduled trigger)
 * 
 * Output:
 * {
 *   success: boolean,
 *   expiry_warnings_created: number,
 *   expired_alerts_created: number,
 *   processed_at: string (ISO 8601)
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface DocumentWithVehicle {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  document_type: string;
  file_name: string;
  expiry_date: string;
  vehicle: {
    make: string;
    model: string;
    vin: string;
  };
}

interface ExpiryCheckResult {
  success: boolean;
  expiry_warnings_created: number;
  expired_alerts_created: number;
  processed_at: string;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const EXPIRY_WARNING_DAYS = 30;
const ALERT_TYPES = {
  EXPIRY: 'document_expiry',
  EXPIRED: 'document_expired',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format document type for user-friendly display
 */
function formatDocumentType(documentType: string): string {
  const typeMap: Record<string, string> = {
    insurance: 'Insurance',
    rc_book: 'RC Book',
    fitness_certificate: 'Fitness Certificate',
    pollution_certificate: 'Pollution Certificate',
    invoice: 'Invoice',
    warranty: 'Warranty',
    service_report: 'Service Report',
  };
  return typeMap[documentType] || documentType;
}

/**
 * Format date for display (YYYY-MM-DD to human-readable)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Check if an alert already exists for a document
 */
async function alertExists(
  supabase: any,
  tenantId: string,
  vehicleId: string,
  alertType: string,
  documentType: string,
  sinceDate: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .eq('alert_type', alertType)
    .eq('status', 'active')
    .ilike('description', `%${documentType}%`)
    .gte('created_at', sinceDate)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Document Expiry Checker] Error checking existing alert:', error);
    return false;
  }

  return !!data;
}

/**
 * Create an alert for expiring or expired document
 */
async function createAlert(
  supabase: any,
  tenantId: string,
  vehicleId: string,
  alertType: string,
  severity: string,
  title: string,
  description: string
): Promise<boolean> {
  const { error } = await supabase
    .from('alerts')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      alert_type: alertType,
      severity: severity,
      title: title,
      description: description,
      status: 'active',
    });

  if (error) {
    console.error('[Document Expiry Checker] Error creating alert:', error);
    return false;
  }

  return true;
}

/**
 * Get documents expiring within the warning period (30 days)
 */
async function getExpiringDocuments(
  supabase: any
): Promise<DocumentWithVehicle[]> {
  const today = new Date();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      tenant_id,
      vehicle_id,
      document_type,
      file_name,
      expiry_date,
      vehicles:vehicle_id (
        make,
        model,
        vin
      )
    `)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', today.toISOString().split('T')[0])
    .lte('expiry_date', warningDate.toISOString().split('T')[0]);

  if (error) {
    console.error('[Document Expiry Checker] Error fetching expiring documents:', error);
    throw error;
  }

  // Transform the data to match our type
  return (data || []).map((doc: any) => ({
    ...doc,
    vehicle: Array.isArray(doc.vehicles) ? doc.vehicles[0] : doc.vehicles,
  })).filter((doc: any) => doc.vehicle); // Filter out documents without vehicle info
}

/**
 * Get expired documents
 */
async function getExpiredDocuments(
  supabase: any
): Promise<DocumentWithVehicle[]> {
  const today = new Date();

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      tenant_id,
      vehicle_id,
      document_type,
      file_name,
      expiry_date,
      vehicles:vehicle_id (
        make,
        model,
        vin
      )
    `)
    .not('expiry_date', 'is', null)
    .lt('expiry_date', today.toISOString().split('T')[0]);

  if (error) {
    console.error('[Document Expiry Checker] Error fetching expired documents:', error);
    throw error;
  }

  // Transform the data to match our type
  return (data || []).map((doc: any) => ({
    ...doc,
    vehicle: Array.isArray(doc.vehicles) ? doc.vehicles[0] : doc.vehicles,
  })).filter((doc: any) => doc.vehicle); // Filter out documents without vehicle info
}

/**
 * Process expiring documents and create warning alerts
 */
async function processExpiringDocuments(
  supabase: any,
  documents: DocumentWithVehicle[]
): Promise<number> {
  let alertsCreated = 0;

  for (const doc of documents) {
    try {
      // Check if an expiry warning alert already exists (within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const exists = await alertExists(
        supabase,
        doc.tenant_id,
        doc.vehicle_id,
        ALERT_TYPES.EXPIRY,
        doc.document_type,
        thirtyDaysAgo.toISOString()
      );

      if (exists) {
        console.log(
          `[Document Expiry Checker] Alert already exists for ${doc.document_type} on vehicle ${doc.vehicle.vin}`
        );
        continue;
      }

      // Create expiry warning alert
      const title = 'Document Expiring Soon';
      const description = `${formatDocumentType(doc.document_type)} for vehicle ${doc.vehicle.make} ${doc.vehicle.model} (VIN: ${doc.vehicle.vin}) expires on ${formatDate(doc.expiry_date)}`;

      const created = await createAlert(
        supabase,
        doc.tenant_id,
        doc.vehicle_id,
        ALERT_TYPES.EXPIRY,
        'medium',
        title,
        description
      );

      if (created) {
        alertsCreated++;
        console.log(
          `[Document Expiry Checker] Created expiry warning alert for ${doc.document_type} on vehicle ${doc.vehicle.vin}`
        );
      }
    } catch (error) {
      console.error(
        `[Document Expiry Checker] Error processing expiring document ${doc.id}:`,
        error
      );
    }
  }

  return alertsCreated;
}

/**
 * Process expired documents and create expired alerts
 */
async function processExpiredDocuments(
  supabase: any,
  documents: DocumentWithVehicle[]
): Promise<number> {
  let alertsCreated = 0;

  for (const doc of documents) {
    try {
      // Check if an expired alert already exists (since expiry date)
      const exists = await alertExists(
        supabase,
        doc.tenant_id,
        doc.vehicle_id,
        ALERT_TYPES.EXPIRED,
        doc.document_type,
        doc.expiry_date
      );

      if (exists) {
        console.log(
          `[Document Expiry Checker] Alert already exists for expired ${doc.document_type} on vehicle ${doc.vehicle.vin}`
        );
        continue;
      }

      // Create expired document alert
      const title = 'Document Expired';
      const description = `${formatDocumentType(doc.document_type)} for vehicle ${doc.vehicle.make} ${doc.vehicle.model} (VIN: ${doc.vehicle.vin}) expired on ${formatDate(doc.expiry_date)}`;

      const created = await createAlert(
        supabase,
        doc.tenant_id,
        doc.vehicle_id,
        ALERT_TYPES.EXPIRED,
        'high',
        title,
        description
      );

      if (created) {
        alertsCreated++;
        console.log(
          `[Document Expiry Checker] Created expired alert for ${doc.document_type} on vehicle ${doc.vehicle.vin}`
        );
      }
    } catch (error) {
      console.error(
        `[Document Expiry Checker] Error processing expired document ${doc.id}:`,
        error
      );
    }
  }

  return alertsCreated;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  console.log('[Document Expiry Checker] Starting document expiry check...');

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Document Expiry Checker] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Supabase configuration',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Get documents expiring within 30 days
    console.log('[Document Expiry Checker] Fetching expiring documents...');
    const expiringDocuments = await getExpiringDocuments(supabase);
    console.log(
      `[Document Expiry Checker] Found ${expiringDocuments.length} documents expiring within 30 days`
    );

    // Step 2: Get expired documents
    console.log('[Document Expiry Checker] Fetching expired documents...');
    const expiredDocuments = await getExpiredDocuments(supabase);
    console.log(
      `[Document Expiry Checker] Found ${expiredDocuments.length} expired documents`
    );

    // Step 3: Process expiring documents and create warning alerts
    console.log('[Document Expiry Checker] Processing expiring documents...');
    const expiryWarningsCreated = await processExpiringDocuments(
      supabase,
      expiringDocuments
    );
    console.log(
      `[Document Expiry Checker] Created ${expiryWarningsCreated} expiry warning alerts`
    );

    // Step 4: Process expired documents and create expired alerts
    console.log('[Document Expiry Checker] Processing expired documents...');
    const expiredAlertsCreated = await processExpiredDocuments(
      supabase,
      expiredDocuments
    );
    console.log(
      `[Document Expiry Checker] Created ${expiredAlertsCreated} expired document alerts`
    );

    // Step 5: Return summary
    const result: ExpiryCheckResult = {
      success: true,
      expiry_warnings_created: expiryWarningsCreated,
      expired_alerts_created: expiredAlertsCreated,
      processed_at: new Date().toISOString(),
    };

    console.log('[Document Expiry Checker] Document expiry check completed successfully');
    console.log('[Document Expiry Checker] Summary:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Document Expiry Checker] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
        processed_at: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
