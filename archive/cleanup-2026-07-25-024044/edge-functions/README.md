# Edge Functions - Supabase Serverless Functions

Deno-based Edge Functions for FleetGuard AI business logic and integrations.

## Functions Overview

### 1. alert-dispatcher
Routes alerts to appropriate notification channels (WhatsApp, SMS, Email, Push).

**Trigger**: Called when an alert is generated  
**Input**: `{ alert_id, user_ids[], channels[] }`  
**Output**: `{ delivery_status: { channel: status }[] }`

### 2. odometer-validator
Validates and flags anomalous odometer readings.

**Trigger**: Called when odometer reading is submitted  
**Input**: `{ vehicle_id, reading, timestamp, source }`  
**Output**: `{ valid: boolean, anomaly_flag: boolean, reason?: string }`

### 3. gps-processor
Processes GPS telemetry and updates vehicle state.

**Trigger**: Webhook from GPS device provider  
**Input**: `{ device_id, lat, lon, speed, timestamp, odometer }`  
**Output**: `{ updated: boolean }`

### 4. maintenance-scheduler
Generates due/overdue alerts based on schedules.

**Trigger**: Cron (daily at 2:00 AM)  
**Logic**: Calculate due dates/odometer for all components, create alerts

### 5. ai-assistant-handler
Processes photos/videos/voice for work orders using AI.

**Trigger**: Called when mechanic uploads media  
**Input**: `{ file_url, type: 'photo'|'video'|'voice', work_order_id }`  
**Output**: `{ component_type, damage_type, severity, description }`

### 6. subscription-enforcer
Enforces subscription limits and features.

**Trigger**: Before vehicle creation, feature access  
**Logic**: Check tenant vehicle count vs plan limit

## Development

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Docker (for local development)

### Local Development
```bash
# Start all functions locally
supabase functions serve

# Start specific function
supabase functions serve alert-dispatcher

# Test function
curl -X POST http://localhost:54321/functions/v1/alert-dispatcher \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "123"}'
```

### Environment Variables
Create `.env` file in this directory:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
WHATSAPP_ACCESS_TOKEN=your_token
TWILIO_ACCOUNT_SID=your_sid
# ... other credentials
```

## Deployment

### Deploy All Functions
```bash
supabase functions deploy
```

### Deploy Specific Function
```bash
supabase functions deploy alert-dispatcher
```

### Set Secrets
```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN=your_token
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set SENDGRID_API_KEY=your_key
```

## Function Structure

Each function follows this structure:
```
edge-functions/
├── alert-dispatcher/
│   ├── index.ts           # Main function handler
│   └── _shared/           # Shared utilities (symlink)
├── odometer-validator/
│   └── index.ts
└── _shared/               # Shared code for all functions
    ├── supabase.ts        # Supabase client
    ├── cors.ts            # CORS headers
    └── types.ts           # Type definitions
```

## Testing

```bash
# Unit tests (using Deno test)
deno test

# Integration tests
npm run test:integration
```

## CORS Configuration

All functions support CORS with the following configuration:
- Allow Origins: Web app URL, Mobile app URLs
- Allow Methods: GET, POST, PUT, DELETE, OPTIONS
- Allow Headers: authorization, content-type

## Error Handling

Functions return standardized error responses:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

HTTP Status Codes:
- 200: Success
- 400: Bad Request (validation error)
- 401: Unauthorized (authentication failed)
- 403: Forbidden (insufficient permissions)
- 500: Internal Server Error

## Monitoring

- View logs: `supabase functions logs alert-dispatcher`
- Monitor execution time and errors in Supabase dashboard
- Sentry integration for error tracking (optional)

## Rate Limiting

Rate limiting is implemented at the middleware level:
- 100 requests per minute per user
- 429 status code when limit exceeded

## Best Practices

1. Keep functions focused and single-purpose
2. Use shared utilities for common logic
3. Validate all inputs using Zod schemas
4. Log errors with context for debugging
5. Return appropriate HTTP status codes
6. Use environment variables for secrets
7. Test locally before deploying
8. Monitor function performance and errors
