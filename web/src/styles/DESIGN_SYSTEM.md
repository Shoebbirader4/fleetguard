# FleetGuard AI Design System

This document provides comprehensive guidelines for using the FleetGuard AI design system with standardized component styling.

## Color Palette

### Primary Colors (FleetGuard AI Blue)
- **Primary**: `#2563EB` (blue-600) - Main brand color
- **Primary Dark**: `#1E40AF` (blue-800) - Hover states
- **Primary Light**: `#3B82F6` (blue-500) - Active states
- **Primary Lighter**: `#DBEAFE` (blue-100) - Backgrounds

### Semantic Colors
- **Success**: `#10B981` (green-500)
- **Warning**: `#F59E0B` (amber-500)
- **Error**: `#EF4444` (red-500)
- **Info**: `#3B82F6` (blue-500)

### Neutral Colors
- Gray scale: gray-50 to gray-900
- Dark mode: Inverse gray scale

## Component Patterns

### Buttons

Use `buttonStyles` from `utils/stylePatterns.ts`:

```tsx
import { buttonStyles } from '../utils/stylePatterns';

// Primary button
<button className={buttonStyles.primary}>Save Changes</button>

// Secondary button
<button className={buttonStyles.secondary}>Cancel</button>

// Danger button
<button className={buttonStyles.danger}>Delete</button>

// Ghost button
<button className={buttonStyles.ghost}>View Details</button>
```

**Button Features:**
- Consistent padding: `px-4 py-2`
- Rounded corners: `rounded-lg`
- Focus ring: `focus:ring-2`
- Disabled states: `disabled:opacity-50 disabled:cursor-not-allowed`
- Smooth transitions: `transition-colors`
- Full dark mode support

### Cards

Use `cardVariants` from `utils/stylePatterns.ts`:

```tsx
import { cardVariants } from '../utils/stylePatterns';

// Default card
<div className={cardVariants.default}>...</div>

// Hover card (with shadow transition)
<div className={cardVariants.hover}>...</div>

// Info card (blue background)
<div className={cardVariants.info}>...</div>

// Warning card (yellow background)
<div className={cardVariants.warning}>...</div>

// Success card (green background)
<div className={cardVariants.success}>...</div>

// Error card (red background)
<div className={cardVariants.error}>...</div>
```

**Card Features:**
- Rounded corners: `rounded-lg`
- Shadow: `shadow-sm` (hover: `shadow-md`)
- Border: `border border-gray-200 dark:border-gray-700`
- Padding: `p-6`
- Full dark mode support

### Form Inputs

Use `inputStyles`, `selectStyles`, `textareaStyles` from `utils/stylePatterns.ts`:

```tsx
import { inputStyles, selectStyles, textareaStyles, labelStyles } from '../utils/stylePatterns';

// Text input
<label className={labelStyles}>Email</label>
<input type="email" className={inputStyles} />

// Select dropdown
<label className={labelStyles}>Role</label>
<select className={selectStyles}>
  <option>Option 1</option>
</select>

// Textarea
<label className={labelStyles}>Description</label>
<textarea className={textareaStyles} rows={4} />
```

**Input Features:**
- Full width: `w-full`
- Consistent padding: `px-3 py-2`
- Border with focus states: `focus:ring-2 focus:ring-blue-500`
- Disabled states: `disabled:bg-gray-50 disabled:text-gray-500`
- Dark mode support: `dark:bg-gray-700 dark:border-gray-600`

### Badges

Use `badgeStyles` from `utils/stylePatterns.ts`:

```tsx
import { badgeStyles, getStatusBadgeStyle, getPriorityBadgeStyle } from '../utils/stylePatterns';

// Default badge
<span className={badgeStyles.default}>New</span>

// Success badge
<span className={badgeStyles.success}>Active</span>

// Warning badge
<span className={badgeStyles.warning}>Pending</span>

// Error badge
<span className={badgeStyles.error}>Failed</span>

// Dynamic status badge
<span className={getStatusBadgeStyle('active')}>Active</span>

// Dynamic priority badge
<span className={getPriorityBadgeStyle('high')}>High Priority</span>
```

