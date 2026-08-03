/**
 * DriverSelector Component - Usage Examples
 * 
 * This file demonstrates how to use the DriverSelector component
 * in various contexts throughout the application.
 */

import { useState } from 'react';
import DriverSelector from './DriverSelector';

/**
 * Example 1: Basic Usage in a Vehicle Form
 */
export function VehicleFormExample() {
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assign Driver
        </label>
        <DriverSelector
          value={assignedDriverId}
          onChange={setAssignedDriverId}
          placeholder="Select a driver..."
        />
      </div>
    </div>
  );
}

/**
 * Example 2: Usage with Form Validation
 */
export function VehicleFormWithValidation() {
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Your submission logic here
    console.log('Assigned driver:', assignedDriverId);
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assign Driver
        </label>
        <DriverSelector
          value={assignedDriverId}
          onChange={setAssignedDriverId}
          placeholder="Select a driver..."
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
          Select a driver to assign to this vehicle (optional)
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Vehicle'}
        </button>
      </div>
    </form>
  );
}

/**
 * Example 3: Usage in Vehicle Edit Form with Pre-selected Driver
 */
export function VehicleEditExample() {
  // Simulate loading existing vehicle data
  const existingVehicle = {
    id: 'vehicle-1',
    vin: 'ABC123',
    make: 'Toyota',
    model: 'Hiace',
    assigned_driver_id: 'driver-1', // Pre-selected driver
  };

  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(
    existingVehicle.assigned_driver_id
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assigned Driver
        </label>
        <DriverSelector
          value={assignedDriverId}
          onChange={setAssignedDriverId}
        />
      </div>
    </div>
  );
}

/**
 * Example 4: Usage in a Filter/Search Component
 */
export function VehicleFilterExample() {
  const [filterDriverId, setFilterDriverId] = useState<string | null>(null);

  const handleClearFilter = () => {
    setFilterDriverId(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Driver
        </label>
        <div className="flex gap-2">
          <DriverSelector
            value={filterDriverId}
            onChange={setFilterDriverId}
            placeholder="All drivers"
          />
          {filterDriverId && (
            <button
              onClick={handleClearFilter}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-normal leading-normal"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Handling Driver Change Events
 */
export function VehicleWithDriverChangeTracking() {
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [changeHistory, setChangeHistory] = useState<string[]>([]);

  const handleDriverChange = (newDriverId: string | null) => {
    setAssignedDriverId(newDriverId);
    
    const message = newDriverId 
      ? `Driver assigned: ${newDriverId}` 
      : 'Driver unassigned';
    
    setChangeHistory(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    
    // You could also trigger notifications, audit logs, etc.
    console.log('Driver change detected:', { from: assignedDriverId, to: newDriverId });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assign Driver
        </label>
        <DriverSelector
          value={assignedDriverId}
          onChange={handleDriverChange}
        />
      </div>

      {changeHistory.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Change History:</h4>
          <ul className="text-xs font-normal leading-tight space-y-1 text-gray-600 dark:text-gray-400">
            {changeHistory.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
