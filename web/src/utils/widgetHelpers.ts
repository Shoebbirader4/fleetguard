/**
 * Widget Helper Functions
 * 
 * This module provides utility functions for working with dashboard widgets.
 * These functions handle widget titles, descriptions, icons, sizes, and validation.
 * 
 * Requirements: 8.1 (Dashboard widgets must load asynchronously and not block page render)
 */

import { DashboardWidget, WidgetType } from '../types/dashboard';

/**
 * Get human-readable display title for a widget type
 * 
 * @param type - The widget type identifier
 * @returns Formatted display title for the widget
 * 
 * @example
 * getWidgetTitle('fleet-overview') // Returns: 'Fleet Overview'
 */
export function getWidgetTitle(type: WidgetType): string {
  const titles: Record<WidgetType, string> = {
    'fleet-overview': 'Fleet Overview',
    'work-orders-summary': 'Work Orders Summary',
    'maintenance-alerts': 'Maintenance Alerts',
    'financial-summary': 'Financial Summary',
    'team-summary': 'Team Summary',
    'recent-activity': 'Recent Activity',
    'vehicle-status': 'Vehicle Status',
    'driver-assignments': 'Driver Assignments',
    'my-work-orders': 'My Work Orders',
    'my-vehicles': 'My Vehicles',
    'parts-availability': 'Parts Availability',
  };
  return titles[type] || type;
}

/**
 * Get default size for a widget type based on information density
 * 
 * Size guidelines:
 * - small: Simple metrics or single data points
 * - medium: Lists or moderate complexity data
 * - large: Complex dashboards or detailed information
 * 
 * @param type - The widget type identifier
 * @returns Default size for the widget ('small', 'medium', or 'large')
 * 
 * @example
 * getDefaultWidgetSize('fleet-overview') // Returns: 'large'
 */
export function getDefaultWidgetSize(type: WidgetType): 'small' | 'medium' | 'large' {
  const sizes: Record<WidgetType, 'small' | 'medium' | 'large'> = {
    'fleet-overview': 'large',
    'work-orders-summary': 'medium',
    'maintenance-alerts': 'medium',
    'financial-summary': 'large',
    'team-summary': 'medium',
    'recent-activity': 'medium',
    'vehicle-status': 'medium',
    'driver-assignments': 'medium',
    'my-work-orders': 'large',
    'my-vehicles': 'medium',
    'parts-availability': 'small',
  };
  return sizes[type] || 'medium';
}

/**
 * Get descriptive text explaining what a widget displays
 * 
 * @param type - The widget type identifier
 * @returns Description of the widget's purpose and content
 * 
 * @example
 * getWidgetDescription('fleet-overview') // Returns: 'Overview of your entire fleet...'
 */
export function getWidgetDescription(type: WidgetType): string {
  const descriptions: Record<WidgetType, string> = {
    'fleet-overview': 'Overview of your entire fleet including total vehicles, active vehicles, and fleet health metrics',
    'work-orders-summary': 'Summary of all work orders with status breakdown and priority distribution',
    'maintenance-alerts': 'Critical maintenance notifications including upcoming scheduled maintenance and overdue tasks',
    'financial-summary': 'Financial overview showing total costs, budget utilization, and cost trends',
    'team-summary': 'Team overview including active members, role distribution, and team availability',
    'recent-activity': 'Recent system activity including completed work orders, vehicle updates, and user actions',
    'vehicle-status': 'Current status of all vehicles including operational, maintenance, and out-of-service counts',
    'driver-assignments': 'Driver-to-vehicle assignments showing current allocations and driver availability',
    'my-work-orders': 'Your assigned work orders sorted by priority and due date',
    'my-vehicles': 'Vehicles assigned to you with status information and upcoming maintenance',
    'parts-availability': 'Current parts inventory levels with low stock alerts',
  };
  return descriptions[type] || 'Widget description not available';
}

/**
 * Get icon name for a widget type
 * 
 * Icons use Heroicons naming convention (without the 'Icon' suffix)
 * Example: 'Truck' maps to TruckIcon from @heroicons/react
 * 
 * @param type - The widget type identifier
 * @returns Icon name compatible with Heroicons
 * 
 * @example
 * getWidgetIcon('fleet-overview') // Returns: 'Truck'
 */
export function getWidgetIcon(type: WidgetType): string {
  const icons: Record<WidgetType, string> = {
    'fleet-overview': 'Truck',
    'work-orders-summary': 'ClipboardDocumentList',
    'maintenance-alerts': 'ExclamationTriangle',
    'financial-summary': 'CurrencyDollar',
    'team-summary': 'UserGroup',
    'recent-activity': 'Clock',
    'vehicle-status': 'CheckCircle',
    'driver-assignments': 'Users',
    'my-work-orders': 'Wrench',
    'my-vehicles': 'Truck',
    'parts-availability': 'Cube',
  };
  return icons[type] || 'Square2Stack';
}

/**
 * Validate widget structure for data integrity
 * 
 * Checks:
 * - All required fields are present
 * - Widget type is valid
 * - Size is valid
 * - Order is a non-negative number
 * - Visible is a boolean
 * 
 * @param widget - Widget object to validate
 * @returns true if widget is valid, false otherwise
 * 
 * @example
 * validateWidget({ id: '1', type: 'fleet-overview', ... }) // Returns: true
 * validateWidget({ id: '1', type: 'invalid-type', ... }) // Returns: false
 */
