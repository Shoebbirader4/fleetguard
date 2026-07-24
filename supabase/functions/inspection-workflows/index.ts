/**
 * Inspection Workflows Edge Function
 * 
 * Handles inspection checklist loading and submission workflows:
 * - Load checklists by vehicle type
 * - Submit inspection results with validation
 * - Calculate overall inspection status
 * - Validate non-compliant item requirements
 * 
 * Requirements: 20.4, 20.5, 20.6
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ChecklistItem {
  id: string;
  item_name: string;
  item_type: 'yes_no' | 'pass_fail' | 'numeric' | 'text' | 'photo';
  is_required: boolean;
  is_critical?: boolean; // Critical items cause fail if non-compliant
  default_value?: any;
  options?: any;
}

interface ChecklistResult {
  item_id: string;
  result: any; // yes/no, pass/fail, numeric value, text, etc.
  notes?: string;
  photo_urls?: string[];
}

interface SubmitInspectionRequest {
  vehicle_id: string;
  checklist_id: string;
  odometer_reading: number;
  checklist_results: ChecklistResult[];
  notes?: string;
}

interface InspectionStatusCalculation {
  overall_status: 'pass' | 'fail' | 'warning';
  defects_reported: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Route: GET /load-checklist?vehicle_id={id}
    if (req.method === 'GET' && path === 'load-checklist') {
      const vehicleId = url.searchParams.get('vehicle_id');
      
      if (!vehicleId) {
        return new Response(
          JSON.stringify({ error: 'vehicle_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get vehicle to determine vehicle_type
      const { data: vehicle, error: vehicleError } = await supabaseClient
        .from('vehicles')
        .select('vehicle_type, tenant_id')
        .eq('id', vehicleId)
        .single();

      if (vehicleError || !vehicle) {
        return new Response(
          JSON.stringify({ error: 'Vehicle not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Load active checklist for vehicle type
      // Priority: 1) specific vehicle type, 2) 'all' type
      const { data: checklists, error: checklistError } = await supabaseClient
        .from('inspection_checklists')
        .select('*')
        .eq('tenant_id', vehicle.tenant_id)
        .eq('is_active', true)
        .or(`vehicle_type.eq.${vehicle.vehicle_type},vehicle_type.eq.all`)
        .order('vehicle_type', { ascending: false }) // Specific type first
        .limit(1);

      if (checklistError) {
        throw checklistError;
      }

      if (!checklists || checklists.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No active checklist found for this vehicle type' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const checklist = checklists[0];

      return new Response(
        JSON.stringify({
          success: true,
          checklist: {
            id: checklist.id,
            checklist_name: checklist.checklist_name,
            description: checklist.description,
            vehicle_type: checklist.vehicle_type,
            checklist_items: checklist.checklist_items,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /submit-inspection
    if (req.method === 'POST' && path === 'submit-inspection') {
      const body: SubmitInspectionRequest = await req.json();

      // Validate required fields
      if (!body.vehicle_id || !body.checklist_id || !body.odometer_reading || !body.checklist_results) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: vehicle_id, checklist_id, odometer_reading, checklist_results' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get checklist to validate results
      const { data: checklist, error: checklistError } = await supabaseClient
        .from('inspection_checklists')
        .select('*')
        .eq('id', body.checklist_id)
        .single();

      if (checklistError || !checklist) {
        return new Response(
          JSON.stringify({ error: 'Checklist not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate and calculate overall status
      const checklistItems = checklist.checklist_items as ChecklistItem[];
      const calculation = calculateInspectionStatus(checklistItems, body.checklist_results);

      if (calculation.errors.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            validation_errors: calculation.errors 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert inspection record
      const { data: inspection, error: insertError } = await supabaseClient
        .from('inspections')
        .insert({
          vehicle_id: body.vehicle_id,
          inspector_id: user.id,
          checklist_id: body.checklist_id,
          inspection_date: new Date().toISOString(),
          odometer_reading: body.odometer_reading,
          overall_status: calculation.overall_status,
          checklist_results: body.checklist_results,
          defects_reported: calculation.defects_reported,
          notes: body.notes,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // If inspection failed or has warnings, create alert
      if (calculation.overall_status === 'fail' || calculation.overall_status === 'warning') {
        const severity = calculation.overall_status === 'fail' ? 'high' : 'medium';
        const defectText = calculation.defects_reported === 1 ? 'defect' : 'defects';
        
        await supabaseClient
          .from('alerts')
          .insert({
            vehicle_id: body.vehicle_id,
            alert_type: 'safety_risk',
            severity: severity,
            title: `Vehicle Inspection ${calculation.overall_status === 'fail' ? 'Failed' : 'Warning'}`,
            description: `Vehicle inspection completed with ${calculation.overall_status} status. ${calculation.defects_reported} ${defectText} reported.`,
            status: 'active',
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          inspection: {
            id: inspection.id,
            overall_status: inspection.overall_status,
            defects_reported: inspection.defects_reported,
          },
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /calculate-status (for preview before submission)
    if (req.method === 'POST' && path === 'calculate-status') {
      const body = await req.json();

      if (!body.checklist_id || !body.checklist_results) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: checklist_id, checklist_results' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get checklist
      const { data: checklist, error: checklistError } = await supabaseClient
        .from('inspection_checklists')
        .select('*')
        .eq('id', body.checklist_id)
        .single();

      if (checklistError || !checklist) {
        return new Response(
          JSON.stringify({ error: 'Checklist not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const checklistItems = checklist.checklist_items as ChecklistItem[];
      const calculation = calculateInspectionStatus(checklistItems, body.checklist_results);

      return new Response(
        JSON.stringify({
          overall_status: calculation.overall_status,
          defects_reported: calculation.defects_reported,
          validation_errors: calculation.errors,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Calculate overall inspection status based on checklist results
 * Requirements: 20.5, 20.6
 */
