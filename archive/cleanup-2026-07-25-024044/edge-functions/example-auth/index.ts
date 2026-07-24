/**
 * Example Edge Function demonstrating authentication and authorization
 * 
 * This is a reference implementation showing how to use the auth middleware
 * and permission checking in Edge Functions.
 * 
 * DELETE THIS FILE after reviewing - it's for demonstration only.
 */

import {
  authMiddleware,
  forbiddenResponse,
  successResponse,
  corsPreflightResponse,
} from '../_shared/auth-middleware.ts';
import {
  authorize,
  authorizeAll,
  isAdmin,
} from '../../shared/auth/permissions.ts';

// ============================================================================
// Example 1: Simple Permission Check
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Step 1: Authenticate and get context
    const { authContext, supabase, error } = await authMiddleware(req);

    if (error) {
      console.error('[Auth Error]', error);
      return new Response(JSON.stringify(error), {
        status: error.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check permission
    const authResult = authorize(authContext!, 'vehicles:read');
    if (!authResult.authorized) {
      console.warn('[Authorization Failed]', {
        userId: authContext!.userId,
        role: authContext!.role,
        permission: 'vehicles:read',
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Execute business logic with tenant isolation
    const { data: vehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('tenant_id', authContext!.tenantId)
      .limit(10);

    if (dbError) {
      console.error('[Database Error]', dbError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Return success response
    return successResponse({
      vehicles,
      metadata: {
        count: vehicles?.length || 0,
        tenantId: authContext!.tenantId,
        role: authContext!.role,
      },
    });
  } catch (err) {
    console.error('[Unhandled Error]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Example 2: Multiple Permission Checks
// ============================================================================

/*
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const { authContext, supabase, error } = await authMiddleware(req);

  if (error) {
    return new Response(JSON.stringify(error), { status: 401 });
  }

  // Check multiple permissions (requires ALL)
  const authResult = authorizeAll(authContext!, [
    'work_orders:create',
    'work_orders:assign',
  ]);

  if (!authResult.authorized) {
    return forbiddenResponse(authResult.reason);
  }

  // Parse request body
  const body = await req.json();

  // Create work order
  const { data: workOrder, error: dbError } = await supabase
    .from('work_orders')
    .insert({
      ...body,
      tenant_id: authContext!.tenantId,
      requested_by: authContext!.userId,
    })
    .select()
    .single();

  if (dbError) {
    return new Response(
      JSON.stringify({ error: dbError.message }),
      { status: 400 }
    );
  }

  return successResponse({ workOrder }, 201);
});
*/

// ============================================================================
// Example 3: Role-Based Logic
// ============================================================================

/*
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  const { authContext, supabase, error } = await authMiddleware(req);

  if (error) {
    return new Response(JSON.stringify(error), { status: 401 });
  }

  // Different query based on role
  let query = supabase.from('work_orders').select('*');

  if (isAdmin(authContext!.role)) {
    // Admins see all work orders in tenant
    query = query.eq('tenant_id', authContext!.tenantId);
  } else if (authContext!.role === 'mechanic') {
    // Mechanics only see assigned work orders
    query = query
      .eq('tenant_id', authContext!.tenantId)
      .eq('assigned_to', authContext!.userId);
  } else if (authContext!.role === 'driver') {
    // Drivers only see work orders for their vehicles
    query = query
      .eq('tenant_id', authContext!.tenantId)
      .eq('requested_by', authContext!.userId);
  } else {
    // Default: see all work orders (managers, etc.)
    query = query.eq('tenant_id', authContext!.tenantId);
  }

  const { data: workOrders, error: dbError } = await query;

  if (dbError) {
    return new Response(
      JSON.stringify({ error: dbError.message }),
      { status: 500 }
    );
  }

  return successResponse({
    workOrders,
    metadata: {
      count: workOrders?.length || 0,
      role: authContext!.role,
    },
  });
});
*/

// ============================================================================
// Example 4: Optional Authentication
// ============================================================================

/*
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Allow unauthenticated access (for public endpoints)
  const { authContext, supabase } = await authMiddleware(req, {
    requireAuth: false,
  });

  // Public data (no tenant filter)
  const { data: stats } = await supabase
    .from('public_stats')
    .select('*')
    .single();

  // If authenticated, return personalized data
  if (authContext) {
    const { data: personalStats } = await supabase
      .from('tenant_stats')
      .select('*')
      .eq('tenant_id', authContext.tenantId)
      .single();

    return successResponse({
      public: stats,
      personal: personalStats,
      authenticated: true,
    });
  }

  // Return public data only
  return successResponse({
    public: stats,
    authenticated: false,
  });
});
*/
