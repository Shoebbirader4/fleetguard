# Deploy Email Fix Script
# This script deploys the fixed notification-processor with Resend support

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   FleetGuard Email Fix Deployment Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Resend API key is provided
$resendKey = Read-Host "Enter your Resend API key (starts with 're_')"

if ([string]::IsNullOrWhiteSpace($resendKey)) {
    Write-Host "❌ No API key provided. Please get one from https://resend.com" -ForegroundColor Red
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://resend.com/signup" -ForegroundColor Yellow
    Write-Host "  2. Sign up (free, no credit card needed)" -ForegroundColor Yellow
    Write-Host "  3. Dashboard → API Keys → Create API Key" -ForegroundColor Yellow
    Write-Host "  4. Copy the key and run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Resend API key received" -ForegroundColor Green
Write-Host ""

# Step 1: Set Resend API key in Supabase
Write-Host "📝 Step 1: Adding Resend API key to Supabase secrets..." -ForegroundColor Cyan
supabase secrets set RESEND_API_KEY="$resendKey" --project-ref ftywwrzkbtayapfiocck

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set Resend API key" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Resend API key added successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Backup current notification-processor
Write-Host "💾 Step 2: Backing up current notification-processor..." -ForegroundColor Cyan
$backupPath = "supabase\functions\notification-processor\index-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').ts"
Copy-Item "supabase\functions\notification-processor\index.ts" $backupPath -ErrorAction SilentlyContinue
Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green
Write-Host ""

# Step 3: Replace with Resend version
Write-Host "🔄 Step 3: Replacing with Resend-enabled version..." -ForegroundColor Cyan
Copy-Item "supabase\functions\notification-processor\index-resend.ts" "supabase\functions\notification-processor\index.ts" -Force
Write-Host "✅ Notification processor updated" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy to Supabase
Write-Host "🚀 Step 4: Deploying to Supabase..." -ForegroundColor Cyan
supabase functions deploy notification-processor --project-ref ftywwrzkbtayapfiocck

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Notification processor deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Retry the failed email
Write-Host "📧 Step 5: Retrying the failed email..." -ForegroundColor Cyan
Write-Host "Running SQL to reset the notification job..." -ForegroundColor Yellow

$sql = @"
UPDATE notification_jobs 
SET status = 'queued', 
    attempt = 0, 
    sent_at = NULL, 
    error_message = NULL,
    next_retry_at = NULL
WHERE id = '6851992b-bda3-4e2d-a277-886b32455ad7';
"@

supabase db query "$sql" --linked

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Could not reset notification job automatically" -ForegroundColor Yellow
    Write-Host "   Please run this SQL manually in Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host $sql -ForegroundColor White
} else {
    Write-Host "✅ Notification job reset to 'queued'" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "            🎉 DEPLOYMENT COMPLETE! 🎉" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. ⏰ Wait 1-2 minutes for the cron job to process the queue" -ForegroundColor White
Write-Host "  2. 📧 Check your email: shoebbirader@gmail.com" -ForegroundColor White
Write-Host "  3. 📁 Check spam folder if not in inbox" -ForegroundColor White
Write-Host ""
Write-Host "To verify email was sent, run this SQL:" -ForegroundColor Yellow
Write-Host "  SELECT status, sent_at, error_message FROM notification_jobs" -ForegroundColor White
Write-Host "  WHERE id = '6851992b-bda3-4e2d-a277-886b32455ad7';" -ForegroundColor White
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Yellow
Write-Host "  status: 'sent'" -ForegroundColor Green
Write-Host "  sent_at: <recent timestamp>" -ForegroundColor Green
Write-Host "  error_message: NULL" -ForegroundColor Green
Write-Host ""
Write-Host "If you have issues:" -ForegroundColor Yellow
Write-Host "  - Check Resend dashboard: https://resend.com/emails" -ForegroundColor White
Write-Host "  - Check Supabase function logs: Dashboard → Edge Functions → notification-processor → Logs" -ForegroundColor White
Write-Host ""
