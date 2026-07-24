// Edge Function: invite-user
// Description: Creates an invitation for an employee to join a tenant
// Requires: company_owner or fleet_manager role

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  role: string;
  fullName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user profile to check role and tenant
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('tenant_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has permission to invite (company_owner or fleet_manager)
    if (!['company_owner', 'fleet_manager'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only company owners and fleet managers can invite users.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { email, role, fullName }: InviteUserRequest = await req.json();

    // Validation
    if (!email || !role) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'email and role are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate role (cannot invite super_admin or company_owner)
    const allowedRoles = [
      'fleet_manager',
      'workshop_manager',
      'maintenance_engineer',
      'mechanic',
      'driver',
      'inspector',
      'accountant',
      'auditor',
    ];

    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid role',
          details: `Role must be one of: ${allowedRoles.join(', ')}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user with this email already exists in the tenant
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: 'User with this email already exists in your company',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation } = await supabaseClient
      .from('user_invitations')
      .select('id, status')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({
          error: 'A pending invitation already exists for this email',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate invitation token
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('user_invitations')
      .insert({
        tenant_id: userProfile.tenant_id,
        email: email,
        role: role,
        invited_by: user.id,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create invitation',
          details: inviteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get tenant name for email
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('name')
      .eq('id', userProfile.tenant_id)
      .single();

    // Generate invitation URL
    const invitationUrl = `${Deno.env.get('APP_URL') || 'http://localhost:3000'}/join?token=${token}`;

    // Send invitation email using Supabase Auth (built-in, free tier)
    try {
      // Create a temporary password for the invitation email
      const tempPassword = crypto.randomUUID();
      
      // Use Supabase admin client to send magic link / invitation
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Send email invitation using Supabase's built-in email
      // This uses the free tier email service
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          invitation_token: token,
          tenant_id: userProfile.tenant_id,
          role: role,
          invited_by: userProfile.full_name,
          company_name: tenant?.name || 'Unknown Company',
        },
        redirectTo: invitationUrl,
      });

      console.log(`Invitation email sent to ${email} via Supabase Auth`);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
      console.log(`Fallback: Invitation URL: ${invitationUrl}`);
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation created successfully',
        data: {
          invitationId: invitation.id,
          email: email,
          role: role,
          invitationUrl: invitationUrl,
          expiresAt: expiresAt.toISOString(),
          companyName: tenant?.name || 'Unknown Company',
          invitedBy: userProfile.full_name,
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
