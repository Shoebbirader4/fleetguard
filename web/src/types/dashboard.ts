/**
 * Dashboard Widget Type Definitions
 * 
 * This module defines types for dashboard customization, including widget types,
 * dashboard layouts, and default configurations for each user role.
 */

import { UserRole } from './user';

/**
 * WidgetType represents all available dashboard widgets
 * Each widget displays specific information relevant to user roles
 */
export type WidgetType =
  | 'fleet-overview'
  | 'work-orders-summary'
  | 'maintenance-alerts'
  | 'financial-summary'
  | 'team-summary'
  | 'recent-activity'
  | 'vehicle-status'
  | 'driver-assignments'
  | 'my-work-orders'
  | 'my-vehicles'
  | 'parts-availability';

/**
 * DashboardWidget interface representing a single widget instance
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
}

/**
 * DashboardLayout interface representing a user's dashboard configuration
 */
export interface DashboardLayout {
  user_id: string;
  role: UserRole;
  widgets: DashboardWidget[];
  updated_at: string;
}

/**
 * DEFAULT_WIDGETS_BY_ROLE constant defining the default widget configuration
 * for each user role. Used when a user hasn't customized their dashboard.
 */
export const DEFAULT_WIDGETS_BY_ROLE: Record<UserRole, WidgetType[]> = {
  company_owner: [
    'fleet-overview',
    'financial-summary',
    'team-summary',
    'work-orders-summary',
    'maintenance-alerts',
    'recent-activity',
  ],
  fleet_manager: [
    'fleet-overview',
    'vehicle-status',
    'driver-assignments',
    'maintenance-alerts',
    'work-orders-summary',
  ],
  workshop_manager: [
    'work-orders-summary',
    'parts-availability',
    'maintenance-alerts',
    'recent-activity',
  ],
  mechanic: [
    'my-work-orders',
    'parts-availability',
    'recent-activity',
  ],
  driver: [
    'my-vehicles',
    'maintenance-alerts',
  ],
  maintenance_engineer: [
    'work-orders-summary',
    'maintenance-alerts',
    'vehicle-status',
  ],
  inspector: [
    'vehicle-status',
    'maintenance-alerts',
  ],
  accountant: [
    'financial-summary',
    'work-orders-summary',
  ],
  auditor: [
    'fleet-overview',
    'recent-activity',
  ],
};
