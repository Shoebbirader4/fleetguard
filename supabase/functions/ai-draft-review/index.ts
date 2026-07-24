/**
 * AI Draft Review Edge Function
 * 
 * Allows mechanics to review, edit, approve, or reject AI-generated maintenance drafts.
 * 
 * Requirements:
 * - 11.5: Allow mechanic to review and edit before saving
 * 
 * Endpoints:
 * 
 * GET /?draft_id=<uuid>
 *   - Retrieve a specific draft by ID
 * 
 * GET /?work_order_id=<uuid>
 *   - Retrieve all drafts for a work order
 * 
 * GET /?status=<draft|reviewed|approved|rejected>
 *   - Retrieve drafts by status (optional tenant filter)
 * 
 * PATCH /?draft_id=<uuid>
 *   - Update/edit a draft (review workflow)
 *   Body: {
 *     status?: 'reviewed' | 'approved' | 'rejected',
 *     edited_component_type?: string,
 *     edited_component_subtype?: string,
 *     edited_damage_type?: string,
 *     edited_severity?: 'minor' | 'moderate' | 'severe' | 'critical',
 *     edited_failure_category?: 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'body' | 'other',
 *     edited_description?: string,
 *     edited_recommended_actions?: string[],
 *     edited_estimated_labor_hours?: number,
 *     rejection_reason?: string
 *   }
 * 
 * DELETE /?draft_id=<uuid>
 *   - Delete a draft
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

type DraftStatus = 'draft' | 'reviewed' | 'approved' | 'rejected';
type Severity = 'minor' | 'moderate' | 'severe' | 'critical';
type FailureCategory = 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'body' | 'other';

interface DraftUpdateRequest {
  status?: DraftStatus;
  edited_component_type?: string;
  edited_component_subtype?: string;
  edited_damage_type?: string;
  edited_severity?: Severity;
  edited_failure_category?: FailureCategory;
  edited_description?: string;
  edited_recommended_actions?: string[];
  edited_estimated_labor_hours?: number;
  rejection_reason?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate draft update request
 */
