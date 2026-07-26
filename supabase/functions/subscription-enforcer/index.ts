/**
 * Subscription Enforcer Edge Function
 * 
 * Enforces subscription limits and displays upgrade prompts for tenants.
 * 
 * Requirements:
 * - 18.2: Enforce vehicle limits per subscription plan
 * - 18.3: Prevent adding new vehicles and display upgrade prompt when limit reached
 * 
 * Input:
 * {
 *   tenant_id: UUID
 * }
 * 
 * Output:
 * {
 *   allowed: boolean,
 *   current_count: number,
 *   vehicle_limit: number,
 *   subscription_plan: string,
 *   upgrade_message?: string
 * }
 */

import {
  authMiddleware,
  forbiddenResponse,
  successResponse,
  corsPreflightResponse,
} from '../_shared/auth-middleware.ts';
import { authorize } from '../shared/auth/permissions.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface CheckSubscriptionRequest {
  tenant_id: string;
}

interface CheckSubscriptionResponse {
  allowed: boolean;
  current_count: number;
  vehicle_limit: number;
  subscription_plan: string;
  upgrade_message?: string;
}

interface TenantSubscription {
  subscription_plan: string;
  vehicle_limit: number;
  subscription_status: string;
}

// ============================================================================
// Constants
// ============================================================================

const UPGRADE_MESSAGES = {
  starter: 'You have reached the vehicle limit for your Starter plan (50 vehicles). Upgrade to Professional to add up to 200 vehicles with advanced analytics and reporting features.',
  professional: 'You have reached the vehicle limit for your Professional plan (200 vehicles). Upgrade to Enterprise for unlimited vehicles and premium support.',
  enterprise: 'Your Enterprise plan supports unlimited vehicles. Contact your account manager for assistance.',
};

// ============================================================================
// Subscription Enforcement Functions
// ============================================================================

/**
 * Get tenant subscription details
 */
async function getTenantSubscription(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantSubscription> {
  const { data, error } = await supabase
    .from('tenants')
    .select('subscription_plan, vehicle_limit, subscription_status')
    .eq('id', tenantId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch tenant subscription: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  return data;
}

/**
 * Count active vehicles for tenant
 */
async function countActiveVehicles(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to count vehicles: ${error.message}`);
  }

  return count || 0;
}

/**
 * Check if tenant can add more vehicles
 */
function canAddVehicle(
  currentCount: number,
  vehicleLimit: number,
  subscriptionStatus: string
): boolean {
  // Check subscription is active
  if (subscriptionStatus !== 'active') {
    return false;
  }

  // Check vehicle limit
  return currentCount < vehicleLimit;
}

/**
 * Get upgrade message based on subscription plan
 */
function getUpgradeMessage(subscriptionPlan: string): string {
  const plan = subscriptionPlan.toLowerCase();
  return UPGRADE_MESSAGES[plan as keyof typeof UPGRADE_MESSAGES] || 
    'You have reached your vehicle limit. Contact support to upgrade your plan.';
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Step 1: Authenticate
    const { authContext, supabase, error: authError } = await authMiddleware(req);

    if (authError) {
      console.error('[Subscription Enforcer] Auth error:', authError);
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        },
      });
    }

    // Step 2: Check permission
    // Only admins and managers can check subscription limits
    const authResult = authorize(authContext!, 'vehicles:create');
    if (!authResult.authorized) {
      console.warn('[Subscription Enforcer] Authorization failed:', {
        userId: authContext!.userId,
        role: authContext!.role,
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Parse and validate request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, content-type',
          } 
        }
      );
    }

    const body: CheckSubscriptionRequest = await req.json();

    // Validate tenant_id
    if (!body.tenant_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field',
          details: 'tenant_id is required',
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, content-type',
          } 
        }
      );
    }

    // Step 4: Verify tenant_id matches authenticated user's tenant
    if (body.tenant_id !== authContext!.tenantId) {
      console.warn('[Subscription Enforcer] Tenant ID mismatch:', {
        requestedTenantId: body.tenant_id,
        authTenantId: authContext!.tenantId,
      });
      return forbiddenResponse('Cannot check subscription for a different tenant');
    }

    // Step 5: Get tenant subscription details
    console.log('[Subscription Enforcer] Fetching subscription for tenant:', body.tenant_id);
    const subscription = await getTenantSubscription(supabase, body.tenant_id);

    console.log('[Subscription Enforcer] Subscription details:', {
      plan: subscription.subscription_plan,
      limit: subscription.vehicle_limit,
      status: subscription.subscription_status,
    });

    // Step 6: Count current active vehicles
    console.log('[Subscription Enforcer] Counting active vehicles for tenant:', body.tenant_id);
    const currentCount = await countActiveVehicles(supabase, body.tenant_id);

    console.log('[Subscription Enforcer] Current vehicle count:', currentCount);

    // Step 7: Check if tenant can add more vehicles
    const allowed = canAddVehicle(
      currentCount,
      subscription.vehicle_limit,
      subscription.subscription_status
    );

    console.log('[Subscription Enforcer] Enforcement result:', {
      allowed,
      currentCount,
      vehicleLimit: subscription.vehicle_limit,
    });

    // Step 8: Build response
    const response: CheckSubscriptionResponse = {
      allowed,
      current_count: currentCount,
      vehicle_limit: subscription.vehicle_limit,
      subscription_plan: subscription.subscription_plan,
    };

    // Add upgrade message if limit reached
    if (!allowed) {
      response.upgrade_message = getUpgradeMessage(subscription.subscription_plan);
    }

    return successResponse(response, 200);
  } catch (err) {
    console.error('[Subscription Enforcer] Unhandled error:', err);
    console.error('[Subscription Enforcer] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
        } 
      }
    );
  }
});
