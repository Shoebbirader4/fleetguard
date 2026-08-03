/**
 * Usage Examples for Dashboard Layout Hooks
 * 
 * This file demonstrates how to use the dashboard layout management hooks
 * in real components.
 */

import React from 'react';
import {
  useDashboardLayout,
  useUpdateDashboardLayout,
  useUpdateWidgetVisibility,
  useReorderWidgets,
} from './useDashboard';

/**
 * Example 1: Fetching and displaying dashboard layout
 */
export function DashboardLayoutExample() {
  const { data: layout, isLoading, error } = useDashboardLayout();

  if (isLoading) {
    return <div>Loading your dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {(error as Error).message}</div>;
  }

  if (!layout) {
    return <div>No dashboard layout found</div>;
  }

  return (
    <div className="dashboard-layout">
      <h1>My Dashboard</h1>
      <p>User ID: {layout.user_id}</p>
      <p>Role: {layout.role}</p>
      <p>Last updated: {new Date(layout.updated_at).toLocaleString()}</p>

      <div className="widgets-grid">
        {layout.widgets
          .filter((w) => w.visible)
          .map((widget) => (
            <div
              key={widget.id}
              className={`widget widget-${widget.size}`}
              data-order={widget.order}
            >
              <h3>{widget.title}</h3>
              <p>Type: {widget.type}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * Example 2: Updating dashboard layout with full control
 */
export function DashboardCustomizerExample() {
  const { data: layout, isLoading } = useDashboardLayout();
  const { mutate: updateLayout, isPending } = useUpdateDashboardLayout();

  if (isLoading || !layout) {
    return <div>Loading...</div>;
  }

  const handleSaveCustomization = () => {
    // Modify the layout
    const updatedWidgets = layout.widgets.map((widget) => ({
      ...widget,
      // Example: hide all financial widgets
      visible: !widget.type.includes('financial'),
    }));

    // Save to database with optimistic update
    updateLayout({
      ...layout,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="dashboard-customizer">
      <h2>Customize Your Dashboard</h2>

      <div className="widgets-list">
        {layout.widgets.map((widget) => (
          <div key={widget.id} className="widget-item">
            <input
              type="checkbox"
              checked={widget.visible}
              onChange={(e) => {
                const updated = layout.widgets.map((w) =>
                  w.id === widget.id ? { ...w, visible: e.target.checked } : w
                );
                updateLayout({
                  ...layout,
                  widgets: updated,
                  updated_at: new Date().toISOString(),
                });
              }}
            />
            <span>{widget.title}</span>
          </div>
        ))}
      </div>

      <button onClick={handleSaveCustomization} disabled={isPending}>
        {isPending ? 'Saving...' : 'Hide Financial Widgets'}
      </button>
    </div>
  );
}

/**
 * Example 3: Using convenience hook for widget visibility
 */
export function WidgetVisibilityExample() {
  const { data: layout } = useDashboardLayout();
  const updateVisibility = useUpdateWidgetVisibility();

  if (!layout) {
    return <div>Loading...</div>;
  }

  return (
    <div className="widget-toggles">
      <h2>Show/Hide Widgets</h2>
      {layout.widgets.map((widget) => (
        <label key={widget.id} className="toggle-item">
          <input
            type="checkbox"
            checked={widget.visible}
            onChange={(e) => updateVisibility(widget.id, e.target.checked)}
          />
          <span>{widget.title}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Example 4: Drag-and-drop widget reordering
 */
export function DragDropWidgetsExample() {
  const { data: layout } = useDashboardLayout();
  const reorderWidgets = useReorderWidgets();

  if (!layout) {
    return <div>Loading...</div>;
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    e.dataTransfer.setData('widgetId', widgetId);
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    const sourceWidgetId = e.dataTransfer.getData('widgetId');
    if (sourceWidgetId && sourceWidgetId !== targetWidgetId) {
      reorderWidgets(sourceWidgetId, targetWidgetId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="drag-drop-dashboard">
      <h2>Drag widgets to reorder</h2>
      <div className="widgets-container">
        {layout.widgets
          .sort((a, b) => a.order - b.order)
          .map((widget) => (
            <div
              key={widget.id}
              className="widget draggable"
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDrop={(e) => handleDrop(e, widget.id)}
              onDragOver={handleDragOver}
            >
              <h3>{widget.title}</h3>
              <p>Order: {widget.order}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * Example 5: Handling PGRST116 (no custom layout) scenario
 * 
 * This example demonstrates that the hook automatically returns
 * default widgets for the user's role when no custom layout exists.
 */
export function DefaultLayoutExample() {
  const { data: layout, isLoading } = useDashboardLayout();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="default-layout">
      <h2>Your Dashboard</h2>
      <p>
        {layout?.widgets.some((w) => w.id.startsWith('widget-'))
          ? 'Using default layout for your role'
          : 'Using your customized layout'}
      </p>

      <div className="widgets">
        {layout?.widgets.map((widget) => (
          <div key={widget.id} className="widget">
            <h3>{widget.title}</h3>
            <p>Type: {widget.type}</p>
            <p>Size: {widget.size}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 6: Optimistic updates in action
 * 
 * This example shows how optimistic updates provide instant feedback
 * to users while the server processes the request.
 */
export function OptimisticUpdateExample() {
  const { data: layout } = useDashboardLayout();
  const { mutate: updateLayout, isPending, error } = useUpdateDashboardLayout();

  const toggleAllWidgets = (visible: boolean) => {
    if (!layout) return;

    // This update will be reflected immediately in the UI
    // thanks to optimistic updates
    updateLayout({
      ...layout,
      widgets: layout.widgets.map((w) => ({ ...w, visible })),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="optimistic-update">
      <h2>Optimistic Updates Demo</h2>

      {/* Notice how these buttons respond instantly */}
      <button onClick={() => toggleAllWidgets(false)} disabled={isPending}>
        Hide All Widgets
      </button>
      <button onClick={() => toggleAllWidgets(true)} disabled={isPending}>
        Show All Widgets
      </button>

      {error && (
        <div className="error">
          Error: {(error as Error).message}
          <p>Changes were rolled back</p>
        </div>
      )}

      <div className="widgets-status">
        <p>Visible widgets: {layout?.widgets.filter((w) => w.visible).length}</p>
        <p>Hidden widgets: {layout?.widgets.filter((w) => !w.visible).length}</p>
      </div>
    </div>
  );
}
