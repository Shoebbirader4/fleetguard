/**
 * Unit Tests for Alert Dispatcher Edge Function
 * 
 * Tests notification job enqueueing logic and user preference handling.
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';

// ============================================================================
// Mock Data
// ============================================================================

const mockAlert = {
  id: 'alert-123',
  tenant_id: 'tenant-1',
  vehicle_id: 'vehicle-1',
  component_id: 'component-1',
  alert_type: 'overdue',
  severity: 'high',
  title: 'Overdue: Brake Replacement',
  description: 'Brake pads have exceeded their expected life. Immediate replacement recommended.',
  status: 'active',
};

const mockUsers = [
  {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'manager@example.com',
    full_name: 'John Manager',
    role: 'fleet_manager',
    phone: '+1234567890',
    fcm_token: 'fcm-token-1',
    notification_preferences: {
      overdue: ['email', 'push', 'sms'],
      due_soon: ['email'],
    },
  },
  {
    id: 'user-2',
    tenant_id: 'tenant-1',
    email: 'engineer@example.com',
    full_name: 'Jane Engineer',
    role: 'maintenance_engineer',
    phone: null, // No phone number
    fcm_token: 'fcm-token-2',
    notification_preferences: {
      overdue: ['email', 'sms', 'whatsapp'], // SMS and WhatsApp will be skipped
    },
  },
  {
    id: 'user-3',
    tenant_id: 'tenant-1',
    email: 'mechanic@example.com',
    full_name: 'Bob Mechanic',
    role: 'mechanic',
    phone: '+9876543210',
    fcm_token: null, // No FCM token
    notification_preferences: {}, // No preferences set - should default to email
  },
];

// ============================================================================
// Helper Functions Tests
// ============================================================================

Deno.test('getRolesToNotify - critical severity includes all management', () => {
  const roles = getRolesToNotify({
    ...mockAlert,
    severity: 'critical',
  });

  assertEquals(roles, [
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
  ]);
});

Deno.test('getRolesToNotify - high severity includes all management', () => {
  const roles = getRolesToNotify({
    ...mockAlert,
    severity: 'high',
  });

  assertEquals(roles, [
    'company_owner',
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
  ]);
});

Deno.test('getRolesToNotify - medium severity includes managers and engineers', () => {
  const roles = getRolesToNotify({
    ...mockAlert,
    severity: 'medium',
  });

  assertEquals(roles, [
    'fleet_manager',
    'workshop_manager',
    'maintenance_engineer',
  ]);
});

Deno.test('getRolesToNotify - low severity includes engineers only', () => {
  const roles = getRolesToNotify({
    ...mockAlert,
    severity: 'low',
  });

  assertEquals(roles, ['maintenance_engineer', 'workshop_manager']);
});

Deno.test('getEnabledChannels - uses user preferences for alert type', () => {
  const channels = getEnabledChannels(mockUsers[0], mockAlert);
  assertEquals(channels, ['email', 'push', 'sms']);
});

Deno.test('getEnabledChannels - defaults to email when no preferences set', () => {
  const channels = getEnabledChannels(mockUsers[2], mockAlert);
  assertEquals(channels, ['email']);
});

Deno.test('getEnabledChannels - uses override channels when provided', () => {
  const channels = getEnabledChannels(
    mockUsers[0],
    mockAlert,
    ['email', 'whatsapp'] as any
  );
  assertEquals(channels, ['email', 'whatsapp']);
});

Deno.test('canSendToChannel - validates phone for SMS', () => {
  // User with phone
  let result = canSendToChannel(mockUsers[0], 'sms');
  assertEquals(result.valid, true);

  // User without phone
  result = canSendToChannel(mockUsers[1], 'sms');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'No phone number configured');
});

Deno.test('canSendToChannel - validates phone for WhatsApp', () => {
  // User with phone
  let result = canSendToChannel(mockUsers[0], 'whatsapp');
  assertEquals(result.valid, true);

  // User without phone
  result = canSendToChannel(mockUsers[1], 'whatsapp');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'No phone number configured');
});

Deno.test('canSendToChannel - validates email', () => {
  // All mock users have email
  const result = canSendToChannel(mockUsers[0], 'email');
  assertEquals(result.valid, true);
});

Deno.test('canSendToChannel - validates FCM token for push', () => {
  // User with FCM token
  let result = canSendToChannel(mockUsers[0], 'push');
  assertEquals(result.valid, true);

  // User without FCM token
  result = canSendToChannel(mockUsers[2], 'push');
  assertEquals(result.valid, false);
  assertEquals(result.reason, 'No FCM token registered');
});

Deno.test('getRecipient - returns phone for SMS', () => {
  const recipient = getRecipient(mockUsers[0], 'sms');
  assertEquals(recipient, '+1234567890');
});

Deno.test('getRecipient - returns phone for WhatsApp', () => {
  const recipient = getRecipient(mockUsers[0], 'whatsapp');
  assertEquals(recipient, '+1234567890');
});

Deno.test('getRecipient - returns email for email', () => {
  const recipient = getRecipient(mockUsers[0], 'email');
  assertEquals(recipient, 'manager@example.com');
});

Deno.test('getRecipient - returns FCM token for push', () => {
  const recipient = getRecipient(mockUsers[0], 'push');
  assertEquals(recipient, 'fcm-token-1');
});

Deno.test('createPayload - creates WhatsApp payload', () => {
  const payload = createPayload(mockUsers[0], mockAlert, 'whatsapp');
  
  assertExists(payload.template);
  assertEquals(payload.template, 'alert_notification');
  assertExists(payload.params);
  assertEquals((payload.params as string[]).length, 2);
});

Deno.test('createPayload - creates SMS payload', () => {
  const payload = createPayload(mockUsers[0], mockAlert, 'sms');
  
  assertExists(payload.body);
  assertEquals(
    payload.body,
    '[HIGH] Overdue: Brake Replacement: Brake pads have exceeded their expected life. Immediate replacement recommended.'
  );
});

Deno.test('createPayload - creates Email payload', () => {
  const payload = createPayload(mockUsers[0], mockAlert, 'email');
  
  assertExists(payload.template_id);
  assertEquals(payload.template_id, 'alert_template');
  assertExists(payload.subject);
  assertEquals(payload.subject, '[FleetGuard] Overdue: Brake Replacement');
  assertExists(payload.html_content);
});

Deno.test('createPayload - creates Push notification payload', () => {
  const payload = createPayload(mockUsers[0], mockAlert, 'push');
  
  assertExists(payload.notification);
  const notification = payload.notification as any;
  assertEquals(notification.title, 'Overdue: Brake Replacement');
  assertExists(payload.data);
  const data = payload.data as any;
  assertEquals(data.alert_id, 'alert-123');
  assertEquals(data.severity, 'high');
});

Deno.test('formatEmailContent - formats alert into HTML', () => {
  const html = formatEmailContent(mockAlert);
  
  // Check that HTML contains key elements
  assertEquals(html.includes('<h2>Fleet Alert: Overdue: Brake Replacement</h2>'), true);
  assertEquals(html.includes('<strong>Severity:</strong> HIGH'), true);
  assertEquals(html.includes('<strong>Type:</strong> overdue'), true);
  assertEquals(html.includes('Brake pads have exceeded their expected life'), true);
});

// ============================================================================
// Integration Scenarios
// ============================================================================

Deno.test('Scenario: User with all channels enabled and contact info', () => {
  const user = mockUsers[0];
  const channels = getEnabledChannels(user, mockAlert);
  
  // Should have 3 channels enabled
  assertEquals(channels.length, 3);
  
  // All channels should be valid
  for (const channel of channels) {
    const validation = canSendToChannel(user, channel);
    assertEquals(validation.valid, true);
  }
});

Deno.test('Scenario: User with SMS preference but no phone number', () => {
  const user = mockUsers[1];
  const channels = getEnabledChannels(user, mockAlert);
  
  // Should have email, sms, whatsapp from preferences
  assertEquals(channels.includes('email'), true);
  assertEquals(channels.includes('sms'), true);
  assertEquals(channels.includes('whatsapp'), true);
  
  // Email should be valid
  let validation = canSendToChannel(user, 'email');
  assertEquals(validation.valid, true);
  
  // SMS should be invalid (no phone)
  validation = canSendToChannel(user, 'sms');
  assertEquals(validation.valid, false);
  assertEquals(validation.reason, 'No phone number configured');
  
  // WhatsApp should be invalid (no phone)
  validation = canSendToChannel(user, 'whatsapp');
  assertEquals(validation.valid, false);
  assertEquals(validation.reason, 'No phone number configured');
});

Deno.test('Scenario: User with no preferences defaults to email', () => {
  const user = mockUsers[2];
  const channels = getEnabledChannels(user, mockAlert);
  
  // Should default to email only
  assertEquals(channels.length, 1);
  assertEquals(channels[0], 'email');
  
  // Email should be valid
  const validation = canSendToChannel(user, 'email');
  assertEquals(validation.valid, true);
});

Deno.test('Scenario: Override channels ignores user preferences', () => {
  const user = mockUsers[0];
  // User has ['email', 'push', 'sms'] for overdue
  
  const channels = getEnabledChannels(
    user,
    mockAlert,
    ['whatsapp'] as any
  );
  
  // Should use override, not user preferences
  assertEquals(channels.length, 1);
  assertEquals(channels[0], 'whatsapp');
});

// ============================================================================
// Test Helper Functions (copied from index.ts for testing)
// ============================================================================

function getRolesToNotify(alert: any): string[] {
  const { alert_type, severity } = alert;

  if (severity === 'critical' || severity === 'high') {
    return [
      'company_owner',
      'fleet_manager',
      'workshop_manager',
      'maintenance_engineer',
    ];
  }

  if (severity === 'medium') {
    return [
      'fleet_manager',
      'workshop_manager',
      'maintenance_engineer',
    ];
  }

  return ['maintenance_engineer', 'workshop_manager'];
}

function getEnabledChannels(
  user: any,
  alert: any,
  overrideChannels?: string[]
): string[] {
  if (overrideChannels && overrideChannels.length > 0) {
    return overrideChannels;
  }

  const preferences = user.notification_preferences || {};
  const channelsForAlertType = preferences[alert.alert_type] || [];

  if (channelsForAlertType.length === 0) {
    return ['email'];
  }

  return channelsForAlertType.filter((ch: string) => 
    ['whatsapp', 'sms', 'email', 'push'].includes(ch)
  );
}

function canSendToChannel(
  user: any,
  channel: string
): { valid: boolean; reason?: string } {
  switch (channel) {
    case 'whatsapp':
    case 'sms':
      if (!user.phone) {
        return { valid: false, reason: 'No phone number configured' };
      }
      return { valid: true };

    case 'email':
      if (!user.email) {
        return { valid: false, reason: 'No email address configured' };
      }
      return { valid: true };

    case 'push':
      if (!user.fcm_token) {
        return { valid: false, reason: 'No FCM token registered' };
      }
      return { valid: true };

    default:
      return { valid: false, reason: 'Unknown channel' };
  }
}

function getRecipient(user: any, channel: string): string {
  switch (channel) {
    case 'whatsapp':
    case 'sms':
      return user.phone || '';
    case 'email':
      return user.email;
    case 'push':
      return user.fcm_token || '';
    default:
      return '';
  }
}

function createPayload(
  user: any,
  alert: any,
  channel: string
): Record<string, unknown> {
  const basePayload = {
    alert_id: alert.id,
    alert_type: alert.alert_type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    user_name: user.full_name,
  };

  switch (channel) {
    case 'whatsapp':
      return {
        ...basePayload,
        template: 'alert_notification',
        params: [alert.title, alert.description],
      };

    case 'sms':
      return {
        ...basePayload,
        body: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`,
      };

    case 'email':
      return {
        ...basePayload,
        template_id: 'alert_template',
        subject: `[FleetGuard] ${alert.title}`,
        html_content: formatEmailContent(alert),
      };

    case 'push':
      return {
        ...basePayload,
        notification: {
          title: alert.title,
          body: alert.description,
        },
        data: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          severity: alert.severity,
        },
      };

    default:
      return basePayload;
  }
}

function formatEmailContent(alert: any): string {
  return `
    <h2>Fleet Alert: ${alert.title}</h2>
    <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
    <p><strong>Type:</strong> ${alert.alert_type}</p>
    <p><strong>Description:</strong></p>
    <p>${alert.description}</p>
    <hr>
    <p><small>This is an automated notification from FleetGuard AI.</small></p>
  `;
}
