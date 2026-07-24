/**
 * Auth Security Edge Function
 * 
 * Task: 17.3 Implement authentication security
 * Requirements: 28.3, 28.5, 28.7
 * 
 * This edge function integrates with Supabase Auth to:
 * 1. Log all authentication attempts (success and failure)
 * 2. Check for account lockouts before allowing login
 * 3. Detect suspicious activity and lock accounts when needed
 * 4. Enforce password complexity requirements
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthAttemptPayload {
  email: string;
  success: boolean;
  attemptType: 'login' | 'signup' | 'password_reset' | 'magic_link';
  failureReason?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface PasswordValidationRequest {
  password: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // Extract IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // ========================================================================
    // ENDPOINT: POST /auth-security/log-attempt
    // Log authentication attempt
    // ========================================================================
    if (path.includes('/log-attempt') && req.method === 'POST') {
      const payload: AuthAttemptPayload = await req.json();

      const { data, error } = await supabase.rpc('log_auth_attempt', {
        p_user_id: payload.userId || null,
        p_email: payload.email,
        p_attempt_type: payload.attemptType,
        p_success: payload.success,
        p_failure_reason: payload.failureReason || null,
        p_ip_address: payload.ipAddress || ipAddress,
        p_user_agent: payload.userAgent || userAgent,
        p_metadata: {}
      });

      if (error) {
        console.error('Error logging auth attempt:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to log authentication attempt', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If this was a failed login, check for suspicious activity
      if (!payload.success && payload.attemptType === 'login') {
        const { data: lockResult, error: lockError } = await supabase.rpc(
          'check_and_lock_suspicious_account',
          {
            p_email: payload.email,
            p_ip_address: payload.ipAddress || ipAddress
          }
        );

        if (lockError) {
          console.error('Error checking for suspicious activity:', lockError);
        } else if (lockResult?.locked) {
          console.log(`Account locked for ${payload.email}:`, lockResult);
        }
      }

      return new Response(
        JSON.stringify({ success: true, attemptId: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // ENDPOINT: GET /auth-security/check-lockout?email=xxx
    // Check if account is locked
    // ========================================================================
    if (path.includes('/check-lockout') && req.method === 'GET') {
      const email = url.searchParams.get('email');

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('is_account_locked', {
        p_email: email
      });

      if (error) {
        console.error('Error checking account lockout:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to check account lockout', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // ENDPOINT: POST /auth-security/validate-password
    // Validate password complexity
    // ========================================================================
    if (path.includes('/validate-password') && req.method === 'POST') {
      const { password }: PasswordValidationRequest = await req.json();

      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('validate_password_with_details', {
        password: password
      });

      if (error) {
        console.error('Error validating password:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to validate password', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // ENDPOINT: POST /auth-security/unlock-account
    // Manually unlock an account (admin only)
    // ========================================================================
    if (path.includes('/unlock-account') && req.method === 'POST') {
      // Get authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is authenticated and is an admin
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is an admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData || !['super_admin', 'company_owner', 'fleet_manager'].includes(userData.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions. Admin role required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { email, reason } = await req.json();

      if (!email || !reason) {
        return new Response(
          JSON.stringify({ error: 'Email and reason are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('unlock_account', {
        p_email: email,
        p_admin_user_id: user.id,
        p_unlock_reason: reason
      });

      if (error) {
        console.error('Error unlocking account:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to unlock account', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: data, message: data ? 'Account unlocked successfully' : 'No active lockout found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // ENDPOINT: POST /auth-security/cleanup-lockouts
    // Cleanup expired lockouts (called by cron)
    // ========================================================================
    if (path.includes('/cleanup-lockouts') && req.method === 'POST') {
      // Verify cron secret
      const cronSecret = req.headers.get('x-cron-secret');
      const expectedSecret = Deno.env.get('CRON_SECRET');

      if (!cronSecret || cronSecret !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: 'Invalid cron secret' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase.rpc('cleanup_expired_lockouts');

      if (error) {
        console.error('Error cleaning up expired lockouts:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to cleanup lockouts', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, unlockedCount: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
