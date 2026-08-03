/**
 * Example usage of the notification utility
 * 
 * This file demonstrates how to integrate notifications with work order assignment.
 * DO NOT import this file in production code - it's for reference only.
 */

import { sendWorkOrderAssignmentNotification, sendWorkOrderReassignmentNotifications } from './notifications';

// ============================================================================
// Example 1: Send notification when assigning a work order
// ============================================================================

async function handleWorkOrderAssignment(
  workOrderId: string,
  assignedMechanicId: string,
  currentUserId: string,
  currentUserName: string
) {
  // First, update the work order in the database
  // (This would be done via your useAssignWorkOrder hook)
  
  // Then, send notification to the assigned mechanic
  const result = await sendWorkOrderAssignmentNotification(
    assignedMechanicId,
    {
      workOrderId: workOrderId,
      workOrderTitle: 'Replace Brake Pads',
      workOrderDescription: 'Front brake pads worn, need replacement',
      priority: 'high',
      vehicleInfo: {
        id: 'vehicle-123',
        vin: 'JH4KA8170PC008269',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
      },
      assignedBy: {
        id: currentUserId,
        name: currentUserName,
      },
    },
    false // isReassignment = false
  );

  if (result.success) {
    console.log(`✅ Sent ${result.jobsCreated} notification(s) to mechanic`);
  } else {
    console.error('❌ Failed to send notifications:', result.errors);
  }

  return result;
}

// ============================================================================
// Example 2: Send notifications when reassigning a work order
// ============================================================================

async function handleWorkOrderReassignment(
  workOrderId: string,
  oldMechanicId: string,
  newMechanicId: string,
  currentUserId: string,
  currentUserName: string
) {
  // First, update the work order in the database
  // (This would be done via your useReassignWorkOrder hook)
  
  // Then, send notifications to both mechanics
  const result = await sendWorkOrderReassignmentNotifications(
    oldMechanicId,
    newMechanicId,
    {
      workOrderId: workOrderId,
      workOrderTitle: 'Replace Brake Pads',
      workOrderDescription: 'Front brake pads worn, need replacement',
      priority: 'high',
      vehicleInfo: {
        id: 'vehicle-123',
        vin: 'JH4KA8170PC008269',
        make: 'Honda',
        model: 'Accord',
        year: 2021,
      },
      assignedBy: {
        id: currentUserId,
        name: currentUserName,
      },
    }
  );

  // Check results for old mechanic
  if (result.oldMechanicResult) {
    if (result.oldMechanicResult.success) {
      console.log(`✅ Notified old mechanic (${result.oldMechanicResult.jobsCreated} jobs)`);
    } else {
      console.error('❌ Failed to notify old mechanic:', result.oldMechanicResult.errors);
    }
  }

  // Check results for new mechanic
  if (result.newMechanicResult.success) {
    console.log(`✅ Notified new mechanic (${result.newMechanicResult.jobsCreated} jobs)`);
  } else {
    console.error('❌ Failed to notify new mechanic:', result.newMechanicResult.errors);
  }

  return result;
}

// ============================================================================
// Example 3: Integration with React Query mutation
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

function useAssignWorkOrderWithNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      assignedTo,
    }: {
      workOrderId: string;
      assignedTo: string;
    }) => {
      // Update work order in database
      const { data, error } = await supabase
        .from('work_orders')
        .update({
          assigned_to: assignedTo,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workOrderId)
        .select(`
          *,
          vehicle:vehicles(id, vin, make, model, year)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders', variables.workOrderId] });

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Send notification
      await sendWorkOrderAssignmentNotification(
        variables.assignedTo,
        {
          workOrderId: data.id,
          workOrderTitle: data.title || 'Work Order',
          workOrderDescription: data.description || '',
          priority: data.priority || 'medium',
          vehicleInfo: {
            id: data.vehicle.id,
            vin: data.vehicle.vin,
            make: data.vehicle.make,
            model: data.vehicle.model,
            year: data.vehicle.year,
          },
          assignedBy: {
            id: user.id,
            name: userProfile?.full_name || 'Unknown',
          },
        },
        false
      );
    },
  });
}

// ============================================================================
// Example 4: Integration with form submission
// ============================================================================

interface AssignWorkOrderFormProps {
  workOrderId: string;
  onSuccess?: () => void;
}

function AssignWorkOrderForm({ workOrderId, onSuccess }: AssignWorkOrderFormProps) {
  const { mutate: assignWorkOrder, isPending } = useAssignWorkOrderWithNotification();

  const handleSubmit = async (mechanicId: string) => {
    assignWorkOrder(
      { workOrderId, assignedTo: mechanicId },
      {
        onSuccess: () => {
          // Show success toast
          console.log('Work order assigned and notification sent');
          onSuccess?.();
        },
        onError: (error) => {
          // Show error toast
          console.error('Failed to assign work order:', error);
        },
      }
    );
  };

  // Form UI would go here...
  return null;
}

// ============================================================================
// Example 5: Checking notification status before sending
// ============================================================================

import { areNotificationsEnabled } from './notifications';

async function assignWorkOrderWithConditionalNotification(
  workOrderId: string,
  mechanicId: string,
  notificationData: any
) {
  // Update work order first
  // ... database update code ...

  // Check if notifications are enabled
  const notificationsEnabled = await areNotificationsEnabled(
    mechanicId,
    'work_order_assigned'
  );

  if (notificationsEnabled) {
    const result = await sendWorkOrderAssignmentNotification(
      mechanicId,
      notificationData,
      false
    );
    
    if (result.success) {
      console.log('✅ Notification sent successfully');
    } else {
      console.warn('⚠️ Notification failed but work order was assigned:', result.errors);
    }
  } else {
    console.log('ℹ️ Notifications disabled for this user, skipping notification');
  }
}

// Export examples for reference
export {
  handleWorkOrderAssignment,
  handleWorkOrderReassignment,
  useAssignWorkOrderWithNotification,
  assignWorkOrderWithConditionalNotification,
};
