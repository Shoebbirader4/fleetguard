/**
 * UserRoleSelector Component Examples
 * 
 * This file demonstrates various use cases of the UserRoleSelector component.
 * Run this with Storybook or a component preview tool to see examples in action.
 */

import { useState } from 'react';
import UserRoleSelector from './UserRoleSelector';
import type { UserRole } from '../types/user';

export default function UserRoleSelectorExamples() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [adminSelectedRole, setAdminSelectedRole] = useState<UserRole>('fleet_manager');

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        UserRoleSelector Examples
      </h1>

      {/* Example 1: Basic usage */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          1. Basic Usage
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Simple role selector with descriptions
        </p>
        <UserRoleSelector
          value={selectedRole}
          onChange={setSelectedRole}
          label="Select User Role"
          placeholder="Choose a role..."
        />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Selected: <strong>{selectedRole || 'None'}</strong>
        </p>
      </section>

      {/* Example 2: Without descriptions in dropdown */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          2. Without Descriptions in Dropdown
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Shows role names only in dropdown, description as helper text
        </p>
        <UserRoleSelector
          value={adminSelectedRole}
          onChange={setAdminSelectedRole}
          label="User Role"
          showDescriptions={false}
        />
      </section>

      {/* Example 3: Disabled state */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          3. Disabled State
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Selector is disabled (e.g., insufficient permissions)
        </p>
        <UserRoleSelector
          value={'mechanic'}
          onChange={() => {}}
          label="User Role"
          disabled={true}
        />
      </section>

      {/* Example 4: Self-role editing prevention */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          4. Self-Role Editing Prevention (Requirement 1.3)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          User cannot change their own role - selector automatically disables
        </p>
        <UserRoleSelector
          value={'company_owner'}
          onChange={() => {}}
          label="My Role"
          currentUserId="user-123"
          targetUserId="user-123"
        />
      </section>

      {/* Example 5: Editing another user's role */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          5. Editing Another User's Role
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Company owner can change other users' roles
        </p>
        <UserRoleSelector
          value={'driver'}
          onChange={(role) => console.log('Changing role to:', role)}
          label="User Role"
          currentUserId="user-123"
          targetUserId="user-456"
        />
      </section>

      {/* Example 6: With error state */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          6. Error State
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Showing validation error
        </p>
        <UserRoleSelector
          value={null}
          onChange={() => {}}
          label="User Role"
          error="Role selection is required"
        />
      </section>

      {/* Example 7: In a form context */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          7. In Invitation Form Context
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Complete form example for inviting a user
        </p>
        <InviteUserForm />
      </section>
    </div>
  );
}

// Example form component
function InviteUserForm() {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: null as UserRole | null,
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.role) newErrors.role = 'Role is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', formData);
      alert('User invitation sent! (Demo only)');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="user@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Doe"
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName}</p>
        )}
      </div>

      <UserRoleSelector
        value={formData.role}
        onChange={(role) => setFormData({ ...formData, role })}
        label="Role *"
        placeholder="Select role for this user..."
        error={errors.role}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Phone (Optional)
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="+1234567890"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Send Invitation
      </button>
    </form>
  );
}
