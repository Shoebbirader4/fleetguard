# Widget Helper Functions

This document provides comprehensive documentation for the widget helper utility functions in `widgetHelpers.ts`.

## Overview

The widget helper functions provide utilities for working with dashboard widgets, including:
- Getting widget titles, descriptions, icons, and default sizes
- Validating widget configurations
- Type guards for runtime type checking
- Metadata aggregation for UI components

## Requirements

Implements Requirement 8.1: Dashboard widgets must load asynchronously and not block page render

## API Reference

### Core Helper Functions

#### `getWidgetTitle(type: WidgetType): string`

Returns a human-readable display title for a widget type.

**Parameters:**
- `type`: The widget type identifier

**Returns:** Formatted display title

**Example:**
```typescript
import { getWidgetTitle } from '../utils/widgetHelpers';

const title = getWidgetTitle('fleet-overview');
console.log(title); // "Fleet Overview"
```

**All Widget Titles:**
- `fleet-overview` → "Fleet Overview"
- `work-orders-summary` → "Work Orders Summary"
- `maintenance-alerts` → "Maintenance Alerts"
- `financial-summary` → "Financial Summary"
- `team-summary` → "Team Summary"
- `recent-activity` → "Recent Activity"
- `vehicle-status` → "Vehicle Status"
- `driver-assignments` → "Driver Assignments"
- `my-work-orders` → "My Work Orders"
- `my-vehicles` → "My Vehicles"
- `parts-availability` → "Parts Availability"

---

#### `getDefaultWidgetSize(type: WidgetType): 'small' | 'medium' | 'large'`

Returns the default size for a widget type based on information density.

**Size Guidelines:**
- **small**: Simple metrics or single data points
- **medium**: Lists or moderate complexity data
- **large**: Complex dashboards or detailed information

**Parameters:**
- `type`: The widget type identifier

**Returns:** Default size ('small', 'medium', or 'large')

**Example:**
```typescript
import { getDefaultWidgetSize } from '../utils/widgetHelpers';

const size = getDefaultWidgetSize('fleet-overview');
console.log(size); // "large"
```

**Widget Size Reference:**
- **Large Widgets**: `fleet-overview`, `financial-summary`, `my-work-orders`
- **Medium Widgets**: `work-orders-summary`, `maintenance-alerts`, `team-summary`, `recent-activity`, `vehicle-status`, `driver-assignments`, `my-vehicles`
- **Small Widgets**: `parts-availability`

---

#### `getWidgetDescription(type: WidgetType): string`

Returns descriptive text explaining what a widget displays.

**Parameters:**
- `type`: The widget type identifier

**Returns:** Description of the widget's purpose and content

**Example:**
```typescript
import { getWidgetDescription } from '../utils/widgetHelpers';

const description = getWidgetDescription('fleet-overview');
console.log(description);
// "Overview of your entire fleet including total vehicles, active vehicles, and fleet health metrics"
```

---

#### `getWidgetIcon(type: WidgetType): string`

Returns the icon name for a widget type (Heroicons naming convention).

**Parameters:**
- `type`: The widget type identifier

**Returns:** Icon name compatible with Heroicons (without 'Icon' suffix)

**Example:**
```typescript
import { getWidgetIcon } from '../utils/widgetHelpers';
import { TruckIcon } from '@heroicons/react/24/outline';

const iconName = getWidgetIcon('fleet-overview');
console.log(iconName); // "Truck"

// Use with dynamic import or icon mapping
const iconMap = {
  Truck: TruckIcon,
  // ... other icons
};
const Icon = iconMap[iconName];
```

**Widget Icon Reference:**
- `fleet-overview` → "Truck"
- `work-orders-summary` → "ClipboardDocumentList"
- `maintenance-alerts` → "ExclamationTriangle"
- `financial-summary` → "CurrencyDollar"
- `team-summary` → "UserGroup"
- `recent-activity` → "Clock"
- `vehicle-status` → "CheckCircle"
- `driver-assignments` → "Users"
- `my-work-orders` → "Wrench"
- `my-vehicles` → "Truck"
- `parts-availability` → "Cube"

---

### Validation Functions

#### `validateWidget(widget: DashboardWidget): boolean`

Validates widget structure for data integrity.

**Validation Checks:**
- All required fields are present (id, type, title, order, visible, size)
- Widget type is valid
- Size is valid ('small', 'medium', or 'large')
- Order is a non-negative number
- Visible is a boolean

**Parameters:**
- `widget`: Widget object to validate

**Returns:** `true` if valid, `false` otherwise

**Example:**
```typescript
import { validateWidget } from '../utils/widgetHelpers';

const widget = {
  id: 'widget-1',
  type: 'fleet-overview',
  title: 'Fleet Overview',
  order: 0,
  visible: true,
  size: 'large',
};

if (validateWidget(widget)) {
  console.log('Widget is valid!');
} else {
  console.error('Widget validation failed');
}
```

