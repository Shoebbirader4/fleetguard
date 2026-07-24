/**
 * Maintenance Calendar Edge Function
 * 
 * Provides API endpoint for retrieving 30-day upcoming maintenance calendar.
 * 
 * Requirements: 9.6
 * 
 * Endpoints:
 * - GET /maintenance-calendar - Get upcoming maintenance for authenticated user's tenant
 *   Query params:
 *   - days_ahead: number of days to look ahead (default: 30)
 * 
 * Authentication: Required (JWT)
 * Roles: All authenticated users
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify authentication and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant_id from JWT token (auth hook adds it to root level)
    // First, decode the JWT to get custom claims
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tenantId = payload.tenant_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing tenant_id in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle GET request - retrieve upcoming maintenance
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const daysAhead = parseInt(url.searchParams.get('days_ahead') || '30', 10);

      // Validate days_ahead parameter
      if (isNaN(daysAhead) || daysAhead < 1 || daysAhead > 365) {
        return new Response(
          JSON.stringify({ error: 'Invalid days_ahead parameter. Must be between 1 and 365.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Call the database function to get upcoming maintenance
      const { data, error } = await supabase.rpc('get_upcoming_maintenance_calendar', {
        p_tenant_id: tenantId,
        p_days_ahead: daysAhead,
      });

      if (error) {
        console.error('Error fetching maintenance calendar:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch maintenance calendar', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate summary statistics
      const summary = {
        total_items: data.length,
        overdue_count: data.filter((item: MaintenanceCalendarItem) => item.is_overdue).length,
        critical_count: data.filter((item: MaintenanceCalendarItem) => item.priority === 'critical').length,
        high_priority_count: data.filter((item: MaintenanceCalendarItem) => item.priority === 'high').length,
        due_by_date_count: data.filter((item: MaintenanceCalendarItem) => 
          item.due_type === 'date' || item.due_type === 'multiple'
        ).length,
        due_by_odometer_count: data.filter((item: MaintenanceCalendarItem) => 
          item.due_type === 'odometer' || item.due_type === 'multiple'
        ).length,
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          summary: summary,
          days_ahead: daysAhead,
          generated_at: new Date().toISOString(),
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
