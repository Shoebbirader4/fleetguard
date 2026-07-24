/**
 * Type definitions for components and predictions
 */

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
  status: 'active' | 'replaced' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  component_id: string;
  prediction_date: string;
  failure_probability: number;
  risk_score: 'low' | 'medium' | 'high' | 'critical';
  remaining_useful_life_days?: number;
  remaining_useful_life_km?: number;
  recommended_action?: string;
  model_version: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  current_odometer: number;
  unit: 'km' | 'miles';
}

export interface ComponentWithPrediction extends Component {
  prediction?: Prediction;
  vehicle?: Vehicle;
}

export interface ComponentsByType {
  [componentType: string]: ComponentWithPrediction[];
}
