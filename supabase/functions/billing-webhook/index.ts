import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function hex(buffer: ArrayBuffer) { return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }

async function verifySignature(payload: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return hex(digest) === signature.replace(/^sha256=/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': 'content-type, x-billing-provider, x-billing-event-id, x-billing-event-type, x-billing-signature' } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers });
  try {
    const provider = req.headers.get('x-billing-provider');
    const eventId = req.headers.get('x-billing-event-id');
    const eventType = req.headers.get('x-billing-event-type');
    const signature = req.headers.get('x-billing-signature');
    const secret = Deno.env.get('BILLING_WEBHOOK_SECRET');
    const payload = await req.text();
    if (!provider || !eventId || !eventType || !signature || !secret) return new Response(JSON.stringify({ error: 'Missing webhook metadata' }), { status: 400, headers });
    if (!await verifySignature(payload, signature, secret)) return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), { status: 401, headers });
    const payloadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await service.rpc('record_billing_webhook', { provider_name: provider, provider_event_id_value: eventId, event_type_value: eventType, payload_hash_value: hex(payloadHash) });
    if (error) throw error;
    return new Response(JSON.stringify({ received: true, duplicate: data === false, next_step: 'Map the verified provider event to the tenant subscription lifecycle.' }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook processing failed' }), { status: 500, headers });
  }
});
