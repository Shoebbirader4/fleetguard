// Edge Function: accept-invitation
// Description: Creates a user account from an invitation token
// This allows employees to join an existing tenant

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  token: string;
  password: string;
  fullName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { token, password, fullName }: AcceptInvitationRequest = await req.json();

    // Validation
    if (!token || !password || !fullName) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'token, password, and fullName are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate password complexity (Requirement 28.3)
    if (password.length < 12) {
      return new Response(
        JSON.stringify({
          error: 'Password must be at least 12 characters long',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return new Response(
        JSON.stringify({
          error: 'Password must contain uppercase, lowercase, numbers, and special characters',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .select('*, tenants(name)')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired invitation',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({
          error: 'This invitation has expired',
        }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user already exists with this email
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUser?.users?.some((u) => u.email === invitation.email);

    if (userExists) {
      return new Response(
        JSON.stringify({
          error: 'An account with this email already exists. Please sign in instead.',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create user account',
          details: authError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: fullName,
      role: invitation.role,
      notification_preferences: {
        due_soon: ['email'],
        overdue: ['email', 'push'],
        critical_failure_risk: ['email', 'sms', 'push'],
        safety_risk: ['email', 'sms', 'push', 'whatsapp'],
        low_stock: ['email'],
        document_expiry: ['email'],
        document_expired: ['email', 'push'],
        tire_replacement_forecast: ['email'],
      },
      theme: 'light',
      locale: 'en',
      is_active: true,
    });

    if (profileError) {
      console.error('User profile creation error:', profileError);
      // Don't fail completely - trigger might have created it
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully. You can now sign in.',
        data: {
          userId: authData.user.id,
          tenantId: invitation.tenant_id,
          email: invitation.email,
          role: invitation.role,
          companyName: invitation.tenants?.name || 'Unknown Company',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
