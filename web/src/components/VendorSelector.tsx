/**
 * VendorSelector Component
 * 
 * A reusable dropdown component for selecting vendors from the active vendor list.
 * Used in purchase order forms and other vendor selection contexts.
 * 
 * Features:
 * - Fetches active vendors using useVendors('active') hook
 * - Displays vendor name and contact person
 * - Shows helpful message with link to create vendor if none exist
 * - Loading and error states
 * - Follows FleetGuard AI design system
 * 
 * Requirements: 3.1, 3.3
 */

import { useVendors } from '../hooks/useVendors';
import { Link } from 'react-router-dom';
import { selectStyles, cardVariants, linkStyles } from '../utils/stylePatterns';

interface VendorSelectorProps {
  value: string | null;
  onChange: (vendorId: string | null) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function VendorSelector({
  value,
  onChange,
  required = false,
  placeholder = 'Select a vendor...',
  disabled = false,
}: VendorSelectorProps) {
  const { data: vendors, isLoading, isError, error } = useVendors('active');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
  };

  if (isError) {
    return (
      <div className="w-full px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-normal leading-normal">
        Error loading vendors: {error?.message || 'Unknown error'}
      </div>
    );
  }

  // Show helpful message if no vendors exist
  if (!isLoading && vendors && vendors.length === 0) {
    return (
      <div className={cardVariants.info}>
        <p className="text-blue-700 dark:text-blue-300 text-sm font-normal leading-normal mb-2">
          No active vendors found. Please add a vendor first.
        </p>
        <Link
          to="/vendors/new"
          className={`${linkStyles} inline-flex items-center text-sm font-medium`}
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Vendor
        </Link>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      required={required}
      disabled={disabled || isLoading}
      className={selectStyles}
    >
      <option value="">
        {isLoading ? 'Loading vendors...' : placeholder}
      </option>
      
      {!isLoading && vendors && vendors.length > 0 && (
        <>
          {!required && <option value="">No vendor</option>}
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.vendor_name}
              {vendor.contact_person && ` (${vendor.contact_person})`}
            </option>
          ))}
        </>
      )}
    </select>
  );
}
