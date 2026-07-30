import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { WorkOrderWithDetails, WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '../types/workOrder';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/ToastContainer';
import ConfirmationModal from '../components/ConfirmationModal';
import WorkOrderAssignmentCard from '../components/WorkOrderAssignmentCard';

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [serviceReport, setServiceReport] = useState('');
  
  // Labor Hours Modal State
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [laborForm, setLaborForm] = useState({
    labor_type: 'regular',
    hours: '',
    hourly_rate: '50.00',
    start_time: '',
    end_time: '',
    description: ''
  });

  // Parts Modal State
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [partsForm, setPartsForm] = useState({
    spare_part_id: '',
    quantity: '',
    unit_cost: ''
  });
  const [availableParts, setAvailableParts] = useState<any[]>([]);

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch work order details
  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(id, vin, make, model, year, vehicle_type, current_odometer),
          requested_by_user:users!work_orders_requested_by_fkey(id, full_name, email),
          assigned_to_user:users!work_orders_assigned_to_fkey(id, full_name, email, role)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as WorkOrderWithDetails;
    },
    enabled: !!user && !!id,
  });

  // Fetch labor hours
  const { data: laborHours } = useQuery({
    queryKey: ['labor-hours', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_hours')
        .select('*, user:users(full_name)')
        .eq('work_order_id', id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch parts consumed
  const { data: partsConsumed } = useQuery({
    queryKey: ['work-order-parts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_parts')
        .select('*, spare_part:spare_parts(part_number, description, unit_of_measure)')
        .eq('work_order_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, report }: { status: string; report?: string }) => {
      const updateData: any = { status };
      
      if (status === 'in_progress' && !workOrder?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (report) {
          updateData.service_report = report;
        }
      }

      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setShowStatusModal(false);
      setNewStatus('');
      setServiceReport('');
      toast.success('Work order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  // Add labor hours mutation
  const addLaborMutation = useMutation({
    mutationFn: async (laborData: any) => {
      const hours = parseFloat(laborData.hours);
      const hourlyRate = parseFloat(laborData.hourly_rate);
      const totalCost = hours * hourlyRate;

      const { data, error } = await supabase
        .from('labor_hours')
        .insert({
          work_order_id: id,
          user_id: user?.id,
          labor_type: laborData.labor_type,
          hours,
          hourly_rate: hourlyRate,
          total_cost: totalCost,
          start_time: laborData.start_time || new Date().toISOString(),
          end_time: laborData.end_time || new Date().toISOString(),
          description: laborData.description
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-hours', id] });
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      setShowLaborModal(false);
      setLaborForm({
        labor_type: 'regular',
        hours: '',
        hourly_rate: '50.00',
        start_time: '',
        end_time: '',
        description: ''
      });
      toast.success('Labor hours added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add labor hours: ${error.message}`);
    }
  });

  // Add parts mutation
  const addPartsMutation = useMutation({
    mutationFn: async (partsData: any) => {
      const quantity = parseFloat(partsData.quantity);
      const unitCost = parseFloat(partsData.unit_cost);
      const lineTotal = quantity * unitCost;

      // First, insert the work order part
      const { data: workOrderPart, error: insertError } = await supabase
        .from('work_order_parts')
        .insert({
          work_order_id: id,
          spare_part_id: partsData.spare_part_id,
          quantity,
          unit_cost: unitCost,
          line_total: lineTotal
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Then, update the spare part quantity
      const { error: updateError } = await supabase
        .rpc('decrement_spare_part_quantity', {
          part_id: partsData.spare_part_id,
          qty: quantity
        });

      if (updateError) throw updateError;

      return workOrderPart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      setShowPartsModal(false);
      setPartsForm({
        spare_part_id: '',
        quantity: '',
        unit_cost: ''
      });
      toast.success('Parts added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add parts: ${error.message}`);
    }
  });

  // Delete work order mutation
  const deleteWorkOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Work order deleted successfully');
      navigate('/work-orders');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete work order: ${error.message}`);
    }
  });

  // Fetch available spare parts when parts modal opens
  const fetchAvailableParts = async () => {
    const { data, error } = await supabase
      .from('spare_parts')
      .select('id, part_number, description, current_quantity, unit_cost, unit_of_measure')
      .gt('current_quantity', 0)
      .order('part_number');

    if (!error && data) {
      setAvailableParts(data);
    }
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateStatusMutation.mutate({ status: newStatus, report: serviceReport });
  };

  const handleAddLabor = () => {
    if (!laborForm.hours || !laborForm.hourly_rate) {
      toast.error('Please fill in all required fields');
      return;
    }
    addLaborMutation.mutate(laborForm);
  };

  const handleAddParts = () => {
    if (!partsForm.spare_part_id || !partsForm.quantity) {
      toast.error('Please select a part and enter quantity');
      return;
    }
    addPartsMutation.mutate(partsForm);
  };

  const handleDeleteWorkOrder = () => {
    deleteWorkOrderMutation.mutate();
  };

  const handlePartsModalOpen = () => {
    fetchAvailableParts();
    setShowPartsModal(true);
  };

  const handlePartSelection = (partId: string) => {
    const selectedPart = availableParts.find(p => p.id === partId);
    if (selectedPart) {
      setPartsForm({
        ...partsForm,
        spare_part_id: partId,
        unit_cost: selectedPart.unit_cost.toString()
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading work order...</p>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Work order not found</p>
          <button
            onClick={() => navigate('/work-orders')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Back to Work Orders
          </button>
        </div>
      </div>
    );
  }

  const status = WORK_ORDER_STATUSES.find((s) => s.value === workOrder.status);
  const priority = WORK_ORDER_PRIORITIES.find((p) => p.value === workOrder.priority);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Timeline events
  const timelineEvents = [
    {
      label: 'Created',
      date: workOrder.created_at,
      description: `Work order created by ${workOrder.requested_by_user?.full_name}`,
      icon: '📝',
    },
    workOrder.assigned_to && {
      label: 'Assigned',
      date: workOrder.updated_at,
      description: `Assigned to ${workOrder.assigned_to_user?.full_name}`,
      icon: '👤',
    },
    workOrder.started_at && {
      label: 'Started',
      date: workOrder.started_at,
      description: 'Work started',
      icon: '🔧',
    },
    workOrder.completed_at && {
      label: 'Completed',
      date: workOrder.completed_at,
      description: 'Work completed',
      icon: '✅',
    },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/work-orders')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {workOrder.work_order_number}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Work Order Details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/work-orders/${id}/edit`)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status and Priority */}
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status?.color}`}>
                  {status?.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${priority?.color}`}>
                  {priority?.label}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300">{workOrder.description}</p>
            </div>

            {/* Vehicle Information */}
            {workOrder.vehicle && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Vehicle Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Vehicle</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {workOrder.vehicle.make} {workOrder.vehicle.model} {workOrder.vehicle.year}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">VIN</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {workOrder.vehicle.vin}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Type</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {workOrder.vehicle.vehicle_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Current Odometer</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {(workOrder.vehicle as any).current_odometer ? (workOrder.vehicle as any).current_odometer.toLocaleString() : 'N/A'} km
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Labor Hours */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Labor Hours
                </h2>
                <button
                  onClick={() => setShowLaborModal(true)}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  + Add Labor
                </button>
              </div>
              {laborHours && laborHours.length > 0 ? (
                <div className="space-y-3">
                  {laborHours.map((labor: any) => (
                    <div
                      key={labor.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {labor.user?.full_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {labor.labor_type}
                        </p>
                        {labor.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {labor.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {labor.hours.toFixed(1)}h
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(labor.total_cost)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No labor hours recorded yet</p>
                  <button
                    onClick={() => setShowLaborModal(true)}
                    className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Add first labor entry
                  </button>
                </div>
              )}
            </div>

            {/* Parts Consumed */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Parts Consumed
                </h2>
                <button
                  onClick={handlePartsModalOpen}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  + Add Parts
                </button>
              </div>
              {partsConsumed && partsConsumed.length > 0 ? (
                <div className="space-y-3">
                  {partsConsumed.map((part: any) => (
                    <div
                      key={part.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {part.spare_part?.part_number}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {part.spare_part?.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {part.quantity} {part.spare_part?.unit_of_measure}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(part.line_total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No parts consumed yet</p>
                  <button
                    onClick={handlePartsModalOpen}
                    className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Add first part
                  </button>
                </div>
              )}
            </div>

            {/* Service Report */}
            {workOrder.service_report && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Service Report
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {workOrder.service_report}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Work Order Assignment Card - Task 20.3 */}
            <WorkOrderAssignmentCard
              workOrder={workOrder}
              onAssignmentChange={() => {
                queryClient.invalidateQueries({ queryKey: ['work-order', id] });
                queryClient.invalidateQueries({ queryKey: ['work-orders'] });
              }}
            />

            {/* Last Updated Timestamp */}
            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <svg 
                  className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Last Updated
                  </p>
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                    {formatDate(workOrder.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Timeline
              </h2>
              <div className="space-y-4">
                {timelineEvents.map((event: any, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-lg">
                        {event.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {event.label}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDate(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Summary */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Cost Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Labor Hours</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {workOrder.total_labor_hours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Labor Cost</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(workOrder.total_labor_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Parts Cost</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(workOrder.total_parts_cost)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total Cost</span>
                  <span className="font-bold text-primary-600 text-lg">
                    {formatCurrency(workOrder.total_cost)}
                  </span>
                </div>
              </div>
            </div>

            {/* People */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                People
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Requested By</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {workOrder.requested_by_user?.full_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {workOrder.requested_by_user?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {workOrder.assigned_to_user?.full_name || 'Unassigned'}
                  </p>
                  {workOrder.assigned_to_user && (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {workOrder.assigned_to_user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                        {workOrder.assigned_to_user.role?.replace('_', ' ')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Update Status
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select status...</option>
                  {WORK_ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === 'completed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Report
                  </label>
                  <textarea
                    value={serviceReport}
                    onChange={(e) => setServiceReport(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter service report..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                  setServiceReport('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={!newStatus || updateStatusMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Labor Hours Modal */}
      {showLaborModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Add Labor Hours
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Labor Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={laborForm.labor_type}
                  onChange={(e) => setLaborForm({ ...laborForm, labor_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="regular">Regular</option>
                  <option value="overtime">Overtime</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={laborForm.hours}
                    onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="8.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hourly Rate ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={laborForm.hourly_rate}
                    onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="50.00"
                  />
                </div>
              </div>

              {laborForm.hours && laborForm.hourly_rate && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(parseFloat(laborForm.hours) * parseFloat(laborForm.hourly_rate))}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={laborForm.description}
                  onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="What work was performed..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLaborModal(false);
                  setLaborForm({
                    labor_type: 'regular',
                    hours: '',
                    hourly_rate: '50.00',
                    start_time: '',
                    end_time: '',
                    description: ''
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLabor}
                disabled={addLaborMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addLaborMutation.isPending ? 'Adding...' : 'Add Labor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Parts Modal */}
      {showPartsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Add Parts
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Part <span className="text-red-500">*</span>
                </label>
                <select
                  value={partsForm.spare_part_id}
                  onChange={(e) => handlePartSelection(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a part...</option>
                  {availableParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.part_number} - {part.description} (Stock: {part.current_quantity} {part.unit_of_measure})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={partsForm.quantity}
                    onChange={(e) => setPartsForm({ ...partsForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={partsForm.unit_cost}
                    onChange={(e) => setPartsForm({ ...partsForm, unit_cost: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {partsForm.quantity && partsForm.unit_cost && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Line Total</p>
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(parseFloat(partsForm.quantity) * parseFloat(partsForm.unit_cost))}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPartsModal(false);
                  setPartsForm({
                    spare_part_id: '',
                    quantity: '',
                    unit_cost: ''
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParts}
                disabled={addPartsMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addPartsMutation.isPending ? 'Adding...' : 'Add Parts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteWorkOrder}
        title="Delete Work Order?"
        message="Are you sure you want to delete this work order? This action cannot be undone. All labor hours and parts records will also be deleted."
        type="danger"
        confirmText="Delete Work Order"
        isLoading={deleteWorkOrderMutation.isPending}
      />
    </div>
  );
}
