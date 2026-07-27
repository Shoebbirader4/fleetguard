/**
 * Authentication Middleware for Supabase Edge Functions
 * 
 * This module provides middleware to:
 * 1. Verify JWT tokens from Authorization header
 * 2. Extract tenant_id and role from JWT custom claims
 * 3. Create AuthContext for authorization checks
 * 
 * Satisfies Requirements 1.2, 1.3: JWT verification and role extraction
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AuthContext, AuthError, JWTPayload } from '../shared/types/auth.ts';
import { createAuthContext, isValidRole } from '../shared/auth/permissions.ts';

// ============================================================================
// Types
// ============================================================================

interface AuthMiddlewareOptions {
  requireAuth?: boolean; // Default: true
  allowServiceRole?: boolean; // Default: false
}

interface AuthMiddlewareResult {
  authContext?: AuthContext;
  supabase: SupabaseClient;
  error?: AuthError;
}

// ============================================================================
// JWT Token Extraction
// ============================================================================

/**
 * Extract JWT token from Authorization header
 * 
 * @param request - HTTP Request object
 * @returns JWT token string or null
 */
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Handle raw token
  return authHeader;
}

// ============================================================================
// JWT Verification and Parsing
// ============================================================================

/**
 * Verify JWT token and extract user information
 * 
 * @param supabase - Supabase client instance
 * @param token - JWT token string
 * @returns AuthContext or null if verification fails
 */
async function verifyAndExtractAuth(
  supabase: SupabaseClient,
  token: string
): Promise<AuthContext | null> {
  try {
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth Middleware] Token verification failed:', error?.message);
      return null;
    }

    // Extract custom claims from user metadata
    // Check both app_metadata (preferred) and user_metadata (fallback)
    const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;
    const role = user.app_metadata?.role || user.user_metadata?.role;

    if (!tenantId) {
      console.error('[Auth Middleware] Missing tenant_id in JWT claims');
      console.error('[Auth Middleware] app_metadata:', user.app_metadata);
      console.error('[Auth Middleware] user_metadata:', user.user_metadata);
      return null;
    }

    if (!role || !isValidRole(role)) {
      console.error('[Auth Middleware] Invalid or missing role in JWT claims:', role);
      console.error('[Auth Middleware] app_metadata:', user.app_metadata);
      console.error('[Auth Middleware] user_metadata:', user.user_metadata);
      return null;
    }

    // Create AuthContext with permissions
    const authContext = createAuthContext(
      user.id,
      tenantId,
      role,
      user.email || ''
    );

    return authContext;
  } catch (error) {
    console.error('[Auth Middleware] Exception during token verification:', error);
    return null;
  }
}

// ============================================================================
// Main Middleware Function
// ============================================================================

/**
 * Authentication middleware for Edge Functions
 * 
 * Usage in Edge Function:
 * ```typescript
 * import { authMiddleware } from '../_shared/auth-middleware.ts';
 * 
 * Deno.serve(async (req) => {
 *   const { authContext, supabase, error } = await authMiddleware(req);
 *   
 *   if (error) {
 *     return new Response(JSON.stringify(error), { 
 *       status: error.code === 'MISSING_TOKEN' ? 401 : 403,
 *       headers: { 'Content-Type': 'application/json' }
 *     });
 *   }
 *   
 *   // Use authContext for authorization
 *   if (!authorize(authContext, 'vehicles:read').authorized) {
 *     return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
 *   }
 *   
 *   // Proceed with function logic
 *   // ...
 * });
 * ```
 * 
 * @param request - HTTP Request object
 * @param options - Middleware configuration options
 * @returns AuthMiddlewareResult with authContext, supabase client, or error
 */
export async function authMiddleware(
  request: Request,
  options: AuthMiddlewareOptions = {}
): Promise<AuthMiddlewareResult> {
  const { requireAuth = true, allowServiceRole = false } = options;

  // Get Supabase credentials from environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Auth Middleware] Missing Supabase environment variables');
    return {
      supabase: null as any,
      error: {
        error: 'Internal server error',
        code: 'UNAUTHORIZED',
        details: { message: 'Missing Supabase configuration' },
      },
    };
  }

  // Extract token from request
  const token = extractToken(request);

  if (!token) {
    if (!requireAuth) {
      // Create anonymous Supabase client
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      return { supabase };
    }

    return {
      supabase: null as any,
      error: {
        error: 'Missing authorization token',
        code: 'MISSING_TOKEN',
        details: { message: 'Authorization header is required' },
      },
    };
  }

  // Check if using service role key (for internal operations)
  if (allowServiceRole && token === supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    return {
      supabase,
      authContext: createAuthContext(
        'service-role',
        'system',
        'super_admin',
        'service@fleetguard.ai'
      ),
    };
  }

  // Create Supabase client with user token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify token and extract auth context
  const authContext = await verifyAndExtractAuth(supabase, token);

  if (!authContext) {
    if (!requireAuth) {
      return { supabase };
    }

    return {
      supabase,
      error: {
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        details: { message: 'Failed to verify JWT token' },
      },
    };
  }

  return {
    authContext,
    supabase,
  };
}

// ============================================================================
// Authorization Response Helpers
// ============================================================================

/**
 * Create a standardized 401 Unauthorized response
 * 
 * @param error - Optional custom error message
 * @returns HTTP Response with 401 status
 */
export function unauthorizedResponse(error?: string): Response {
  const authError: AuthError = {
    error: error || 'Unauthorized',
    code: 'UNAUTHORIZED',
  };

  return new Response(JSON.stringify(authError), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
    },
  });
}

/**
 * Create a standardized 403 Forbidden response
 * 
 * @param error - Optional custom error message
 * @param details - Optional error details
 * @returns HTTP Response with 403 status
 */
export function forbiddenResponse(
  error?: string,
  details?: Record<string, unknown>
): Response {
  const authError: AuthError = {
    error: error || 'Forbidden',
    code: 'FORBIDDEN',
    details,
  };

  return new Response(JSON.stringify(authError), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success response with CORS headers
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns HTTP Response
 */
export function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Configure based on environment
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}

/**
 * Handle CORS preflight requests
 * 
 * @returns HTTP Response for OPTIONS request
 */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
      'Access-Control-Max-Age': '86400',
    },
  });
}
