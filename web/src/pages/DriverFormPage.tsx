/**
 * DriverFormPage Component
 * 
 * Form for creating new drivers or editing existing driver information.
 * Supports both create and edit modes based on route parameter.
 * Uses validation utilities for form validation and integrates with useDrivers hook.
 * 
 * Task 13.3 - Create DriverFormPage component
 * Requirements: 2.4
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDriverWithVehicles } from '../hooks/useDrivers';
import { useAuthStore } from '../stores/authStore';
import { canManageDrivers } from '../utils/authorization';
import {
  validateEmail,
  validateFullName,
  validatePhone,
  validateRequired,
  validateMaxLength,
} from '../utils/validation';
import type { DriverFormData } from '../types/driver';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from '../components/ToastContainer';

export default function DriverFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  // Check permissions
  const canManage = authUser ? canManageDrivers(authUser.role) : false;

  // Fetch driver data for edit mode
  const { data: driver, isLoading: driverLoading } = useDriverWithVehicles(id || '');

  // Form state
  const [formData, setFormData] = useState<DriverFormData>({
    email: '',
    full_name: '',
    phone: '',
    license_number: '',
    license_expiry: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DriverFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (authUser && !canManage) {
      navigate('/forbidden');
    }
  }, [authUser, canManage, navigate]);

  // Populate form data in edit mode
  useEffect(() => {
    if (driver && isEditMode) {
      setFormData({
        email: driver.email,
        full_name: driver.full_name,
        phone: driver.phone || '',
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry || '',
      });
    }
  }, [driver, isEditMode]);

  // Create mutation - Creates a user with driver role via invitation
  const createMutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      // Use the invite-user edge function to create a driver
      const { data: result, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || undefined,
          role: 'driver',
          license_number: data.license_number || undefined,
          license_expiry: data.license_expiry || undefined,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver invited successfully! They will receive an email to complete signup.');
      navigate('/drivers');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create driver');
    },
  });

  // Update mutation - Updates existing driver information
  const updateMutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      if (!id) throw new Error('Driver ID is required');

      const { data: result, error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          license_number: data.license_number || null,
          license_expiry: data.license_expiry || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers', id, 'vehicles'] });
      toast.success('Driver updated successfully!');
      navigate(`/drivers/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update driver');
    },
  });

  const handleChange = (field: keyof DriverFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DriverFormData, string>> = {};

    // Email validation (required, can't be changed in edit mode)
    if (!isEditMode) {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    // Full name validation (required)
    const nameError = validateFullName(formData.full_name);
    if (nameError) {
      newErrors.full_name = nameError;
    }

    // Phone validation (optional)
    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    // License number validation (optional, max length)
    if (formData.license_number) {
      const licenseError = validateMaxLength(formData.license_number, 50, 'License number');
      if (licenseError) {
        newErrors.license_number = licenseError;
      }
    }

    // License expiry validation (optional, must be a valid date format)
    if (formData.license_expiry) {
      const expiryDate = new Date(formData.license_expiry);
      if (isNaN(expiryDate.getTime())) {
        newErrors.license_expiry = 'Invalid date format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/drivers/${id}`);
    } else {
      navigate('/drivers');
    }
  };

  if (isEditMode && driverLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading driver information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Driver' : 'Add New Driver'}
          </h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isEditMode} // Email cannot be changed in edit mode
                className={`input-field ${isEditMode ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
                placeholder="driver@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
              {isEditMode && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Email cannot be changed after driver is created
                </p>
              )}
            </div>

            {/* Full Name Field */}
            <div>
              <label htmlFor="full_name" className="label">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="input-field"
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.full_name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input-field"
                placeholder="+1234567890"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Use international format (e.g., +1234567890)
              </p>
            </div>

            {/* License Number Field */}
            <div>
              <label htmlFor="license_number" className="label">
                License Number
              </label>
              <input
                type="text"
                id="license_number"
                value={formData.license_number}
                onChange={(e) => handleChange('license_number', e.target.value)}
                className="input-field"
                placeholder="DL123456789"
              />
              {errors.license_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.license_number}</p>
              )}
            </div>

            {/* License Expiry Field */}
            <div>
              <label htmlFor="license_expiry" className="label">
                License Expiry Date
              </label>
              <input
                type="date"
                id="license_expiry"
                value={formData.license_expiry}
                onChange={(e) => handleChange('license_expiry', e.target.value)}
                className="input-field"
              />
              {errors.license_expiry && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.license_expiry}</p>
              )}
            </div>

            {/* Info Message for Create Mode */}
            {!isEditMode && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-blue-400 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    The driver will receive an invitation email to complete their account setup.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Driver' : 'Invite Driver'}</>
              )}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
