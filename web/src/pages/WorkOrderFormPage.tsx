import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { WorkOrderFormData, WORK_ORDER_PRIORITIES } from '../types/workOrder';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/ToastContainer';
import MechanicSelector from '../components/MechanicSelector';

export default function WorkOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const user = useAuthStore((state) => state.user);
  
  const [formData, setFormData] = useState<WorkOrderFormData>({
    vehicle_id: '',
    description: '',
    priority: 'medium',
    assigned_to: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing work order if editing
  const { data: existingWorkOrder, isLoading: isLoadingWorkOrder } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditing && !!id,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingWorkOrder) {
      setFormData({
        vehicle_id: existingWorkOrder.vehicle_id,
        description: existingWorkOrder.description,
        priority: existingWorkOrder.priority,
        assigned_to: existingWorkOrder.assigned_to || undefined,
      });
    }
  }, [existingWorkOrder]);

  // Fetch vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, vin, make, model, year, vehicle_type')
        .eq('status', 'active')
        .order('make', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mechanics are now fetched by MechanicSelector component using useMechanics hook

  // Create work order mutation
  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormData) => {
      // Generate work order number
      const { data: latestWO } = await supabase
        .from('work_orders')
        .select('work_order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let woNumber = 'WO-0001';
      if (latestWO) {
        const lastNumber = parseInt(latestWO.work_order_number.split('-')[1]);
        woNumber = `WO-${String(lastNumber + 1).padStart(4, '0')}`;
      }

      const { data: newWO, error } = await supabase
        .from('work_orders')
        .insert([
          {
            work_order_number: woNumber,
            vehicle_id: data.vehicle_id,
            description: data.description,
            priority: data.priority,
            status: data.assigned_to ? 'assigned' : 'pending',
            requested_by: user?.id,
            assigned_to: data.assigned_to || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return newWO;
    },
    onSuccess: (data) => {
      toast.success('Work order created successfully');
      navigate(`/work-orders/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create work order: ${error.message}`);
    }
  });

  // Update work order mutation
  const updateMutation = useMutation({
    mutationFn: async (data: WorkOrderFormData) => {
      const { data: updatedWO, error } = await supabase
        .from('work_orders')
        .update({
          vehicle_id: data.vehicle_id,
          description: data.description,
          priority: data.priority,
          assigned_to: data.assigned_to || null,
          status: data.assigned_to && !existingWorkOrder?.assigned_to ? 'assigned' : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedWO;
    },
    onSuccess: (data) => {
      toast.success('Work order updated successfully');
      navigate(`/work-orders/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to update work order: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.vehicle_id) newErrors.vehicle_id = 'Vehicle is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof WorkOrderFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (isEditing && isLoadingWorkOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading work order...</p>
        </div>
      </div>
    );
  }

  const mutation = isEditing ? updateMutation : createMutation;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/work-orders')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Edit Work Order' : 'Create Work Order'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isEditing ? 'Update work order details' : 'Create a new maintenance or repair request'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-6">
            {/* Vehicle Selection */}
            <div>
              <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle *
              </label>
              <select
                id="vehicle"
                value={formData.vehicle_id}
                onChange={(e) => handleChange('vehicle_id', e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.vehicle_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
              >
                <option value="">Select a vehicle...</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year} - VIN: {vehicle.vin}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.vehicle_id}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                placeholder="Describe the maintenance or repair work needed..."
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority *
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as any)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.priority ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
              >
                {WORK_ORDER_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.priority}</p>
              )}
            </div>

            {/* Assign To (Optional) - Using MechanicSelector component */}
            <div>
              <MechanicSelector
                value={formData.assigned_to || null}
                onChange={(mechanicId) => handleChange('assigned_to', mechanicId || undefined)}
                label="Assign To (Optional)"
                placeholder="Unassigned (assign later)"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Leave unassigned if you want to assign later. Status will be 'pending' if unassigned, 'assigned' if assigned.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/work-orders')}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Work Order' : 'Create Work Order')}
            </button>
          </div>

          {mutation.isError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">
                Failed to {isEditing ? 'update' : 'create'} work order. Please try again.
              </p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
