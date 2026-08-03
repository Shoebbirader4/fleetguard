/**
 * DashboardWidget Component
 * 
 * Base component for rendering dashboard widgets with consistent styling and behavior.
 * Supports different widget types, sizes, and provides toggle visibility functionality.
 * Enhanced with mobile collapsible functionality (Task 29.4)
 * 
 * Task 23.1 - Create base DashboardWidget component
 * Task 29.4 - Make widgets collapsible on mobile
 * Requirements: 8.1, 8.6, 5.3
 */

import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { DashboardWidget as DashboardWidgetType } from '../../types/dashboard';
import FleetOverviewWidget from './FleetOverviewWidget';
import WorkOrdersSummaryWidget from './WorkOrdersSummaryWidget';
import MyWorkOrdersWidget from './MyWorkOrdersWidget';
import MaintenanceAlertsWidget from './MaintenanceAlertsWidget';
import FinancialSummaryWidget from './FinancialSummaryWidget';
import TeamSummaryWidget from './TeamSummaryWidget';
import MyVehiclesWidget from './MyVehiclesWidget';
import PartsAvailabilityWidget from './PartsAvailabilityWidget';
import DriverAssignmentsWidget from './DriverAssignmentsWidget';

interface DashboardWidgetProps {
  widget: DashboardWidgetType;
  onToggleVisibility?: (widgetId: string) => void;
  onMove?: (widgetId: string, direction: 'up' | 'down') => void;
}

/**
 * Get CSS classes for widget size
 */
function getWidgetSizeClasses(size: 'small' | 'medium' | 'large'): string {
  switch (size) {
    case 'small':
      return 'col-span-1';
    case 'medium':
      return 'col-span-1 md:col-span-2';
    case 'large':
      return 'col-span-1 md:col-span-2 lg:col-span-3';
    default:
      return 'col-span-1';
  }
}

/**
 * Base DashboardWidget component that renders appropriate widget content based on widget type
 * Enhanced with mobile collapsible functionality (Task 29.4)
 * 
 * **Validates: Requirements 8.1, 8.6, 5.3**
 * - Renders widgets based on configuration
 * - Supports visibility toggle
 * - Applies consistent styling from design system
 * - Collapsible on mobile to save space
 */
export default function DashboardWidget({
  widget,
  onToggleVisibility,
  onMove,
}: DashboardWidgetProps) {
  const sizeClasses = getWidgetSizeClasses(widget.size);
  // Task 29.4: Mobile collapsible state (collapsed by default on mobile for better UX)
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Render widget content based on widget type
   */
  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'fleet-overview':
        return <FleetOverviewWidget />;
      case 'work-orders-summary':
        return <WorkOrdersSummaryWidget />;
      case 'my-work-orders':
        return <MyWorkOrdersWidget />;
      case 'maintenance-alerts':
        return <MaintenanceAlertsWidget />;
      case 'financial-summary':
        return <FinancialSummaryWidget />;
      case 'team-summary':
        return <TeamSummaryWidget />;
      case 'my-vehicles':
        return <MyVehiclesWidget />;
      case 'parts-availability':
        return <PartsAvailabilityWidget />;
      case 'driver-assignments':
        return <DriverAssignmentsWidget />;
      case 'vehicle-status':
        // Placeholder for future implementation
        return <div className="text-gray-500">Vehicle Status Widget (Coming Soon)</div>;
      case 'recent-activity':
        // Placeholder for future implementation
        return <div className="text-gray-500">Recent Activity Widget (Coming Soon)</div>;
      default:
        return <div className="text-gray-500">Unknown widget type</div>;
    }
  };

  if (!widget.visible) {
    return null;
  }

  return (
    <div
      className={`${sizeClasses} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}
    >
      {/* Widget Header - Task 29.4: Enhanced with collapse button on mobile */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold leading-snug text-gray-900 dark:text-white flex-1 truncate pr-2">
          {widget.title}
        </h3>
        
        {/* Widget Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Task 29.4: Collapse/Expand button (mobile only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={isCollapsed ? 'Expand widget' : 'Collapse widget'}
            aria-label={isCollapsed ? 'Expand widget' : 'Collapse widget'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronUpIcon className="h-5 w-5" />
            )}
          </button>
          
          {onToggleVisibility && (
            <button
              onClick={() => onToggleVisibility(widget.id)}
              className="hidden md:block p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={widget.visible ? 'Hide widget' : 'Show widget'}
              aria-label={widget.visible ? 'Hide widget' : 'Show widget'}
            >
              {widget.visible ? (
                <EyeIcon className="h-5 w-5" />
              ) : (
                <EyeSlashIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Widget Content - Task 29.4: Collapsible on mobile */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 md:max-h-none' : 'max-h-[1000px] md:max-h-none'
        }`}
      >
        <div className="p-4 sm:p-6">
          {renderWidgetContent()}
        </div>
      </div>
    </div>
  );
}
