// Edge Function: signup
// Description: Creates a new tenant (company) and first user (company owner)
// This function uses service_role to bypass RLS for initial tenant/user creation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, password, fullName, companyName }: SignupRequest = await req.json();

    // Validation
    if (!email || !password || !fullName || !companyName) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'email, password, fullName, and companyName are required',
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
        JSON.stringify({
          error: 'Invalid email format',
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

    // Create Supabase client with service_role to bypass RLS
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

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some((u) => u.email === email);

    if (userExists) {
      return new Response(
        JSON.stringify({
          error: 'An account with this email already exists',
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 1: Create tenant (company)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: companyName,
        subscription_plan: 'starter', // Default to starter plan
        vehicle_limit: 50, // Starter plan allows 50 vehicles
        subscription_status: 'active',
        billing_cycle: 'monthly',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create company account',
          details: tenantError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Create auth user with metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        full_name: fullName,
        tenant_id: tenant.id,
        role: 'company_owner',
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      
      // Rollback: Delete tenant if user creation fails
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      
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

    // Step 3: Create user profile (trigger should handle this, but we'll do it explicitly)
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email: email,
      full_name: fullName,
      role: 'company_owner',
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
      
      // Note: We don't rollback here because the trigger might have already created it
      // and this is just a safety net
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        data: {
          userId: authData.user.id,
          tenantId: tenant.id,
          email: email,
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
