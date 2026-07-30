/**
 * DriverSelector Component
 * 
 * A reusable dropdown component for selecting drivers from the active driver list.
 * Used in vehicle assignment forms and other driver selection contexts.
 * 
 * Features:
 * - Fetches active drivers with the 'driver' role
 * - Displays driver full_name and email
 * - Includes "No driver" option for unassigning
 * - Loading and error states
 * - Follows FleetGuard AI design system
 * 
 * Requirements: 2.2, 2.3
 */

import { useDrivers } from '../hooks/useDrivers';

interface DriverSelectorProps {
  value: string | null;
  onChange: (driverId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function DriverSelector({
  value,
  onChange,
  placeholder = 'Select a driver...',
  disabled = false,
}: DriverSelectorProps) {
  const { data: drivers, isLoading, isError, error } = useDrivers();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
  };

  if (isError) {
    return (
      <div className="w-full px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
        Error loading drivers: {error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      disabled={disabled || isLoading}
      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <option value="">
        {isLoading ? 'Loading drivers...' : placeholder}
      </option>
      
      {!isLoading && drivers && drivers.length > 0 && (
        <>
          <option value="">No driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name} ({driver.email})
            </option>
          ))}
        </>
      )}
      
      {!isLoading && drivers && drivers.length === 0 && (
        <option value="" disabled>
          No active drivers available
        </option>
      )}
    </select>
  );
}
