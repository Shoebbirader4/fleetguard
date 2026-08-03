# Component Styling Guide

**Task 27.2 - Standardize component styling**  
**Requirements: 5.1, 5.2**

This guide documents the standardized component styling system for FleetGuard AI. All components follow consistent patterns for buttons, cards, forms, badges, and support both light and dark themes.

## Design System Reference

The design system is centrally defined in `config/designSystem.ts` and provides:
- Color palette (FleetGuard AI Blue #2563EB primary)
- Typography scale (Inter font family)
- Component patterns with consistent styling
- Dark mode support for all components
- WCAG AA accessibility compliance (4.5:1 contrast ratio)

## Standardized Components

### Button Component

**Location:** `components/Button.tsx`

**Variants:**
- `primary` - Blue background, white text (default)
- `secondary` - White/gray background with border
- `danger` - Red background for destructive actions
- `success` - Green background for positive actions

**Sizes:**
- `sm` - Small (px-3 py-1.5 text-sm)
- `md` - Medium (px-4 py-2 text-base) - default
- `lg` - Large (px-6 py-3 text-lg)

**Features:**
- Loading state with spinner
- Icon support
- Full width option
- Disabled state
- Focus ring for accessibility
- Dark mode support

**Usage:**
```tsx
import Button from './components/Button';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Danger button with loading
<Button variant="danger" isLoading={isDeleting}>
  Delete
</Button>

// Secondary button with icon
<Button variant="secondary" icon={<PlusIcon />}>
  Add Item
</Button>
```

### Card Component

**Location:** `components/Card.tsx`

**Variants:**
- `default` - Standard card with shadow-sm
- `compact` - Less padding (p-4 instead of p-6)
- `elevated` - Larger shadow (shadow-md)

**Features:**
- Consistent shadows and borders
- Hover effect option
- Dark mode support
- Rounded corners

**Usage:**
```tsx
import Card from './components/Card';

// Default card with hover effect
<Card variant="default" hover>
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>

// Compact card
<Card variant="compact">
  <div>Compact content</div>
</Card>
```

### Input Component

**Location:** `components/Input.tsx`

**Features:**
- Label with optional required indicator
- Error state with error message
- Helper text
- Focus states (blue ring)
- Disabled state
- Dark mode support

**Usage:**
```tsx
import Input from './components/Input';

// Basic input with label
<Input 
  label="Email Address" 
  type="email" 
  required
  placeholder="you@example.com"
/>

// Input with error
<Input 
  label="Username" 
  error="Username is already taken"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
/>

// Input with helper text
<Input 
  label="Password" 
  type="password" 
  helperText="Must be at least 8 characters"
/>
```

### Select Component

**Location:** `components/Select.tsx`

**Features:**
- Label with optional required indicator
- Error state with error message
- Helper text
- Options array support
- Focus states
- Dark mode support

**Usage:**
```tsx
import Select from './components/Select';

// With options array
<Select 
  label="Status" 
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
  value={status}
  onChange={(e) => setStatus(e.target.value)}
/>

// With children
<Select label="Priority">
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
</Select>
```

### Textarea Component

**Location:** `components/Textarea.tsx`

**Features:**
- Label with optional required indicator
- Error state with error message
- Helper text
- Focus states
- Non-resizable by default
- Dark mode support

**Usage:**
```tsx
import Textarea from './components/Textarea';

<Textarea 
  label="Description" 
  rows={4}
  placeholder="Enter description..."
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

### Badge Component

**Location:** `components/Badge.tsx`

**Variants:**
- `blue` / `info` - Information states
- `green` / `success` - Success/active states
- `yellow` / `warning` - Warning/pending states
- `red` / `error` - Error/critical states
- `gray` - Neutral/inactive states

**Contexts:**
- `status` - Auto-color based on status value
- `priority` - Auto-color based on priority level
- `custom` - Manual variant selection

**Usage:**
```tsx
import Badge from './components/Badge';

// Status badge (auto-colors)
<Badge context="status" value="completed">
  Completed
</Badge>

// Priority badge (auto-colors)
<Badge context="priority" value="high">
  High Priority
</Badge>

// Custom variant
<Badge variant="success">
  Active
</Badge>
```

## Layout Patterns

For page structure and layouts that aren't components, use the patterns from `utils/stylePatterns.ts`:

```tsx
import { pageStyles, modalStyles, tableStyles } from '../utils/stylePatterns';

// Page container
<div className={pageStyles.container}>
  <header className={pageStyles.header}>
    <div className={pageStyles.headerContent}>
      {/* Header content */}
    </div>
  </header>
  <main className={pageStyles.mainContent}>
    {/* Main content */}
  </main>
</div>

// Modal
<div className={modalStyles.overlay}>
  <div className={modalStyles.container}>
    {/* Modal content */}
  </div>
</div>

// Table
<div className={tableStyles.container}>
  <table className={tableStyles.table}>
    <thead className={tableStyles.thead}>
      <tr>
        <th className={tableStyles.th}>Name</th>
      </tr>
    </thead>
    <tbody className={tableStyles.tbody}>
      <tr>
        <td className={tableStyles.td}>Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Theme Support

All components support dark mode automatically through Tailwind's `dark:` variant. The application uses a theme store to manage the current theme.

**Colors in Dark Mode:**
- Backgrounds: gray-800, gray-900
- Text: gray-100, gray-200
- Borders: gray-600, gray-700
- Primary remains: blue-500, blue-600

## Accessibility

All components meet WCAG AA standards:
- **Contrast:** 4.5:1 minimum ratio
- **Focus states:** Visible focus rings on all interactive elements
- **Keyboard navigation:** Full support
- **Screen readers:** Proper labels and ARIA attributes

## Migration Guide

If you have hardcoded styles, migrate to standardized components:

### Before (Hardcoded):
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Save
</button>

<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
  Content
</div>

<input className="w-full px-3 py-2 border border-gray-300 rounded-lg..." />
```

### After (Standardized):
```tsx
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';

<Button variant="primary">Save</Button>

<Card variant="default">
  Content
</Card>

<Input label="Field Name" />
```

## Testing Components

All standardized components have test files:
- `Button.test.tsx`
- `Card.test.tsx`
- `Input.test.tsx`
- `Badge.test.tsx`
- etc.

Run tests with:
```bash
npm test
```

## Contributing

When adding new components:
1. Follow the existing patterns in `config/designSystem.ts`
2. Support all variants (primary, secondary, danger, etc.)
3. Include dark mode support
4. Add proper TypeScript types
5. Write tests
6. Document in this guide
7. Ensure WCAG AA compliance

## Questions?

See the design system configuration: `config/designSystem.ts`
See the requirements: `.kiro/specs/frontend-upgrade/requirements.md` (sections 5.1, 5.2)
See the design document: `.kiro/specs/frontend-upgrade/design.md`