function validateUpdateRequest(request: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (request.status && !['draft', 'reviewed', 'approved', 'rejected'].includes(request.status)) {
    errors.push('status must be one of: draft, reviewed, approved, rejected');
  }

  if (request.edited_severity && !['minor', 'moderate', 'severe', 'critical'].includes(request.edited_severity)) {
    errors.push('edited_severity must be one of: minor, moderate, severe, critical');
  }

  if (request.edited_failure_category && 
      !['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'body', 'other'].includes(request.edited_failure_category)) {
    errors.push('edited_failure_category must be one of: mechanical, electrical, hydraulic, pneumatic, body, other');
  }

  if (request.edited_estimated_labor_hours !== undefined) {
    if (typeof request.edited_estimated_labor_hours !== 'number' || request.edited_estimated_labor_hours <= 0) {
      errors.push('edited_estimated_labor_hours must be a positive number');
    }
  }

  if (request.edited_recommended_actions !== undefined && !Array.isArray(request.edited_recommended_actions)) {
    errors.push('edited_recommended_actions must be an array');
  }

  // If status is 'rejected', rejection_reason is required
  if (request.status === 'rejected' && !request.rejection_reason) {
    errors.push('rejection_reason is required when status is rejected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Get draft by ID
 */
async function getDraftById(
  supabase: SupabaseClient,
  tenantId: string,
  draftId: string
) {
  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', draftId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch draft: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  return data;
}

/**
 * Get drafts by work order ID
 */
async function getDraftsByWorkOrder(
  supabase: SupabaseClient,
  tenantId: string,
  workOrderId: string
) {
  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch drafts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get drafts by status
 */
async function getDraftsByStatus(
  supabase: SupabaseClient,
  tenantId: string,
  status: DraftStatus
) {
  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch drafts: ${error.message}`);
  }

  return data || [];
}

/**
 * Update draft
 */
async function updateDraft(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  draftId: string,
  updates: DraftUpdateRequest
) {
  // Prepare update object
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // If status is being changed to reviewed/approved/rejected, set review metadata
  if (updates.status && ['reviewed', 'approved', 'rejected'].includes(updates.status)) {
    updateData.reviewed_by = userId;
    updateData.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .update(updateData)
    .eq('tenant_id', tenantId)
    .eq('id', draftId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update draft: ${error.message}`);
  }

  return data;
}

/**
 * Delete draft
 */
async function deleteDraft(
  supabase: SupabaseClient,
  tenantId: string,
  draftId: string
) {
  const { error } = await supabase
    .from('ai_maintenance_drafts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', draftId);

  if (error) {
    throw new Error(`Failed to delete draft: ${error.message}`);
  }
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handle GET requests
 */
async function handleGet(
  supabase: SupabaseClient,
  tenantId: string,
  url: URL
) {
  const draftId = url.searchParams.get('draft_id');
  const workOrderId = url.searchParams.get('work_order_id');
  const status = url.searchParams.get('status') as DraftStatus | null;

  if (draftId) {
    console.log('[AI Draft Review] Fetching draft by ID:', draftId);
    const draft = await getDraftById(supabase, tenantId, draftId);
    return successResponse(draft);
  }

  if (workOrderId) {
    console.log('[AI Draft Review] Fetching drafts by work order:', workOrderId);
    const drafts = await getDraftsByWorkOrder(supabase, tenantId, workOrderId);
    return successResponse({ drafts, count: drafts.length });
  }

  if (status) {
    console.log('[AI Draft Review] Fetching drafts by status:', status);
    const drafts = await getDraftsByStatus(supabase, tenantId, status);
    return successResponse({ drafts, count: drafts.length });
  }

  // If no specific filter, return all drafts for tenant (limited to recent)
  console.log('[AI Draft Review] Fetching recent drafts');
  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch drafts: ${error.message}`);
  }

  return successResponse({ drafts: data || [], count: data?.length || 0 });
}

/**
 * Handle PATCH requests
 */
async function handlePatch(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  url: URL,
  body: DraftUpdateRequest
) {
  const draftId = url.searchParams.get('draft_id');

  if (!draftId) {
    return new Response(
      JSON.stringify({ error: 'draft_id parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('[AI Draft Review] Updating draft:', draftId);

  // Validate update request
  const validation = validateUpdateRequest(body);
  if (!validation.valid) {
    console.warn('[AI Draft Review] Validation failed:', validation.errors);
    return new Response(
      JSON.stringify({
        error: 'Invalid request',
        details: validation.errors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify draft exists
  const existingDraft = await getDraftById(supabase, tenantId, draftId);
  console.log('[AI Draft Review] Existing draft status:', existingDraft.status);

  // Update draft
  const updatedDraft = await updateDraft(supabase, tenantId, userId, draftId, body);

  console.log('[AI Draft Review] Draft updated successfully:', {
    id: updatedDraft.id,
    status: updatedDraft.status,
    reviewed_by: updatedDraft.reviewed_by,
  });

  return successResponse(updatedDraft);
}

/**
 * Handle DELETE requests
 */
async function handleDelete(
  supabase: SupabaseClient,
  tenantId: string,
  url: URL
) {
  const draftId = url.searchParams.get('draft_id');

  if (!draftId) {
    return new Response(
      JSON.stringify({ error: 'draft_id parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('[AI Draft Review] Deleting draft:', draftId);

  // Verify draft exists before deleting
  await getDraftById(supabase, tenantId, draftId);

  // Delete draft
  await deleteDraft(supabase, tenantId, draftId);

  console.log('[AI Draft Review] Draft deleted successfully');

  return successResponse({ message: 'Draft deleted successfully', draft_id: draftId });
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
      console.error('[AI Draft Review] Auth error:', authError);
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check permission (mechanics, engineers, managers can review drafts)
    const authResult = authorize(authContext!, 'work_orders:update');
    if (!authResult.authorized) {
      console.warn('[AI Draft Review] Authorization failed:', {
        userId: authContext!.userId,
        role: authContext!.role,
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Parse URL
    const url = new URL(req.url);

    // Step 4: Route based on HTTP method
    if (req.method === 'GET') {
      return await handleGet(supabase, authContext!.tenantId, url);
    }

    if (req.method === 'PATCH') {
      const body: DraftUpdateRequest = await req.json();
      return await handlePatch(supabase, authContext!.tenantId, authContext!.userId, url, body);
    }

    if (req.method === 'DELETE') {
      return await handleDelete(supabase, authContext!.tenantId, url);
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use GET, PATCH, or DELETE.` }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[AI Draft Review] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
