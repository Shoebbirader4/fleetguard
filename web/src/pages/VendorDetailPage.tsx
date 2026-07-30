/**
 * Vendor Detail Page
 * 
 * Displays detailed information about a single vendor including:
 * - Vendor information (name, contact, email, phone, address)
 * - Statistics: total orders, total spent, pending orders
 * - List of purchase orders from this vendor
 * - Edit and Deactivate buttons for authorized users
 * - Confirmation dialog before deactivation
 * 
 * Requirements: 3.4, 3.5
 * Task: 16.3 - Create VendorDetailPage component
 */

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useVendorWithStats, useDeactivateVendor } from '../hooks/useVendors';
import { useAuthStore } from '../stores/authStore';
import { canManageVendors } from '../utils/authorization';
import { toast } from '../components/ToastContainer';
import ConfirmationModal from '../components/ConfirmationModal';

interface PurchaseOrder {
  id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  total_cost: number;
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();

  // State for deactivation confirmation
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Check permissions
  const canManage = authUser ? canManageVendors(authUser.role) : false;

  // Fetch vendor with stats
  const { data: vendor, isLoading: isLoadingVendor, error: vendorError } = useVendorWithStats(id || '');

  // Fetch purchase orders for this vendor
  const { data: purchaseOrders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['purchase-orders', 'vendor', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, order_date, expected_delivery_date, status, total_cost')
        .eq('vendor_id', id)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!id,
  });

  // Deactivate vendor mutation
  const deactivateVendor = useDeactivateVendor();

  const handleBack = () => {
    navigate('/vendors');
  };

  const handleEdit = () => {
    navigate(`/vendors/${id}/edit`);
  };

  const handleDeactivate = async () => {
    try {
      await deactivateVendor.mutateAsync(id!);
      toast.success('Vendor deactivated successfully');
      setShowDeactivateModal(false);
      // Navigate back to vendors list after deactivation
      navigate('/vendors');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate vendor');
    }
  };

  const isLoading = isLoadingVendor || isLoadingOrders;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (vendorError || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading vendor: {vendorError instanceof Error ? vendorError.message : 'Vendor not found'}
            </p>
            <button onClick={handleBack} className="mt-4 btn-primary">
              Back to Vendors
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || statusClasses.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPOStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || statusClasses.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Back to vendors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {vendor.vendor_name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vendor Details
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-3">
                <button onClick={handleEdit} className="btn-primary flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                {vendor.status === 'active' && (
                  <button
                    onClick={() => setShowDeactivateModal(true)}
                    className="btn-secondary text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendor Information Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vendor Details */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Vendor Information
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Vendor Name</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {vendor.vendor_name}
                  </p>
                </div>
                {vendor.contact_person && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Contact Person</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {vendor.contact_person}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    <a href={`mailto:${vendor.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {vendor.email}
                    </a>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    <a href={`tel:${vendor.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {vendor.phone}
                    </a>
                  </p>
                </div>
                {vendor.address && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {vendor.address}
                    </p>
                  </div>
                )}
                {vendor.payment_terms && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Payment Terms</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {vendor.payment_terms}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <div className="mt-1">
                    {getStatusBadge(vendor.status)}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Metadata
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(vendor.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(vendor.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Statistics
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {vendor.total_orders}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Spent</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${vendor.total_spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</span>
                    <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {vendor.pending_orders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Orders Card */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Purchase Orders ({purchaseOrders.length})
                </h2>
                {canManage && (
                  <Link
                    to="/inventory/purchase-orders/new"
                    state={{ vendorId: vendor.id }}
                    className="btn-primary text-sm"
                  >
                    + New Purchase Order
                  </Link>
                )}
              </div>

              {purchaseOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg 
                    className="mx-auto h-12 w-12 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                  <p className="mt-2">No purchase orders from this vendor yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseOrders.map((po) => (
                    <Link
                      key={po.id}
                      to={`/inventory/purchase-orders/${po.id}`}
                      className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {po.po_number}
                            </h3>
                            {getPOStatusBadge(po.status)}
                          </div>
                          <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {new Date(po.order_date).toLocaleDateString()}
                              </span>
                            </div>
                            {po.expected_delivery_date && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Expected:</span>
                                <span className="ml-2 text-gray-900 dark:text-gray-100">
                                  {new Date(po.expected_delivery_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Total:</span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">
                                ${po.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <svg 
                            className="w-5 h-5 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 5l7 7-7 7" 
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Deactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Vendor"
        message={`Are you sure you want to deactivate ${vendor.vendor_name}? This vendor will no longer appear in purchase order dropdowns, but existing purchase orders will not be affected.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        type="warning"
        isLoading={deactivateVendor.isPending}
      />
    </div>
  );
}
