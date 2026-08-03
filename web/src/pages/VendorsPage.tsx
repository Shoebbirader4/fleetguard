/**
 * VendorsPage Component
 * 
 * Displays a list of all vendors with search, filter, and sorting capabilities.
 * Shows vendor table with columns: Vendor Name, Contact Person, Email, Phone, Status, Total Orders, Actions
 * 
 * Task 16.1 - Create VendorsPage component
 * Requirements: 3.1, 3.6
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { canManageVendors } from '../utils/authorization';
import type { Vendor } from '../types/vendor';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import { ListPageSkeleton } from '../components/SkeletonScreens';
import { getErrorMessage } from '../hooks/useQueryError';

// Extended vendor type with order count for list view
interface VendorWithOrderCount extends Vendor {
  order_count: number;
}

export default function VendorsPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  
  // Fetch vendors with order count using a custom query
  // This satisfies requirement 3.1: "list of all vendors with status, contact info, and total orders"
  const { data: vendors, isLoading, error, refetch } = useQuery({
    queryKey: ['vendors', 'with-order-count'],
    queryFn: async () => {
      // Fetch all vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('vendor_name');
      
      if (vendorsError) throw vendorsError;
      
      // Fetch order counts for all vendors in a single query
      const { data: orderCounts, error: orderCountsError } = await supabase
        .from('purchase_orders')
        .select('vendor_id');
      
      if (orderCountsError) throw orderCountsError;
      
      // Count orders per vendor
      const orderCountMap = orderCounts.reduce((acc, order) => {
        acc[order.vendor_id] = (acc[order.vendor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Combine vendors with their order counts
      return vendorsData.map(vendor => ({
        ...vendor,
        order_count: orderCountMap[vendor.id] || 0,
      })) as VendorWithOrderCount[];
    },
  });
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for status filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Check permissions
  const canManage = authUser ? canManageVendors(authUser.role) : false;
  
  // Filter and search vendors
  const filteredVendors = useMemo(() => {
    if (!vendors) return [];
    
    return vendors.filter((vendor) => {
      // Search filter - vendor name, contact person, or email
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        vendor.vendor_name.toLowerCase().includes(searchLower) ||
        (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchLower)) ||
        vendor.email.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  // Get status badge color
  const getStatusBadgeColor = (status: 'active' | 'inactive'): string => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Vendors
            </h1>
            {canManage && (
              <button
                onClick={() => navigate('/vendors/new')}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Vendor
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Search by vendor name, contact person, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="label">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input-field"
              >
                <option value="all">All Vendors</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {vendors && (
            <div className="mt-4 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
              Showing {filteredVendors.length} of {vendors.length} vendors
            </div>
          )}
        </div>

        {/* Vendor Table */}
        {isLoading ? (
          <ListPageSkeleton />
        ) : error ? (
          <ErrorDisplay
            error={error as Error}
            message={getErrorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : filteredVendors.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No vendors found
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first vendor'}
            </p>
            {canManage && !searchQuery && statusFilter === 'all' && (
              <div className="mt-4">
                <button
                  onClick={() => navigate('/vendors/new')}
                  className="btn-primary"
                >
                  Add Vendor
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Vendor Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Contact Person
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Phone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Total Orders
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-normal leading-tight font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vendor.vendor_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {vendor.contact_person || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {vendor.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {vendor.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal leading-tight font-medium ${getStatusBadgeColor(
                            vendor.status
                          )}`}
                        >
                          {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
                          {vendor.order_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View details"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
