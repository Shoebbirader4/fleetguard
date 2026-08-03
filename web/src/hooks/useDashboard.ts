/**
 * Dashboard Layout Management Hooks
 * 
 * This module provides hooks for managing personalized dashboard layouts.
 * Users can customize their dashboard widgets, and changes are persisted
 * to the database with optimistic updates.
 * 
 * Requirements: 8.3 (Dashboard customization must persist across sessions)
 *               8.6 (Widget data must refresh automatically)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ToastContainer';
import { useAuth } from './useAuth';
import {
  DashboardLayout,
  DashboardWidget,
  DEFAULT_WIDGETS_BY_ROLE,
  WidgetType,
} from '../types/dashboard';
import { UserRole } from '../types/user';
import { getWidgetTitle, getDefaultWidgetSize } from '../utils/widgetHelpers';

// ============================================================================
// DASHBOARD LAYOUT HOOKS
// ============================================================================

/**
 * Fetch and manage user's dashboard layout
 * 
 * This hook fetches the user's custom dashboard layout from the database.
 * If no custom layout exists (PGRST116 error), it returns the default
 * layout based on the user's role.
 * 
 * Performance characteristics:
 * - First load: 50-200ms (from database)
 * - Cached: 0ms (instant from React Query cache)
 * - Data is considered fresh for 5 minutes
 * 
 * @returns Dashboard layout with loading and error states
 * 
 * @example
 * const { data: layout, isLoading, error } = useDashboardLayout();
 */
export function useDashboardLayout() {
  const { user } = useAuth();

  return useQuery<DashboardLayout>({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Handle errors (excluding no data found, which is expected)
      if (error) {
        throw error;
      }

      // If no custom layout found, return default layout for user's role
      if (!data) {
        const defaultWidgets = DEFAULT_WIDGETS_BY_ROLE[user.role as UserRole];
        return {
          user_id: user.id,
          role: user.role,
          widgets: defaultWidgets.map((type, index) => ({
            id: `widget-${index}`,
            type,
            title: getWidgetTitle(type),
            order: index,
            visible: true,
            size: getDefaultWidgetSize(type),
          })),
          updated_at: new Date().toISOString(),
        } as DashboardLayout;
      }

      return data as DashboardLayout;
    },
    // Only fetch when user is authenticated
    enabled: !!user,
    // Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes after last use
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Update user's dashboard layout with optimistic updates
 * 
 * This hook provides a mutation function to save the user's dashboard layout
 * to the database. It uses optimistic updates to immediately reflect changes
 * in the UI before the server responds.
 * 
 * @returns Mutation object with mutate function and status
 * 
 * @example
 * const { mutate: updateLayout, isPending } = useUpdateDashboardLayout();
 * 
 * updateLayout({
 *   user_id: user.id,
 *   role: user.role,
 *   widgets: updatedWidgets,
 *   updated_at: new Date().toISOString(),
 * });
 */
export function useUpdateDashboardLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .upsert({
          user_id: layout.user_id,
          role: layout.role,
          widgets: layout.widgets,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DashboardLayout;
    },
    // Optimistic update: immediately update cache before server responds
    onMutate: async (newLayout) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ['dashboard-layout', user?.id],
      });

      // Snapshot the previous value
      const previousLayout = queryClient.getQueryData<DashboardLayout>([
        'dashboard-layout',
        user?.id,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<DashboardLayout>(
        ['dashboard-layout', user?.id],
        newLayout
      );

      // Return context with previous layout for rollback
      return { previousLayout };
    },
    // On error, rollback to previous layout
    onError: (err, newLayout, context) => {
      if (context?.previousLayout) {
        queryClient.setQueryData(
          ['dashboard-layout', user?.id],
          context.previousLayout
        );
      }
      
      // Show error toast
      toast.error(`Failed to update dashboard layout: ${err.message}`);
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: (data, error) => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-layout', user?.id],
      });
      
      // Show success toast only if no error occurred
      if (!error) {
        toast.success('Dashboard layout updated successfully');
      }
    },
  });
}

/**
 * Helper hook to update widget visibility
 * 
 * Convenience hook for toggling widget visibility without manually
 * constructing the full layout object.
 * 
 * @returns Function to update widget visibility
 * 
 * @example
 * const updateVisibility = useUpdateWidgetVisibility();
 * updateVisibility(widgetId, false); // Hide widget
 */
export function useUpdateWidgetVisibility() {
  const { data: layout } = useDashboardLayout();
  const { mutate: updateLayout } = useUpdateDashboardLayout();

  return (widgetId: string, visible: boolean) => {
    if (!layout) return;

    const updatedWidgets = layout.widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, visible } : widget
    );

    updateLayout({
      ...layout,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    });
  };
}

/**
 * Helper hook to reorder dashboard widgets
 * 
 * Convenience hook for reordering widgets (e.g., drag-and-drop)
 * without manually updating the full layout object.
 * 
 * @returns Function to reorder widgets
 * 
 * @example
 * const reorderWidgets = useReorderWidgets();
 * reorderWidgets(draggedId, droppedId);
 */
export function useReorderWidgets() {
  const { data: layout } = useDashboardLayout();
  const { mutate: updateLayout } = useUpdateDashboardLayout();

  return (sourceWidgetId: string, targetWidgetId: string) => {
    if (!layout) return;

    const widgets = [...layout.widgets];
    const sourceIndex = widgets.findIndex((w) => w.id === sourceWidgetId);
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Remove source widget
    const [removed] = widgets.splice(sourceIndex, 1);
    // Insert at target position
    widgets.splice(targetIndex, 0, removed);

    // Update order property
    const reorderedWidgets = widgets.map((widget, index) => ({
      ...widget,
      order: index,
    }));

    updateLayout({
      ...layout,
      widgets: reorderedWidgets,
      updated_at: new Date().toISOString(),
    });
  };
}
