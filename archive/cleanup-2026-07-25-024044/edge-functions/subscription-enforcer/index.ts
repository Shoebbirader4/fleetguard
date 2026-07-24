import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  tenant_id: string;
}

interface SubscriptionCheck {
  allowed: boolean;
  current_count: number;
  vehicle_limit: number;
  subscription_plan: string;
  upgrade_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant_id from metadata
    const userTenantId = user.user_metadata?.tenant_id;

    // Security check: ensure user can only check their own tenant
    if (userTenantId !== tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot check subscription for a different tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant subscription details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('subscription_plan, vehicle_limit, subscription_status')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tenant subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription is active
    if (tenant.subscription_status !== 'active') {
      return new Response(
        JSON.stringify({
          allowed: false,
          current_count: 0,
          vehicle_limit: tenant.vehicle_limit,
          subscription_plan: tenant.subscription_plan,
          upgrade_message: `Your subscription is ${tenant.subscription_status}. Please contact support to reactivate.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count current active vehicles
    const { count, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .in('status', ['active', 'maintenance']);

    if (countError) {
      console.error('Error counting vehicles:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to count vehicles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentCount = count || 0;
    const vehicleLimit = tenant.vehicle_limit;
    const allowed = currentCount < vehicleLimit;

    const result: SubscriptionCheck = {
      allowed,
      current_count: currentCount,
      vehicle_limit: vehicleLimit,
      subscription_plan: tenant.subscription_plan,
    };

    // Add upgrade message if limit reached
    if (!allowed) {
      const planMessages: Record<string, string> = {
        starter: 'You have reached the vehicle limit for your Starter plan (50 vehicles). Upgrade to Professional to add up to 200 vehicles with advanced analytics and reporting features.',
        professional: 'You have reached the vehicle limit for your Professional plan (200 vehicles). Upgrade to Enterprise for unlimited vehicles and dedicated support.',
        enterprise: 'You have reached the vehicle limit. Please contact your account manager.',
      };

      result.upgrade_message = planMessages[tenant.subscription_plan] || 'Vehicle limit reached.';
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Subscription enforcer error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
