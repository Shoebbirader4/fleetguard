# Document Expiry Checker Edge Function

## Overview

This Edge Function is a scheduled background job that runs daily to check document expiry dates and generate alerts for fleet operators.

## Requirements

- **Requirement 14.4**: Generate expiry warning alert when document expiry date is within 30 days
- **Requirement 14.5**: Generate expired document alert when a document expires

## Functionality

### Schedule
- Runs daily at **3:00 AM UTC**
- Configured via Supabase cron trigger

### Document Types Checked
- Insurance
- RC Book
- Fitness Certificate
- Pollution Certificate
- Invoice
- Warranty
- Service Report

### Alert Generation

#### Expiry Warning Alerts
- **Trigger**: Document expires within 30 days
- **Alert Type**: `document_expiry`
- **Severity**: `medium`
- **Title**: "Document Expiring Soon"
- **Description**: Includes document type, vehicle details, and expiry date
- **Deduplication**: Only creates one alert per document per 30-day period

#### Expired Document Alerts
- **Trigger**: Document has already expired (expiry date < today)
- **Alert Type**: `document_expired`
- **Severity**: `high`
- **Title**: "Document Expired"
- **Description**: Includes document type, vehicle details, and expiry date
- **Deduplication**: Only creates one alert per document since expiry date

### Response Format

```json
{
  "success": true,
  "expiry_warnings_created": 5,
  "expired_alerts_created": 2,
  "processed_at": "2025-01-15T03:00:00.000Z"
}
```

## Database Interactions

### Queries
1. Fetches documents with expiry dates within 30 days
2. Fetches documents with expiry dates in the past
3. Checks for existing alerts to prevent duplicates

### Alert Creation
- Inserts new alerts into the `alerts` table
- Uses service role to bypass RLS policies
- Links alerts to vehicles and includes document type in description

## Configuration

### Environment Variables
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (bypasses RLS)

### Deployment

Deploy using Supabase CLI:

```bash
# Deploy the function
supabase functions deploy document-expiry-checker

# Create a cron trigger (run daily at 3:00 AM UTC)
# This is done via Supabase Dashboard or pg_cron extension
```

### Setting Up Cron Trigger

You can set up the cron trigger in two ways:

#### Option 1: Via SQL (using pg_cron extension)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'document-expiry-checker',
  '0 3 * * *', -- Cron expression: At 3:00 AM every day
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-expiry-checker',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);
```

#### Option 2: Via Supabase Dashboard

1. Navigate to Database > Cron Jobs
2. Create a new cron job
3. Set schedule: `0 3 * * *`
4. Set SQL command to invoke the Edge Function

## Testing

### Manual Invocation

Test the function manually using curl:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-expiry-checker \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Expected Output

```json
{
  "success": true,
  "expiry_warnings_created": 5,
  "expired_alerts_created": 2,
  "processed_at": "2025-01-15T10:30:45.123Z"
}
```

### Test Data Setup

Create test documents with various expiry dates:

```sql
-- Insert test documents expiring in 15 days
INSERT INTO documents (tenant_id, vehicle_id, document_type, file_name, file_url, file_size, expiry_date, uploaded_by)
VALUES (
  'YOUR_TENANT_ID',
  'YOUR_VEHICLE_ID',
  'insurance',
  'test-insurance.pdf',
  'https://storage.supabase.co/test/insurance.pdf',
  1024000,
  CURRENT_DATE + INTERVAL '15 days',
  'YOUR_USER_ID'
);

-- Insert test documents expired 5 days ago
INSERT INTO documents (tenant_id, vehicle_id, document_type, file_name, file_url, file_size, expiry_date, uploaded_by)
VALUES (
  'YOUR_TENANT_ID',
  'YOUR_VEHICLE_ID',
  'fitness_certificate',
  'test-fitness.pdf',
  'https://storage.supabase.co/test/fitness.pdf',
  512000,
  CURRENT_DATE - INTERVAL '5 days',
  'YOUR_USER_ID'
);
```

## Monitoring

### Logs

View function logs in Supabase Dashboard:
1. Navigate to Edge Functions > document-expiry-checker
2. Click "Logs" tab
3. Monitor execution and any errors

### Key Log Messages

```
[Document Expiry Checker] Starting document expiry check...
[Document Expiry Checker] Found 10 documents expiring within 30 days
[Document Expiry Checker] Found 3 expired documents
[Document Expiry Checker] Created 7 expiry warning alerts
[Document Expiry Checker] Created 2 expired document alerts
[Document Expiry Checker] Document expiry check completed successfully
```

## Performance

- **Execution Time**: Typically < 5 seconds for 1000 documents
- **Database Queries**: 3 main queries (expiring docs, expired docs, alert checks)
- **Alert Deduplication**: Prevents duplicate alerts using smart checks
- **Scalability**: Can handle thousands of documents per tenant

## Error Handling

The function includes comprehensive error handling:
- Missing environment variables
- Database connection failures
- Query errors
- Alert creation failures
- Per-document error isolation (one failure doesn't stop entire batch)

All errors are logged and included in the response.

## Integration with Alert System

Once alerts are created, they are:
1. Visible in the web dashboard
2. Available in mobile apps
3. Eligible for multi-channel notifications (WhatsApp, SMS, Email, Push)
4. Processed by the alert-dispatcher Edge Function

## Related Components

- **Database**: `documents` and `alerts` tables
- **Edge Function**: `alert-dispatcher` (sends notifications)
- **Web Dashboard**: Alert management UI
- **Mobile Apps**: Alert viewing and acknowledgment
