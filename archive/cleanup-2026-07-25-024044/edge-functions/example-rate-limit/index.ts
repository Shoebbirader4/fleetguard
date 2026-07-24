/**
 * Example Edge Function with Rate Limiting
 * 
 * This demonstrates how to use the rate limiting middleware in an Edge Function.
 * 
 * Features:
 * - Authentication using authMiddleware
 * - Rate limiting (100 req/min per user by default)
 * - Returns rate limit headers in response
 * - Logs rate limit violations
 * 
 * Task: 17.2 Implement rate limiting
 * Requirement: 28.4
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authMiddleware, corsPreflightResponse } from '../_shared/auth-middleware.ts';
import { rateLimitMiddleware, addRateLimitHeaders } from '../_shared/rate-limit-middleware.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Step 1: Authenticate the request
    const { authContext, supabase, error: authError } = await authMiddleware(req);

    if (authError) {
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Apply rate limiting
    const rateLimit = await rateLimitMiddleware(req, {
      userId: authContext!.userId,
      tenantId: authContext!.tenantId,
      // Optional: Use custom config
      // config: { maxRequests: 50, windowMs: 60000 }
    });

    // If rate limit exceeded, return 429 response
    if (!rateLimit.allowed) {
      return rateLimit.response!;
    }

    // Step 3: Process the request
    // Your business logic here
    const result = {
      message: 'Request successful!',
      user: authContext!.userId,
      tenant: authContext!.tenantId,
      timestamp: new Date().toISOString(),
    };

    // Step 4: Return response with rate limit headers
    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

    // Add rate limit information to response headers
    return addRateLimitHeaders(response, rateLimit.rateLimitInfo);
  } catch (error) {
    console.error('Error in example-rate-limit function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
