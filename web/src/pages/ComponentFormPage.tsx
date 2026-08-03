import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { toast } from '../components/ToastContainer';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  current_odometer: number;
  unit: string;
}

interface ComponentFormData {
  vehicle_id: string;
  component_type: string;
  component_subtype: string;
  brand: string;
  model: string;
  serial_number: string;
  installation_date: string;
  installation_odometer: number;
  expected_life_km: number | null;
  expected_life_days: number | null;
  notes: string;
  status: 'active' | 'replaced' | 'removed';
}

const COMPONENT_TYPES = [
  { value: 'engine', label: 'Engine' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'brake_system', label: 'Brake System' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'tire', label: 'Tire' },
  { value: 'battery', label: 'Battery' },
  { value: 'alternator', label: 'Alternator' },
  { value: 'starter', label: 'Starter' },
  { value: 'air_filter', label: 'Air Filter' },
  { value: 'oil_filter', label: 'Oil Filter' },
  { value: 'fuel_filter', label: 'Fuel Filter' },
  { value: 'spark_plug', label: 'Spark Plug' },
  { value: 'belt', label: 'Belt' },
  { value: 'hose', label: 'Hose' },
  { value: 'light', label: 'Light' },
  { value: 'wiper', label: 'Wiper' },
  { value: 'clutch', label: 'Clutch' },
  { value: 'radiator', label: 'Radiator' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'other', label: 'Other' },
];

