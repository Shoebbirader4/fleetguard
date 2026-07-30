/**
 * VendorFormPage Component
 * 
 * Form for creating new vendors or editing existing vendor information.
 * Supports both create and edit modes based on route parameter.
 * Uses validation utilities for form validation and integrates with useVendors hook.
 * 
 * Task 16.2 - Create VendorFormPage component
 * Requirements: 3.2
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVendorWithStats, useCreateVendor, useUpdateVendor } from '../hooks/useVendors';
import { useAuthStore } from '../stores/authStore';
import { canManageVendors } from '../utils/authorization';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateMaxLength,
} from '../utils/validation';
import type { VendorFormData } from '../types/vendor';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from '../components/ToastContainer';

export default function VendorFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  // Check permissions
  const canManage = authUser ? canManageVendors(authUser.role) : false;

  // Fetch vendor data for edit mode
  const { data: vendor, isLoading: vendorLoading } = useVendorWithStats(id || '');

  // Form state
  const [formData, setFormData] = useState<VendorFormData>({
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VendorFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (authUser && !canManage) {
      navigate('/forbidden');
    }
  }, [authUser, canManage, navigate]);

  // Populate form data in edit mode
  useEffect(() => {
    if (vendor && isEditMode) {
      setFormData({
        vendor_name: vendor.vendor_name,
        contact_person: vendor.contact_person || '',
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address || '',
        payment_terms: vendor.payment_terms || '',
        status: vendor.status,
      });
    }
  }, [vendor, isEditMode]);

  const handleChange = (field: keyof VendorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VendorFormData, string>> = {};

    // Vendor name validation (required)
    const nameError = validateRequired(formData.vendor_name, 'Vendor name');
    if (nameError) {
      newErrors.vendor_name = nameError;
    } else {
      const lengthError = validateMaxLength(formData.vendor_name, 200, 'Vendor name');
      if (lengthError) {
        newErrors.vendor_name = lengthError;
      }
    }

    // Email validation (required)
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Phone validation (required)
    const phoneError = validatePhone(formData.phone);
    if (phoneError && formData.phone) {
      newErrors.phone = phoneError;
    }
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Phone is required';
    }

    // Contact person validation (optional, max length)
    if (formData.contact_person) {
      const contactError = validateMaxLength(formData.contact_person, 100, 'Contact person');
      if (contactError) {
        newErrors.contact_person = contactError;
      }
    }

    // Address validation (optional, max length)
    if (formData.address) {
      const addressError = validateMaxLength(formData.address, 500, 'Address');
      if (addressError) {
        newErrors.address = addressError;
      }
    }

    // Payment terms validation (optional, max length)
    if (formData.payment_terms) {
      const termsError = validateMaxLength(formData.payment_terms, 200, 'Payment terms');
      if (termsError) {
        newErrors.payment_terms = termsError;
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
        await updateMutation.mutateAsync({ id: id!, ...formData });
        toast.success('Vendor updated successfully!');
        navigate(`/vendors/${id}`);
      } else {
        const result = await createMutation.mutateAsync(formData);
        toast.success('Vendor created successfully!');
        navigate(`/vendors/${result.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} vendor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/vendors/${id}`);
    } else {
      navigate('/vendors');
    }
  };

  if (isEditMode && vendorLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading vendor information...</p>
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
            {isEditMode ? 'Edit Vendor' : 'Add New Vendor'}
          </h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-6">
            {/* Vendor Name Field */}
            <div>
              <label htmlFor="vendor_name" className="label">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => handleChange('vendor_name', e.target.value)}
                className="input-field"
                placeholder="ABC Parts Supplier"
              />
              {errors.vendor_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.vendor_name}</p>
              )}
            </div>

            {/* Contact Person Field */}
            <div>
              <label htmlFor="contact_person" className="label">
                Contact Person
              </label>
              <input
                type="text"
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className="input-field"
                placeholder="John Smith"
              />
              {errors.contact_person && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_person}</p>
              )}
            </div>

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
                className="input-field"
                placeholder="vendor@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="label">
                Phone <span className="text-red-500">*</span>
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

            {/* Address Field */}
            <div>
              <label htmlFor="address" className="label">
                Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input-field"
                rows={3}
                placeholder="123 Main St, City, State, ZIP"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
              )}
            </div>

            {/* Payment Terms Field */}
            <div>
              <label htmlFor="payment_terms" className="label">
                Payment Terms
              </label>
              <input
                type="text"
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => handleChange('payment_terms', e.target.value)}
                className="input-field"
                placeholder="Net 30, Net 60, COD, etc."
              />
              {errors.payment_terms && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.payment_terms}</p>
              )}
            </div>

            {/* Status Field */}
            <div>
              <label htmlFor="status" className="label">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as 'active' | 'inactive')}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Only active vendors will appear in purchase order creation
              </p>
            </div>
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
                <>{isEditMode ? 'Update Vendor' : 'Create Vendor'}</>
              )}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
