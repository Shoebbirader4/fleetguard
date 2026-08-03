/**
 * MechanicSelector Component
 * 
 * A reusable dropdown component for selecting mechanics for work order assignment.
 * Used in work order forms and work order assignment contexts.
 * 
 * Features:
 * - Fetches active users with mechanic-related roles (mechanic, maintenance_engineer, workshop_manager)
 * - Displays mechanic name and role
 * - Includes "Unassigned" option for unassigning work orders
 * - Loading and error states
 * - Follows FleetGuard AI design system
 * 
 * Requirements: 4.1, 4.2
 */

import { useMechanics } from '../hooks/useMechanics';
import { selectStyles, labelStyles } from '../utils/stylePatterns';

interface MechanicSelectorProps {
  value: string | null;
  onChange: (mechanicId: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const ROLE_DISPLAY_MAP: Record<string, string> = {
  mechanic: 'Mechanic',
  maintenance_engineer: 'Maintenance Engineer',
  workshop_manager: 'Workshop Manager',
};

export default function MechanicSelector({
  value,
  onChange,
  label,
  placeholder = 'Select a mechanic...',
  disabled = false,
}: MechanicSelectorProps) {
  const { data: mechanics, isLoading, isError, error } = useMechanics();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
  };

  if (isError) {
    return (
      <div className="w-full">
        {label && (
          <label className={labelStyles}>
            {label}
          </label>
        )}
        <div className="w-full px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-normal leading-normal">
          Error loading mechanics: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <label className={labelStyles}>
          {label}
        </label>
      )}
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={selectStyles}
      >
        <option value="">
          {isLoading ? 'Loading mechanics...' : placeholder}
        </option>
        
        {!isLoading && mechanics && mechanics.length > 0 && (
          <>
            <option value="">Unassigned</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>
                {mechanic.full_name} ({ROLE_DISPLAY_MAP[mechanic.role]})
              </option>
            ))}
          </>
        )}
        
        {!isLoading && mechanics && mechanics.length === 0 && (
          <option value="" disabled>
            No mechanics available
          </option>
        )}
      </select>
    </div>
  );
}
