/**
 * Cost Reporting Edge Function
 * 
 * Provides comprehensive cost tracking and reporting functionality:
 * - Generate cost reports with date range, vehicle, and category filters
 * - Compare current period to previous period with percentage changes
 * - Identify top cost contributors by vehicle and component type
 * - Calculate cost per vehicle, cost per kilometer, and cost per maintenance event
 * - Export cost reports (Excel/PDF handled client-side)
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
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

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication and get tenant_id
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get tenant_id from JWT token (auth hook adds it to root level)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tenantId = payload.tenant_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request URL and get report type
    const url = new URL(req.url);
    const reportType = url.pathname.split('/').pop();

    // Handle different report types
    switch (reportType) {
      case 'detailed':
        return await handleDetailedCostReport(supabaseClient, tenantId, url);
      
      case 'summary':
        return await handleCostSummary(supabaseClient, tenantId, url);
      
      case 'top-vehicles':
        return await handleTopVehicles(supabaseClient, tenantId, url);
      
      case 'top-components':
        return await handleTopComponents(supabaseClient, tenantId, url);
      
      case 'refresh-cache':
        return await handleRefreshCache(supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid report type',
            available_endpoints: [
              '/cost-reporting/detailed',
              '/cost-reporting/summary',
              '/cost-reporting/top-vehicles',
              '/cost-reporting/top-components',
              '/cost-reporting/refresh-cache'
            ]
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('Error in cost-reporting function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Generate detailed cost report with filters and period comparison
 * 
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 * - vehicle_ids: comma-separated UUIDs (optional)
 * - cost_categories: comma-separated categories (optional): parts,labor,external_service,fuel
 * - include_previous_period: true/false (default: true)
 */
async function handleDetailedCostReport(
  supabaseClient: any,
  tenantId: string,
  url: URL
): Promise<Response> {
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  
  if (!startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: 'start_date and end_date are required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const vehicleIds = url.searchParams.get('vehicle_ids')?.split(',').filter(Boolean) || null;
  const costCategories = url.searchParams.get('cost_categories')?.split(',').filter(Boolean) || null;
  const includePreviousPeriod = url.searchParams.get('include_previous_period') !== 'false';

  // Call database function for cost report
  const { data, error } = await supabaseClient.rpc('get_cost_report', {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_vehicle_ids: vehicleIds,
    p_cost_categories: costCategories,
    p_include_previous_period: includePreviousPeriod
  });

  if (error) {
    console.error('Error generating cost report:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate cost report', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      report_type: 'detailed',
      filters: {
        start_date: startDate,
        end_date: endDate,
        vehicle_ids: vehicleIds,
        cost_categories: costCategories,
        include_previous_period: includePreviousPeriod
      },
      data: data || []
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Get cost summary statistics
 * 
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 */
async function handleCostSummary(
  supabaseClient: any,
  tenantId: string,
  url: URL
): Promise<Response> {
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  
  if (!startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: 'start_date and end_date are required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Call database function for cost summary
  const { data, error } = await supabaseClient.rpc('get_cost_summary_statistics', {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error generating cost summary:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate cost summary', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      report_type: 'summary',
      period: {
        start_date: startDate,
        end_date: endDate
      },
      data: data?.[0] || null
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Get top cost contributors by vehicle
 * 
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 * - limit: integer (default: 10)
 */
async function handleTopVehicles(
  supabaseClient: any,
  tenantId: string,
  url: URL
): Promise<Response> {
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  
  if (!startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: 'start_date and end_date are required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Call database function for top vehicles
  const { data, error } = await supabaseClient.rpc('get_top_cost_contributors_by_vehicle', {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit
  });

  if (error) {
    console.error('Error getting top vehicle contributors:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get top vehicle contributors', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      report_type: 'top_vehicles',
      period: {
        start_date: startDate,
        end_date: endDate
      },
      limit: limit,
      data: data || []
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Get top cost contributors by component type
 * 
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 * - limit: integer (default: 10)
 */
async function handleTopComponents(
  supabaseClient: any,
  tenantId: string,
  url: URL
): Promise<Response> {
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  
  if (!startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: 'start_date and end_date are required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Call database function for top components
  const { data, error } = await supabaseClient.rpc('get_top_cost_contributors_by_component', {
    p_tenant_id: tenantId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit
  });

  if (error) {
    console.error('Error getting top component contributors:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get top component contributors', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      report_type: 'top_components',
      period: {
        start_date: startDate,
        end_date: endDate
      },
      limit: limit,
      data: data || []
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Refresh the materialized view cache
 * This should be called periodically or after significant cost data updates
 */
async function handleRefreshCache(supabaseClient: any): Promise<Response> {
  const { error } = await supabaseClient.rpc('refresh_vehicle_cost_summary');

  if (error) {
    console.error('Error refreshing cache:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to refresh cache', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Vehicle cost summary cache refreshed successfully'
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
