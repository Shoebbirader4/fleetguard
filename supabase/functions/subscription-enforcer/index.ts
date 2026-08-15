import { authMiddleware, forbiddenResponse, successResponse, corsPreflightResponse } from '../_shared/auth-middleware.ts';
import { authorize } from '../shared/auth/permissions.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface RequestBody { tenant_id?: string; feature?: string; action?: 'vehicle:create' | 'feature:check'; }
interface Plan { code: string; name: string; monthly_price_inr: number; vehicle_limit: number | null; features: Record<string, boolean>; }

const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };

async function getServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function getPlan(client: SupabaseClient, tenantId: string): Promise<Plan> {
  const { data, error } = await client.from('tenants').select('subscription_plan_code, subscription_plan, subscription_status, billing_currency, price_per_vehicle_inr').eq('id', tenantId).single();
  if (error || !data) throw new Error(error?.message || 'Tenant not found');
  if (data.subscription_status !== 'active') throw new Error('Subscription is not active');
  const code = data.subscription_plan_code || (data.subscription_plan === 'starter' ? 'basic' : data.subscription_plan === 'professional' ? 'plus' : data.subscription_plan === 'enterprise' ? 'all' : data.subscription_plan || 'basic');
  const planResult = await client.from('subscription_plans').select('code, name, monthly_price_inr, vehicle_limit, features').eq('code', code).single();
  if (planResult.error || !planResult.data) throw new Error(planResult.error?.message || 'Subscription plan not found');
  return planResult.data as Plan;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse();
  try {
    const { authContext, supabase, error: authError } = await authMiddleware(req);
    if (authError) return new Response(JSON.stringify(authError), { status: 401, headers: jsonHeaders });
    const auth = authContext!;
    const permission = authorize(auth, 'vehicles:create');
    if (!permission.authorized) return forbiddenResponse(permission.reason);
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
    const body = (await req.json()) as RequestBody;
    if (!body.tenant_id || body.tenant_id !== auth.tenantId) return new Response(JSON.stringify({ error: 'Invalid tenant_id' }), { status: 403, headers: jsonHeaders });

    const service = await getServiceClient();
    const plan = await getPlan(service, body.tenant_id);
    const { count, error: countError } = await service.from('vehicles').select('*', { count: 'exact', head: true }).eq('tenant_id', body.tenant_id).eq('status', 'active');
    if (countError) throw countError;
    const currentCount = count || 0;
    const feature = body.feature || (body.action === 'feature:check' ? 'dashboard' : undefined);
    const featureAllowed = feature ? Boolean(plan.features[feature]) : true;
    const limitAllowed = plan.vehicle_limit == null || currentCount < plan.vehicle_limit;
    const allowed = featureAllowed && limitAllowed;
    const response = {
      allowed,
      current_count: currentCount,
      vehicle_limit: plan.vehicle_limit,
      subscription_plan: plan.code,
      plan_name: plan.name,
      price_per_vehicle_inr: plan.monthly_price_inr,
      billing_currency: 'INR',
      feature,
      feature_allowed: featureAllowed,
      features: plan.features,
      upgrade_message: !featureAllowed ? `The ${plan.name} plan does not include ${feature}. Upgrade to Basic Plus or All Access to unlock it.` : !limitAllowed ? 'Vehicle limit reached. Upgrade your plan to add more vehicles.' : undefined,
    };
    return successResponse(response, 200);
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500, headers: jsonHeaders });
  }
});