export default function ComponentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const vehicleIdParam = searchParams.get('vehicleId');
  const isEditMode = !!id;

  const [formData, setFormData] = useState<ComponentFormData>({
    vehicle_id: vehicleIdParam || '',
    component_type: '',
    component_subtype: '',
    brand: '',
    model: '',
    serial_number: '',
    installation_date: new Date().toISOString().split('T')[0],
    installation_odometer: 0,
    expected_life_km: null,
    expected_life_days: null,
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ComponentFormData, string>>>({});

  // Fetch vehicles for dropdown
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, make, model, year, vin, current_odometer, unit')
        .eq('status', 'active')
        .order('make', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch component data if editing
  const { data: component, isLoading } = useQuery({
    queryKey: ['component', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Populate form when editing
  useEffect(() => {
    if (component) {
      setFormData({
        vehicle_id: component.vehicle_id,
        component_type: component.component_type || '',
        component_subtype: component.component_subtype || '',
        brand: component.brand || '',
        model: component.model || '',
        serial_number: component.serial_number || '',
        installation_date: component.installation_date?.split('T')[0] || '',
        installation_odometer: component.installation_odometer || 0,
        expected_life_km: component.expected_life_km,
        expected_life_days: component.expected_life_days,
        notes: component.notes || '',
        status: component.status || 'active',
      });
    }
  }, [component]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      if (isEditMode && id) {
        const { data: updated, error } = await supabase
          .from('components')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('components')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: (data) => {
      toast.success(isEditMode ? 'Component updated successfully!' : 'Component added successfully!');
      navigate(`/vehicles/${data.vehicle_id}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} component: ${error.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('odometer') || name.includes('life') ? (value ? Number(value) : null) : value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof ComponentFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ComponentFormData, string>> = {};

    if (!formData.vehicle_id) {
      newErrors.vehicle_id = 'Vehicle is required';
    }
    if (!formData.component_type) {
      newErrors.component_type = 'Component type is required';
    }
    if (!formData.installation_date) {
      newErrors.installation_date = 'Installation date is required';
    }
    if (formData.installation_odometer < 0) {
      newErrors.installation_odometer = 'Installation odometer must be positive';
    }
    if (formData.expected_life_km !== null && formData.expected_life_km <= 0) {
      newErrors.expected_life_km = 'Expected life must be positive';
    }
    if (formData.expected_life_days !== null && formData.expected_life_days <= 0) {
      newErrors.expected_life_days = 'Expected life must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    if (formData.vehicle_id) {
      navigate(`/vehicles/${formData.vehicle_id}`);
    } else {
      navigate('/components');
    }
  };

  if (isEditMode && isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading component...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedVehicle = vehicles?.find((v) => v.id === formData.vehicle_id);

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Component' : 'Add New Component'}
          </h1>
          <p className="mt-1 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
            {isEditMode ? 'Update component information' : 'Add a new component to a vehicle'}
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Selection */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Vehicle Information</h2>
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle *
              </label>
              <select
                id="vehicle_id"
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                disabled={isEditMode}
                className={`block w-full rounded-md shadow-sm ${
                  errors.vehicle_id
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                } dark:bg-gray-700 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
              >
                <option value="">Select a vehicle...</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} {vehicle.year} - VIN: {vehicle.vin}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.vehicle_id}</p>}
              
              {selectedVehicle && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm font-normal leading-normal text-blue-800 dark:text-blue-200">
                    Current Odometer: <span className="font-semibold">{selectedVehicle.current_odometer.toLocaleString()} {selectedVehicle.unit}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Component Details */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Component Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="component_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Component Type *
                </label>
                <select
                  id="component_type"
                  name="component_type"
                  value={formData.component_type}
                  onChange={handleChange}
                  className={`block w-full rounded-md shadow-sm ${
                    errors.component_type
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  } dark:bg-gray-700 dark:text-gray-100`}
                >
                  <option value="">Select type...</option>
                  {COMPONENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.component_type && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.component_type}</p>
                )}
              </div>

              <div>
                <label htmlFor="component_subtype" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtype / Specific Part
                </label>
                <input
                  type="text"
                  id="component_subtype"
                  name="component_subtype"
                  value={formData.component_subtype}
                  onChange={handleChange}
                  placeholder="e.g., Front Right Tire, Oil Filter"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g., Bosch, Michelin"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model / Part Number
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., XYZ-123"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="Serial number or unique identifier"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Installation Information */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Installation Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="installation_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Installation Date *
                </label>
                <input
                  type="date"
                  id="installation_date"
                  name="installation_date"
                  value={formData.installation_date}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={`block w-full rounded-md shadow-sm ${
                    errors.installation_date
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  } dark:bg-gray-700 dark:text-gray-100`}
                />
                {errors.installation_date && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.installation_date}</p>
                )}
              </div>

              <div>
                <label htmlFor="installation_odometer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Installation Odometer {selectedVehicle && `(${selectedVehicle.unit})`} *
                </label>
                <input
                  type="number"
                  id="installation_odometer"
                  name="installation_odometer"
                  value={formData.installation_odometer}
                  onChange={handleChange}
                  min="0"
                  className={`block w-full rounded-md shadow-sm ${
                    errors.installation_odometer
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  } dark:bg-gray-700 dark:text-gray-100`}
                />
                {errors.installation_odometer && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.installation_odometer}</p>
                )}
              </div>

              <div>
                <label htmlFor="expected_life_km" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Life {selectedVehicle && `(${selectedVehicle.unit})`}
                </label>
                <input
                  type="number"
                  id="expected_life_km"
                  name="expected_life_km"
                  value={formData.expected_life_km || ''}
                  onChange={handleChange}
                  min="1"
                  placeholder="e.g., 50000"
                  className={`block w-full rounded-md shadow-sm ${
                    errors.expected_life_km
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  } dark:bg-gray-700 dark:text-gray-100`}
                />
                {errors.expected_life_km && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.expected_life_km}</p>
                )}
                <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                  How many {selectedVehicle?.unit || 'km/miles'} is this component expected to last?
                </p>
              </div>

              <div>
                <label htmlFor="expected_life_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Life (Days)
                </label>
                <input
                  type="number"
                  id="expected_life_days"
                  name="expected_life_days"
                  value={formData.expected_life_days || ''}
                  onChange={handleChange}
                  min="1"
                  placeholder="e.g., 365"
                  className={`block w-full rounded-md shadow-sm ${
                    errors.expected_life_days
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                  } dark:bg-gray-700 dark:text-gray-100`}
                />
                {errors.expected_life_days && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.expected_life_days}</p>
                )}
                <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                  For time-based components (e.g., batteries, fluids)
                </p>
              </div>

              {isEditMode && (
                <div className="md:col-span-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="replaced">Replaced</option>
                    <option value="removed">Removed</option>
                  </select>
                  <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                    Mark as "Replaced" or "Removed" when component is no longer in use
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-100 mb-4">Additional Notes</h2>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Add any additional notes, warranty information, or installation details..."
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={mutation.isPending}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Component' : 'Add Component'}</>
              )}
            </button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
