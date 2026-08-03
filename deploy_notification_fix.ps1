# ==================================================================
# Deploy Notification System Fix
# ==================================================================
# This script applies the notification pipeline fix to your Supabase database
# ==================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔔 Deploying Notification System Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Or apply manually:" -ForegroundColor Yellow
    Write-Host "  1. Copy contents of APPLY_NOTIFICATION_FIX.sql" -ForegroundColor White
    Write-Host "  2. Go to Supabase Dashboard → SQL Editor" -ForegroundColor White
    Write-Host "  3. Paste and run the SQL" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Apply migration
Write-Host "Applying migration..." -ForegroundColor Yellow
Write-Host ""

Get-Content ".\APPLY_NOTIFICATION_FIX.sql" | supabase db query --linked

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Migration Applied Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 What was installed:" -ForegroundColor Cyan
    Write-Host "  1. ✅ Trigger: Auto-dispatch alerts → notifications" -ForegroundColor White
    Write-Host "  2. ✅ Cron Job: Process notification queue every 1 minute" -ForegroundColor White
    Write-Host "  3. ✅ Monitoring view: alert_notification_pipeline" -ForegroundColor White
    Write-Host "  4. ✅ Health check function: check_notification_system_health()" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  CRITICAL NEXT STEP:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Configure Supabase settings in Dashboard:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/settings/database" -ForegroundColor White
    Write-Host "  2. Scroll to 'Custom Postgres Configuration'" -ForegroundColor White
    Write-Host "  3. Add:" -ForegroundColor White
    Write-Host "     app.settings.supabase_url = https://ftywwrzkbtayapfiocck.supabase.co" -ForegroundColor Cyan
    Write-Host "     app.settings.service_role_key = YOUR_SERVICE_ROLE_KEY" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Get service_role_key from:" -ForegroundColor White
    Write-Host "  https://supabase.com/dashboard/project/ftywwrzkbtayapfiocck/settings/api" -ForegroundColor White
    Write-Host ""
    Write-Host "🧪 Test the system:" -ForegroundColor Cyan
    Write-Host "  See CONFIGURE_NOTIFICATION_SYSTEM.md for complete testing guide" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick health check:" -ForegroundColor Yellow
    Write-Host '  supabase db query --linked -c "SELECT * FROM check_notification_system_health();"' -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Migration Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please apply manually:" -ForegroundColor Yellow
    Write-Host "  1. Open Supabase Dashboard" -ForegroundColor White
    Write-Host "  2. Go to SQL Editor" -ForegroundColor White
    Write-Host "  3. Copy and paste contents of APPLY_NOTIFICATION_FIX.sql" -ForegroundColor White
    Write-Host "  4. Click 'Run'" -ForegroundColor White
    Write-Host ""
}
