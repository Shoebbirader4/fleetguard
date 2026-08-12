/**
 * Configure Database Settings for Alert System
 * 
 * This edge function configures the service role key and Supabase URL
 * in the database settings so that the notification trigger can work.
 * 
 * Requirements:
 * - Service role key (from Settings → API → service_role)
 * - Supabase project URL
 * 
 * Usage:
 * POST /functions/v1/configure-db-settings
 * {
 *   "service_role_key": "eyJ...",
 *   "supabase_url": "https://xxxxx.supabase.co"
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ConfigRequest {
  service_role_key: string;
  supabase_url: string;
}

Deno.serve(async (req) => {
  // Only POST requests allowed
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: ConfigRequest = await req.json();

    if (!body.service_role_key || !body.supabase_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: service_role_key, supabase_url',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute SQL to configure database settings
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Configure Supabase URL
        ALTER DATABASE postgres SET app.settings.supabase_url = '${body.supabase_url}';
        
        -- Configure Service Role Key
        ALTER DATABASE postgres SET app.settings.service_role_key = '${body.service_role_key}';
        
        -- Verify configuration
        SELECT 
          current_setting('app.settings.supabase_url', true) as supabase_url,
          current_setting('app.settings.service_role_key', true) as service_role_key;
      `,
    });

    if (configError) {
      console.error('Configuration error:', configError);
      return new Response(
        JSON.stringify({
          error: 'Failed to configure database settings',
          details: configError,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if configuration was successful
    const { data: healthData, error: healthError } = await supabase.rpc(
      'check_notification_system_health'
    );

    if (healthError) {
      console.error('Health check error:', healthError);
      return new Response(
        JSON.stringify({
          message: 'Database settings configured (could not verify health)',
          error: healthError,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Database settings configured successfully',
        settings_configured: {
          supabase_url: body.supabase_url,
          service_role_key: '***' + body.service_role_key.slice(-20),
        },
        health: healthData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Configuration error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
