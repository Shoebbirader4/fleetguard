/**
 * Driver-specific types for FleetGuard AI
 * Extends User type and provides driver management interfaces
 */

import type { User } from './user';

/**
 * Driver interface - extends User with driver role
 * A driver is a user with the 'driver' role who can be assigned to vehicles
 */
export interface Driver extends User {
  role: 'driver';
  license_number?: string;
  license_expiry?: string;
  assigned_vehicles?: VehicleAssignment[];
}

/**
 * Vehicle Assignment interface
 * Represents the relationship between a driver and an assigned vehicle
 */
export interface VehicleAssignment {
  vehicle_id: string;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    vehicle_type: string;
  };
  assigned_at: string;
}

/**
 * Driver Form Data interface
 * Form data structure for creating or editing a driver
 */
export interface DriverFormData {
  email: string;
  full_name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
}