---

#### `validateWidgetType(type: string): type is WidgetType`

Type guard to check if a string is a valid WidgetType. Provides runtime type checking.

**Parameters:**
- `type`: String to check

**Returns:** `true` if valid WidgetType, `false` otherwise

**Example:**
```typescript
import { validateWidgetType, getWidgetTitle } from '../utils/widgetHelpers';

const userInput: string = 'fleet-overview';

if (validateWidgetType(userInput)) {
  // TypeScript now knows userInput is WidgetType
  const title = getWidgetTitle(userInput);
  console.log(title);
}
```

---

#### `isValidWidgetSize(size: string): size is 'small' | 'medium' | 'large'`

Type guard to validate widget size values.

**Parameters:**
- `size`: String to check

**Returns:** `true` if valid size, `false` otherwise

**Example:**
```typescript
import { isValidWidgetSize } from '../utils/widgetHelpers';

const userSize: string = 'large';

if (isValidWidgetSize(userSize)) {
  // TypeScript knows userSize is 'small' | 'medium' | 'large'
  widget.size = userSize;
}
```

---

#### `getWidgetValidationError(widget: Partial<DashboardWidget>): string | null`

Performs validation and returns a descriptive error message if validation fails.

**Parameters:**
- `widget`: Widget to validate (can be partial)

**Returns:** Error message string if invalid, `null` if valid

**Example:**
```typescript
import { getWidgetValidationError } from '../utils/widgetHelpers';

const widget = {
  id: '',
  type: 'fleet-overview',
  title: 'Fleet Overview',
  order: -1,
  visible: true,
  size: 'large',
};

const error = getWidgetValidationError(widget);
if (error) {
  console.error('Validation failed:', error);
  // "Widget must have a valid id"
}
```

**Error Messages:**
- `MISSING_ID`: "Widget must have a valid id"
- `INVALID_TYPE`: "Widget type is not valid"
- `MISSING_TITLE`: "Widget must have a title"
- `INVALID_ORDER`: "Widget order must be a non-negative number"
- `INVALID_VISIBLE`: "Widget visible must be a boolean"
- `INVALID_SIZE`: "Widget size must be \"small\", \"medium\", or \"large\""

---

### Metadata Functions

#### `getWidgetMetadata(type: WidgetType): WidgetMetadata`

Returns complete metadata for a widget type.

**Returns:** Object containing:
- `type`: Widget type
- `title`: Display title
- `description`: Descriptive text
- `icon`: Icon name
- `defaultSize`: Default size

**Example:**
```typescript
import { getWidgetMetadata } from '../utils/widgetHelpers';

const metadata = getWidgetMetadata('fleet-overview');
console.log(metadata);
/*
{
  type: 'fleet-overview',
  title: 'Fleet Overview',
  description: 'Overview of your entire fleet...',
  icon: 'Truck',
  defaultSize: 'large'
}
*/
```

---

#### `getAllWidgetTypes(): WidgetType[]`

Returns an array of all valid widget types.

**Returns:** Array of all available widget types

**Example:**
```typescript
import { getAllWidgetTypes } from '../utils/widgetHelpers';

const allTypes = getAllWidgetTypes();
console.log(allTypes);
// ['fleet-overview', 'work-orders-summary', ...]
```

---

#### `getAllWidgetMetadata(): WidgetMetadata[]`

Returns metadata for all widget types. Useful for rendering widget catalogs.

**Returns:** Array of metadata objects for all widgets

**Example:**
```typescript
import { getAllWidgetMetadata } from '../utils/widgetHelpers';

const allWidgets = getAllWidgetMetadata();

// Render widget catalog
allWidgets.forEach(widget => {
  console.log(`${widget.title}: ${widget.description}`);
});
```

---

## Usage Examples

### Example 1: Creating a New Widget

```typescript
import {
  getWidgetTitle,
  getDefaultWidgetSize,
  validateWidget,
} from '../utils/widgetHelpers';
import { DashboardWidget, WidgetType } from '../types/dashboard';

function createWidget(type: WidgetType, order: number): DashboardWidget {
  const widget: DashboardWidget = {
    id: `widget-${Date.now()}`,
    type,
    title: getWidgetTitle(type),
    order,
    visible: true,
    size: getDefaultWidgetSize(type),
  };

  if (!validateWidget(widget)) {
    throw new Error('Failed to create valid widget');
  }

  return widget;
}

const newWidget = createWidget('fleet-overview', 0);
```

### Example 2: Widget Selector Component

