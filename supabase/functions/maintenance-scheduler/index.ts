/**
 * Maintenance Scheduler Edge Function (Cron Job)
 * 
 * Calculates due dates/odometer for all active components and generates alerts.
 * 
 * Requirements:
 * - 5.5: Generate due-soon alert when component reaches 90% of expected life
 * - 5.6: Generate overdue alert when component exceeds expected life
 * - 9.1: Generate maintenance schedules based on calendar days and odometer
 * - 9.2: Create due-soon alert at 90% of scheduled maintenance interval
 * - 9.3: Create overdue alert when scheduled maintenance interval is exceeded
 * 
 * Schedule: Runs daily at 2:00 AM
 * 
 * Output:
 * {
 *   processed: number,
 *   due_soon_alerts: number,
 *   overdue_alerts: number,
 *   errors: string[]
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface Component {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  component_type: string;
  component_subtype: string | null;
  installation_date: string;
  installation_odometer: number;
  expected_life_days: number | null;
  expected_life_km: number | null;
}

interface Vehicle {
  id: string;
  current_odometer: number;
}

interface MaintenanceSchedulerResult {
  processed: number;
  due_soon_alerts: number;
  overdue_alerts: number;
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DUE_SOON_THRESHOLD = 0.9; // 90% of expected life
const OVERDUE_THRESHOLD = 1.0; // 100% of expected life

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days elapsed since installation
 */
