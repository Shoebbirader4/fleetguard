/**
 * WorkOrderAssignmentCard Component
 * 
 * Displays work order assignment status and provides UI for assigning/reassigning mechanics.
 * 
 * Features:
 * - Display current assignment status
 * - Show assigned mechanic info (name, role, email) if assigned
 * - "Assign Work Order" button if unassigned
 * - "Reassign" button if already assigned
 * - Modal for assignment/reassignment with MechanicSelector
 * - Confirmation dialog for reassignment
 * - Loading and error states
 * - Success/error toast notifications
 * 
 * Task 20.2 - Create WorkOrderAssignmentCard component
 * Requirements: 4.2, 4.5
 */

import { useState } from 'react';
import { useAssignWorkOrder, useReassignWorkOrder } from '../hooks/useWorkOrderAssignment';
import { WorkOrderWithDetails, WORK_ORDER_STATUSES } from '../types/workOrder';
import MechanicSelector from './MechanicSelector';
import Modal from './Modal';
import { toast } from './ToastContainer';

interface WorkOrderAssignmentCardProps {
  workOrder: WorkOrderWithDetails;
  onAssignmentChange?: () => void; // Optional callback after successful assignment
}

const ROLE_DISPLAY_MAP: Record<string, string> = {
  mechanic: 'Mechanic',
  maintenance_engineer: 'Maintenance Engineer',
  workshop_manager: 'Workshop Manager',
};

export default function WorkOrderAssignmentCard({
  workOrder,
  onAssignmentChange,
}: WorkOrderAssignmentCardProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [showReassignConfirmation, setShowReassignConfirmation] = useState(false);

  const assignMutation = useAssignWorkOrder();
  const reassignMutation = useReassignWorkOrder();

  const currentAssignee = workOrder.assigned_to_user;
  const isAssigned = !!currentAssignee;

  const handleAssignClick = () => {
    setShowAssignModal(true);
    setSelectedMechanicId(null);
  };

  const handleReassignClick = () => {
    setShowAssignModal(true);
    setSelectedMechanicId(currentAssignee?.id || null);
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedMechanicId(null);
    setShowReassignConfirmation(false);
  };

  const handleSaveAssignment = () => {
    if (!selectedMechanicId) {
      toast.error('Please select a mechanic');
      return;
    }

    if (isAssigned) {
      // If already assigned, show confirmation dialog for reassignment
      setShowReassignConfirmation(true);
    } else {
      // If unassigned, directly assign
      performAssignment();
    }
  };

  const performAssignment = () => {
    if (!selectedMechanicId) return;

    if (isAssigned && currentAssignee) {
      // Reassign
      reassignMutation.mutate(
        {
          workOrderId: workOrder.id,
          oldAssignedTo: currentAssignee.id,
          newAssignedTo: selectedMechanicId,
        },
        {
          onSuccess: () => {
            toast.success('Work order reassigned successfully');
            handleCloseModal();
            onAssignmentChange?.();
          },
          onError: (error: any) => {
            toast.error(`Failed to reassign work order: ${error.message}`);
            setShowReassignConfirmation(false);
          },
        }
      );
    } else {
      // Initial assignment
      assignMutation.mutate(
        {
          workOrderId: workOrder.id,
          assignedTo: selectedMechanicId,
        },
        {
          onSuccess: () => {
            toast.success('Work order assigned successfully');
            handleCloseModal();
            onAssignmentChange?.();
          },
          onError: (error: any) => {
            toast.error(`Failed to assign work order: ${error.message}`);
          },
        }
      );
    }
  };

  const handleConfirmReassign = () => {
    performAssignment();
  };

  const handleCancelReassign = () => {
    setShowReassignConfirmation(false);
  };

  // Get status badge
  const statusBadge = WORK_ORDER_STATUSES.find((s) => s.value === workOrder.status);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Assignment
            </h2>
            {statusBadge && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            )}
          </div>
          
          {isAssigned ? (
            <button
              onClick={handleReassignClick}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Reassign
            </button>
          ) : (
            <button
              onClick={handleAssignClick}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Assign Work Order
            </button>
          )}
        </div>

        {/* Display Current Assignment */}
        <div>
          {isAssigned && currentAssignee ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-semibold text-lg">
                      {currentAssignee.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {currentAssignee.full_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {ROLE_DISPLAY_MAP[currentAssignee.role] || currentAssignee.role.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 break-all">
                    {currentAssignee.email}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Assigned
                  </span>
                </div>
              </div>
              
              {/* Assignment History Info */}
              <div className="pl-3 pt-2 border-l-2 border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Assignment History
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Currently assigned to <span className="font-medium">{currentAssignee.full_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Assignment status: {workOrder.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Unassigned
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                This work order needs to be assigned to a mechanic
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assignment/Reassignment Modal */}
      <Modal
        isOpen={showAssignModal && !showReassignConfirmation}
        onClose={handleCloseModal}
        title={isAssigned ? 'Reassign Work Order' : 'Assign Work Order'}
        size="md"
      >
        <div className="space-y-4">
          <MechanicSelector
            value={selectedMechanicId}
            onChange={setSelectedMechanicId}
            label="Select Mechanic"
            placeholder="Choose a mechanic..."
          />

          {assignMutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                {(assignMutation.error as any)?.message || 'Failed to assign work order'}
              </p>
            </div>
          )}

          {reassignMutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                {(reassignMutation.error as any)?.message || 'Failed to reassign work order'}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCloseModal}
              disabled={assignMutation.isPending || reassignMutation.isPending}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAssignment}
              disabled={!selectedMechanicId || assignMutation.isPending || reassignMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {assignMutation.isPending || reassignMutation.isPending
                ? 'Saving...'
                : isAssigned
                ? 'Update Assignment'
                : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reassignment Confirmation Dialog */}
      {showReassignConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <svg
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              Confirm Reassignment
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
              Are you sure you want to reassign this work order? The current assignee will be notified of this change.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelReassign}
                disabled={reassignMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                disabled={reassignMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