```typescript
import React from 'react';
import { getAllWidgetMetadata } from '../utils/widgetHelpers';

export function WidgetSelector({ onSelect }) {
  const widgets = getAllWidgetMetadata();

  return (
    <div className="grid grid-cols-3 gap-4">
      {widgets.map((widget) => (
        <button
          key={widget.type}
          onClick={() => onSelect(widget.type)}
          className="p-4 border rounded hover:bg-gray-50"
        >
          <h3 className="font-semibold">{widget.title}</h3>
          <p className="text-sm text-gray-600">{widget.description}</p>
          <span className="text-xs text-gray-500">
            Default size: {widget.defaultSize}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### Example 3: Widget Validation Before Save

```typescript
import {
  validateWidget,
  getWidgetValidationError,
} from '../utils/widgetHelpers';
import { DashboardWidget } from '../types/dashboard';

function saveDashboardLayout(widgets: DashboardWidget[]) {
  // Validate all widgets before saving
  const errors: string[] = [];

  widgets.forEach((widget, index) => {
    const error = getWidgetValidationError(widget);
    if (error) {
      errors.push(`Widget ${index + 1}: ${error}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }

  // All widgets are valid, proceed with save
  return supabase
    .from('dashboard_layouts')
    .upsert({ widgets })
    .select();
}
```

### Example 4: Runtime Type Checking from API

```typescript
import { validateWidgetType, validateWidget } from '../utils/widgetHelpers';

async function loadDashboardFromAPI() {
  const response = await fetch('/api/dashboard');
  const data = await response.json();

  // Validate widgets from untrusted source
  const validWidgets = data.widgets.filter((widget: any) => {
    // Type guard for widget type
    if (!validateWidgetType(widget.type)) {
      console.warn(`Invalid widget type: ${widget.type}`);
      return false;
    }

    // Full widget validation
    if (!validateWidget(widget)) {
      console.warn(`Invalid widget structure:`, widget);
      return false;
    }

    return true;
  });

  return validWidgets;
}
```

### Example 5: Widget Customization UI

```typescript
import React, { useState } from 'react';
import {
  getWidgetTitle,
  getWidgetDescription,
  isValidWidgetSize,
} from '../utils/widgetHelpers';
import { DashboardWidget } from '../types/dashboard';

export function WidgetCustomizer({ widget, onUpdate }) {
  const [size, setSize] = useState(widget.size);

  const handleSizeChange = (newSize: string) => {
    if (isValidWidgetSize(newSize)) {
      setSize(newSize);
      onUpdate({ ...widget, size: newSize });
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">{getWidgetTitle(widget.type)}</h3>
      <p className="text-sm text-gray-600">
        {getWidgetDescription(widget.type)}
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Size:</label>
        <select
          value={size}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  );
}
```

## Testing

The widget helper functions are thoroughly tested in `widgetHelpers.test.ts`:

- ✅ 48 unit tests covering all functions
- ✅ Edge case testing (undefined, null, invalid inputs)
- ✅ Type guard validation
- ✅ Integration tests for complete workflows

Run tests:
```bash
npm run test -- widgetHelpers.test.ts
```

## Integration with useDashboard Hook

The `useDashboard.ts` hook imports and uses these helper functions:

```typescript
import { getWidgetTitle, getDefaultWidgetSize } from '../utils/widgetHelpers';

// Used when creating default dashboard layouts
const defaultWidgets = DEFAULT_WIDGETS_BY_ROLE[user.role].map((type, index) => ({
  id: `widget-${index}`,
  type,
  title: getWidgetTitle(type),
  order: index,
  visible: true,
  size: getDefaultWidgetSize(type),
}));
```

## Best Practices

1. **Always validate widgets from external sources** (API, database) using `validateWidget()` or `getWidgetValidationError()`

2. **Use type guards** (`validateWidgetType`, `isValidWidgetSize`) when working with user input or dynamic data

3. **Leverage metadata functions** (`getWidgetMetadata`, `getAllWidgetMetadata`) for UI components instead of hardcoding widget information

4. **Handle validation errors gracefully** by checking `getWidgetValidationError()` and providing user-friendly feedback

5. **Keep widget configurations consistent** by using `getDefaultWidgetSize()` when creating new widgets

## File Structure

```
web/src/
├── utils/
│   ├── widgetHelpers.ts          # Main implementation
│   ├── widgetHelpers.test.ts     # Unit tests
│   └── WIDGET_HELPERS_README.md  # This documentation
├── hooks/
│   └── useDashboard.ts           # Uses widget helpers
└── types/
    └── dashboard.ts              # Type definitions
```

## Related Files

- **Types**: `web/src/types/dashboard.ts`
- **Hooks**: `web/src/hooks/useDashboard.ts`
- **Requirements**: `.kiro/specs/frontend-upgrade/requirements.md` (Requirement 8.1)
- **Design**: `.kiro/specs/frontend-upgrade/design.md`
