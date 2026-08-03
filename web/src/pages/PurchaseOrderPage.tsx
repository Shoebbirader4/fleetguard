import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function PurchaseOrderPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders', selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(vendor_name),
          creator:users!purchase_orders_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as any[];
    },
    enabled: !!user,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'ordered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const totalPendingValue = purchaseOrders
    ?.filter((po) => po.status === 'pending' || po.status === 'ordered')
    .reduce((sum, po) => sum + po.total_cost, 0) || 0;

  const totalReceivedValue = purchaseOrders
    ?.filter((po) => po.status === 'received')
    .reduce((sum, po) => sum + po.total_cost, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/inventory')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                  Purchase Orders
                </h1>
                <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                  Manage parts procurement and stock receiving
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventory/purchase-orders/new')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
            >
              + Create Purchase Order
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Purchase Orders
            </h3>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {purchaseOrders?.length || 0}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending Orders Value
            </h3>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {formatCurrency(totalPendingValue)}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Received Orders Value
            </h3>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(totalReceivedValue)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="card">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading purchase orders...
            </div>
          ) : purchaseOrders && purchaseOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      PO Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Order Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Expected Delivery
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {po.po_number}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {po.vendor?.vendor_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {formatDate(po.order_date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                        {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(po.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal">
                        <span className={`px-2 py-1 rounded-full text-xs font-normal leading-tight font-medium ${getStatusColor(po.status)}`}>
                          {po.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-normal leading-normal space-x-3">
                        <button
                          onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View
                        </button>
                        {po.status === 'ordered' && (
                          <button
                            onClick={() => navigate(`/inventory/purchase-orders/${po.id}`)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No purchase orders found. {selectedStatus !== 'all' ? 'Try adjusting your filter.' : 'Create your first purchase order to get started.'}
              </p>
              {selectedStatus === 'all' && (
                <button
                  onClick={() => navigate('/inventory/purchase-orders/new')}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-normal leading-normal"
                >
                  + Create Purchase Order
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
