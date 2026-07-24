/**
 * Work Order types for FleetGuard AI
 */

export interface WorkOrder {
  id: string;
  tenant_id: string;
  work_order_number: string;
  vehicle_id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  requested_by: string;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_labor_hours: number;
  total_parts_cost: number;
  total_labor_cost: number;
  total_cost: number;
  service_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderWithDetails extends WorkOrder {
  vehicle?: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    vehicle_type: string;
  };
  requested_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to_user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  labor_hours?: LaborHour[];
  parts_consumed?: WorkOrderPart[];
}

export interface LaborHour {
  id: string;
  work_order_id: string;
  user_id: string;
  labor_type: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
  spare_part?: {
    part_number: string;
    description: string;
    unit_of_measure: string;
  };
}

export interface WorkOrderFormData {
  vehicle_id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
}

export interface WorkOrderStatusUpdate {
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  service_report?: string;
}

export const WORK_ORDER_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
] as const;

export const WORK_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
] as const;
