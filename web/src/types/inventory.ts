/**
 * Inventory and Spare Parts types for FleetGuard AI
 */

export interface SparePart {
  id: string;
  tenant_id: string;
  part_number: string;
  description: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  current_quantity: number;
  reorder_level: number;
  max_stock_level: number | null;
  vendor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  tenant_id: string;
  vendor_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  vendor_type: 'parts_supplier' | 'service_provider' | 'both';
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  vendor_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  total_cost: number;
  notes: string | null;
  created_by: string;
  received_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  received_quantity: number;
  created_at: string;
}

export interface StockTransaction {
  id: string;
  tenant_id: string;
  part_id: string;
  transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return';
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface InventoryValuation {
  part_id: string;
  part_number: string;
  description: string;
  category: string;
  current_quantity: number;
  weighted_average_cost: number;
  total_value: number;
}
