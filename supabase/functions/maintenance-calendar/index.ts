/**
 * Maintenance Calendar Edge Function
 * 
 * Provides a 30-day upcoming maintenance calendar view for Fleet Managers.
 * 
 * Requirements:
 * - 9.6: Generate a 30-day upcoming maintenance calendar view for Fleet Managers
 * 
 * GET /maintenance-calendar?days=30
 * 
 * Output:
 * {
 *   total: number,
 *   overdue: number,
 *   due_soon: number,
 *   items: MaintenanceCalendarItem[]
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// Types
// ============================================================================

interface MaintenanceCalendarItem {
  schedule_id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
  component_id: string | null;
  component_type: string | null;
  component_subtype: string | null;
  schedule_name: string;
  description: string | null;
  next_due_date: string | null;
  next_due_odometer: number | null;
  next_due_engine_hours: number | null;
  current_odometer: number;
  days_until_due: number | null;
  km_until_due: number | null;
  priority: string;
  is_overdue: boolean;
  due_type: string;
}

interface MaintenanceCalendarResponse {
  total: number;
  overdue: number;
  due_soon: number;
  items: MaintenanceCalendarItem[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tenant ID from JWT token
 */
function getTenantIdFromToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload.tenant_id || null;
  } catch (error) {
    console.error('[Maintenance Calendar] Error parsing token:', error);
    return null;
  }
}

/**
 * Validate days parameter
 */
function validateDaysParam(daysParam: string | null): number {
  if (!daysParam) return 30; // Default to 30 days
  
  const days = parseInt(daysParam, 10);
  if (isNaN(days) || days < 1 || days > 365) {
    throw new Error('Invalid days parameter. Must be between 1 and 365.');
  }
  
  return days;
}

/**
 * Categorize maintenance items
 */
function categorizeItems(items: MaintenanceCalendarItem[]): {
  overdue: number;
  due_soon: number;
} {
  let overdue = 0;
  let dueSoon = 0;

  for (const item of items) {
    if (item.is_overdue) {
      overdue++;
    } else if (item.days_until_due !== null && item.days_until_due <= 7) {
      // Due within 7 days is considered "due soon"
      dueSoon++;
    }
  }

  return { overdue, due_soon: dueSoon };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Maintenance Calendar] Processing request');

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get authorization token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract tenant ID from JWT
    const tenantId = getTenantIdFromToken(req);
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing tenant_id in token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const daysAhead = validateDaysParam(url.searchParams.get('days'));

    console.log(`[Maintenance Calendar] Fetching ${daysAhead}-day calendar for tenant ${tenantId}`);

    // Create Supabase client with user's auth token
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Call the database function to get upcoming maintenance
    const { data, error } = await supabase.rpc('get_upcoming_maintenance_calendar', {
      p_tenant_id: tenantId,
      p_days_ahead: daysAhead,
    });

    if (error) {
      console.error('[Maintenance Calendar] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch maintenance calendar', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const items: MaintenanceCalendarItem[] = data || [];
    const { overdue, due_soon } = categorizeItems(items);

    const response: MaintenanceCalendarResponse = {
      total: items.length,
      overdue,
      due_soon,
      items,
    };

    console.log(`[Maintenance Calendar] Returning ${items.length} maintenance items (${overdue} overdue, ${due_soon} due soon)`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[Maintenance Calendar] Error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
