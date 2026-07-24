/**
 * AI Assistant Handler Edge Function
 * 
 * Processes photos, videos, and voice notes to generate structured maintenance records
 * using computer vision, speech-to-text, and LLM APIs.
 * 
 * Requirements:
 * - 11.1: Accept photo uploads, video uploads, and voice note uploads from mechanics
 * - 11.2: Use computer vision to identify component type, damage type, and severity
 * - 11.3: Use speech-to-text to transcribe maintenance descriptions
 * - 11.4: Use LLM to generate structured maintenance records
 * - 11.5: Allow mechanic to review and edit before saving
 * - 11.6: Categorize failures into predefined categories
 * 
 * Input:
 * {
 *   work_order_id: UUID,
 *   file_type: 'photo' | 'video' | 'voice',
 *   file_urls: string[], // URLs to files in Supabase Storage
 *   context?: string // Optional: additional context from mechanic
 * }
 * 
 * Output:
 * {
 *   draft_id: UUID,
 *   work_order_id: UUID,
 *   ai_generated: {
 *     component_type: string,
 *     component_subtype?: string,
 *     damage_type: string,
 *     severity: 'minor' | 'moderate' | 'severe' | 'critical',
 *     failure_category: 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'body' | 'other',
 *     description: string,
 *     recommended_actions: string[],
 *     estimated_labor_hours?: number,
 *     confidence_score: number // 0-1
 *   },
 *   status: 'draft',
 *   created_at: string
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

type FileType = 'photo' | 'video' | 'voice';
type Severity = 'minor' | 'moderate' | 'severe' | 'critical';
type FailureCategory = 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'body' | 'other';

interface AIAssistantRequest {
  work_order_id: string;
  file_type: FileType;
  file_urls: string[];
  context?: string;
}

interface AIGeneratedData {
  component_type: string;
  component_subtype?: string;
  damage_type: string;
  severity: Severity;
  failure_category: FailureCategory;
  description: string;
  recommended_actions: string[];
  estimated_labor_hours?: number;
  confidence_score: number;
}

interface AIAssistantResponse {
  draft_id: string;
  work_order_id: string;
  ai_generated: AIGeneratedData;
  status: 'draft';
  created_at: string;
}

interface WorkOrder {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  status: string;
}

interface VisionAnalysisResult {
  component_type: string;
  component_subtype?: string;
  damage_type: string;
  severity: Severity;
  damage_description: string;
  confidence: number;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
}

interface LLMStructuredOutput {
  component_type: string;
  component_subtype?: string;
  damage_type: string;
  severity: Severity;
  failure_category: FailureCategory;
  description: string;
  recommended_actions: string[];
  estimated_labor_hours?: number;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate request payload
 */
function validateRequest(request: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.work_order_id || typeof request.work_order_id !== 'string') {
    errors.push('work_order_id is required and must be a string');
  }

  if (!request.file_type || !['photo', 'video', 'voice'].includes(request.file_type)) {
    errors.push('file_type must be one of: photo, video, voice');
  }

  if (!Array.isArray(request.file_urls) || request.file_urls.length === 0) {
    errors.push('file_urls must be a non-empty array');
  }

  if (request.file_urls && !request.file_urls.every((url: any) => typeof url === 'string')) {
    errors.push('all file_urls must be strings');
  }

  if (request.context !== undefined && typeof request.context !== 'string') {
    errors.push('context (if provided) must be a string');
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
 * Get work order details
 */
async function getWorkOrder(
  supabase: SupabaseClient,
  tenantId: string,
  workOrderId: string
): Promise<WorkOrder> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, tenant_id, vehicle_id, status')
    .eq('tenant_id', tenantId)
    .eq('id', workOrderId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch work order: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Work order not found: ${workOrderId}`);
  }

  return data;
}

/**
 * Create AI-generated draft maintenance record
 */
async function createDraftRecord(
  supabase: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  aiData: AIGeneratedData,
  fileUrls: string[],
  fileType: FileType
): Promise<string> {
  const { data, error } = await supabase
    .from('ai_maintenance_drafts')
    .insert({
      tenant_id: tenantId,
      work_order_id: workOrderId,
      file_type: fileType,
      file_urls: fileUrls,
      component_type: aiData.component_type,
      component_subtype: aiData.component_subtype,
      damage_type: aiData.damage_type,
      severity: aiData.severity,
      failure_category: aiData.failure_category,
      description: aiData.description,
      recommended_actions: aiData.recommended_actions,
      estimated_labor_hours: aiData.estimated_labor_hours,
      confidence_score: aiData.confidence_score,
      status: 'draft',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create draft record: ${error.message}`);
  }

  return data.id;
}

