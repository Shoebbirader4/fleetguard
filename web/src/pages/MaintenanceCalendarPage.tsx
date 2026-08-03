import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { maintenanceCalendarApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'work_order' | 'scheduled_maintenance' | 'inspection' | 'alert';
  vehicle_id: string;
  vehicle_name: string;
  status: string;
  priority?: string;
  description?: string;
}

export default function MaintenanceCalendarPage() {
  const user = useAuthStore((state) => state.user);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  // Calculate date range for current view
  const getDateRange = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (view === 'month') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start, end };
    } else {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // End of week
      return { start, end };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch calendar events
  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      // Fetch work orders
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select(`
          id,
          scheduled_date,
          title,
          description,
          status,
          priority,
          vehicle_id,
          vehicles (make, model, year, registration_number)
        `)
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date');

      if (woError) throw woError;

      // Fetch components due for maintenance
      const { data: components, error: compError } = await supabase
        .from('components')
        .select(`
          id,
          component_type,
          next_maintenance_date,
          vehicle_id,
          vehicles (make, model, year, registration_number)
        `)
        .eq('status', 'active')
        .not('next_maintenance_date', 'is', null)
        .gte('next_maintenance_date', startDate.toISOString())
        .lte('next_maintenance_date', endDate.toISOString())
        .order('next_maintenance_date');

      if (compError) throw compError;

      // Fetch scheduled inspections
      const { data: inspections, error: inspError } = await supabase
        .from('inspections')
        .select(`
          id,
          inspection_date,
          inspection_type,
          status,
          vehicle_id,
          vehicles (make, model, year, registration_number)
        `)
        .gte('inspection_date', startDate.toISOString())
        .lte('inspection_date', endDate.toISOString())
        .order('inspection_date');

      if (inspError) throw inspError;

      // Transform to calendar events
      const calendarEvents: CalendarEvent[] = [];

      workOrders?.forEach((wo: any) => {
        calendarEvents.push({
          id: `wo-${wo.id}`,
          date: wo.scheduled_date,
          title: wo.title || 'Work Order',
          type: 'work_order',
          vehicle_id: wo.vehicle_id,
          vehicle_name: wo.vehicles ? `${wo.vehicles.make} ${wo.vehicles.model} (${wo.vehicles.registration_number})` : 'Unknown',
          status: wo.status,
          priority: wo.priority,
          description: wo.description,
        });
      });

      components?.forEach((comp: any) => {
        calendarEvents.push({
          id: `comp-${comp.id}`,
          date: comp.next_maintenance_date,
          title: `${comp.component_type} Maintenance`,
          type: 'scheduled_maintenance',
          vehicle_id: comp.vehicle_id,
          vehicle_name: comp.vehicles ? `${comp.vehicles.make} ${comp.vehicles.model} (${comp.vehicles.registration_number})` : 'Unknown',
          status: 'scheduled',
        });
      });

      inspections?.forEach((insp: any) => {
        calendarEvents.push({
          id: `insp-${insp.id}`,
          date: insp.inspection_date,
          title: `${insp.inspection_type} Inspection`,
          type: 'inspection',
          vehicle_id: insp.vehicle_id,
          vehicle_name: insp.vehicles ? `${insp.vehicles.make} ${insp.vehicles.model} (${insp.vehicles.registration_number})` : 'Unknown',
          status: insp.status,
        });
      });

      return calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!user,
  });

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date || !events) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date.startsWith(dateStr));
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'work_order') {
      if (event.priority === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      if (event.priority === 'medium') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    if (event.type === 'scheduled_maintenance') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    if (event.type === 'inspection') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
                📅 Maintenance Calendar
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Plan and schedule vehicle maintenance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Legend */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Work Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Scheduled Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Inspections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">High Priority</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        ) : (
          <div className="card">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-100 dark:bg-gray-800 px-2 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isTodayDate = isToday(date);
                
                return (
                  <div
                    key={index}
                    className={`bg-white dark:bg-gray-800 min-h-[120px] p-2 ${
                      date ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                    } ${isTodayDate ? 'ring-2 ring-primary-600' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-medium mb-2 ${
                          isTodayDate 
                            ? 'text-primary-600 dark:text-primary-400 font-bold' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {date.getDate()}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded border ${getEventColor(event)} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                              title={`${event.title} - ${event.vehicle_name}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 px-2">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Events List */}
        {events && events.length > 0 && (
          <div className="card mt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upcoming Maintenance ({events.length})
            </h2>
            <div className="space-y-3">
              {events.slice(0, 10).map(event => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getEventColor(event)}`}>
                        {event.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {event.title}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {event.vehicle_name}
                    </div>
                    {event.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {event.description}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-right">
                    <div className="font-medium">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-xs">
                      {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Events State */}
        {!isLoading && (!events || events.length === 0) && (
          <div className="card text-center py-12 mt-6">
            <p className="text-gray-600 dark:text-gray-400">
              No maintenance scheduled for this period.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Schedule work orders or inspections to see them here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
