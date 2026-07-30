/**
 * Vendor Types and Interfaces
 * 
 * Requirements: 3.1, 3.2
 * - 3.1: Only active vendors appear in purchase order creation
 * - 3.2: Vendor email and phone must be unique per tenant
 */

export interface Vendor {
  id: string;
  tenant_id: string;
  vendor_name: string;
  contact_person?: string;
  email: string;
  phone: string;
  address?: string;
  payment_terms?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VendorWithStats extends Vendor {
  total_orders: number;
  total_spent: number;
  pending_orders: number;
}

export interface VendorFormData {
  vendor_name: string;
  contact_person?: string;
  email: string;
  phone: string;
  address?: string;
  payment_terms?: string;
  status: 'active' | 'inactive';
}

export const VENDOR_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
] as const;
