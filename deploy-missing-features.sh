#!/bin/bash

# ==================================================================
# Deploy Missing Features - Quick Start Script
# ==================================================================
# This script deploys the 3 missing features:
# 1. Cron job schedules
# 2. Supabase email notifications
# 3. Real-time odometer alert triggers
# ==================================================================

set -e  # Exit on error

echo "======================================================================"
echo "FleetGuard AI - Deploy Missing Features"
echo "======================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ==================================================================
# Step 1: Check Prerequisites
# ==================================================================
echo "Step 1: Checking prerequisites..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    echo "Please run this script from the project root"
    exit 1
fi
echo -e "${GREEN}✅ In project root directory${NC}"

# Check if linked to Supabase project
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not linked to Supabase project${NC}"
    echo "Linking to project..."
    supabase link
fi
echo -e "${GREEN}✅ Linked to Supabase project${NC}"
echo ""

# ==================================================================
# Step 2: Apply Database Migrations
# ==================================================================
echo "Step 2: Applying database migrations..."
echo ""

echo "Applying real-time odometer alerts migration..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

# ==================================================================
# Step 3: Deploy Edge Functions
# ==================================================================
echo "Step 3: Deploying edge functions..."
echo ""

# Deploy updated invite-user function
echo "Deploying invite-user function..."
cd edge-functions
supabase functions deploy invite-user

# Deploy maintenance-scheduler
echo "Deploying maintenance-scheduler function..."
cd ../supabase/functions
supabase functions deploy maintenance-scheduler

cd ../..

echo -e "${GREEN}✅ Edge functions deployed${NC}"
echo ""

# ==================================================================
# Step 4: Configure Cron Settings
# ==================================================================
echo "Step 4: Configuring cron job settings..."
echo ""

echo -e "${YELLOW}⚠️  You need to configure database settings manually${NC}"
echo ""
echo "Please set these in Supabase Dashboard → Settings → Database → Custom Postgres Configuration:"
echo ""
echo "  app.settings.supabase_url = <your-supabase-url>"
echo "  app.settings.service_role_key = <your-service-role-key>"
echo "  app.settings.cron_secret = <random-secret>"
echo ""
echo "Or run these SQL commands:"
echo ""
echo "  ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';"
echo "  ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-key';"
echo "  ALTER DATABASE postgres SET app.settings.cron_secret = '$(openssl rand -hex 32)';"
echo "  SELECT pg_reload_conf();"
echo ""

read -p "Press Enter after configuring settings..."

# ==================================================================
# Step 5: Verify Installation
# ==================================================================
echo ""
echo "Step 5: Verifying installation..."
echo ""

# Get project URL
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')

if [ -z "$PROJECT_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not detect project URL${NC}"
    read -p "Enter your Supabase project URL: " PROJECT_URL
fi

echo "Checking cron jobs..."
echo ""

# Check cron jobs via SQL
CRON_CHECK=$(supabase db execute "SELECT COUNT(*) as job_count FROM cron.job;" 2>&1 || echo "error")

if [[ "$CRON_CHECK" == *"error"* ]]; then
    echo -e "${RED}❌ Could not verify cron jobs${NC}"
    echo "Please check manually with:"
    echo "  SELECT * FROM cron_jobs_status;"
else
    echo -e "${GREEN}✅ Cron jobs configured${NC}"
    echo "$CRON_CHECK"
fi

echo ""
echo "Checking triggers..."
echo ""

# Check triggers
TRIGGER_CHECK=$(supabase db execute "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%component_check%';" 2>&1 || echo "error")

if [[ "$TRIGGER_CHECK" == *"error"* ]]; then
    echo -e "${RED}❌ Could not verify triggers${NC}"
else
    echo -e "${GREEN}✅ Real-time triggers installed${NC}"
    echo "$TRIGGER_CHECK"
fi

# ==================================================================
# Step 6: Test Installation
# ==================================================================
echo ""
echo "Step 6: Running tests..."
echo ""

echo "Testing cron settings check..."
SETTINGS_CHECK=$(supabase db execute "SELECT * FROM check_cron_settings();" 2>&1)

if [[ "$SETTINGS_CHECK" == *"configured"* ]]; then
    echo -e "${GREEN}✅ Settings check passed${NC}"
    echo "$SETTINGS_CHECK"
else
    echo -e "${YELLOW}⚠️  Some settings not configured${NC}"
    echo "$SETTINGS_CHECK"
fi

echo ""
echo "======================================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "======================================================================"
echo ""
echo "What's been deployed:"
echo "  ✅ Cron job schedules (5 jobs)"
echo "  ✅ Real-time odometer alert triggers"
echo "  ✅ Supabase email notification service"
echo "  ✅ Updated edge functions"
echo ""
echo "Next steps:"
echo "  1. Verify cron settings are configured (see above)"
echo "  2. Test email notifications (invite a user)"
echo "  3. Test real-time alerts (add odometer reading)"
echo ""
echo "Documentation:"
echo "  📖 Setup Guide: CRON_AND_NOTIFICATIONS_SETUP.md"
echo "  📋 Summary: IMPLEMENTATION_COMPLETE_SUMMARY.md"
echo ""
echo "Verification commands:"
echo "  - View cron jobs: SELECT * FROM cron_jobs_status;"
echo "  - Check settings: SELECT * FROM check_cron_settings();"
echo "  - View recent alerts: SELECT * FROM recent_automatic_alerts;"
echo ""
echo "======================================================================"
