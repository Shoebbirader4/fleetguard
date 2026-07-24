import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { WorkOrderWithDetails, WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '../types/workOrder';
import { useAuthStore } from '../stores/authStore';

export default function WorkOrderListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch work orders with vehicle and user details
  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', statusFilter, priorityFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(id, vin, make, model, year, vehicle_type),
          requested_by_user:users!work_orders_requested_by_fkey(id, full_name, email),
          assigned_to_user:users!work_orders_assigned_to_fkey(id, full_name, email, role)
        `)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `work_order_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as WorkOrderWithDetails[];
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = WORK_ORDER_STATUSES.find((s) => s.value === status);
    return statusConfig || WORK_ORDER_STATUSES[0];
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = WORK_ORDER_PRIORITIES.find((p) => p.value === priority);
    return priorityConfig || WORK_ORDER_PRIORITIES[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate summary statistics
  const totalWorkOrders = workOrders?.length || 0;
  const pendingCount = workOrders?.filter((wo) => wo.status === 'pending').length || 0;
  const inProgressCount = workOrders?.filter((wo) => wo.status === 'in_progress').length || 0;
  const completedCount = workOrders?.filter((wo) => wo.status === 'completed').length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Work Orders
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage maintenance and repair requests
              </p>
            </div>
            <button
              onClick={() => navigate('/work-orders/new')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              + Create Work Order
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Work Orders
            </h3>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {totalWorkOrders}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </h3>
            <div className="mt-2 text-3xl font-bold text-gray-600">
              {pendingCount}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              In Progress
            </h3>
            <div className="mt-2 text-3xl font-bold text-yellow-600">
              {inProgressCount}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Completed
            </h3>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {completedCount}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by work order number or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                {WORK_ORDER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="w-full md:w-48">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Priorities</option>
                {WORK_ORDER_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Work Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="card text-center py-8 text-gray-600 dark:text-gray-400">
              Loading work orders...
            </div>
          ) : workOrders && workOrders.length > 0 ? (
            workOrders.map((workOrder) => {
              const status = getStatusBadge(workOrder.status);
              const priority = getPriorityBadge(workOrder.priority);

              return (
                <div
                  key={workOrder.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/work-orders/${workOrder.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {workOrder.work_order_number}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {workOrder.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Vehicle</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {workOrder.vehicle ? (
                              `${workOrder.vehicle.make} ${workOrder.vehicle.model} ${workOrder.vehicle.year}`
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Requested By</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {workOrder.requested_by_user?.full_name || 'N/A'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Assigned To</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {workOrder.assigned_to_user?.full_name || 'Unassigned'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Created</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(workOrder.created_at)}
                          </p>
                        </div>
                      </div>

                      {workOrder.total_cost > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex gap-6 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Labor Hours: </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {workOrder.total_labor_hours.toFixed(1)}h
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Parts Cost: </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(workOrder.total_parts_cost)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Total Cost: </span>
                              <span className="font-bold text-primary-600">
                                {formatCurrency(workOrder.total_cost)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/work-orders/${workOrder.id}`);
                        }}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No work orders found. {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first work order to get started.'}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                <button
                  onClick={() => navigate('/work-orders/new')}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  + Create Work Order
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
