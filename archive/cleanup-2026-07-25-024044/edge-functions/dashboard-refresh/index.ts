/**
 * Dashboard Refresh Edge Function
 * 
 * This function refreshes all dashboard materialized views every 5 minutes
 * to ensure dashboard analytics load within 2 seconds.
 * 
 * Schedule: Every 5 minutes via pg_cron
 * Requirements: 26.2, 26.6
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RefreshResponse {
  success: boolean;
  refreshed_at: string;
  duration_ms: number;
  error?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is a scheduled invocation or authenticated request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting materialized view refresh...');
    const startTime = Date.now();

    // Call the refresh function
    const { error } = await supabase.rpc('refresh_dashboard_materialized_views');

    if (error) {
      console.error('Error refreshing materialized views:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          refreshed_at: new Date().toISOString(),
        } as RefreshResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`Materialized views refreshed successfully in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed_at: new Date().toISOString(),
        duration_ms: duration,
      } as RefreshResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        refreshed_at: new Date().toISOString(),
      } as RefreshResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