// ============================================================================
// AI Service Integration Functions
// ============================================================================

/**
 * Call Computer Vision API for photo/video analysis
 * 
 * This uses a computer vision API (e.g., OpenAI Vision, Google Cloud Vision, AWS Rekognition)
 * to analyze images/videos and identify vehicle components and damage.
 */
async function analyzeImageWithVision(
  fileUrls: string[],
  context?: string
): Promise<VisionAnalysisResult> {
  const visionApiUrl = Deno.env.get('VISION_API_URL');
  const visionApiKey = Deno.env.get('VISION_API_KEY');

  if (!visionApiUrl || !visionApiKey) {
    console.warn('[AI Assistant] Vision API not configured, using mock response');
    // Return mock data for development/testing
    return {
      component_type: 'brake',
      component_subtype: 'brake_pad',
      damage_type: 'excessive_wear',
      severity: 'moderate',
      damage_description: 'Brake pad shows significant wear with visible scoring on the surface.',
      confidence: 0.85,
    };
  }

  try {
    console.log('[AI Assistant] Analyzing images with Vision API:', fileUrls);

    // Call vision API (example format - adjust based on actual API)
    const response = await fetch(visionApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${visionApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: fileUrls,
        context: context || 'Vehicle maintenance inspection',
        task: 'component_damage_analysis',
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status} - ${await response.text()}`);
    }

    const result = await response.json();

    // Parse response (format depends on API)
    return {
      component_type: result.component_type || 'unknown',
      component_subtype: result.component_subtype,
      damage_type: result.damage_type || 'unspecified_damage',
      severity: (result.severity as Severity) || 'moderate',
      damage_description: result.description || '',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('[AI Assistant] Vision API error:', error);
    // Fallback to mock response on error
    return {
      component_type: 'unknown',
      damage_type: 'inspection_required',
      severity: 'moderate',
      damage_description: 'Manual inspection required - automated analysis unavailable.',
      confidence: 0.3,
    };
  }
}

/**
 * Call Speech-to-Text API for voice transcription
 * 
 * This uses a speech recognition API (e.g., OpenAI Whisper, Google Speech-to-Text, AWS Transcribe)
 * to transcribe voice notes from mechanics.
 */
async function transcribeAudio(
  fileUrls: string[]
): Promise<TranscriptionResult> {
  const speechApiUrl = Deno.env.get('SPEECH_API_URL');
  const speechApiKey = Deno.env.get('SPEECH_API_KEY');

  if (!speechApiUrl || !speechApiKey) {
    console.warn('[AI Assistant] Speech API not configured, using mock response');
    // Return mock data for development/testing
    return {
      text: 'Front brake pads are worn down to about 30% and need replacement soon. The rotor has some scoring but is still serviceable. Recommend replacing pads and monitoring rotor condition.',
      confidence: 0.92,
    };
  }

  try {
    console.log('[AI Assistant] Transcribing audio with Speech API:', fileUrls);

    // Call speech-to-text API (example format - adjust based on actual API)
    const response = await fetch(speechApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${speechApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_urls: fileUrls,
        language: 'en-US',
        model: 'latest',
      }),
    });

    if (!response.ok) {
      throw new Error(`Speech API error: ${response.status} - ${await response.text()}`);
    }

    const result = await response.json();

    return {
      text: result.transcription || '',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('[AI Assistant] Speech API error:', error);
    // Return empty transcription on error
    return {
      text: '',
      confidence: 0.0,
    };
  }
}

/**
 * Call LLM API to generate structured maintenance record
 * 
 * This uses an LLM (e.g., OpenAI GPT-4, Anthropic Claude, Google Gemini)
 * to combine vision analysis, transcription, and context into a structured output.
 */
async function generateStructuredOutput(
  fileType: FileType,
  visionAnalysis?: VisionAnalysisResult,
  transcription?: TranscriptionResult,
  context?: string
): Promise<LLMStructuredOutput> {
  const llmApiUrl = Deno.env.get('LLM_API_URL');
  const llmApiKey = Deno.env.get('LLM_API_KEY');

  if (!llmApiUrl || !llmApiKey) {
    console.warn('[AI Assistant] LLM API not configured, using mock response');
    
    // Generate mock structured output based on available data
    const mockOutput: LLMStructuredOutput = {
      component_type: visionAnalysis?.component_type || 'brake',
      component_subtype: visionAnalysis?.component_subtype || 'brake_pad',
      damage_type: visionAnalysis?.damage_type || 'wear',
      severity: visionAnalysis?.severity || 'moderate',
      failure_category: 'mechanical',
      description: transcription?.text || visionAnalysis?.damage_description || 
        'Component inspection reveals maintenance requirement. Detailed assessment needed.',
      recommended_actions: [
        'Replace worn component',
        'Inspect related systems',
        'Test after replacement',
      ],
      estimated_labor_hours: 2.5,
    };

    return mockOutput;
  }

  try {
    console.log('[AI Assistant] Generating structured output with LLM');

    // Construct prompt for LLM
    const prompt = buildLLMPrompt(fileType, visionAnalysis, transcription, context);

    // Call LLM API (example format for OpenAI - adjust based on actual API)
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llmApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert vehicle maintenance assistant. Generate structured maintenance records from inspection data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} - ${await response.text()}`);
    }

    const result = await response.json();
    const parsedOutput = JSON.parse(result.choices[0].message.content);

    return {
      component_type: parsedOutput.component_type || 'unknown',
      component_subtype: parsedOutput.component_subtype,
      damage_type: parsedOutput.damage_type || 'unspecified',
      severity: (parsedOutput.severity as Severity) || 'moderate',
      failure_category: (parsedOutput.failure_category as FailureCategory) || 'other',
      description: parsedOutput.description || '',
      recommended_actions: parsedOutput.recommended_actions || [],
      estimated_labor_hours: parsedOutput.estimated_labor_hours,
    };
  } catch (error) {
    console.error('[AI Assistant] LLM API error:', error);
    
    // Fallback to simple structured output
    return {
      component_type: visionAnalysis?.component_type || 'unknown',
      damage_type: visionAnalysis?.damage_type || 'inspection_required',
      severity: visionAnalysis?.severity || 'moderate',
      failure_category: 'other',
      description: transcription?.text || 'Automated analysis unavailable. Manual review required.',
      recommended_actions: ['Manual inspection required'],
    };
  }
}

