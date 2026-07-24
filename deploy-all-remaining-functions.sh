#!/bin/bash
# ============================================================================
# Deploy All Remaining Edge Functions
# ============================================================================
# This script deploys all edge functions that may not be deployed yet
# Run this after: supabase login (or supabase link if already logged in)
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "FleetGuard AI - Deploy All Remaining Functions"
echo "============================================================================"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Supabase CLI not found"
    echo "Install it with: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Supabase CLI found"
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions" ]; then
    echo -e "${RED}[ERROR]${NC} Not in project root directory"
    echo "Please run this script from the project root"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} In project root directory"
echo ""

# Check if linked to Supabase project
if ! supabase status &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Not linked to Supabase project"
    echo "Run: supabase link"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Linked to Supabase project"
echo ""

echo "============================================================================"
echo "Step 1: Listing currently deployed functions..."
echo "============================================================================"
echo ""

supabase functions list

echo ""
echo "============================================================================"
echo "Step 2: Deploying all functions from supabase/functions/"
echo "============================================================================"
echo ""

cd supabase/functions

# Core notification functions
echo ""
echo "[1/21] Deploying alert-dispatcher..."
if supabase functions deploy alert-dispatcher --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} alert-dispatcher deployed"
else
    echo -e "${YELLOW}[WARN]${NC} alert-dispatcher deployment failed"
fi

echo ""
echo "[2/21] Deploying notification-processor..."
if supabase functions deploy notification-processor --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} notification-processor deployed"
else
    echo -e "${YELLOW}[WARN]${NC} notification-processor deployment failed"
fi

echo ""
echo "[3/21] Deploying notification-worker..."
if supabase functions deploy notification-worker --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} notification-worker deployed"
else
    echo -e "${YELLOW}[WARN]${NC} notification-worker deployment failed"
fi

# GPS and location
echo ""
echo "[4/21] Deploying gps-processor..."
if supabase functions deploy gps-processor --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} gps-processor deployed"
else
    echo -e "${YELLOW}[WARN]${NC} gps-processor deployment failed"
fi

# ML functions
echo ""
echo "[5/21] Deploying ml-daily-predictions..."
if supabase functions deploy ml-daily-predictions --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} ml-daily-predictions deployed"
else
    echo -e "${YELLOW}[WARN]${NC} ml-daily-predictions deployment failed"
fi

echo ""
echo "[6/21] Deploying ml-weekly-training..."
if supabase functions deploy ml-weekly-training --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} ml-weekly-training deployed"
else
    echo -e "${YELLOW}[WARN]${NC} ml-weekly-training deployment failed"
fi

# AI functions
echo ""
echo "[7/21] Deploying ai-assistant-handler..."
if supabase functions deploy ai-assistant-handler --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} ai-assistant-handler deployed"
else
    echo -e "${YELLOW}[WARN]${NC} ai-assistant-handler deployment failed"
fi

echo ""
echo "[8/21] Deploying ai-draft-review..."
if supabase functions deploy ai-draft-review --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} ai-draft-review deployed"
else
    echo -e "${YELLOW}[WARN]${NC} ai-draft-review deployment failed"
fi

# Core functions (redeploy to ensure latest)
echo ""
echo "[9/21] Deploying audit-logs..."
if supabase functions deploy audit-logs --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} audit-logs deployed"
else
    echo -e "${YELLOW}[WARN]${NC} audit-logs deployment failed"
fi

echo ""
echo "[10/21] Deploying cost-reporting..."
if supabase functions deploy cost-reporting --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} cost-reporting deployed"
else
    echo -e "${YELLOW}[WARN]${NC} cost-reporting deployment failed"
fi

echo ""
echo "[11/21] Deploying document-expiry-checker..."
if supabase functions deploy document-expiry-checker --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} document-expiry-checker deployed"
else
    echo -e "${YELLOW}[WARN]${NC} document-expiry-checker deployment failed"
fi

echo ""
echo "[12/21] Deploying inspection-workflows..."
if supabase functions deploy inspection-workflows --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} inspection-workflows deployed"
else
    echo -e "${YELLOW}[WARN]${NC} inspection-workflows deployment failed"
fi

echo ""
echo "[13/21] Deploying maintenance-calendar..."
if supabase functions deploy maintenance-calendar --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} maintenance-calendar deployed"
else
    echo -e "${YELLOW}[WARN]${NC} maintenance-calendar deployment failed"
fi

echo ""
echo "[14/21] Deploying maintenance-scheduler..."
if supabase functions deploy maintenance-scheduler --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} maintenance-scheduler deployed"
else
    echo -e "${YELLOW}[WARN]${NC} maintenance-scheduler deployment failed"
fi

echo ""
echo "[15/21] Deploying odometer-validator..."
if supabase functions deploy odometer-validator --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} odometer-validator deployed"
else
    echo -e "${YELLOW}[WARN]${NC} odometer-validator deployment failed"
fi

echo ""
echo "[16/21] Deploying signup..."
if supabase functions deploy signup --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} signup deployed"
else
    echo -e "${YELLOW}[WARN]${NC} signup deployment failed"
fi

echo ""
echo "[17/21] Deploying subscription-enforcer..."
if supabase functions deploy subscription-enforcer --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} subscription-enforcer deployed"
else
    echo -e "${YELLOW}[WARN]${NC} subscription-enforcer deployment failed"
fi

echo ""
echo "[18/21] Deploying tire-replacement-forecast..."
if supabase functions deploy tire-replacement-forecast --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} tire-replacement-forecast deployed"
else
    echo -e "${YELLOW}[WARN]${NC} tire-replacement-forecast deployment failed"
fi

cd ../..

# Deploy from edge-functions directory (if they exist and are different)
echo ""
echo "============================================================================"
echo "Step 3: Deploying functions from edge-functions/ (if any unique)"
echo "============================================================================"
echo ""

cd edge-functions

echo ""
echo "[19/21] Deploying invite-user (updated with email)..."
if supabase functions deploy invite-user --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} invite-user deployed"
else
    echo -e "${YELLOW}[WARN]${NC} invite-user deployment failed"
fi

echo ""
echo "[20/21] Deploying accept-invitation..."
if supabase functions deploy accept-invitation --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} accept-invitation deployed"
else
    echo -e "${YELLOW}[WARN]${NC} accept-invitation deployment failed"
fi

echo ""
echo "[21/21] Deploying auth-security..."
if supabase functions deploy auth-security --no-verify-jwt; then
    echo -e "${GREEN}[OK]${NC} auth-security deployed"
else
    echo -e "${YELLOW}[WARN]${NC} auth-security deployment failed"
fi

cd ..

echo ""
echo "============================================================================"
echo "Step 4: Verifying deployment"
echo "============================================================================"
echo ""

supabase functions list

echo ""
echo "============================================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "============================================================================"
echo ""
echo "All functions have been deployed."
echo ""
echo "Next steps:"
echo "  1. Review the output above for any failed deployments"
echo "  2. Test critical functions (signup, invite-user, auth-security)"
echo "  3. Verify cron jobs are configured:"
echo "     supabase db execute \"SELECT * FROM cron_jobs_status;\""
echo "  4. Check function logs for any errors:"
echo "     supabase functions logs <function-name>"
echo ""
echo "============================================================================"