function calculateInspectionStatus(
  checklistItems: ChecklistItem[],
  results: ChecklistResult[]
): InspectionStatusCalculation {
  const errors: string[] = [];
  let defectsReported = 0;
  let hasCriticalFailure = false;
  let hasWarning = false;

  // Create map for quick lookup
  const resultMap = new Map(results.map(r => [r.item_id, r]));

  for (const item of checklistItems) {
    const result = resultMap.get(item.id);

    // Check if required item is missing
    if (item.is_required && !result) {
      errors.push(`Required item "${item.item_name}" is missing`);
      continue;
    }

    if (!result) {
      continue; // Optional item not filled
    }

    // Determine if item is non-compliant
    const isNonCompliant = isItemNonCompliant(item, result);

    if (isNonCompliant) {
      defectsReported++;

      // Validate that non-compliant items have description
      // Requirement 20.6: require description and optional photo for non-compliant items
      if (!result.notes || result.notes.trim() === '') {
        errors.push(`Non-compliant item "${item.item_name}" requires a description`);
      }

      // Check if this is a critical failure
      if (item.is_critical) {
        hasCriticalFailure = true;
      } else {
        hasWarning = true;
      }
    }
  }

  // Determine overall status
  // Logic: pass if all pass, fail if any critical fail, warning otherwise
  let overall_status: 'pass' | 'fail' | 'warning' = 'pass';
  
  if (hasCriticalFailure) {
    overall_status = 'fail';
  } else if (hasWarning || defectsReported > 0) {
    overall_status = 'warning';
  }

  return {
    overall_status,
    defects_reported: defectsReported,
    errors,
  };
}

/**
 * Determine if a checklist item result is non-compliant
 * Requirement 20.5: Mark checklist items as compliant or non-compliant based on responses
 */
function isItemNonCompliant(item: ChecklistItem, result: ChecklistResult): boolean {
  switch (item.item_type) {
    case 'yes_no':
      // "No" indicates non-compliance
      return result.result === 'no' || result.result === false;
    
    case 'pass_fail':
      // "Fail" indicates non-compliance
      return result.result === 'fail' || result.result === false;
    
    case 'numeric':
      // For numeric measurements, could have threshold checks
      // For now, we assume any numeric value is compliant unless explicitly marked
      return false;
    
    case 'text':
      // Text notes are informational, not compliance checks
      return false;
    
    case 'photo':
      // Photo required items are non-compliant if no photo provided
      return !result.photo_urls || result.photo_urls.length === 0;
    
    default:
      return false;
  }
}