function calculateDaysElapsed(installationDate: string): number {
  const installDate = new Date(installationDate);
  const currentDate = new Date();
  const diffMs = currentDate.getTime() - installDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate kilometers elapsed since installation
 */
function calculateKmElapsed(
  currentOdometer: number,
  installationOdometer: number
): number {
  return Math.max(0, currentOdometer - installationOdometer);
}

/**
 * Check if alert already exists for this component
 */
async function alertExists(
  supabase: any,
  componentId: string,
  alertType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .eq('component_id', componentId)
    .eq('alert_type', alertType)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.error('[Maintenance Scheduler] Error checking alert existence:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Create a new alert
 */
async function createAlert(
  supabase: any,
  tenantId: string,
  vehicleId: string,
  componentId: string,
  alertType: 'due_soon' | 'overdue',
  title: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<boolean> {
  try {
    // Check if alert already exists
    const exists = await alertExists(supabase, componentId, alertType);
    if (exists) {
      console.log(`[Maintenance Scheduler] Alert already exists for component ${componentId} (${alertType})`);
      return false;
    }

    const { error } = await supabase
      .from('alerts')
      .insert({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        component_id: componentId,
        alert_type: alertType,
        severity: severity,
        title: title,
        description: description,
        status: 'active',
      });

    if (error) {
      console.error('[Maintenance Scheduler] Error creating alert:', error);
      return false;
    }

    console.log(`[Maintenance Scheduler] Created ${alertType} alert for component ${componentId}`);
    return true;
  } catch (err) {
    console.error('[Maintenance Scheduler] Exception creating alert:', err);
    return false;
  }
}

/**
 * Process a single component and generate alerts if needed
 */
async function processComponent(
  supabase: any,
  component: Component,
  vehicle: Vehicle
): Promise<{ dueSoon: boolean; overdue: boolean }> {
  const daysElapsed = calculateDaysElapsed(component.installation_date);
  const kmElapsed = calculateKmElapsed(
    vehicle.current_odometer,
    component.installation_odometer
  );

  let dueSoonCreated = false;
  let overdueCreated = false;

  // Check days-based thresholds
  if (component.expected_life_days) {
    const daysPercentage = daysElapsed / component.expected_life_days;

    if (daysPercentage >= OVERDUE_THRESHOLD) {
      // Component is overdue based on days
      const description = `${component.component_type}${component.component_subtype ? ` (${component.component_subtype})` : ''} has exceeded its expected life of ${component.expected_life_days} days. ${daysElapsed} days have elapsed since installation. Immediate replacement recommended.`;
      
      overdueCreated = await createAlert(
        supabase,
        component.tenant_id,
        component.vehicle_id,
        component.id,
        'overdue',
        `Overdue: ${component.component_type} Replacement`,
        description,
        'high'
      );
    } else if (daysPercentage >= DUE_SOON_THRESHOLD) {
      // Component is due soon based on days
      const remainingDays = component.expected_life_days - daysElapsed;
      const description = `${component.component_type}${component.component_subtype ? ` (${component.component_subtype})` : ''} has reached 90% of its expected life (${component.expected_life_days} days). ${daysElapsed} days have elapsed since installation. Approximately ${remainingDays} days remaining. Schedule replacement soon.`;
      
      dueSoonCreated = await createAlert(
        supabase,
        component.tenant_id,
        component.vehicle_id,
        component.id,
        'due_soon',
        `Due Soon: ${component.component_type} Replacement`,
        description,
        'medium'
      );
    }
  }

  // Check kilometers-based thresholds
  if (component.expected_life_km) {
    const kmPercentage = kmElapsed / component.expected_life_km;

    if (kmPercentage >= OVERDUE_THRESHOLD) {
      // Component is overdue based on kilometers
      const description = `${component.component_type}${component.component_subtype ? ` (${component.component_subtype})` : ''} has exceeded its expected life of ${component.expected_life_km} km. ${kmElapsed} km have elapsed since installation. Immediate replacement recommended.`;
      
      const created = await createAlert(
        supabase,
        component.tenant_id,
        component.vehicle_id,
        component.id,
        'overdue',
        `Overdue: ${component.component_type} Replacement`,
        description,
        'high'
      );
      
      overdueCreated = overdueCreated || created;
    } else if (kmPercentage >= DUE_SOON_THRESHOLD && !dueSoonCreated) {
      // Component is due soon based on kilometers (only if not already flagged by days)
      const remainingKm = component.expected_life_km - kmElapsed;
      const description = `${component.component_type}${component.component_subtype ? ` (${component.component_subtype})` : ''} has reached 90% of its expected life (${component.expected_life_km} km). ${kmElapsed} km have elapsed since installation. Approximately ${remainingKm} km remaining. Schedule replacement soon.`;
      
      const created = await createAlert(
        supabase,
        component.tenant_id,
        component.vehicle_id,
        component.id,
        'due_soon',
        `Due Soon: ${component.component_type} Replacement`,
        description,
        'medium'
      );
      
      dueSoonCreated = dueSoonCreated || created;
    }
  }

  return { dueSoon: dueSoonCreated, overdue: overdueCreated };
}

/**
 * Get all active components with their vehicles
 */
async function getActiveComponents(supabase: any): Promise<Array<{ component: Component; vehicle: Vehicle }>> {
  try {
    // Fetch all active components
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select('*')
      .eq('status', 'active');

    if (componentsError) {
      throw componentsError;
    }

    if (!components || components.length === 0) {
      console.log('[Maintenance Scheduler] No active components found');
      return [];
    }

    // Fetch vehicle data for all components
    const vehicleIds = [...new Set(components.map((c: Component) => c.vehicle_id))];
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, current_odometer')
      .in('id', vehicleIds);

    if (vehiclesError) {
      throw vehiclesError;
    }

    // Create a map of vehicle data
    const vehicleMap = new Map<string, Vehicle>();
    vehicles?.forEach((v: Vehicle) => {
      vehicleMap.set(v.id, v);
    });

    // Combine component and vehicle data
    const result = components
      .filter((c: Component) => vehicleMap.has(c.vehicle_id))
      .map((c: Component) => ({
        component: c,
        vehicle: vehicleMap.get(c.vehicle_id)!,
      }));

    console.log(`[Maintenance Scheduler] Found ${result.length} active components with vehicle data`);
    return result;
  } catch (err) {
    console.error('[Maintenance Scheduler] Error fetching components:', err);
    throw err;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  console.log('[Maintenance Scheduler] Starting maintenance scheduler run');

  const result: MaintenanceSchedulerResult = {
    processed: 0,
    due_soon_alerts: 0,
    overdue_alerts: 0,
    errors: [],
  };

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active components with their vehicles
    const componentsWithVehicles = await getActiveComponents(supabase);

    // Process each component
    for (const { component, vehicle } of componentsWithVehicles) {
      try {
        const { dueSoon, overdue } = await processComponent(
          supabase,
          component,
          vehicle
        );

        result.processed++;
        if (dueSoon) result.due_soon_alerts++;
        if (overdue) result.overdue_alerts++;
      } catch (err) {
        const errorMsg = `Failed to process component ${component.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`[Maintenance Scheduler] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    console.log('[Maintenance Scheduler] Completed successfully:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Maintenance Scheduler] Fatal error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
