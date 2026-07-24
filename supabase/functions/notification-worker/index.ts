/**
 * Notification Worker Edge Function
 * 
 * Background worker that processes queued notification jobs from notification_jobs table.
 * This function should be triggered by a cron job or webhook to continuously process
 * pending notifications.
 * 
 * Can be invoked via:
 * 1. Supabase cron job (e.g., every minute)
 * 2. Manual trigger via HTTP POST
 * 3. Webhook from alert-dispatcher after creating jobs
 * 
 * Requirements: 10.2, 10.3, 10.5
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { processQueuedJobs } from '../alert-dispatcher/handlers.ts';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // This function should only accept POST requests or cron triggers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[Notification Worker] Starting job processing...');

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Process all queued jobs
    const result = await processQueuedJobs(supabase);

    console.log('[Notification Worker] Job processing completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification jobs processed',
        ...result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Notification Worker] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
