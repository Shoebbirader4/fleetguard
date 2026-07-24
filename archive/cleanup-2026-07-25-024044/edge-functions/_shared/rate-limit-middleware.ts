/**
 * Rate Limiting Middleware for Supabase Edge Functions
 * 
 * This module provides middleware to:
 * 1. Enforce rate limits per user (100 requests per minute)
 * 2. Log rate limit violations for security monitoring
 * 3. Return 429 status code when limit is exceeded
 * 
 * Satisfies Requirement 28.4: Rate limiting on API endpoints to prevent abuse
 * 
 * Implementation uses in-memory storage with Map for tracking request counts.
 * For production deployments across multiple Edge Function instances, consider
 * using Redis or Supabase Realtime for distributed rate limiting.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (request: Request, userId?: string) => string; // Custom key generator
  skipFailedRequests?: boolean; // Don't count failed requests
  handler?: (request: Request, userId: string | undefined, result: RateLimitResult) => Response; // Custom handler for rate limit exceeded
}

interface RateLimitInfo {
  count: number;
  resetTime: number; // Timestamp when the window resets
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Seconds until retry is allowed
}

// ============================================================================
// In-Memory Rate Limit Store
// ============================================================================

/**
 * In-memory store for rate limit tracking
 * Maps user IDs to their request counts and reset times
 */
class RateLimitStore {
  private store: Map<string, RateLimitInfo> = new Map();

  /**
   * Get current rate limit info for a key
   */
  get(key: string): RateLimitInfo | undefined {
    const info = this.store.get(key);
    
    // Clean up expired entries
    if (info && Date.now() > info.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    
    return info;
  }

  /**
   * Increment request count for a key
   */
  increment(key: string, windowMs: number): RateLimitInfo {
    const now = Date.now();
    const existing = this.get(key);

    if (existing) {
      // Increment existing counter
      existing.count++;
      this.store.set(key, existing);
      return existing;
    } else {
      // Create new entry
      const info: RateLimitInfo = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, info);
      return info;
    }
  }

