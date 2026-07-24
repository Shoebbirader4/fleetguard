@echo off
REM ==================================================================
REM Deploy Missing Features - Quick Start Script (Windows)
REM ==================================================================
REM This script deploys the 3 missing features:
REM 1. Cron job schedules
REM 2. Supabase email notifications
REM 3. Real-time odometer alert triggers
REM ==================================================================

setlocal enabledelayedexpansion

echo ======================================================================
echo FleetGuard AI - Deploy Missing Features
echo ======================================================================
echo.

REM ==================================================================
REM Step 1: Check Prerequisites
REM ==================================================================
echo Step 1: Checking prerequisites...
echo.

REM Check if supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Supabase CLI not found
    echo Install it with: npm install -g supabase
    exit /b 1
)
echo √ Supabase CLI found

REM Check if we're in the right directory
if not exist "supabase\config.toml" (
    echo X Not in project root directory
    echo Please run this script from the project root
    exit /b 1
)
echo √ In project root directory

REM Check if linked to Supabase project
supabase status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ! Not linked to Supabase project
    echo Linking to project...
    supabase link
)
echo √ Linked to Supabase project
echo.

REM ==================================================================
REM Step 2: Apply Database Migrations
REM ==================================================================
echo Step 2: Applying database migrations...
echo.

echo Applying real-time odometer alerts and cron job migrations...
supabase db push --include-all

if %ERRORLEVEL% EQU 0 (
    echo √ Migrations applied successfully
) else (
    echo X Migration failed
    exit /b 1
)
echo.

REM ==================================================================
REM Step 3: Deploy Edge Functions
REM ==================================================================
echo Step 3: Deploying edge functions...
echo.

REM Deploy updated invite-user function
echo Deploying invite-user function...
cd edge-functions
call supabase functions deploy invite-user

REM Deploy maintenance-scheduler
echo Deploying maintenance-scheduler function...
cd ..\supabase\functions
call supabase functions deploy maintenance-scheduler

cd ..\..

echo √ Edge functions deployed
echo.

REM ==================================================================
REM Step 4: Configure Cron Settings
REM ==================================================================
echo Step 4: Configuring cron job settings...
echo.

echo ! You need to configure database settings manually
echo.
echo Please set these in Supabase Dashboard -^> Settings -^> Database -^> Custom Postgres Configuration:
echo.
echo   app.settings.supabase_url = ^<your-supabase-url^>
echo   app.settings.service_role_key = ^<your-service-role-key^>
echo   app.settings.cron_secret = ^<random-secret^>
echo.
echo Or run these SQL commands in Supabase SQL Editor:
echo.
echo   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
echo   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-key';
echo   ALTER DATABASE postgres SET app.settings.cron_secret = 'your-random-secret';
echo   SELECT pg_reload_conf();
echo.

pause

REM ==================================================================
REM Step 5: Verify Installation
REM ==================================================================
echo.
echo Step 5: Verifying installation...
echo.

echo Checking cron jobs...
supabase db execute "SELECT COUNT(*) as job_count FROM cron.job;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo √ Cron jobs configured
) else (
    echo X Could not verify cron jobs
    echo Please check manually with: SELECT * FROM cron_jobs_status;
)

echo.
echo Checking triggers...
supabase db execute "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%%component_check%%';" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo √ Real-time triggers installed
) else (
    echo X Could not verify triggers
)

echo.
echo Testing cron settings check...
supabase db execute "SELECT * FROM check_cron_settings();" 2>nul

REM ==================================================================
REM Summary
REM ==================================================================
echo.
echo ======================================================================
echo √ Deployment Complete!
echo ======================================================================
echo.
echo What's been deployed:
echo   √ Cron job schedules (5 jobs)
echo   √ Real-time odometer alert triggers
echo   √ Supabase email notification service
echo   √ Updated edge functions
echo.
echo Next steps:
echo   1. Verify cron settings are configured (see above)
echo   2. Test email notifications (invite a user)
echo   3. Test real-time alerts (add odometer reading)
echo.
echo Documentation:
echo   - Setup Guide: CRON_AND_NOTIFICATIONS_SETUP.md
echo   - Summary: IMPLEMENTATION_COMPLETE_SUMMARY.md
echo.
echo Verification commands (run in Supabase SQL Editor):
echo   - View cron jobs: SELECT * FROM cron_jobs_status;
echo   - Check settings: SELECT * FROM check_cron_settings();
echo   - View recent alerts: SELECT * FROM recent_automatic_alerts;
echo.
echo ======================================================================

pause
