import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { email, password, fullName, companyName }: SignUpRequest = body;

    console.log('Signup request received for email:', email);

    // Validate input
    if (!email || !password || !fullName || !companyName) {
      console.error('Missing required fields:', { email: !!email, password: !!password, fullName: !!fullName, companyName: !!companyName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Checking if email already exists...');
    
    // Step 1: Check if email already exists
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing user', details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('Email already registered:', email);
      return new Response(
        JSON.stringify({ error: 'This email is already registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating tenant...');
    
    // Step 2: Create tenant (company)
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: companyName,
        subscription_plan: 'starter',
        vehicle_limit: 10,
        subscription_status: 'active',
        billing_cycle: 'monthly',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      console.error('Tenant creation error:', tenantError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create company account',
          details: tenantError?.message || 'No tenant data returned'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant created:', tenantData.id);
    console.log('Creating auth user...');
    
    // Step 3: Create auth user with metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        tenant_id: tenantData.id,
        full_name: fullName,
        role: 'company_owner',
        company_name: companyName,
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      
      // Rollback: Delete tenant
      await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
      
      return new Response(
        JSON.stringify({ 
          error: authError?.message || 'Failed to create user account',
          details: authError?.message || 'No auth data returned'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user created:', authData.user.id);
    console.log('User profile will be auto-created by database trigger...');
    
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 4: Verify user profile was created by trigger
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile verification error:', profileError);
      
      // Rollback: Delete auth user and tenant
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify user profile creation',
          details: profileError?.message || 'Profile not found after trigger execution'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User profile verified successfully');
    console.log('Sign up completed successfully for:', email);

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
        },
        tenant: {
          id: tenantData.id,
          name: companyName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        type: error?.constructor?.name || 'UnknownError'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
