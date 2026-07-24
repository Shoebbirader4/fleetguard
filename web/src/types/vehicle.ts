// Vehicle type definitions for FleetGuard AI

export interface Vehicle {
  id: string;
  tenant_id: string;
  vin: string;
  chassis_number?: string;
  engine_number?: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: 'bus' | 'truck' | 'van' | 'construction' | 'custom';
  current_odometer: number;
  unit: 'km' | 'miles';
  gps_device_id?: string;
  assigned_route?: string;
  depot_location?: string;
  assigned_driver_id?: string;
  status: 'active' | 'maintenance' | 'retired';
  last_gps_update?: string;
  last_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  updated_at: string;
}

export interface VehicleWithDriver extends Vehicle {
  driver?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
}

export interface VehicleFormData {
  vin: string;
  chassis_number?: string;
  engine_number?: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: 'bus' | 'truck' | 'van' | 'construction' | 'custom';
  current_odometer: number;
  unit: 'km' | 'miles';
  gps_device_id?: string;
  assigned_route?: string;
  depot_location?: string;
  assigned_driver_id?: string;
  status: 'active' | 'maintenance' | 'retired';
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export const VEHICLE_TYPES = [
  { value: 'bus', label: 'Bus' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'construction', label: 'Construction Equipment' },
  { value: 'custom', label: 'Custom' },
] as const;

export const VEHICLE_STATUSES = [
  { value: 'active', label: 'Active', color: 'text-green-600 dark:text-green-400' },
  { value: 'maintenance', label: 'Under Maintenance', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'retired', label: 'Retired', color: 'text-gray-600 dark:text-gray-400' },
] as const;

export const ODOMETER_UNITS = [
  { value: 'km', label: 'Kilometers (km)' },
  { value: 'miles', label: 'Miles (mi)' },
] as const;
