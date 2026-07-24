/**
 * Shared TypeScript types for FleetGuard AI
 * Used across web, mobile, and edge functions
 */

// ============================================================================
// Re-export Auth Types
// ============================================================================

export * from './auth';

// ============================================================================
// User and Authentication Types
// ============================================================================

export type UserRole =
  | 'super_admin'
  | 'company_owner'
  | 'fleet_manager'
  | 'workshop_manager'
  | 'maintenance_engineer'
  | 'mechanic'
  | 'driver'
  | 'inspector'
  | 'accountant'
  | 'auditor';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  fcm_token?: string;
  notification_preferences: Record<string, string[]>;
  theme: 'light' | 'dark';
  locale: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Tenant and Subscription Types
// ============================================================================

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled';
export type BillingCycle = 'monthly' | 'annual';

export interface Tenant {
  id: string;
  name: string;
  subscription_plan: SubscriptionPlan;
  vehicle_limit: number;
  subscription_status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Vehicle Types
// ============================================================================

export type VehicleType = 'bus' | 'truck' | 'van' | 'construction' | 'custom';
export type VehicleStatus = 'active' | 'maintenance' | 'retired';
export type DistanceUnit = 'km' | 'miles';

export interface Vehicle {
  id: string;
  tenant_id: string;
  vin: string;
  chassis_number?: string;
  engine_number?: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  current_odometer: number;
  unit: DistanceUnit;
  gps_device_id?: string;
  assigned_route?: string;
  depot_location?: string;
  assigned_driver_id?: string;
  status: VehicleStatus;
  last_gps_update?: string;
  last_location?: { x: number; y: number };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Component Types
// ============================================================================

export type ComponentStatus = 'active' | 'replaced' | 'removed';

export interface Component {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  component_type: string;
  component_subtype?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date: string;
  installation_odometer: number;
  vendor_id?: string;
  cost?: number;
  warranty_period_days?: number;
  expected_life_days?: number;
  expected_life_km?: number;
  inspection_frequency_days?: number;
  maintenance_frequency_km?: number;
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Odometer Reading Types
// ============================================================================

export type OdometerSource = 'manual' | 'excel' | 'bulk' | 'gps' | 'api';

export interface OdometerReading {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  reading: number;
  timestamp: string;
  source: OdometerSource;
  submitted_by?: string;
  is_anomalous: boolean;
  anomaly_reason?: string;
  confirmed: boolean;
  created_at: string;
}

// ============================================================================
// Work Order Types
// ============================================================================

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkOrder {
  id: string;
  tenant_id: string;
  work_order_number: string;
  vehicle_id: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  requested_by: string;
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  total_labor_hours: number;
  total_parts_cost: number;
  total_labor_cost: number;
  total_cost: number;
  service_report?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertType =
  | 'due_soon'
  | 'overdue'
  | 'critical_failure_risk'
  | 'safety_risk'
  | 'low_stock'
  | 'document_expiry'
  | 'document_expired'
  | 'tire_replacement_forecast';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  tenant_id: string;
  vehicle_id?: string;
  component_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Prediction Types (ML Outputs)
// ============================================================================

export type RiskScore = 'low' | 'medium' | 'high' | 'critical';

export interface Prediction {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  component_id: string;
  prediction_date: string;
  failure_probability: number;
  risk_score: RiskScore;
  remaining_useful_life_days?: number;
  remaining_useful_life_km?: number;
  recommended_action?: string;
  model_version: string;
  created_at: string;
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType =
  | 'insurance'
  | 'rc_book'
  | 'fitness_certificate'
  | 'pollution_certificate'
  | 'invoice'
  | 'warranty'
  | 'service_report';

export interface Document {
  id: string;
  tenant_id: string;
  vehicle_id?: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number;
  expiry_date?: string;
  uploaded_by: string;
  created_at: string;
}

// ============================================================================
// Inspection Types
// ============================================================================

export type InspectionStatus = 'pass' | 'fail' | 'warning';

export interface Inspection {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  inspector_id: string;
  checklist_id: string;
  inspection_date: string;
  odometer_reading: number;
  overall_status: InspectionStatus;
  checklist_results: Array<{
    item_id: string;
    result: boolean;
    notes?: string;
    photo_urls?: string[];
  }>;
  defects_reported: number;
  created_at: string;
}

// ============================================================================
// Spare Parts Types
// ============================================================================

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
  max_stock_level?: number;
  vendor_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GPS and Location Types
// ============================================================================

export interface GPSTelemetry {
  device_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  odometer?: number;
  ignition_status: 'on' | 'off';
}

export interface Location {
  lat: number;
  lng: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationChannel = 'whatsapp' | 'sms' | 'email' | 'push';

export interface NotificationPreferences {
  [alertType: string]: NotificationChannel[];
}

export interface NotificationJob {
  alert_id: string;
  user_id: string;
  channel: NotificationChannel;
  attempt: number;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface FleetHealthMetrics {
  fleet_health_score: number;
  total_vehicles: number;
  vehicles_in_service: number;
  vehicles_under_maintenance: number;
  vehicles_overdue: number;
}

export interface CostMetrics {
  total_maintenance_cost: number;
  cost_per_vehicle: number;
  cost_per_km: number;
  month_over_month_change: number;
}

export interface BreakdownMetrics {
  total_failures: number;
  failures_by_category: Record<string, number>;
  top_failing_components: Array<{ component: string; count: number }>;
  failure_rate_per_1000km: number;
}

export interface DowntimeMetrics {
  total_downtime_hours: number;
  downtime_per_vehicle: number;
  downtime_cost: number;
  mtbf: number;
  mttr: number;
}
