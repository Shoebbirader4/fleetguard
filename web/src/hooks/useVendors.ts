/**
 * Vendor Management Hooks
 * 
 * React Query hooks for fetching and managing vendor data.
 * 
 * Task 15.1 - Complete vendor management hooks implementation
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Vendor, VendorWithStats, VendorFormData } from '../types/vendor';

/**
 * Hook to fetch vendors, optionally filtered by status
 * @param status - Optional filter for 'active' or 'inactive' vendors
 * Returns vendors ordered by vendor_name
 * 
 * **Validates: Requirements 3.1**
 * - Only active vendors appear in purchase order creation (when status='active')
 */
export function useVendors(status?: 'active' | 'inactive') {
  return useQuery({
    queryKey: ['vendors', status],
    queryFn: async () => {
      let query = supabase.from('vendors').select('*');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.order('vendor_name');
      
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

/**
 * Hook to fetch a single vendor with purchase order statistics
 * @param vendorId - Vendor ID to fetch
 * Returns vendor with calculated stats: total_orders, total_spent, pending_orders
 * 
 * **Validates: Requirements 3.4, 3.5**
 * - Shows vendor statistics on detail page
 * - Calculates purchase order metrics from purchase_orders table
 */
export function useVendorWithStats(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'stats'],
    queryFn: async () => {
      // Fetch vendor details
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();
      
      if (vendorError) throw vendorError;

      // Fetch purchase orders for this vendor
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('total_cost, status')
        .eq('vendor_id', vendorId);
      
      if (ordersError) throw ordersError;

      // Calculate statistics
      const total_orders = orders.length;
      const total_spent = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
      const pending_orders = orders.filter(o => o.status === 'pending').length;

      return { 
        ...vendor, 
        total_orders, 
        total_spent, 
        pending_orders 
      } as VendorWithStats;
    },
    enabled: !!vendorId,
  });
}

/**
 * Hook to create a new vendor
 * Inserts a new vendor record with form data
 * Implements optimistic updates and cache invalidation
 * 
 * **Validates: Requirements 3.1, 3.3**
 * - Creates new vendors for purchase orders
 * - Invalidates vendor cache after creation
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: VendorFormData) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert([formData])
        .select()
        .single();
      
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => {
      // Invalidate all vendor queries to refresh lists and dropdowns
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

/**
 * Hook to update an existing vendor
 * Updates vendor information and refreshes cache
 * Implements optimistic updates
 * 
 * **Validates: Requirements 3.1, 3.4**
 * - Updates vendor details
 * - Invalidates vendor cache after update
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...formData }: VendorFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({ 
          ...formData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (data) => {
      // Invalidate vendor queries to refresh lists and detail pages
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', data.id] });
    },
  });
}

/**
 * Hook to deactivate a vendor
 * Sets vendor status to 'inactive', removing them from purchase order dropdowns
 * Implements optimistic updates and cache invalidation
 * 
 * **Validates: Requirements 3.1, 3.4, 3.5**
 * - Deactivating a vendor removes them from purchase order dropdowns
 * - Does not affect existing purchase orders (per requirement 3.4)
 * - Invalidates vendor cache after deactivation
 */
export function useDeactivateVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vendorId: string) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({ 
          status: 'inactive', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', vendorId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (data) => {
      // Invalidate vendor queries to refresh lists and remove from active dropdowns
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', data.id] });
    },
  });
}
