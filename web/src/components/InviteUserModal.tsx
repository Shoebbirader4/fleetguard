/**
 * InviteUserModal Component
 * 
 * Reusable modal component for inviting new users to the team.
 * 
 * Features:
 * - Form fields: email, full_name, role, phone
 * - Uses USER_ROLES constant for role dropdown with descriptions
 * - Client-side validation using validation utilities
 * - Success toast on invitation sent
 * - API error handling and display
 * 
 * Task 8.2 - Create InviteUserModal component
 * Requirements: 1.2, 1.3, 1.4
 */

import { useState } from 'react';
import { useInviteUser } from '../hooks/useUsers';
import { InviteUserFormData, UserRole, USER_ROLES } from '../types/user';
import { validateEmail, validateFullName, validatePhone, validateRole } from '../utils/validation';
import { buttonStyles, inputStyles, labelStyles, errorMessageStyles } from '../utils/stylePatterns';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { toast } from './ToastContainer';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRole?: UserRole;
}

interface FormErrors {
  email?: string;
  full_name?: string;
  role?: string;
  phone?: string;
}

export default function InviteUserModal({ isOpen, onClose, onSuccess, defaultRole = 'driver' }: InviteUserModalProps) {
  const [formData, setFormData] = useState<InviteUserFormData>({
    email: '',
    full_name: '',
    role: defaultRole,
    phone: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const inviteUserMutation = useInviteUser();

  // Validate a single field
  const validateField = (fieldName: keyof InviteUserFormData, value: string): string | null => {
    switch (fieldName) {
      case 'email':
        return validateEmail(value);
      case 'full_name':
        return validateFullName(value);
      case 'role':
        return validateRole(value);
      case 'phone':
        return validatePhone(value || '');
      default:
        return null;
    }
  };

  // Handle field blur (mark as touched)
  const handleBlur = (fieldName: keyof InviteUserFormData) => {
    setTouched({ ...touched, [fieldName]: true });
    
    const error = validateField(fieldName, formData[fieldName] || '');
    setErrors({ ...errors, [fieldName]: error || undefined });
  };

  // Handle field change
  const handleChange = (fieldName: keyof InviteUserFormData, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: undefined });
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate required fields
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
      isValid = false;
    }

    const nameError = validateFullName(formData.full_name);
    if (nameError) {
      newErrors.full_name = nameError;
      isValid = false;
    }

    const roleError = validateRole(formData.role);
    if (roleError) {
      newErrors.role = roleError;
      isValid = false;
    }

    // Validate optional phone field
    const phoneError = validatePhone(formData.phone || '');
    if (phoneError) {
      newErrors.phone = phoneError;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      full_name: true,
      role: true,
      phone: true,
    });

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    try {
      await inviteUserMutation.mutateAsync(formData);
      toast.success('User invited successfully! They will receive an email invitation.');
      
      // Reset form
      setFormData({
        email: '',
        full_name: '',
        role: defaultRole,
        phone: '',
      });
      setErrors({});
      setTouched({});
      
      // Call success callback if provided
      onSuccess?.();
      
      // Close modal
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite user';
      toast.error(errorMessage);
    }
  };

  // Handle modal close
  const handleClose = () => {
    // Reset form state when closing
    setFormData({
      email: '',
      full_name: '',
      role: defaultRole,
      phone: '',
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  // Get selected role description
  const selectedRoleDescription = USER_ROLES.find(r => r.value === formData.role)?.description || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite User"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className={labelStyles}>
              Full Name *
            </label>
            <input
              type="text"
              id="full_name"
              required
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              onBlur={() => handleBlur('full_name')}
              className={`${inputStyles} ${
                touched.full_name && errors.full_name
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : ''
              }`}
              placeholder="John Doe"
              disabled={inviteUserMutation.isPending}
            />
            {touched.full_name && errors.full_name && (
              <p className={errorMessageStyles}>
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelStyles}>
              Email *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`${inputStyles} ${
                touched.email && errors.email
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : ''
              }`}
              placeholder="john.doe@example.com"
              disabled={inviteUserMutation.isPending}
            />
            {touched.email && errors.email && (
              <p className={errorMessageStyles}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className={labelStyles}>
              Role *
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value as UserRole)}
              onBlur={() => handleBlur('role')}
              className={`${inputStyles} ${
                touched.role && errors.role
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : ''
              }`}
              disabled={inviteUserMutation.isPending}
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {/* Show role description */}
            <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
              {selectedRoleDescription}
            </p>
            {touched.role && errors.role && (
              <p className={errorMessageStyles}>
                {errors.role}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelStyles}>
              Phone (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              className={`${inputStyles} ${
                touched.phone && errors.phone
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : ''
              }`}
              placeholder="+1 (555) 123-4567"
              disabled={inviteUserMutation.isPending}
            />
            {touched.phone && errors.phone && (
              <p className={errorMessageStyles}>
                {errors.phone}
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className={buttonStyles.secondary}
            disabled={inviteUserMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${buttonStyles.primary} flex items-center gap-2`}
            disabled={inviteUserMutation.isPending}
          >
            {inviteUserMutation.isPending && <LoadingSpinner size="sm" />}
            Send Invitation
          </button>
        </div>
      </form>
    </Modal>
  );
}