**Badge Features:**
- Inline flex: `inline-flex items-center`
- Small size: `text-xs`
- Rounded: `rounded-full`
- Consistent padding: `px-2.5 py-0.5`
- Font weight: `font-medium`
- Semantic colors with dark mode

### Loading Spinners

Use `getSpinnerClass` from `utils/stylePatterns.ts`:

```tsx
import { getSpinnerClass } from '../utils/stylePatterns';

// Small spinner
<div className={getSpinnerClass('sm')} />

// Medium spinner (default)
<div className={getSpinnerClass('md')} />

// Large spinner
<div className={getSpinnerClass('lg')} />
```

### Modals

Use `modalStyles` from `utils/stylePatterns.ts`:

```tsx
import { modalStyles } from '../utils/stylePatterns';

<div className={modalStyles.overlay}>
  <div className={modalStyles.container}>
    <div className={modalStyles.icon.info}>
      {/* Icon SVG */}
    </div>
    {/* Modal content */}
  </div>
</div>
```

### Tables

Use `tableStyles` from `utils/stylePatterns.ts`:

```tsx
import { tableStyles } from '../utils/stylePatterns';

<div className={tableStyles.container}>
  <table className={tableStyles.table}>
    <thead className={tableStyles.thead}>
      <tr>
        <th className={tableStyles.th}>Name</th>
      </tr>
    </thead>
    <tbody className={tableStyles.tbody}>
      <tr>
        <td className={tableStyles.td}>John Doe</td>
        <td className={tableStyles.tdSecondary}>john@example.com</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Typography

**Font Family**: Inter (existing)

**Type Scale:**
- **Heading 1**: `text-4xl font-bold leading-tight` (36px)
- **Heading 2**: `text-3xl font-bold leading-tight` (30px)
- **Heading 3**: `text-2xl font-semibold leading-snug` (24px)
- **Heading 4**: `text-xl font-semibold leading-snug` (20px)
- **Body Large**: `text-lg font-normal leading-relaxed` (18px)
- **Body**: `text-base font-normal leading-normal` (16px)
- **Body Small**: `text-sm font-normal leading-normal` (14px)
- **Caption**: `text-xs font-normal leading-tight` (12px)

## Helper Functions

### getButtonClass
```tsx
import { getButtonClass } from '../utils/stylePatterns';

const className = getButtonClass('primary', 'w-full'); // Adds additional classes
```

### getCardClass
```tsx
import { getCardClass } from '../utils/stylePatterns';

const className = getCardClass('hover', 'mt-4'); // Adds additional classes
```

### getBadgeClass
```tsx
import { getBadgeClass } from '../utils/stylePatterns';

const className = getBadgeClass('success', 'ml-2'); // Adds additional classes
```

## Accessibility

All components meet WCAG AA accessibility standards:
- **Contrast Ratio**: 4.5:1 minimum
- **Interactive Elements**: Hover and focus states
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels

## Dark Mode

All component patterns support dark mode automatically using Tailwind's `dark:` variants. The theme is controlled by the `themeStore` and applied to the root HTML element.

## Usage Guidelines

1. **Always use the standardized patterns** from `utils/stylePatterns.ts`
2. **Don't create custom button/input styles** unless absolutely necessary
3. **Use helper functions** for dynamic styling needs
4. **Test in both light and dark modes**
5. **Ensure proper focus states** for accessibility
6. **Follow the semantic color scheme** for consistency

## Migration Guide

### Before (Old Pattern)
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
  Save
</button>
```

### After (New Pattern)
```tsx
import { buttonStyles } from '../utils/stylePatterns';

<button className={buttonStyles.primary}>
  Save
</button>
```

## Examples

See `web/src/components/*.example.tsx` files for complete working examples of each component pattern.

## Questions?

Refer to:
- `web/src/utils/stylePatterns.ts` - Source of truth for all patterns
- `web/src/styles/DESIGN_SYSTEM.md` - This document
- `.kiro/specs/frontend-upgrade/design.md` - Original design specification
