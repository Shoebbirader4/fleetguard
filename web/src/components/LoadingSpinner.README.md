# LoadingSpinner Component

A reusable loading spinner component that follows the FleetGuard AI design system.

## Features

- **Three size variants**: `sm`, `md` (default), `lg`
- **Dark mode support**: Automatically adjusts colors for dark theme
- **Accessible**: Includes proper ARIA attributes and screen reader text
- **Lightweight**: No external dependencies
- **FleetGuard AI branded**: Uses the blue-600 (#2563EB) primary color

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the spinner |
| `className` | `string` | `''` | Additional CSS classes to apply |

## Size Reference

- **sm**: 16px × 16px (h-4 w-4)
- **md**: 20px × 20px (h-5 w-5)
- **lg**: 32px × 32px (h-8 w-8)

## Usage

### Basic Usage

```tsx
import LoadingSpinner from '@/components/LoadingSpinner';

function MyComponent() {
  return <LoadingSpinner />;
}
```

### With Size Variants

```tsx
<LoadingSpinner size="sm" />  // Small
<LoadingSpinner size="md" />  // Medium (default)
<LoadingSpinner size="lg" />  // Large
```

### In Buttons

```tsx
<button disabled className="flex items-center gap-2">
  <LoadingSpinner size="sm" className="border-white" />
  Loading...
</button>
```

### Centered in Cards

```tsx
<div className="flex items-center justify-center h-32">
  <LoadingSpinner size="lg" />
</div>
```

### Inline with Text

```tsx
<p className="flex items-center gap-2">
  <LoadingSpinner size="sm" />
  <span>Fetching data...</span>
</p>
```

### Full Page Loading

```tsx
<div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75">
  <div className="text-center">
    <LoadingSpinner size="lg" />
    <p className="mt-4 text-gray-600">Loading application...</p>
  </div>
</div>
```

## Accessibility

The component includes:
- `role="status"` for screen readers
- `aria-label="Loading"` for context
- Hidden text "Loading..." for screen readers

## Requirements Coverage

- **Requirement 5.3**: Loading states appear within 300ms of action initiation
- **Requirement 5.5**: Mobile layouts work on screens as small as 320px width

## Design System Compliance

The component follows the FleetGuard AI design system:
- Primary color: `#2563EB` (blue-600)
- Dark mode color: blue-400 for better contrast
- Smooth animation using Tailwind's `animate-spin`
- Border-based spinner pattern (lightweight, no SVG needed)

## Testing

Run tests with:

```bash
npm test -- LoadingSpinner.test.tsx --run
```

## Examples

See `LoadingSpinner.example.tsx` for comprehensive usage examples including:
- All size variants
- Different use cases (buttons, cards, forms)
- Dark mode demonstration
- Loading state patterns