/**
 * Build LLM prompt from available data
 */
function buildLLMPrompt(
  fileType: FileType,
  visionAnalysis?: VisionAnalysisResult,
  transcription?: TranscriptionResult,
  context?: string
): string {
  let prompt = 'Generate a structured maintenance record from the following inspection data:\n\n';

  if (fileType === 'photo' || fileType === 'video') {
    prompt += '## Visual Analysis:\n';
    if (visionAnalysis) {
      prompt += `- Component: ${visionAnalysis.component_type}${visionAnalysis.component_subtype ? ` (${visionAnalysis.component_subtype})` : ''}\n`;
      prompt += `- Damage Type: ${visionAnalysis.damage_type}\n`;
      prompt += `- Severity: ${visionAnalysis.severity}\n`;
      prompt += `- Description: ${visionAnalysis.damage_description}\n`;
      prompt += `- Confidence: ${(visionAnalysis.confidence * 100).toFixed(1)}%\n`;
    }
    prompt += '\n';
  }

  if (fileType === 'voice' && transcription) {
    prompt += '## Voice Transcription:\n';
    prompt += transcription.text + '\n';
    prompt += `(Confidence: ${(transcription.confidence * 100).toFixed(1)}%)\n\n`;
  }

  if (context) {
    prompt += '## Additional Context:\n';
    prompt += context + '\n\n';
  }

  prompt += '## Required Output Format (JSON):\n';
  prompt += JSON.stringify({
    component_type: 'string (e.g., "tire", "brake", "engine", "oil", "filter", "battery")',
    component_subtype: 'string (optional, e.g., "front_left_tire", "brake_pad")',
    damage_type: 'string (e.g., "wear", "crack", "leak", "corrosion", "malfunction")',
    severity: 'string (one of: "minor", "moderate", "severe", "critical")',
    failure_category: 'string (one of: "mechanical", "electrical", "hydraulic", "pneumatic", "body", "other")',
    description: 'string (detailed description in 2-3 sentences)',
    recommended_actions: 'array of strings (3-5 recommended actions)',
    estimated_labor_hours: 'number (optional, estimated hours to complete repair)',
  }, null, 2);

  return prompt;
}

