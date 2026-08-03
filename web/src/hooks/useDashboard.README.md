# Dashboard Layout Management Hooks

## Overview

The `useDashboard.ts` module provides React Query hooks for managing personalized dashboard layouts. Users can customize their dashboard widgets, and changes persist across sessions with optimistic updates for instant feedback.

## Requirements Addressed

- **Requirement 8.3**: Dashboard customization must persist across sessions
- **Requirement 8.6**: Widget data must refresh automatically (every 5 minutes)

## Hooks

### `useDashboardLayout()`

Fetches and caches the user's dashboard layout. If no custom layout exists, returns the default layout for the user's role.

**Returns:**
```typescript
{
  data: DashboardLayout | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Features:**
- Automatic PGRST116 error handling (no custom layout)
- Default layout generation based on user role
- Caching with 5-minute stale time
- Automatic re-fetch when cache invalidates

**Example:**
```typescript
function MyDashboard() {
  const { data: layout, isLoading, error } = useDashboardLayout();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {layout?.widgets.map(widget => (
        <Widget key={widget.id} {...widget} />
      ))}
    </div>
  );
}
```

### `useUpdateDashboardLayout()`

Updates the user's dashboard layout with optimistic updates.

**Returns:**
```typescript
{
  mutate: (layout: DashboardLayout) => void;
  mutateAsync: (layout: DashboardLayout) => Promise<DashboardLayout>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: DashboardLayout | undefined;
}
```

**Features:**
- Optimistic updates (instant UI feedback)
- Automatic rollback on error
- Cache invalidation on success
- Upsert operation (insert or update)

**Example:**
```typescript
function DashboardCustomizer() {
  const { data: layout } = useDashboardLayout();
  const { mutate: updateLayout, isPending } = useUpdateDashboardLayout();

  const handleSave = () => {
    if (!layout) return;

    updateLayout({
      ...layout,
      widgets: layout.widgets.map(w => ({ ...w, visible: true })),
      updated_at: new Date().toISOString(),
    });
  };

  return <button onClick={handleSave} disabled={isPending}>Save</button>;
}
```

### `useUpdateWidgetVisibility()`

Convenience hook for toggling widget visibility without manually constructing the full layout object.

**Returns:**
```typescript
(widgetId: string, visible: boolean) => void
```

**Example:**
```typescript
function WidgetToggle({ widgetId, title }: Props) {
  const { data: layout } = useDashboardLayout();
  const updateVisibility = useUpdateWidgetVisibility();

  const widget = layout?.widgets.find(w => w.id === widgetId);
  
  return (
    <label>
      <input
        type="checkbox"
        checked={widget?.visible ?? false}
        onChange={(e) => updateVisibility(widgetId, e.target.checked)}
      />
      {title}
    </label>
  );
}
```

### `useReorderWidgets()`

Convenience hook for reordering widgets (e.g., drag-and-drop).

**Returns:**
```typescript
(sourceWidgetId: string, targetWidgetId: string) => void
```

**Example:**
```typescript
function DraggableWidget({ widget }: Props) {
  const reorderWidgets = useReorderWidgets();

  const handleDrop = (e: DragEvent, targetId: string) => {
    const sourceId = e.dataTransfer.getData('widgetId');
    reorderWidgets(sourceId, targetId);
  };

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('widgetId', widget.id)}
      onDrop={(e) => handleDrop(e, widget.id)}
    >
      {widget.title}
    </div>
  );
}
```

## Data Flow

### Loading Default Layout (No Custom Layout)

```
User loads dashboard
    ↓
useDashboardLayout() fetches from database
    ↓
PGRST116 error: No custom layout found
    ↓
Hook returns default layout for user's role
    ↓
UI renders default widgets
```

### Loading Custom Layout

```
User loads dashboard
    ↓
useDashboardLayout() fetches from database
    ↓
Custom layout found
    ↓
UI renders custom widgets
```

### Updating Layout with Optimistic Updates

```
User changes widget visibility
    ↓
useUpdateDashboardLayout().mutate() called
    ↓
onMutate: Cache immediately updated (optimistic)
    ↓
UI reflects change instantly
    ↓
Mutation sent to server
    ↓
Success: Cache invalidated and refetched
    ↓
OR
Error: onError rolls back to previous state
```

## Error Handling

### PGRST116 Error (No Custom Layout)

This error is **expected** and **handled gracefully**. When a user hasn't customized their dashboard, the hook returns the default layout for their role instead of throwing an error.

```typescript
if (error && error.code === 'PGRST116') {
  // Return default layout for user's role
  return generateDefaultLayout(user.role);
}
```

### Other Database Errors

All other errors are thrown and should be handled by the component:

```typescript
const { data, error } = useDashboardLayout();

