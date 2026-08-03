import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import { toast } from '../components/ToastContainer';
import ConfirmationModal from '../components/ConfirmationModal';

interface POLineItem {
  id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  received_quantity: number;
  part: {
    part_number: string;
    description: string;
    unit_of_measure: string;
  };
}

interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  vendor_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  total_cost: number;
  notes: string | null;
  created_at: string;
  vendor: {
    vendor_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  };
  creator: {
    full_name: string;
  };
  receiver: {
    full_name: string;
  } | null;
  line_items: POLineItem[];
}

interface ReceiveQuantity {
  line_id: string;
  quantity: number;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});

  // Fetch PO details
  const { data: po, isLoading } = useQuery<PurchaseOrderDetail>({
    queryKey: ['purchase-order-detail', id],
    queryFn: async () => {
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(vendor_name, contact_person, phone, email),
          creator:users!purchase_orders_created_by_fkey(full_name),
          receiver:users!purchase_orders_received_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (poError) throw poError;

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select(`
          *,
          part:spare_parts(part_number, description, unit_of_measure)
        `)
        .eq('purchase_order_id', id);

      if (linesError) throw linesError;

      return {
        ...poData,
        line_items: lines,
      } as PurchaseOrderDetail;
    },
    enabled: !!id,
  });

  // Initialize receive quantities when PO loads
  useState(() => {
    if (po?.line_items) {
      const initialQuantities: Record<string, string> = {};
      po.line_items.forEach((line) => {
        initialQuantities[line.id] = String(line.quantity - line.received_quantity);
      });
      setReceiveQuantities(initialQuantities);
    }
  });

  // Mark as ordered mutation
  const markOrderedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'ordered' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Purchase order marked as ordered');
      queryClient.invalidateQueries({ queryKey: ['purchase-order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Cancel PO mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Purchase order cancelled');
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  // Receive PO mutation
  const receiveMutation = useMutation({
    mutationFn: async (quantities: ReceiveQuantity[]) => {
      // Update received quantities for each line
      for (const { line_id, quantity } of quantities) {
        const line = po?.line_items.find((l) => l.id === line_id);
        if (!line) continue;

        const newReceivedQty = line.received_quantity + quantity;

        // Update line received quantity
        const { error: lineError } = await supabase
          .from('purchase_order_lines')
          .update({ received_quantity: newReceivedQty })
          .eq('id', line_id);

        if (lineError) throw lineError;

        // Update spare part current quantity
        const { data: partData, error: partFetchError } = await supabase
          .from('spare_parts')
          .select('current_quantity')
          .eq('id', line.part_id)
          .single();

        if (partFetchError) throw partFetchError;

        const { error: partError } = await supabase
          .from('spare_parts')
          .update({ current_quantity: partData.current_quantity + quantity })
          .eq('id', line.part_id);

        if (partError) throw partError;

        // Create stock transaction record
        const { error: transError } = await supabase
          .from('stock_transactions')
          .insert({
            part_id: line.part_id,
            transaction_type: 'purchase',
            quantity: quantity,
            unit_cost: line.unit_cost,
            reference_type: 'purchase_order',
            reference_id: id,
            notes: `Received from PO ${po?.po_number}`,
            created_by: user!.id,
          });

        if (transError) throw transError;
      }

      // Check if all lines are fully received
      const { data: updatedLines, error: checkError } = await supabase
        .from('purchase_order_lines')
        .select('quantity, received_quantity')
        .eq('purchase_order_id', id);

      if (checkError) throw checkError;

      const allReceived = updatedLines.every((line) => line.received_quantity >= line.quantity);

      // Update PO status if all received
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({
          status: allReceived ? 'received' : 'ordered',
          actual_delivery_date: allReceived ? new Date().toISOString() : null,
          received_by: user!.id,
        })
        .eq('id', id);

      if (poError) throw poError;
    },
    onSuccess: () => {
      toast.success('Stock received and inventory updated');
      setShowReceiveModal(false);
      setReceiveQuantities({});
      queryClient.invalidateQueries({ queryKey: ['purchase-order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to receive stock: ${error.message}`);
    },
  });

  const handleReceiveSubmit = () => {
    const quantities: ReceiveQuantity[] = [];
    
    for (const [line_id, qtyStr] of Object.entries(receiveQuantities)) {
      const qty = parseInt(qtyStr);
      if (qty > 0) {
        quantities.push({ line_id, quantity: qty });
      }
    }

    if (quantities.length === 0) {
      toast.warning('Please enter at least one quantity to receive');
      return;
    }

    receiveMutation.mutate(quantities);
  };

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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading purchase order...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!po) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Purchase order not found</p>
            <button
              onClick={() => navigate('/inventory/purchase-orders')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Purchase Orders
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/inventory/purchase-orders')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                ← Back
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                    {po.po_number}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-normal leading-tight font-medium ${getStatusColor(po.status)}`}>
                    {po.status.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                  Created {formatDate(po.created_at)} by {po.creator.full_name}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {po.status === 'pending' && (
                <>
                  <button
                    onClick={() => navigate(`/inventory/purchase-orders/${id}/edit`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-normal leading-normal"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => markOrderedMutation.mutate()}
                    disabled={markOrderedMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Mark as Ordered
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
              {po.status === 'ordered' && (
                <button
                  onClick={() => setShowReceiveModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Receive Stock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items */}
            <div className="card">
              <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Order Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Part
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Ordered
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Received
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {po.line_items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-gray-900 dark:text-gray-100">
                          <div>
                            <div className="font-medium">{line.part.part_number}</div>
                            <div className="text-gray-500 dark:text-gray-400">{line.part.description}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-right text-gray-900 dark:text-gray-100">
                          {line.quantity} {line.part.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-right">
                          <span className={line.received_quantity >= line.quantity ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                            {line.received_quantity} {line.part.unit_of_measure}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-right text-gray-900 dark:text-gray-100">
                          {formatCurrency(line.unit_cost)}
                        </td>
                        <td className="px-4 py-3 text-sm font-normal leading-normal text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-gray-100">
                        Total Cost:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(po.total_cost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {po.notes && (
              <div className="card">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vendor Info */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vendor Information</h3>
              <div className="space-y-2 text-sm font-normal leading-normal">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Name:</span>
                  <div className="font-medium">
                    <button
                      onClick={() => navigate(`/vendors/${po.vendor_id}`)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      {po.vendor.vendor_name}
                    </button>
                  </div>
                </div>
                {po.vendor.contact_person && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                    <div className="text-gray-900 dark:text-gray-100">{po.vendor.contact_person}</div>
                  </div>
                )}
                {po.vendor.phone && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                    <div className="text-gray-900 dark:text-gray-100">{po.vendor.phone}</div>
                  </div>
                )}
                {po.vendor.email && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <div className="text-gray-900 dark:text-gray-100">{po.vendor.email}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Dates */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Important Dates</h3>
              <div className="space-y-2 text-sm font-normal leading-normal">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order Date:</span>
                  <div className="text-gray-900 dark:text-gray-100">{formatDate(po.order_date)}</div>
                </div>
                {po.expected_delivery_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Expected Delivery:</span>
                    <div className="text-gray-900 dark:text-gray-100">{formatDate(po.expected_delivery_date)}</div>
                  </div>
                )}
                {po.actual_delivery_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Actual Delivery:</span>
                    <div className="text-gray-900 dark:text-gray-100">{formatDate(po.actual_delivery_date)}</div>
                  </div>
                )}
                {po.receiver && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Received By:</span>
                    <div className="text-gray-900 dark:text-gray-100">{po.receiver.full_name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Purchase Order"
        message="Are you sure you want to cancel this purchase order? This action cannot be undone."
        confirmText="Cancel Order"
        type="danger"
        isLoading={cancelMutation.isPending}
      />

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowReceiveModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Receive Stock</h2>
              <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 mb-6">
                Enter the quantities received for each item. Leave as 0 if not received yet.
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {po.line_items.map((line) => (
                  <div key={line.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{line.part.part_number}</div>
                        <div className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400">{line.part.description}</div>
                      </div>
                      <div className="text-sm font-normal leading-normal text-right">
                        <div className="text-gray-600 dark:text-gray-400">
                          Ordered: {line.quantity} {line.part.unit_of_measure}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Already Received: {line.received_quantity} {line.part.unit_of_measure}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Receive Quantity ({line.part.unit_of_measure})
                      </label>
                      <input
                        type="number"
                        value={receiveQuantities[line.id] || '0'}
                        onChange={(e) => setReceiveQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
                        min="0"
                        max={line.quantity - line.received_quantity}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  disabled={receiveMutation.isPending}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveSubmit}
                  disabled={receiveMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {receiveMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Receiving...
                    </>
                  ) : (
                    'Receive Stock'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
