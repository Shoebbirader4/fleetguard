#!/usr/bin/env -S deno run --allow-env --allow-read

/**
 * Notification Configuration Validator
 * 
 * This script validates that all required environment variables are set
 * for the notification channels you want to use.
 * 
 * Usage:
 *   deno run --allow-env --allow-read scripts/validate-notification-config.ts
 */

// Load environment variables from .env file
import { load } from "https://deno.land/std@0.210.0/dotenv/mod.ts";

const env = await load();

// Set environment variables for validation
for (const [key, value] of Object.entries(env)) {
  Deno.env.set(key, value);
}

// Import configuration module
import { 
  validateNotificationConfig, 
  getAllChannelStatus, 
  getConfigSummary 
} from '../supabase/functions/shared/notifications/config.ts';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function printHeader(text: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text.padEnd(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSuccess(text: string) {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

function printWarning(text: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${text}`);
}

function printError(text: string) {
  console.log(`${colors.red}✗${colors.reset} ${text}`);
}

function printInfo(text: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${text}`);
}

// Main validation
printHeader('FleetGuard AI Notification Configuration Validator');

// Get all channel status
const allStatus = getAllChannelStatus();
const validation = validateNotificationConfig();

// Print overall status
if (validation.valid) {
  printSuccess('Configuration is valid!');
  console.log(`\n  Configured channels: ${colors.green}${validation.configuredChannels.join(', ')}${colors.reset}`);
} else {
  printError('Configuration has issues!');
}

if (validation.unconfiguredChannels.length > 0) {
  console.log(`  Unconfigured channels: ${colors.yellow}${validation.unconfiguredChannels.join(', ')}${colors.reset}`);
}

// Print detailed status for each channel
printHeader('Channel Configuration Status');

// WhatsApp
console.log(`\n${colors.bright}📱 WhatsApp Business API${colors.reset}`);
if (allStatus.whatsapp.configured) {
  printSuccess('Fully configured');
} else {
  printWarning('Not configured');
  if (allStatus.whatsapp.missingVars) {
    console.log(`   Missing: ${allStatus.whatsapp.missingVars.join(', ')}`);
  }
}

// SMS
console.log(`\n${colors.bright}💬 Twilio SMS${colors.reset}`);
if (allStatus.sms.configured) {
  printSuccess('Fully configured');
} else {
  printWarning('Not configured');
  if (allStatus.sms.missingVars) {
    console.log(`   Missing: ${allStatus.sms.missingVars.join(', ')}`);
  }
}

// Email
console.log(`\n${colors.bright}📧 SendGrid Email${colors.reset}`);
if (allStatus.email.configured) {
  printSuccess('Fully configured');
} else {
  printWarning('Not configured');
  if (allStatus.email.missingVars) {
    console.log(`   Missing: ${allStatus.email.missingVars.join(', ')}`);
  }
}

// Push
console.log(`\n${colors.bright}🔔 Firebase Cloud Messaging (Push)${colors.reset}`);
if (allStatus.push.configured) {
  printSuccess('Fully configured');
} else {
  printWarning('Not configured');
  if (allStatus.push.missingVars) {
    console.log(`   Missing: ${allStatus.push.missingVars.join(', ')}`);
  }
}

// Print recommendations
printHeader('Recommendations');

if (validation.configuredChannels.length === 0) {
  printError('No notification channels are configured!');
  console.log('\n  You need to configure at least one channel to send notifications.');
  console.log('  We recommend starting with Email (SendGrid) as it\'s the easiest to set up.\n');
  printInfo('Follow the setup guides in docs/notifications/');
} else if (validation.configuredChannels.length === 1) {
  printInfo('Only one channel is configured. Consider adding more for redundancy.');
  
  if (!validation.configuredChannels.includes('email')) {
    console.log('  → Email is the easiest to set up and provides good coverage.');
  }
  
  if (!validation.configuredChannels.includes('push')) {
    console.log('  → Push notifications are free and provide instant delivery to mobile users.');
  }
} else {
  printSuccess(`${validation.configuredChannels.length} channels configured - good coverage!`);
}

// Print next steps
if (validation.unconfiguredChannels.length > 0) {
  printHeader('Next Steps');
  
  console.log('To configure the remaining channels, follow these guides:\n');
  
  if (validation.unconfiguredChannels.includes('email')) {
    console.log('  📧 Email: docs/notifications/SENDGRID_EMAIL_SETUP.md');
  }
  
  if (validation.unconfiguredChannels.includes('sms')) {
    console.log('  💬 SMS: docs/notifications/TWILIO_SMS_SETUP.md');
  }
  
  if (validation.unconfiguredChannels.includes('whatsapp')) {
    console.log('  📱 WhatsApp: docs/notifications/WHATSAPP_SETUP.md');
  }
  
  if (validation.unconfiguredChannels.includes('push')) {
    console.log('  🔔 Push: docs/notifications/FCM_PUSH_SETUP.md');
  }
  
  console.log('\n  Or start with the master guide: docs/notifications/SETUP_MASTER_GUIDE.md\n');
}

// Print validation errors/warnings
if (validation.errors.length > 0) {
  printHeader('Configuration Issues');
  
  for (const error of validation.errors) {
    if (error.includes('not configured')) {
      printWarning(error);
    } else {
      printError(error);
    }
  }
  console.log();
}

// Summary
printHeader('Summary');

console.log(getConfigSummary());

// Exit with appropriate code
if (validation.valid) {
  printSuccess('Validation complete!');
  Deno.exit(0);
} else {
  printWarning('Some channels are not configured. Configure at least one channel before deploying.');
  Deno.exit(0); // Exit 0 since partial configuration is acceptable
}