if (error) {
  return <ErrorBoundary error={error} />;
}
```

### Mutation Errors

Update errors trigger automatic rollback:

```typescript
const { mutate, error } = useUpdateDashboardLayout();

// If mutation fails, cache is automatically rolled back
// to previous state
if (error) {
  toast.error('Failed to save dashboard: ' + error.message);
}
```

## Performance

### Caching Strategy

- **Stale Time**: 5 minutes (data considered fresh)
- **Cache Time**: 10 minutes (data kept in cache after last use)
- **Refetch on Window Focus**: Enabled by default
- **Automatic Background Refetch**: When data becomes stale

### Query Keys

```typescript
['dashboard-layout', userId]  // Dashboard layout for specific user
```

### Optimization Tips

1. **Use the layout hook once at the top level**
   ```typescript
   // ✅ Good: Single hook at dashboard level
   function Dashboard() {
     const { data: layout } = useDashboardLayout();
     return <Widgets layout={layout} />;
   }

   // ❌ Bad: Multiple hooks in child components
   function Widget() {
     const { data: layout } = useDashboardLayout(); // Unnecessary re-fetch
   }
   ```

2. **Pass layout data down as props**
   ```typescript
   // ✅ Good
   <Widget widget={layout.widgets[0]} />

   // ❌ Bad
   <Widget widgetId="1" /> // Child must fetch layout
   ```

3. **Use convenience hooks for updates**
   ```typescript
   // ✅ Good: Single-purpose update
   const updateVisibility = useUpdateWidgetVisibility();
   updateVisibility(widgetId, false);

   // ❌ Less optimal: Manual construction
   const { mutate } = useUpdateDashboardLayout();
   mutate({ ...layout, widgets: [...] }); // More code
   ```

## Type Definitions

```typescript
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

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
}

export interface DashboardLayout {
  user_id: string;
  role: UserRole;
  widgets: DashboardWidget[];
  updated_at: string;
}
```

## Testing

See `useDashboard.test.tsx` for comprehensive test examples:

- ✅ Fetching custom layout
- ✅ Handling PGRST116 (default layout)
- ✅ Disabled when user not authenticated
- ✅ Error handling for database errors
- ✅ Successful layout updates
- ✅ Mutation error handling

## Related Files

- `web/src/types/dashboard.ts` - Type definitions and constants
- `web/src/types/user.ts` - User and role types
- `web/src/hooks/useAuth.ts` - Authentication hook
- `web/src/hooks/useDashboard.example.tsx` - Usage examples

## Future Enhancements (Task 24.2)

The following helper functions are referenced but will be fully implemented in task 24.2:

- `getWidgetTitle(type: WidgetType): string` - Currently has basic implementation
- `getDefaultWidgetSize(type: WidgetType): 'small' | 'medium' | 'large'` - Currently has basic implementation

## Best Practices

1. **Always check loading states**
   ```typescript
   if (isLoading) return <LoadingSpinner />;
   ```

2. **Handle errors gracefully**
   ```typescript
   if (error) return <ErrorMessage error={error} />;
   ```

3. **Provide feedback for mutations**
   ```typescript
   const { mutate, isPending } = useUpdateDashboardLayout();
   <button disabled={isPending}>
     {isPending ? 'Saving...' : 'Save'}
   </button>
   ```

4. **Use optimistic updates for better UX**
   - Changes appear instantly
   - Rollback on error is automatic
   - No need for loading spinners on every update

5. **Invalidate cache when needed**
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
   ```

## Troubleshooting

### Layout not loading

1. Check user authentication: `useAuth()` must return a valid user
2. Check Supabase connection: Ensure environment variables are set
3. Check browser console for errors

### Updates not persisting

1. Verify `updated_at` is set to current timestamp
2. Check database permissions (RLS policies)
3. Ensure `user_id` matches authenticated user

### Default layout not showing

1. Verify user has a valid role
2. Check `DEFAULT_WIDGETS_BY_ROLE` constant in `types/dashboard.ts`
3. Ensure PGRST116 error is being caught correctly

## Support

For issues or questions, refer to:
- Design document: `.kiro/specs/frontend-upgrade/design.md`
- Requirements: `.kiro/specs/frontend-upgrade/requirements.md`
- Task list: `.kiro/specs/frontend-upgrade/tasks.md`
