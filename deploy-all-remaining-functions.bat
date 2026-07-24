@echo off
REM ============================================================================
REM Deploy All Remaining Edge Functions
REM ============================================================================
REM This script deploys all edge functions that may not be deployed yet
REM Run this after: supabase login (or supabase link if already logged in)
REM ============================================================================

setlocal enabledelayedexpansion

echo ============================================================================
echo FleetGuard AI - Deploy All Remaining Functions
echo ============================================================================
echo.

REM Check if supabase CLI is available
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Supabase CLI not found
    echo Install it with: npm install -g supabase
    pause
    exit /b 1
)
echo [OK] Supabase CLI found
echo.

REM Check if we're in the right directory
if not exist "supabase\functions" (
    echo [ERROR] Not in project root directory
    echo Please run this script from the project root
    pause
    exit /b 1
)
echo [OK] In project root directory
echo.

REM Check if linked to Supabase project
supabase status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Not linked to Supabase project
    echo Run: supabase link
    pause
    exit /b 1
)
echo [OK] Linked to Supabase project
echo.

echo ============================================================================
echo Step 1: Listing currently deployed functions...
echo ============================================================================
echo.

supabase functions list

echo.
echo ============================================================================
echo Step 2: Deploying all functions from supabase/functions/
echo ============================================================================
echo.

cd supabase\functions

REM Core notification functions
echo.
echo [1/21] Deploying alert-dispatcher...
call supabase functions deploy alert-dispatcher --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] alert-dispatcher deployed) else (echo [WARN] alert-dispatcher deployment failed)

echo.
echo [2/21] Deploying notification-processor...
call supabase functions deploy notification-processor --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] notification-processor deployed) else (echo [WARN] notification-processor deployment failed)

echo.
echo [3/21] Deploying notification-worker...
call supabase functions deploy notification-worker --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] notification-worker deployed) else (echo [WARN] notification-worker deployment failed)

REM GPS and location
echo.
echo [4/21] Deploying gps-processor...
call supabase functions deploy gps-processor --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] gps-processor deployed) else (echo [WARN] gps-processor deployment failed)

REM ML functions
echo.
echo [5/21] Deploying ml-daily-predictions...
call supabase functions deploy ml-daily-predictions --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] ml-daily-predictions deployed) else (echo [WARN] ml-daily-predictions deployment failed)

echo.
echo [6/21] Deploying ml-weekly-training...
call supabase functions deploy ml-weekly-training --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] ml-weekly-training deployed) else (echo [WARN] ml-weekly-training deployment failed)

REM AI functions
echo.
echo [7/21] Deploying ai-assistant-handler...
call supabase functions deploy ai-assistant-handler --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] ai-assistant-handler deployed) else (echo [WARN] ai-assistant-handler deployment failed)

echo.
echo [8/21] Deploying ai-draft-review...
call supabase functions deploy ai-draft-review --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] ai-draft-review deployed) else (echo [WARN] ai-draft-review deployment failed)

REM Core functions (redeploy to ensure latest)
echo.
echo [9/21] Deploying audit-logs...
call supabase functions deploy audit-logs --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] audit-logs deployed) else (echo [WARN] audit-logs deployment failed)

echo.
echo [10/21] Deploying cost-reporting...
call supabase functions deploy cost-reporting --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] cost-reporting deployed) else (echo [WARN] cost-reporting deployment failed)

echo.
echo [11/21] Deploying document-expiry-checker...
call supabase functions deploy document-expiry-checker --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] document-expiry-checker deployed) else (echo [WARN] document-expiry-checker deployment failed)

echo.
echo [12/21] Deploying inspection-workflows...
call supabase functions deploy inspection-workflows --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] inspection-workflows deployed) else (echo [WARN] inspection-workflows deployment failed)

echo.
echo [13/21] Deploying maintenance-calendar...
call supabase functions deploy maintenance-calendar --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] maintenance-calendar deployed) else (echo [WARN] maintenance-calendar deployment failed)

echo.
echo [14/21] Deploying maintenance-scheduler...
call supabase functions deploy maintenance-scheduler --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] maintenance-scheduler deployed) else (echo [WARN] maintenance-scheduler deployment failed)

echo.
echo [15/21] Deploying odometer-validator...
call supabase functions deploy odometer-validator --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] odometer-validator deployed) else (echo [WARN] odometer-validator deployment failed)

echo.
echo [16/21] Deploying signup...
call supabase functions deploy signup --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] signup deployed) else (echo [WARN] signup deployment failed)

echo.
echo [17/21] Deploying subscription-enforcer...
call supabase functions deploy subscription-enforcer --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] subscription-enforcer deployed) else (echo [WARN] subscription-enforcer deployment failed)

echo.
echo [18/21] Deploying tire-replacement-forecast...
call supabase functions deploy tire-replacement-forecast --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] tire-replacement-forecast deployed) else (echo [WARN] tire-replacement-forecast deployment failed)

cd ..\..

REM Deploy from edge-functions directory (if they exist and are different)
echo.
echo ============================================================================
echo Step 3: Deploying functions from edge-functions/ (if any unique)
echo ============================================================================
echo.

cd edge-functions

echo.
echo [19/21] Deploying invite-user (updated with email)...
call supabase functions deploy invite-user --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] invite-user deployed) else (echo [WARN] invite-user deployment failed)

echo.
echo [20/21] Deploying accept-invitation...
call supabase functions deploy accept-invitation --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] accept-invitation deployed) else (echo [WARN] accept-invitation deployment failed)

echo.
echo [21/21] Deploying auth-security...
call supabase functions deploy auth-security --no-verify-jwt
if %ERRORLEVEL% EQU 0 (echo [OK] auth-security deployed) else (echo [WARN] auth-security deployment failed)

cd ..

echo.
echo ============================================================================
echo Step 4: Verifying deployment
echo ============================================================================
echo.

supabase functions list

echo.
echo ============================================================================
echo Deployment Complete!
echo ============================================================================
echo.
echo All functions have been deployed.
echo.
echo Next steps:
echo   1. Review the output above for any failed deployments
echo   2. Test critical functions (signup, invite-user, auth-security)
echo   3. Verify cron jobs are configured: supabase db execute "SELECT * FROM cron_jobs_status;"
echo   4. Check function logs for any errors: supabase functions logs ^<function-name^>
echo.
echo ============================================================================

pause