export function validateWidget(widget: DashboardWidget): boolean {
  try {
    // Check required fields
    if (!widget.id || typeof widget.id !== 'string') {
      return false;
    }
    
    if (!widget.title || typeof widget.title !== 'string') {
      return false;
    }
    
    if (typeof widget.order !== 'number' || widget.order < 0) {
      return false;
    }
    
    if (typeof widget.visible !== 'boolean') {
      return false;
    }
    
    // Validate widget type
    if (!validateWidgetType(widget.type)) {
      return false;
    }
    
    // Validate widget size
    if (!isValidWidgetSize(widget.size)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Type guard to check if a string is a valid WidgetType
 * 
 * This function provides runtime type checking for widget types,
 * useful when loading data from external sources like databases or APIs.
 * 
 * @param type - String to check
 * @returns true if type is a valid WidgetType, false otherwise
 * 
 * @example
 * if (validateWidgetType(input)) {
 *   // TypeScript now knows 'input' is a WidgetType
 *   const title = getWidgetTitle(input);
 * }
 */
export function validateWidgetType(type: string): type is WidgetType {
  const validTypes: WidgetType[] = [
    'fleet-overview',
    'work-orders-summary',
    'maintenance-alerts',
    'financial-summary',
    'team-summary',
    'recent-activity',
    'vehicle-status',
    'driver-assignments',
    'my-work-orders',
    'my-vehicles',
    'parts-availability',
  ];
  
  return validTypes.includes(type as WidgetType);
}

/**
 * Type guard to check if a string is a valid widget size
 * 
 * Validates that a size value is one of the allowed widget sizes.
 * 
 * @param size - String to check
 * @returns true if size is valid ('small', 'medium', or 'large'), false otherwise
 * 
 * @example
 * if (isValidWidgetSize(userInput)) {
 *   // TypeScript knows userInput is 'small' | 'medium' | 'large'
 *   widget.size = userInput;
 * }
 */
export function isValidWidgetSize(size: string): size is 'small' | 'medium' | 'large' {
  return size === 'small' || size === 'medium' || size === 'large';
}

/**
 * Validation error messages for debugging
 */
export const WIDGET_VALIDATION_ERRORS = {
  MISSING_ID: 'Widget must have a valid id',
  INVALID_TYPE: 'Widget type is not valid',
  MISSING_TITLE: 'Widget must have a title',
  INVALID_ORDER: 'Widget order must be a non-negative number',
  INVALID_VISIBLE: 'Widget visible must be a boolean',
  INVALID_SIZE: 'Widget size must be "small", "medium", or "large"',
} as const;

/**
 * Get detailed validation error message for a widget
 * 
 * Performs validation and returns a descriptive error message
 * if validation fails, or null if widget is valid.
 * 
 * @param widget - Widget to validate
 * @returns Error message string if invalid, null if valid
 * 
 * @example
 * const error = getWidgetValidationError(widget);
 * if (error) {
 *   console.error('Widget validation failed:', error);
 * }
 */
export function getWidgetValidationError(widget: Partial<DashboardWidget>): string | null {
  if (!widget.id || typeof widget.id !== 'string') {
    return WIDGET_VALIDATION_ERRORS.MISSING_ID;
  }
  
  if (!widget.title || typeof widget.title !== 'string') {
    return WIDGET_VALIDATION_ERRORS.MISSING_TITLE;
  }
  
  if (typeof widget.order !== 'number' || widget.order < 0) {
    return WIDGET_VALIDATION_ERRORS.INVALID_ORDER;
  }
  
  if (typeof widget.visible !== 'boolean') {
    return WIDGET_VALIDATION_ERRORS.INVALID_VISIBLE;
  }
  
  if (!widget.type || !validateWidgetType(widget.type)) {
    return WIDGET_VALIDATION_ERRORS.INVALID_TYPE;
  }
  
  if (!widget.size || !isValidWidgetSize(widget.size)) {
    return WIDGET_VALIDATION_ERRORS.INVALID_SIZE;
  }
  
  return null;
}

/**
 * Get all available widget types
 * 
 * Returns an array of all valid widget types. Useful for generating
 * widget selection UIs or documentation.
 * 
 * @returns Array of all available widget types
 * 
 * @example
 * const allWidgets = getAllWidgetTypes();
 * // Returns: ['fleet-overview', 'work-orders-summary', ...]
 */
export function getAllWidgetTypes(): WidgetType[] {
  return [
    'fleet-overview',
    'work-orders-summary',
    'maintenance-alerts',
    'financial-summary',
    'team-summary',
    'recent-activity',
    'vehicle-status',
    'driver-assignments',
    'my-work-orders',
    'my-vehicles',
    'parts-availability',
  ];
}

/**
 * Get widget metadata for display in widget selector or configuration UI
 * 
 * @param type - Widget type
 * @returns Object containing all metadata for the widget
 * 
 * @example
 * const metadata = getWidgetMetadata('fleet-overview');
 * // Returns: { type, title, description, icon, defaultSize }
 */
export interface WidgetMetadata {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  defaultSize: 'small' | 'medium' | 'large';
}

export function getWidgetMetadata(type: WidgetType): WidgetMetadata {
  return {
    type,
    title: getWidgetTitle(type),
    description: getWidgetDescription(type),
    icon: getWidgetIcon(type),
    defaultSize: getDefaultWidgetSize(type),
  };
}

/**
 * Get metadata for all widget types
 * 
 * Useful for rendering widget catalogs or configuration panels
 * 
 * @returns Array of metadata for all widget types
 * 
 * @example
 * const allWidgetMetadata = getAllWidgetMetadata();
 * // Render each widget option in a grid
 */
export function getAllWidgetMetadata(): WidgetMetadata[] {
  return getAllWidgetTypes().map(getWidgetMetadata);
}
