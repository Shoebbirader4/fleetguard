import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface MaintenanceSchedule {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  component_id: string | null;
  schedule_name: string;
  description: string | null;
  interval_days: number | null;
  interval_km: number | null;
  interval_engine_hours: number | null;
  last_service_date: string | null;
  last_service_odometer: number | null;
  next_due_date: string | null;
  next_due_odometer: number | null;
  is_active: boolean;
  is_recurring: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  vehicle?: {
    make: string;
    model: string;
    registration_number: string;
  };
  component?: {
    component_type: string;
  };
}

export default function RecurringMaintenancePage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  // Form state
  const [formData, setFormData] = useState({
    schedule_name: '',
    description: '',
    vehicle_id: '',
    component_id: '',
    interval_days: '',
    interval_km: '',
    interval_engine_hours: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    is_active: true,
    is_recurring: true,
  });

  // Fetch schedules
  const { data: schedules, isLoading } = useQuery<MaintenanceSchedule[]>({
    queryKey: ['maintenance-schedules', filterActive],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_schedules')
        .select(`
          *,
          vehicle:vehicles(make, model, registration_number),
          component:components(component_type)
        `)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (filterActive === 'active') {
        query = query.eq('is_active', true);
      } else if (filterActive === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch vehicles for dropdown
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-for-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, registration_number')
        .eq('status', 'active')
        .order('make');
      if (error) throw error;
      return data;
    },
    enabled: !!user && isModalOpen,
  });

  // Fetch components for selected vehicle
  const { data: components } = useQuery({
    queryKey: ['components-for-schedule', formData.vehicle_id],
    queryFn: async () => {
      if (!formData.vehicle_id) return [];
      const { data, error } = await supabase
        .from('components')
        .select('id, component_type, component_subtype')
        .eq('vehicle_id', formData.vehicle_id)
        .eq('status', 'active')
        .order('component_type');
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!formData.vehicle_id && isModalOpen,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSchedule) {
        const { error } = await supabase
          .from('maintenance_schedules')
          .update(data)
          .eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maintenance_schedules')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
      handleCloseModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] });
    },
  });

  const handleOpenModal = (schedule?: MaintenanceSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        schedule_name: schedule.schedule_name,
        description: schedule.description || '',
        vehicle_id: schedule.vehicle_id || '',
        component_id: schedule.component_id || '',
        interval_days: schedule.interval_days?.toString() || '',
        interval_km: schedule.interval_km?.toString() || '',
        interval_engine_hours: schedule.interval_engine_hours?.toString() || '',
        priority: schedule.priority,
        is_active: schedule.is_active,
        is_recurring: schedule.is_recurring,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        schedule_name: '',
        description: '',
        vehicle_id: '',
        component_id: '',
        interval_days: '',
        interval_km: '',
        interval_engine_hours: '',
        priority: 'medium',
        is_active: true,
        is_recurring: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const saveData: any = {
      schedule_name: formData.schedule_name,
      description: formData.description || null,
      vehicle_id: formData.vehicle_id || null,
      component_id: formData.component_id || null,
      interval_days: formData.interval_days ? parseInt(formData.interval_days) : null,
      interval_km: formData.interval_km ? parseInt(formData.interval_km) : null,
      interval_engine_hours: formData.interval_engine_hours ? parseInt(formData.interval_engine_hours) : null,
      priority: formData.priority,
      is_active: formData.is_active,
      is_recurring: formData.is_recurring,
    };

    saveMutation.mutate(saveData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getDaysUntilDue = (nextDueDate: string | null) => {
    if (!nextDueDate) return null;
    const dueDate = new Date(nextDueDate);
    const today = new Date();
    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                🔄 Recurring Maintenance Schedules
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure automatic maintenance schedules based on time or mileage
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              New Schedule
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <div className="flex gap-2">
              {['all', 'active', 'inactive'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterActive(filter as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filterActive === filter
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading schedules...</p>
          </div>
        ) : !schedules || schedules.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No maintenance schedules found.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <PlusIcon className="h-5 w-5" />
              Create your first schedule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {schedules.map((schedule) => {
              const daysUntilDue = getDaysUntilDue(schedule.next_due_date);
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
              const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

              return (
                <div
                  key={schedule.id}
                  className={`card ${
                    !schedule.is_active ? 'opacity-60' : ''
                  } ${isOverdue ? 'border-l-4 border-red-500' : isDueSoon ? 'border-l-4 border-yellow-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {schedule.schedule_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(schedule.priority)}`}>
                          {schedule.priority.toUpperCase()}
                        </span>
                        {!schedule.is_active && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      {schedule.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {schedule.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Vehicle</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {schedule.vehicle
                              ? `${schedule.vehicle.make} ${schedule.vehicle.model} (${schedule.vehicle.registration_number})`
                              : 'All Vehicles'}
                          </div>
                        </div>

                        {schedule.component && (
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Component</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {schedule.component.component_type}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Interval</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {schedule.interval_days && `Every ${schedule.interval_days} days`}
                            {schedule.interval_days && schedule.interval_km && ' or '}
                            {schedule.interval_km && `${schedule.interval_km.toLocaleString()} km`}
                            {!schedule.interval_days && !schedule.interval_km && schedule.interval_engine_hours && `${schedule.interval_engine_hours} hrs`}
                          </div>
                        </div>

                        {schedule.next_due_date && (
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Next Due</div>
                            <div className={`font-medium ${
                              isOverdue ? 'text-red-600 dark:text-red-400' :
                              isDueSoon ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-gray-900 dark:text-gray-100'
                            }`}>
                              {new Date(schedule.next_due_date).toLocaleDateString()}
                              {daysUntilDue !== null && (
                                <span className="ml-2 text-xs">
                                  ({isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: schedule.id, is_active: !schedule.is_active })}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={schedule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {schedule.is_active ? '🟢' : '⚫'}
                      </button>
                      <button
                        onClick={() => handleOpenModal(schedule)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this schedule?')) {
                            deleteMutation.mutate(schedule.id);
                          }
                        }}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.schedule_name}
                    onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Oil Change - Every 5000km"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={3}
                    placeholder="Regular oil and filter change"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vehicle (Optional)
                    </label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value, component_id: '' })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">All Vehicles</option>
                      {vehicles?.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.make} {vehicle.model} ({vehicle.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Component (Optional)
                    </label>
                    <select
                      value={formData.component_id}
                      onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      disabled={!formData.vehicle_id}
                    >
                      <option value="">No Component</option>
                      {components?.map((component) => (
                        <option key={component.id} value={component.id}>
                          {component.component_type} {component.component_subtype && `(${component.component_subtype})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interval (Days)
                    </label>
                    <input
                      type="number"
                      value={formData.interval_days}
                      onChange={(e) => setFormData({ ...formData, interval_days: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="30"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Interval (KM)
                    </label>
                    <input
                      type="number"
                      value={formData.interval_km}
                      onChange={(e) => setFormData({ ...formData, interval_km: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="5000"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Recurring</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
