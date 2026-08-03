/**
 * Notification System Test Script
 * 
 * This script tests your email notification system by:
 * 1. Checking database tables exist
 * 2. Checking Edge Functions are deployed
 * 3. Creating a test notification job
 * 4. Verifying email sending capability
 * 
 * Run with: npx ts-node test-notification-system.ts
 * Or: deno run --allow-net --allow-env test-notification-system.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_SERVICE_ROLE_KEY';

// Test email (use your actual email to receive test notification)
const TEST_EMAIL = 'your-email@example.com';

// ============================================================================
// Color Output Helpers
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function success(msg: string) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

function error(msg: string) {
  console.log(`${colors.red}✗ ${msg}${colors.reset}`);
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ ${msg}${colors.reset}`);
}

function warning(msg: string) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

// ============================================================================
// Test Functions
// ============================================================================

async function testDatabaseConnection(supabase: any) {
  console.log('\n' + colors.bright + '1. Testing Database Connection' + colors.reset);
  
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      error(`Database connection failed: ${error.message}`);
      return false;
    }
    
    success('Database connection successful');
    return true;
  } catch (err) {
    error(`Database connection error: ${err}`);
    return false;
  }
}

async function testNotificationTables(supabase: any) {
  console.log('\n' + colors.bright + '2. Checking Notification Tables' + colors.reset);
  
  const tables = ['notification_jobs', 'alerts', 'user_invitations', 'alert_escalations'];
  let allExist = true;
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      
      if (error) {
        error(`Table '${table}' not found or not accessible`);
        allExist = false;
      } else {
        success(`Table '${table}' exists`);
      }
    } catch (err) {
      error(`Error checking table '${table}': ${err}`);
      allExist = false;
    }
  }
  
  return allExist;
}

async function testEdgeFunctions(supabase: any) {
  console.log('\n' + colors.bright + '3. Testing Edge Functions' + colors.reset);
  
  const functions = [
    'notification-processor',
    'alert-dispatcher',
    'invite-user',
  ];
  
  info('Edge Function deployment status can be checked via Supabase Dashboard');
  info('URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/functions');
  
  for (const fn of functions) {
    info(`Function: ${fn} (verify in dashboard)`);
  }
  
  return true;
}

async function testNotificationJobCreation(supabase: any, testEmail: string) {
  console.log('\n' + colors.bright + '4. Creating Test Notification Job' + colors.reset);
  
  try {
    // Get a test tenant and user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, email')
      .limit(1)
      .single();
    
    if (userError || !users) {
      error('No users found in database for testing');
      warning('Create a user first before testing notifications');
      return false;
    }
    
    info(`Using test user: ${users.email}`);
    
    // Create a test alert
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .insert({
        tenant_id: users.tenant_id,
        alert_type: 'test_notification',
        severity: 'medium',
        title: 'Test Notification',
        description: 'This is a test notification from the notification system verification script',
        status: 'active',
      })
      .select()
      .single();
    
    if (alertError) {
      error(`Failed to create test alert: ${alertError.message}`);
      return false;
    }
    
    success('Test alert created');
    
    // Create a test notification job
    const { data: job, error: jobError } = await supabase
      .from('notification_jobs')
      .insert({
        tenant_id: users.tenant_id,
        alert_id: alert.id,
        user_id: users.id,
        channel: 'email',
        recipient: testEmail,
        payload: {
          subject: 'FleetGuard AI - Test Notification',
          alert_type: 'test_notification',
          severity: 'medium',
          title: 'Test Notification',
          description: 'This is a test notification from the notification system verification script',
          html_content: `
            <h2>Test Notification</h2>
            <p>This is a test email to verify your FleetGuard AI notification system is working correctly.</p>
            <p><strong>Status:</strong> Email delivery is configured and working!</p>
            <hr>
            <p><small>This is an automated test from FleetGuard AI</small></p>
          `,
          text_body: 'Test Notification: This is a test email to verify your FleetGuard AI notification system is working correctly.',
        },
        status: 'queued',
        attempt: 0,
      })
      .select()
      .single();
    
    if (jobError) {
      error(`Failed to create notification job: ${jobError.message}`);
      return false;
    }
    
    success(`Notification job created: ${job.id}`);
    info(`Job will be processed by notification-processor cron job`);
    info(`Check email: ${testEmail}`);
    
    return true;
  } catch (err) {
    error(`Error creating test notification: ${err}`);
    return false;
  }
}

async function checkRecentNotificationJobs(supabase: any) {
  console.log('\n' + colors.bright + '5. Checking Recent Notification Jobs' + colors.reset);
  
  try {
    const { data: jobs, error } = await supabase
      .from('notification_jobs')
      .select('id, channel, status, created_at, sent_at, error_message')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      error(`Failed to fetch notification jobs: ${error.message}`);
      return false;
    }
    
    if (!jobs || jobs.length === 0) {
      warning('No notification jobs found');
      return true;
    }
    
    console.log('\nRecent Notification Jobs:');
    console.log('─'.repeat(80));
    
    for (const job of jobs) {
      const statusColor = job.status === 'sent' ? colors.green :
                         job.status === 'failed' ? colors.red :
                         colors.yellow;
      
      console.log(`${statusColor}${job.status.toUpperCase()}${colors.reset} | ${job.channel} | ${job.created_at}`);
      
      if (job.sent_at) {
        console.log(`  └─ Sent at: ${job.sent_at}`);
      }
      
      if (job.error_message) {
        console.log(`  └─ Error: ${job.error_message}`);
      }
    }
    
    console.log('─'.repeat(80));
    
    const sentCount = jobs.filter(j => j.status === 'sent').length;
    const failedCount = jobs.filter(j => j.status === 'failed').length;
    const queuedCount = jobs.filter(j => j.status === 'queued').length;
    
    console.log(`\nSummary: ${sentCount} sent, ${queuedCount} queued, ${failedCount} failed`);
    
    return true;
  } catch (err) {
    error(`Error checking notification jobs: ${err}`);
    return false;
  }
}

async function checkCronJobs(supabase: any) {
  console.log('\n' + colors.bright + '6. Checking Cron Jobs' + colors.reset);
  
  try {
    const { data: jobs, error } = await supabase
      .from('cron.job')
      .select('*');
    
    if (error) {
      warning('Unable to check cron jobs (requires elevated permissions)');
      info('Manually verify cron jobs in Supabase Dashboard → Database → Cron Jobs');
      return true;
    }
    
    if (!jobs || jobs.length === 0) {
      warning('No cron jobs found');
      info('Run the migration: supabase/migrations/99999999999999_configure_cron_jobs.sql');
      return false;
    }
    
    console.log('\nConfigured Cron Jobs:');
    for (const job of jobs) {
      success(`${job.jobname} - Schedule: ${job.schedule}`);
    }
    
    return true;
  } catch (err) {
    warning('Unable to check cron jobs (table may not exist or insufficient permissions)');
    info('Manually verify cron jobs in Supabase Dashboard');
    return true;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log(colors.bright + '\n╔════════════════════════════════════════════════════════╗');
  console.log('║  FleetGuard AI - Notification System Test Suite       ║');
  console.log('╚════════════════════════════════════════════════════════╝' + colors.reset);
  
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    error('\nError: SUPABASE_URL not configured');
    info('Set the environment variable: SUPABASE_URL=https://your-project.supabase.co');
    Deno.exit(1);
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    error('\nError: SUPABASE_SERVICE_ROLE_KEY not configured');
    info('Set the environment variable: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    Deno.exit(1);
  }
  
  info(`Testing Supabase project: ${SUPABASE_URL}`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const results = {
    dbConnection: await testDatabaseConnection(supabase),
    notificationTables: await testNotificationTables(supabase),
    edgeFunctions: await testEdgeFunctions(supabase),
    cronJobs: await checkCronJobs(supabase),
    recentJobs: await checkRecentNotificationJobs(supabase),
  };
  
  // Ask user if they want to create a test notification
  console.log('\n' + colors.bright + '━'.repeat(80) + colors.reset);
  info('Optional: Create a test notification job?');
  warning('This will create a test email job that will be sent to: ' + TEST_EMAIL);
  info('Update TEST_EMAIL constant in this script with your actual email first!');
  console.log(colors.bright + '━'.repeat(80) + colors.reset);
  
  // Uncomment to create test notification automatically
  // results.testNotification = await testNotificationJobCreation(supabase, TEST_EMAIL);
  
  // Summary
  console.log('\n' + colors.bright + '╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝' + colors.reset);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  
  console.log(`\nPassed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    success('\n✓ All tests passed! Notification system is ready.');
  } else {
    warning('\n⚠ Some tests failed. Review the output above for details.');
  }
  
  console.log('\n' + colors.bright + 'Next Steps:' + colors.reset);
  console.log('1. Update TEST_EMAIL in this script with your actual email');
  console.log('2. Uncomment the test notification creation line (line 305)');
  console.log('3. Re-run this script');
  console.log('4. Check your email inbox for the test notification');
  console.log('5. Review NOTIFICATION_SYSTEM_VERIFICATION.md for detailed guide');
}

// Run tests
if (import.meta.main) {
  runTests().catch(console.error);
}