/**
 * Calculate overall confidence score
 */
function calculateConfidence(
  visionAnalysis?: VisionAnalysisResult,
  transcription?: TranscriptionResult
): number {
  const scores: number[] = [];

  if (visionAnalysis) {
    scores.push(visionAnalysis.confidence);
  }

  if (transcription) {
    scores.push(transcription.confidence);
  }

  if (scores.length === 0) return 0.5;

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Process files and generate AI maintenance record
 */
async function processAIAssistant(
  request: AIAssistantRequest
): Promise<AIGeneratedData> {
  console.log('[AI Assistant] Processing request:', {
    work_order_id: request.work_order_id,
    file_type: request.file_type,
    file_count: request.file_urls.length,
  });

  let visionAnalysis: VisionAnalysisResult | undefined;
  let transcription: TranscriptionResult | undefined;

  // Step 1: Process files based on type
  if (request.file_type === 'photo' || request.file_type === 'video') {
    console.log('[AI Assistant] Analyzing images/video with computer vision');
    visionAnalysis = await analyzeImageWithVision(request.file_urls, request.context);
    console.log('[AI Assistant] Vision analysis complete:', {
      component: visionAnalysis.component_type,
      damage: visionAnalysis.damage_type,
      severity: visionAnalysis.severity,
      confidence: visionAnalysis.confidence,
    });
  }

  if (request.file_type === 'voice') {
    console.log('[AI Assistant] Transcribing voice notes');
    transcription = await transcribeAudio(request.file_urls);
    console.log('[AI Assistant] Transcription complete:', {
      length: transcription.text.length,
      confidence: transcription.confidence,
    });
  }

  // Step 2: Generate structured output with LLM
  console.log('[AI Assistant] Generating structured maintenance record');
  const structuredOutput = await generateStructuredOutput(
    request.file_type,
    visionAnalysis,
    transcription,
    request.context
  );

  // Step 3: Calculate overall confidence
  const confidenceScore = calculateConfidence(visionAnalysis, transcription);

  console.log('[AI Assistant] Structured output generated:', {
    component: structuredOutput.component_type,
    failure_category: structuredOutput.failure_category,
    severity: structuredOutput.severity,
    confidence: confidenceScore,
  });

  return {
    ...structuredOutput,
    confidence_score: confidenceScore,
  };
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
      console.error('[AI Assistant] Auth error:', authError);
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check permission (mechanics, engineers, managers can use AI assistant)
    const authResult = authorize(authContext!, 'work_orders:update');
    if (!authResult.authorized) {
      console.warn('[AI Assistant] Authorization failed:', {
        userId: authContext!.userId,
        role: authContext!.role,
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Validate HTTP method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Parse and validate request body
    const body: AIAssistantRequest = await req.json();

    const validation = validateRequest(body);
    if (!validation.valid) {
      console.warn('[AI Assistant] Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: validation.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI Assistant] Request validated successfully');

    // Step 5: Verify work order exists and belongs to tenant
    const workOrder = await getWorkOrder(
      supabase,
      authContext!.tenantId,
      body.work_order_id
    );

    console.log('[AI Assistant] Work order verified:', {
      id: workOrder.id,
      vehicle_id: workOrder.vehicle_id,
      status: workOrder.status,
    });

    // Step 6: Process files with AI services
    const aiData = await processAIAssistant(body);

    // Step 7: Create draft maintenance record
    const draftId = await createDraftRecord(
      supabase,
      authContext!.tenantId,
      workOrder.id,
      aiData,
      body.file_urls,
      body.file_type
    );

    console.log('[AI Assistant] Draft record created:', draftId);

    // Step 8: Return response
    const response: AIAssistantResponse = {
      draft_id: draftId,
      work_order_id: workOrder.id,
      ai_generated: aiData,
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    return successResponse(response, 201);
  } catch (err) {
    console.error('[AI Assistant] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
