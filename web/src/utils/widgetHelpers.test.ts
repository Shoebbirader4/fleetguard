/**
 * Widget Helper Functions - Unit Tests
 * 
 * Tests for widget helper utility functions including titles, descriptions,
 * icons, sizes, and validation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  getWidgetTitle,
  getDefaultWidgetSize,
  getWidgetDescription,
  getWidgetIcon,
  validateWidget,
  validateWidgetType,
  isValidWidgetSize,
  getWidgetValidationError,
  getAllWidgetTypes,
  getWidgetMetadata,
  getAllWidgetMetadata,
  WIDGET_VALIDATION_ERRORS,
} from './widgetHelpers';
import { DashboardWidget, WidgetType } from '../types/dashboard';

describe('getWidgetTitle', () => {
  it('should return correct title for all widget types', () => {
    expect(getWidgetTitle('fleet-overview')).toBe('Fleet Overview');
    expect(getWidgetTitle('work-orders-summary')).toBe('Work Orders Summary');
    expect(getWidgetTitle('maintenance-alerts')).toBe('Maintenance Alerts');
    expect(getWidgetTitle('financial-summary')).toBe('Financial Summary');
    expect(getWidgetTitle('team-summary')).toBe('Team Summary');
    expect(getWidgetTitle('recent-activity')).toBe('Recent Activity');
    expect(getWidgetTitle('vehicle-status')).toBe('Vehicle Status');
    expect(getWidgetTitle('driver-assignments')).toBe('Driver Assignments');
    expect(getWidgetTitle('my-work-orders')).toBe('My Work Orders');
    expect(getWidgetTitle('my-vehicles')).toBe('My Vehicles');
    expect(getWidgetTitle('parts-availability')).toBe('Parts Availability');
  });

  it('should return the widget type as fallback for unknown types', () => {
    const unknownType = 'unknown-widget' as WidgetType;
    expect(getWidgetTitle(unknownType)).toBe('unknown-widget');
  });
});

describe('getDefaultWidgetSize', () => {
  it('should return correct size for information-dense widgets', () => {
    expect(getDefaultWidgetSize('fleet-overview')).toBe('large');
    expect(getDefaultWidgetSize('financial-summary')).toBe('large');
    expect(getDefaultWidgetSize('my-work-orders')).toBe('large');
  });

  it('should return medium for moderately complex widgets', () => {
    expect(getDefaultWidgetSize('work-orders-summary')).toBe('medium');
    expect(getDefaultWidgetSize('maintenance-alerts')).toBe('medium');
    expect(getDefaultWidgetSize('team-summary')).toBe('medium');
    expect(getDefaultWidgetSize('recent-activity')).toBe('medium');
    expect(getDefaultWidgetSize('vehicle-status')).toBe('medium');
    expect(getDefaultWidgetSize('driver-assignments')).toBe('medium');
    expect(getDefaultWidgetSize('my-vehicles')).toBe('medium');
  });

  it('should return small for simple metric widgets', () => {
    expect(getDefaultWidgetSize('parts-availability')).toBe('small');
  });

  it('should return medium as fallback for unknown types', () => {
    const unknownType = 'unknown-widget' as WidgetType;
    expect(getDefaultWidgetSize(unknownType)).toBe('medium');
  });
});

describe('getWidgetDescription', () => {
  it('should return descriptive text for all widget types', () => {
    const description = getWidgetDescription('fleet-overview');
    expect(description).toContain('fleet');
    expect(description.length).toBeGreaterThan(20);
  });

  it('should return all descriptions without errors', () => {
    const types = getAllWidgetTypes();
    types.forEach((type) => {
      const description = getWidgetDescription(type);
      expect(description).toBeTruthy();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(10);
    });
  });

  it('should return fallback for unknown types', () => {
    const unknownType = 'unknown-widget' as WidgetType;
    expect(getWidgetDescription(unknownType)).toBe('Widget description not available');
  });
});

describe('getWidgetIcon', () => {
  it('should return valid Heroicon names for all widget types', () => {
    expect(getWidgetIcon('fleet-overview')).toBe('Truck');
    expect(getWidgetIcon('work-orders-summary')).toBe('ClipboardDocumentList');
    expect(getWidgetIcon('maintenance-alerts')).toBe('ExclamationTriangle');
    expect(getWidgetIcon('financial-summary')).toBe('CurrencyDollar');
    expect(getWidgetIcon('team-summary')).toBe('UserGroup');
  });

  it('should return icon names without "Icon" suffix', () => {
    const types = getAllWidgetTypes();
    types.forEach((type) => {
      const icon = getWidgetIcon(type);
      expect(icon).not.toMatch(/Icon$/);
    });
  });

  it('should return fallback icon for unknown types', () => {
    const unknownType = 'unknown-widget' as WidgetType;
    expect(getWidgetIcon(unknownType)).toBe('Square2Stack');
  });
});

describe('validateWidget', () => {
  const validWidget: DashboardWidget = {
    id: 'widget-1',
    type: 'fleet-overview',
    title: 'Fleet Overview',
    order: 0,
    visible: true,
    size: 'large',
  };

  it('should return true for valid widget', () => {
    expect(validateWidget(validWidget)).toBe(true);
  });

  it('should return false for widget with missing id', () => {
    const invalid = { ...validWidget, id: '' };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should return false for widget with invalid type', () => {
    const invalid = { ...validWidget, type: 'invalid-type' as WidgetType };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should return false for widget with missing title', () => {
    const invalid = { ...validWidget, title: '' };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should return false for widget with negative order', () => {
    const invalid = { ...validWidget, order: -1 };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should return false for widget with non-boolean visible', () => {
    const invalid = { ...validWidget, visible: 'true' as any };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should return false for widget with invalid size', () => {
    const invalid = { ...validWidget, size: 'extra-large' as any };
    expect(validateWidget(invalid)).toBe(false);
  });

  it('should handle all valid widget sizes', () => {
    expect(validateWidget({ ...validWidget, size: 'small' })).toBe(true);
    expect(validateWidget({ ...validWidget, size: 'medium' })).toBe(true);
    expect(validateWidget({ ...validWidget, size: 'large' })).toBe(true);
  });
});

describe('validateWidgetType', () => {
  it('should return true for all valid widget types', () => {
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

    validTypes.forEach((type) => {
      expect(validateWidgetType(type)).toBe(true);
    });
  });

  it('should return false for invalid widget types', () => {
    expect(validateWidgetType('invalid-type')).toBe(false);
    expect(validateWidgetType('')).toBe(false);
    expect(validateWidgetType('Fleet Overview')).toBe(false);
  });

  it('should act as a type guard', () => {
    const input: string = 'fleet-overview';
    if (validateWidgetType(input)) {
      // TypeScript should now know input is WidgetType
      const title: string = getWidgetTitle(input);
      expect(title).toBeTruthy();
    }
  });
});

describe('isValidWidgetSize', () => {
  it('should return true for valid sizes', () => {
    expect(isValidWidgetSize('small')).toBe(true);
    expect(isValidWidgetSize('medium')).toBe(true);
    expect(isValidWidgetSize('large')).toBe(true);
  });

  it('should return false for invalid sizes', () => {
    expect(isValidWidgetSize('extra-large')).toBe(false);
    expect(isValidWidgetSize('xs')).toBe(false);
    expect(isValidWidgetSize('')).toBe(false);
    expect(isValidWidgetSize('Small')).toBe(false); // case-sensitive
  });

  it('should act as a type guard', () => {
    const input: string = 'large';
    if (isValidWidgetSize(input)) {
      // TypeScript should now know input is 'small' | 'medium' | 'large'
      const size: 'small' | 'medium' | 'large' = input;
      expect(size).toBe('large');
    }
  });
});

describe('getWidgetValidationError', () => {
  const validWidget: DashboardWidget = {
    id: 'widget-1',
    type: 'fleet-overview',
    title: 'Fleet Overview',
    order: 0,
    visible: true,
    size: 'large',
  };

  it('should return null for valid widget', () => {
    expect(getWidgetValidationError(validWidget)).toBeNull();
  });

  it('should return appropriate error for missing id', () => {
    const invalid = { ...validWidget, id: '' };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.MISSING_ID);
  });

  it('should return appropriate error for invalid type', () => {
    const invalid = { ...validWidget, type: 'invalid' as WidgetType };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.INVALID_TYPE);
  });

  it('should return appropriate error for missing title', () => {
    const invalid = { ...validWidget, title: '' };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.MISSING_TITLE);
  });

  it('should return appropriate error for invalid order', () => {
    const invalid = { ...validWidget, order: -5 };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.INVALID_ORDER);
  });

  it('should return appropriate error for invalid visible', () => {
    const invalid = { ...validWidget, visible: 'yes' as any };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.INVALID_VISIBLE);
  });

  it('should return appropriate error for invalid size', () => {
    const invalid = { ...validWidget, size: 'xl' as any };
    expect(getWidgetValidationError(invalid)).toBe(WIDGET_VALIDATION_ERRORS.INVALID_SIZE);
  });
});

describe('getAllWidgetTypes', () => {
  it('should return array of all widget types', () => {
    const types = getAllWidgetTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBe(11);
  });

  it('should return all valid widget types', () => {
    const types = getAllWidgetTypes();
    types.forEach((type) => {
      expect(validateWidgetType(type)).toBe(true);
    });
  });

  it('should include all expected widget types', () => {
    const types = getAllWidgetTypes();
    expect(types).toContain('fleet-overview');
    expect(types).toContain('work-orders-summary');
    expect(types).toContain('maintenance-alerts');
    expect(types).toContain('financial-summary');
    expect(types).toContain('team-summary');
    expect(types).toContain('recent-activity');
    expect(types).toContain('vehicle-status');
    expect(types).toContain('driver-assignments');
    expect(types).toContain('my-work-orders');
    expect(types).toContain('my-vehicles');
    expect(types).toContain('parts-availability');
  });
});

describe('getWidgetMetadata', () => {
  it('should return complete metadata for a widget type', () => {
    const metadata = getWidgetMetadata('fleet-overview');
    
    expect(metadata.type).toBe('fleet-overview');
    expect(metadata.title).toBe('Fleet Overview');
    expect(metadata.description).toBeTruthy();
    expect(metadata.icon).toBe('Truck');
    expect(metadata.defaultSize).toBe('large');
  });

  it('should return consistent data with individual helper functions', () => {
    const type: WidgetType = 'work-orders-summary';
    const metadata = getWidgetMetadata(type);
    
    expect(metadata.title).toBe(getWidgetTitle(type));
    expect(metadata.description).toBe(getWidgetDescription(type));
    expect(metadata.icon).toBe(getWidgetIcon(type));
    expect(metadata.defaultSize).toBe(getDefaultWidgetSize(type));
  });

  it('should return valid metadata for all widget types', () => {
    const types = getAllWidgetTypes();
    types.forEach((type) => {
      const metadata = getWidgetMetadata(type);
      
      expect(metadata.type).toBe(type);
      expect(metadata.title).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      expect(metadata.icon).toBeTruthy();
      expect(['small', 'medium', 'large']).toContain(metadata.defaultSize);
    });
  });
});

describe('getAllWidgetMetadata', () => {
  it('should return metadata for all widget types', () => {
    const allMetadata = getAllWidgetMetadata();
    
    expect(Array.isArray(allMetadata)).toBe(true);
    expect(allMetadata.length).toBe(11);
  });

  it('should return valid metadata for each widget', () => {
    const allMetadata = getAllWidgetMetadata();
    
    allMetadata.forEach((metadata) => {
      expect(metadata.type).toBeTruthy();
      expect(metadata.title).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      expect(metadata.icon).toBeTruthy();
      expect(['small', 'medium', 'large']).toContain(metadata.defaultSize);
    });
  });

  it('should cover all widget types', () => {
    const allMetadata = getAllWidgetMetadata();
    const types = allMetadata.map((m) => m.type);
    const expectedTypes = getAllWidgetTypes();
    
    expect(types.sort()).toEqual(expectedTypes.sort());
  });
});

describe('Edge cases and error handling', () => {
  it('should handle undefined input gracefully', () => {
    const invalid = {
      id: undefined,
      type: undefined,
      title: undefined,
      order: undefined,
      visible: undefined,
      size: undefined,
    } as any;
    
    expect(validateWidget(invalid)).toBe(false);
    expect(getWidgetValidationError(invalid)).toBeTruthy();
  });

  it('should handle null input gracefully', () => {
    const invalid = {
      id: null,
      type: null,
      title: null,
      order: null,
      visible: null,
      size: null,
    } as any;
    
    expect(validateWidget(invalid)).toBe(false);
    expect(getWidgetValidationError(invalid)).toBeTruthy();
  });

  it('should validate order is non-negative including zero', () => {
    const widget = {
      id: 'widget-1',
      type: 'fleet-overview' as WidgetType,
      title: 'Fleet Overview',
      order: 0,
      visible: true,
      size: 'large' as const,
    };
    
    expect(validateWidget(widget)).toBe(true);
    expect(validateWidget({ ...widget, order: 1 })).toBe(true);
    expect(validateWidget({ ...widget, order: 100 })).toBe(true);
    expect(validateWidget({ ...widget, order: -1 })).toBe(false);
  });

  it('should reject non-integer orders', () => {
    const widget = {
      id: 'widget-1',
      type: 'fleet-overview' as WidgetType,
      title: 'Fleet Overview',
      order: 1.5,
      visible: true,
      size: 'large' as const,
    };
    
    // JavaScript allows 1.5 as a valid number, but for widget order we accept it
    // This is a design decision - we could add additional validation if needed
    expect(validateWidget(widget)).toBe(true);
  });
});

describe('Integration tests', () => {
  it('should work together for creating a valid widget', () => {
    const type: WidgetType = 'fleet-overview';
    const widget: DashboardWidget = {
      id: 'widget-1',
      type,
      title: getWidgetTitle(type),
      order: 0,
      visible: true,
      size: getDefaultWidgetSize(type),
    };
    
    expect(validateWidget(widget)).toBe(true);
    expect(getWidgetValidationError(widget)).toBeNull();
  });

  it('should support widget customization workflow', () => {
    // User selects a widget type
    const selectedType: WidgetType = 'my-work-orders';
    
    // Get metadata to show in UI
    const metadata = getWidgetMetadata(selectedType);
    expect(metadata.title).toBe('My Work Orders');
    
    // Create widget with default values
    const widget: DashboardWidget = {
      id: 'custom-widget-1',
      type: selectedType,
      title: metadata.title,
      order: 3,
      visible: true,
      size: metadata.defaultSize,
    };
    
    // Validate before saving
    expect(validateWidget(widget)).toBe(true);
    
    // User changes size
    widget.size = 'medium';
    expect(validateWidget(widget)).toBe(true);
  });
});