  /**
   * Decrement request count (for skipFailedRequests feature)
   */
  decrement(key: string): void {
    const info = this.get(key);
    if (info && info.count > 0) {
      info.count--;
      this.store.set(key, info);
    }
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.store.entries()) {
      if (now > info.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

// Cleanup expired entries every minute
setInterval(() => {
  rateLimitStore.cleanup();
}, 60000);

// ============================================================================
// Rate Limit Key Generation
// ============================================================================

/**
 * Default key generator: uses user ID
 * For anonymous requests, falls back to IP address (if available)
 */
function defaultKeyGenerator(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address for anonymous requests
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `ip:${ip}`;
}

// ============================================================================
// Rate Limit Violation Logging
// ============================================================================

/**
 * Log rate limit violation to audit_logs table
 * This helps with security monitoring and identifying abuse patterns
 */
async function logRateLimitViolation(
  supabase: SupabaseClient,
  userId: string | undefined,
  request: Request,
  tenantId?: string
): Promise<void> {
  try {
    const url = new URL(request.url);
    const logEntry = {
      tenant_id: tenantId || null,
      user_id: userId || null,
      operation: 'rate_limit_violation',
      entity_type: 'edge_function',
      entity_id: url.pathname,
      changed_fields: {
        method: { old_value: null, new_value: request.method },
        path: { old_value: null, new_value: url.pathname },
        ip: { 
          old_value: null, 
          new_value: request.headers.get('x-forwarded-for') || 'unknown' 
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Use service role to insert into audit_logs (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await serviceClient
      .from('audit_logs')
      .insert([logEntry]);

    if (error) {
      console.error('[Rate Limit] Failed to log violation:', error);
    }
  } catch (error) {
    console.error('[Rate Limit] Exception while logging violation:', error);
  }
}

// ============================================================================
// Default Rate Limit Exceeded Handler
// ============================================================================

/**
 * Default response when rate limit is exceeded
 */
function defaultRateLimitHandler(
  request: Request,
  userId: string | undefined,
  result: RateLimitResult
): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        message: 'Too many requests. Please try again later.',
        limit: result.limit,
        retryAfter: retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

// ============================================================================
// Main Rate Limit Middleware Function
// ============================================================================

/**
 * Rate limiting middleware for Edge Functions
 * 
 * Default configuration: 100 requests per minute per user (Requirement 28.4)
 * 
 * Usage in Edge Function:
 * ```typescript
 * import { rateLimitMiddleware } from '../_shared/rate-limit-middleware.ts';
 * 
 * Deno.serve(async (req) => {
 *   // Extract user ID from JWT (or use auth middleware first)
 *   const userId = 'user-id-here';
 *   
 *   const rateLimitResult = await rateLimitMiddleware(req, { userId });
 *   
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.response;
 *   }
 *   
 *   // Proceed with function logic
 *   // ...
 *   
 *   // If request fails and you want to not count it:
 *   if (someError && config.skipFailedRequests) {
 *     rateLimitResult.decrementCount();
 *   }
 * });
 * ```
 * 
 * @param request - HTTP Request object
 * @param options - Rate limit configuration and user context
 * @returns Object with allowed flag and optional response
 */
export async function rateLimitMiddleware(
  request: Request,
  options: {
    userId?: string;
    tenantId?: string;
    config?: Partial<RateLimitConfig>;
  } = {}
): Promise<{
  allowed: boolean;
  response?: Response;
  decrementCount: () => void;
  rateLimitInfo: RateLimitResult;
}> {
  // Default configuration: 100 req/min per user (Requirement 28.4)
  const config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    keyGenerator: defaultKeyGenerator,
    skipFailedRequests: false,
    handler: defaultRateLimitHandler,
    ...options.config,
  };

  // Generate rate limit key
  const key = config.keyGenerator!(request, options.userId);

  // Increment counter and get current status
  const info = rateLimitStore.increment(key, config.windowMs);

  // Calculate rate limit info
  const rateLimitInfo: RateLimitResult = {
    allowed: info.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - info.count),
    resetTime: info.resetTime,
  };

  // Check if limit exceeded
  if (!rateLimitInfo.allowed) {
    rateLimitInfo.retryAfter = Math.ceil((info.resetTime - Date.now()) / 1000);

    // Log violation (only if Supabase is configured)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      await logRateLimitViolation(
        supabase,
        options.userId,
        request,
        options.tenantId
      );
    } else {
      // Log to console if Supabase not configured (e.g., in tests)
      console.warn(
        `[Rate Limit] Violation not logged - Supabase not configured. User: ${options.userId}, Path: ${new URL(request.url).pathname}`
      );
    }

    console.warn(
      `[Rate Limit] Limit exceeded for ${key}: ${info.count}/${config.maxRequests} requests`
    );

    // Return 429 response
    const response = config.handler!(request, options.userId, rateLimitInfo);

    return {
      allowed: false,
      response,
      decrementCount: () => rateLimitStore.decrement(key),
      rateLimitInfo,
    };
  }

  // Rate limit not exceeded - return headers for client awareness
  return {
    allowed: true,
    decrementCount: () => rateLimitStore.decrement(key),
    rateLimitInfo,
  };
}

// ============================================================================
// Helper: Add Rate Limit Headers to Response
// ============================================================================

/**
 * Add rate limit headers to an existing response
 * This provides clients with rate limit information even on successful requests
 * 
 * @param response - Original response
 * @param rateLimitInfo - Rate limit information
 * @returns Response with added headers
 */
export function addRateLimitHeaders(
  response: Response,
  rateLimitInfo: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Strict rate limit: 10 requests per minute (for sensitive operations)
 */
export const strictRateLimit: Partial<RateLimitConfig> = {
  maxRequests: 10,
  windowMs: 60000,
};

/**
 * Relaxed rate limit: 500 requests per minute (for read-heavy operations)
 */
export const relaxedRateLimit: Partial<RateLimitConfig> = {
  maxRequests: 500,
  windowMs: 60000,
};

/**
 * Default rate limit: 100 requests per minute (per Requirement 28.4)
 */
export const defaultRateLimit: Partial<RateLimitConfig> = {
  maxRequests: 100,
  windowMs: 60000,
};
