/**
 * Tests for notification utility
 * 
 * Note: These are integration tests that require a Supabase connection
 * and should be run with proper test data setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendWorkOrderAssignmentNotification,
  sendWorkOrderReassignmentNotifications,
  areNotificationsEnabled,
  type WorkOrderNotificationData,
} from './notifications';
import { supabase } from '../lib/supabase';

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Notification Utility', () => {
  const mockWorkOrderData: WorkOrderNotificationData = {
    workOrderId: '123e4567-e89b-12d3-a456-426614174000',
    workOrderTitle: 'Engine Oil Change',
    workOrderDescription: 'Replace engine oil and filter',
    priority: 'high',
    vehicleInfo: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      vin: 'JH4KA8170PC008269',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
    },
    assignedBy: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'John Manager',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendWorkOrderAssignmentNotification', () => {
    it('should create notification jobs for enabled channels', async () => {
      // Mock user preferences
      const mockPreferences = {
        work_order_assigned: ['email', 'push'],
      };

      // Mock user contact info
      const mockUserInfo = {
        email: 'mechanic@example.com',
        fcm_token: 'mock-fcm-token',
        full_name: 'John Mechanic',
        tenant_id: '123e4567-e89b-12d3-a456-426614174003',
      };

      // Mock supabase calls
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn()
              .mockResolvedValueOnce({
                data: { notification_preferences: mockPreferences },
                error: null,
              })
              .mockResolvedValueOnce({
                data: mockUserInfo,
                error: null,
              }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          data: { id: '123e4567-e89b-12d3-a456-426614174004' },
          error: null,
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await sendWorkOrderAssignmentNotification(
        '123e4567-e89b-12d3-a456-426614174005',
        mockWorkOrderData,
        false
      );

      expect(result.success).toBe(true);
      expect(result.jobsCreated).toBe(2); // email + push
      expect(result.errors).toHaveLength(0);
    });

    it('should skip channels with missing contact info', async () => {
      // Mock user preferences
      const mockPreferences = {
        work_order_assigned: ['email', 'push'],
      };

      // Mock user contact info (missing FCM token)
      const mockUserInfo = {
        email: 'mechanic@example.com',
        fcm_token: null,
        full_name: 'John Mechanic',
        tenant_id: '123e4567-e89b-12d3-a456-426614174003',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn()
              .mockResolvedValueOnce({
                data: { notification_preferences: mockPreferences },
                error: null,
              })
              .mockResolvedValueOnce({
                data: mockUserInfo,
                error: null,
              }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          data: { id: '123e4567-e89b-12d3-a456-426614174004' },
          error: null,
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await sendWorkOrderAssignmentNotification(
        '123e4567-e89b-12d3-a456-426614174005',
        mockWorkOrderData,
        false
      );

      expect(result.success).toBe(true);
      expect(result.jobsCreated).toBe(1); // only email
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return failure if no channels are enabled', async () => {
      // Mock user preferences with no channels
      const mockPreferences = {
        work_order_assigned: [],
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: { notification_preferences: mockPreferences },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await sendWorkOrderAssignmentNotification(
        '123e4567-e89b-12d3-a456-426614174005',
        mockWorkOrderData,
        false
      );

      expect(result.success).toBe(true);
      expect(result.jobsCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sendWorkOrderReassignmentNotifications', () => {
    it('should send notifications to both old and new mechanics', async () => {
      // Mock user preferences
      const mockPreferences = {
        work_order_reassigned: ['email'],
      };

      // Mock user contact info
      const mockUserInfo = {
        email: 'mechanic@example.com',
        fcm_token: null,
        full_name: 'John Mechanic',
        tenant_id: '123e4567-e89b-12d3-a456-426614174003',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserInfo,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          data: { id: '123e4567-e89b-12d3-a456-426614174004' },
          error: null,
        }),
      });

      // Override getUserPreferences mock
      vi.spyOn(supabase, 'from' as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn()
                  .mockResolvedValueOnce({
                    data: { notification_preferences: mockPreferences },
                    error: null,
                  })
                  .mockResolvedValueOnce({
                    data: mockUserInfo,
                    error: null,
                  })
                  .mockResolvedValueOnce({
                    data: { notification_preferences: mockPreferences },
                    error: null,
                  })
                  .mockResolvedValueOnce({
                    data: mockUserInfo,
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            data: { id: '123e4567-e89b-12d3-a456-426614174004' },
            error: null,
          }),
        };
      });

      const result = await sendWorkOrderReassignmentNotifications(
        '123e4567-e89b-12d3-a456-426614174006', // old mechanic
        '123e4567-e89b-12d3-a456-426614174007', // new mechanic
        mockWorkOrderData
      );

      expect(result.oldMechanicResult).toBeTruthy();
      expect(result.newMechanicResult).toBeTruthy();
    });

    it('should handle null old mechanic gracefully', async () => {
      // Mock user preferences
      const mockPreferences = {
        work_order_reassigned: ['email'],
      };

      // Mock user contact info
      const mockUserInfo = {
        email: 'mechanic@example.com',
        fcm_token: null,
        full_name: 'John Mechanic',
        tenant_id: '123e4567-e89b-12d3-a456-426614174003',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserInfo,
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          data: { id: '123e4567-e89b-12d3-a456-426614174004' },
          error: null,
        }),
      });

      vi.spyOn(supabase, 'from' as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUserInfo,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            data: { id: '123e4567-e89b-12d3-a456-426614174004' },
            error: null,
          }),
        };
      });

      const result = await sendWorkOrderReassignmentNotifications(
        null, // no old mechanic
        '123e4567-e89b-12d3-a456-426614174007',
        mockWorkOrderData
      );

      expect(result.oldMechanicResult).toBeNull();
      expect(result.newMechanicResult).toBeTruthy();
    });
  });

  describe('areNotificationsEnabled', () => {
    it('should return true when notifications are enabled', async () => {
      const mockPreferences = {
        work_order_assigned: ['email'],
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { notification_preferences: mockPreferences },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await areNotificationsEnabled(
        '123e4567-e89b-12d3-a456-426614174005',
        'work_order_assigned'
      );

      expect(result).toBe(true);
    });

    it('should return false when no channels are enabled', async () => {
      const mockPreferences = {
        work_order_assigned: [],
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { notification_preferences: mockPreferences },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await areNotificationsEnabled(
        '123e4567-e89b-12d3-a456-426614174005',
        'work_order_assigned'
      );

      expect(result).toBe(false);
    });

    it('should return true on error (safe default)', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await areNotificationsEnabled(
        '123e4567-e89b-12d3-a456-426614174005',
        'work_order_assigned'
      );

      expect(result).toBe(true);
    });
  });
});
