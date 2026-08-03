/**
 * DashboardCustomizer Component
 * 
 * Modal/panel interface for customizing dashboard widgets.
 * Allows users to toggle widget visibility, reorder widgets (drag-and-drop + up/down buttons),
 * and reset to role-based defaults.
 * 
 * Task 25.2 - Create DashboardCustomizer component
 * Task 25.3 - Implement drag-and-drop for widget reordering
 * Requirements: 8.6 (Allow toggling widget visibility and reordering)
 */

import React, { useState } from 'react';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDashboardLayout, useUpdateDashboardLayout } from '../../hooks/useDashboard';
import { DashboardWidget, DEFAULT_WIDGETS_BY_ROLE } from '../../types/dashboard';
import { getWidgetTitle, getWidgetDescription, getDefaultWidgetSize } from '../../utils/widgetHelpers';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/user';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SortableWidgetItem component - individual draggable widget item
 */
interface SortableWidgetItemProps {
  widget: DashboardWidget;
  index: number;
  totalItems: number;
  onToggleVisibility: (widgetId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function SortableWidgetItem({
  widget,
  index,
  totalItems,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
}: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-grab active:cursor-grabbing mt-1"
          title="Drag to reorder"
          aria-label="Drag to reorder widget"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Reorder Buttons (Alternative to drag) */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
            aria-label="Move widget up"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
            aria-label="Move widget down"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Widget Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {widget.title}
          </h3>
          <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
            {getWidgetDescription(widget.type)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-normal leading-tight font-medium ${
                widget.visible
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {widget.visible ? 'Visible' : 'Hidden'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-normal leading-tight font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {widget.size}
            </span>
          </div>
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={() => onToggleVisibility(widget.id)}
          className={`p-2 rounded-lg transition-colors ${
            widget.visible
              ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
              : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={widget.visible ? 'Hide widget' : 'Show widget'}
          aria-label={widget.visible ? 'Hide widget' : 'Show widget'}
        >
          {widget.visible ? (
            <EyeIcon className="h-5 w-5" />
          ) : (
            <EyeSlashIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * DashboardCustomizer component that provides UI for customizing dashboard layout
 * 
 * **Validates: Requirements 8.6**
 * - Toggle widget visibility (show/hide)
 * - Reorder widgets (drag-and-drop + up/down buttons)
 * - Reset to role-based defaults
 * - Save changes using useUpdateDashboardLayout hook
 */
export default function DashboardCustomizer({ isOpen, onClose }: DashboardCustomizerProps) {
  const { user } = useAuth();
  const { data: dashboardLayout, isLoading } = useDashboardLayout();
  const { mutate: updateLayout, isPending: isSaving } = useUpdateDashboardLayout();
  
  // Local state for editing widgets before saving
  const [editedWidgets, setEditedWidgets] = useState<DashboardWidget[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for drag interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize edited widgets when layout loads
  React.useEffect(() => {
    if (dashboardLayout?.widgets) {
      setEditedWidgets([...dashboardLayout.widgets]);
      setHasChanges(false);
    }
  }, [dashboardLayout]);

  /**
   * Handle drag start - track which item is being dragged
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  /**
   * Handle drag end - reorder widgets based on drag operation
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditedWidgets((widgets) => {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);

        const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex);

        // Update order property
        return reorderedWidgets.map((widget, idx) => ({
          ...widget,
          order: idx,
        }));
      });
      setHasChanges(true);
    }

    setActiveId(null);
  };

  /**
   * Get the widget being dragged for the DragOverlay
   */
  const activeWidget = editedWidgets.find((w) => w.id === activeId);

  /**
   * Toggle widget visibility
   */
  const handleToggleVisibility = (widgetId: string) => {
    setEditedWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
      )
    );
    setHasChanges(true);
  };

  /**
   * Move widget up in the order
   */
  const handleMoveUp = (index: number) => {
    if (index === 0) return; // Already at the top

    const newWidgets = [...editedWidgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;

    // Update order property
    const reorderedWidgets = newWidgets.map((widget, idx) => ({
      ...widget,
      order: idx,
    }));

    setEditedWidgets(reorderedWidgets);
    setHasChanges(true);
  };

  /**
   * Move widget down in the order
   */
  const handleMoveDown = (index: number) => {
    if (index === editedWidgets.length - 1) return; // Already at the bottom

    const newWidgets = [...editedWidgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;

    // Update order property
    const reorderedWidgets = newWidgets.map((widget, idx) => ({
      ...widget,
      order: idx,
    }));

    setEditedWidgets(reorderedWidgets);
    setHasChanges(true);
  };

  /**
   * Reset to role-based default widgets
   */
  const handleResetToDefault = () => {
    if (!user || !dashboardLayout) return;

    const confirmed = window.confirm(
      'Are you sure you want to reset your dashboard to the default layout for your role? This cannot be undone.'
    );

    if (!confirmed) return;

    const defaultWidgets = DEFAULT_WIDGETS_BY_ROLE[user.role as UserRole];
    const resetWidgets: DashboardWidget[] = defaultWidgets.map((type, index) => ({
      id: `widget-${index}`,
      type,
      title: getWidgetTitle(type),
      order: index,
      visible: true,
      size: getDefaultWidgetSize(type),
    }));

    setEditedWidgets(resetWidgets);
    setHasChanges(true);
  };

  /**
   * Save changes to the dashboard layout
   */
  const handleSave = () => {
    if (!dashboardLayout || !user) return;

    updateLayout(
      {
        user_id: dashboardLayout.user_id,
        role: dashboardLayout.role,
        widgets: editedWidgets,
        updated_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          onClose();
        },
        onError: (error) => {
          console.error('Failed to save dashboard layout:', error);
          alert('Failed to save dashboard layout. Please try again.');
        },
      }
    );
  };

  /**
   * Cancel changes and close the customizer
   */
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmed) return;
    }
    
    // Reset to original layout
    if (dashboardLayout?.widgets) {
      setEditedWidgets([...dashboardLayout.widgets]);
    }
    setHasChanges(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Customize Dashboard
            </h2>
            <p className="text-sm font-normal leading-normal text-gray-500 dark:text-gray-400 mt-1">
              Toggle widget visibility and rearrange their order
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close customizer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading widgets...</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editedWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {editedWidgets.map((widget, index) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      index={index}
                      totalItems={editedWidgets.length}
                      onToggleVisibility={handleToggleVisibility}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Drag Overlay - shows the item being dragged */}
              <DragOverlay>
                {activeWidget ? (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-2 border-blue-500 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Bars3Icon className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {activeWidget.title}
                        </h3>
                        <p className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400 mt-1">
                          {getWidgetDescription(activeWidget.type)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleResetToDefault}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset to Default
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
