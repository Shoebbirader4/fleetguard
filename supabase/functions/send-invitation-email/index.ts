// Edge Function: send-invitation-email
// Description: Sends invitation email using Supabase Auth (free tier)
// No authentication required - emails are sent via Supabase Auth service

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  email: string;
  full_name: string;
  role: string;
  invitation_token: string;
  invitation_url: string;
  tenant_name: string;
  invited_by: string;
  tenant_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const {
      email,
      full_name,
      role,
      invitation_token,
      invitation_url,
      tenant_name,
      invited_by,
      tenant_id,
    }: SendEmailRequest = await req.json();

    // Validation
    if (!email || !invitation_token || !invitation_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'email, invitation_token, and invitation_url are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase Admin client (with service role key for sending emails)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Sending invitation email to: ${email}`);
    console.log(`Invitation URL: ${invitation_url}`);
    console.log(`Company: ${tenant_name}`);
    console.log(`Invited by: ${invited_by}`);

    // Send invitation email using Supabase Auth
    // This uses the FREE built-in email service
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        invitation_token,
        tenant_id,
        role,
        invited_by,
        company_name: tenant_name,
        full_name,
      },
      redirectTo: invitation_url,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to send invitation email',
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Invitation email sent successfully to: ${email}`);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        data: {
          email,
          sent_at: new Date().toISOString(),
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
