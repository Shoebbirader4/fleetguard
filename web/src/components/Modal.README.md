# Modal Component

A fully accessible, reusable modal component for the FleetGuard AI application.

## Features

✅ **Accessibility (WCAG AA Compliant)**
- Focus trap keeps keyboard navigation within modal
- Auto-focuses first focusable element when opened
- Restores focus to previous element when closed
- Proper ARIA attributes for screen readers
- Keyboard navigation support (Tab, Shift+Tab, Escape)

✅ **User Experience**
- Backdrop click to close (configurable)
- Escape key to close (configurable)
- Close button (X) in header
- Prevents body scroll when open
- Smooth transitions and animations
- Responsive design (mobile-friendly)

✅ **Customization**
- 4 size variants: sm, md, lg, xl
- Dark mode support
- Flexible content via children prop
- Consistent with FleetGuard AI design system

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls modal visibility |
| `onClose` | `() => void` | required | Callback when modal should close |
| `title` | `string` | required | Modal title displayed in header |
| `children` | `ReactNode` | required | Modal content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Modal width |
| `closeOnBackdrop` | `boolean` | `true` | Allow closing by clicking backdrop |
| `closeOnEscape` | `boolean` | `true` | Allow closing with Escape key |

## Usage Examples

### Basic Modal

```tsx
import { useState } from 'react';
import Modal from './components/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Basic Modal"
      >
        <p>This is the modal content.</p>
      </Modal>
    </>
  );
}
```

### Form Modal

```tsx
function FormModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted:', formData);
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="User Form">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button type="submit">Submit</button>
        </div>
      </form>
    </Modal>
  );
}
```

### Large Modal with Custom Settings

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Terms and Conditions"
  size="xl"
  closeOnBackdrop={false}
  closeOnEscape={false}
>
  <div className="space-y-4">
    <p>Long content...</p>
    <div className="flex justify-end">
      <button onClick={() => setIsOpen(false)}>Accept</button>
    </div>
  </div>
</Modal>
```

### Confirmation Dialog

```tsx
function DeleteConfirmation({ itemName, onConfirm }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Confirm Deletion"
      size="sm"
    >
      <div className="space-y-4">
        <p>Are you sure you want to delete "{itemName}"?</p>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>

        <div className="flex justify-end gap-3">
          <button onClick={() => setIsOpen(false)}>Cancel</button>
          <button
            onClick={handleConfirm}
            className="bg-red-600 text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

## Size Variants

The modal comes in 4 sizes to accommodate different content needs:

- **sm**: `max-w-md` (~28rem / 448px) - Best for confirmations, alerts
- **md**: `max-w-lg` (~32rem / 512px) - Default, good for forms
- **lg**: `max-w-2xl` (~42rem / 672px) - Larger forms, content
- **xl**: `max-w-4xl` (~56rem / 896px) - Full content, documents

## Accessibility Features

### Focus Management

1. **Focus Trap**: When the modal opens, focus is trapped within it. Tab and Shift+Tab cycle through focusable elements.
2. **Auto-focus**: First focusable element (close button) receives focus on open.
3. **Focus Restoration**: When closed, focus returns to the element that opened the modal.

### Keyboard Support

| Key | Action |
|-----|--------|
| `Escape` | Close modal (if `closeOnEscape` is true) |
| `Tab` | Move to next focusable element (wraps to first) |
| `Shift + Tab` | Move to previous focusable element (wraps to last) |

### ARIA Attributes

- `role="dialog"` - Identifies the modal as a dialog
- `aria-modal="true"` - Indicates this is a modal dialog
- `aria-labelledby="modal-title"` - Links title to dialog
- `aria-hidden="true"` - Hides backdrop from screen readers
- `aria-label="Close modal"` - Labels the close button

## Styling

The Modal component uses Tailwind CSS and follows the FleetGuard AI design system:

- **Colors**: Blue (#2563EB primary, #1E40AF secondary)
- **Dark Mode**: Full support with `dark:` variants
- **Transitions**: Smooth opacity and transform animations
- **Shadows**: Consistent shadow-xl for elevation
- **Borders**: Rounded corners (rounded-lg) for modern look

## Testing

The component includes comprehensive tests covering:

- ✅ Rendering and visibility
- ✅ Escape key handling
- ✅ Backdrop click handling
- ✅ Close button functionality
- ✅ Focus trap implementation
- ✅ ARIA attributes
- ✅ Body scroll prevention
- ✅ Size variants
- ✅ Custom content rendering
- ✅ Configurable close behaviors

Run tests:
```bash
npm test -- Modal.test.tsx --run
```

## Requirements Validated

**Validates: Requirements 5.2, 5.3**

- **5.2**: All interactive elements have hover and focus states
- **5.3**: Loading states and proper transitions

## Related Components

- `ConfirmationModal.tsx` - Specialized modal for confirmations with action buttons
- `ReceiveStockModal.tsx` - Domain-specific modal for inventory management

## When to Use

Use the generic `Modal` component when you need:
- Custom content layout
- Form inputs
- Multi-step flows
- Content display
- Flexible design

Use `ConfirmationModal` when you need:
- Simple yes/no confirmations
- Danger warnings
- Quick actions with buttons

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

1. The modal uses `position: fixed` with `z-index: 50` to overlay content
2. Body scroll is disabled when modal is open to prevent background scrolling
3. The backdrop uses `bg-opacity-75` for semi-transparency
4. All transitions use Tailwind's `transition-*` utilities for smooth animations
5. The component is fully controlled - manage state in parent component
