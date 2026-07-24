import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function SparePartFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    part_number: '',
    description: '',
    category: '',
    unit_of_measure: '',
    unit_cost: '',
    current_quantity: '',
    reorder_level: '',
    max_stock_level: '',
    vendor_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  // Fetch vendors for dropdown
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .order('vendor_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch existing part data if editing
  const { data: existingPart, isLoading } = useQuery({
    queryKey: ['spare-part', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditMode && !!user,
  });

  // Load existing part data into form
  useEffect(() => {
    if (existingPart) {
      setFormData({
        part_number: existingPart.part_number || '',
        description: existingPart.description || '',
        category: existingPart.category || '',
        unit_of_measure: existingPart.unit_of_measure || '',
        unit_cost: existingPart.unit_cost?.toString() || '',
        current_quantity: existingPart.current_quantity?.toString() || '',
        reorder_level: existingPart.reorder_level?.toString() || '',
        max_stock_level: existingPart.max_stock_level?.toString() || '',
        vendor_id: existingPart.vendor_id || '',
      });
    }
  }, [existingPart]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        part_number: formData.part_number,
        description: formData.description,
        category: formData.category,
        unit_of_measure: formData.unit_of_measure,
        unit_cost: parseFloat(formData.unit_cost),
        current_quantity: parseInt(formData.current_quantity),
        reorder_level: parseInt(formData.reorder_level),
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : null,
        vendor_id: formData.vendor_id || null,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('spare_parts')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spare_parts')
          .insert(payload);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      navigate('/inventory');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        setSubmitError('A part with this part number already exists');
      } else {
        setSubmitError(error.message || 'Failed to save part');
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.part_number.trim()) {
      newErrors.part_number = 'Part number is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.unit_of_measure.trim()) {
      newErrors.unit_of_measure = 'Unit of measure is required';
    }

    if (!formData.unit_cost || parseFloat(formData.unit_cost) < 0) {
      newErrors.unit_cost = 'Valid unit cost is required';
    }

    if (!formData.current_quantity || parseInt(formData.current_quantity) < 0) {
      newErrors.current_quantity = 'Valid current quantity is required';
    }

    if (!formData.reorder_level || parseInt(formData.reorder_level) < 0) {
      newErrors.reorder_level = 'Valid reorder level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (validate()) {
      saveMutation.mutate();
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading part data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isEditMode ? 'Edit Spare Part' : 'Add New Spare Part'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-6">
            {/* Part Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Part Number *
              </label>
              <input
                type="text"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.part_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                placeholder="e.g., BRK-001"
              />
              {errors.part_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.part_number}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                placeholder="Detailed description of the part"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
              )}
            </div>

            {/* Category & Unit of Measure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                  placeholder="e.g., Brakes, Filters, Tires"
                />
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit of Measure *
                </label>
                <input
                  type="text"
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.unit_of_measure ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                  placeholder="e.g., pcs, liters, kg"
                />
                {errors.unit_of_measure && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit_of_measure}</p>
                )}
              </div>
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Cost (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.unit_cost ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                placeholder="0.00"
              />
              {errors.unit_cost && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit_cost}</p>
              )}
            </div>

            {/* Stock Levels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  name="current_quantity"
                  value={formData.current_quantity}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.current_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                  placeholder="0"
                />
                {errors.current_quantity && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.current_quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reorder Level *
                </label>
                <input
                  type="number"
                  min="0"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.reorder_level ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500`}
                  placeholder="0"
                />
                {errors.reorder_level && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reorder_level}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  name="max_stock_level"
                  value={formData.max_stock_level}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vendor (Optional)
              </label>
              <select
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No vendor selected</option>
                {vendors?.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{submitError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                disabled={saveMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : isEditMode ? 'Update Part' : 'Create Part'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
