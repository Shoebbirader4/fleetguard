import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { VehicleFormData, VEHICLE_TYPES, VEHICLE_STATUSES, ODOMETER_UNITS } from '../types/vehicle';
import { getVINError, validateVehicleYear, validateOdometer } from '../lib/validations';
import { checkVehicleCreationAllowed } from '../hooks/useSubscription';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/ToastContainer';
import DriverSelector from '../components/DriverSelector';

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isEditMode = !!id;

  const [formData, setFormData] = useState<VehicleFormData>({
    vin: '',
    chassis_number: '',
    engine_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: 'bus',
    current_odometer: 0,
    unit: 'km',
    gps_device_id: '',
    assigned_route: '',
    depot_location: '',
    assigned_driver_id: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch vehicle data for edit mode
  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Populate form data in edit mode
  useEffect(() => {
    if (vehicle) {
      setFormData({
        vin: vehicle.vin,
        chassis_number: vehicle.chassis_number || '',
        engine_number: vehicle.engine_number || '',
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vehicle_type: vehicle.vehicle_type,
        current_odometer: vehicle.current_odometer,
        unit: vehicle.unit,
        gps_device_id: vehicle.gps_device_id || '',
        assigned_route: vehicle.assigned_route || '',
        depot_location: vehicle.depot_location || '',
        assigned_driver_id: vehicle.assigned_driver_id || '',
        status: vehicle.status,
      });
    }
  }, [vehicle]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const { data: result, error } = await supabase
        .from('vehicles')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle created successfully');
      navigate(`/vehicles/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      if (!id) throw new Error('Vehicle ID is required');

      const { data: result, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      toast.success('Vehicle updated successfully');
      navigate(`/vehicles/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });

  const handleChange = (field: keyof VehicleFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};

    // VIN validation
    const vinError = getVINError(formData.vin);
    if (vinError) {
      newErrors.vin = vinError;
    }

    // Make validation
    if (!formData.make.trim()) {
      newErrors.make = 'Make is required';
    }

    // Model validation
    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    // Year validation
    if (!validateVehicleYear(formData.year)) {
      newErrors.year = 'Year must be between 1900 and ' + (new Date().getFullYear() + 1);
    }

    // Odometer validation
    if (!validateOdometer(formData.current_odometer)) {
      newErrors.current_odometer = 'Odometer must be between 0 and 10,000,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check subscription limit only for new vehicle creation (not edit mode)
    if (!isEditMode && user?.tenantId) {
      const limitError = await checkVehicleCreationAllowed(user.tenantId);
      if (limitError) {
        setSubmitError(limitError);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Clean up empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        chassis_number: formData.chassis_number || undefined,
        engine_number: formData.engine_number || undefined,
        gps_device_id: formData.gps_device_id || undefined,
        assigned_route: formData.assigned_route || undefined,
        depot_location: formData.depot_location || undefined,
        assigned_driver_id: formData.assigned_driver_id || undefined,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync(cleanedData);
      } else {
        await createMutation.mutateAsync(cleanedData);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/vehicles/${id}`);
    } else {
      navigate('/vehicles');
    }
  };

  if (isEditMode && vehicleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading vehicle data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-medium mb-2">{submitError}</p>
                {submitError.toLowerCase().includes('limit') && (
                  <Link
                    to="/subscription"
                    className="inline-flex items-center gap-1 text-sm font-normal leading-normal text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-semibold"
                  >
                    View Subscription Plans →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VIN */}
              <div className="md:col-span-2">
                <label className="label">
                  VIN (Vehicle Identification Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                  maxLength={17}
                  className={`input-field ${errors.vin ? 'border-red-500' : ''}`}
                  placeholder="1HGBH41JXMN109186"
                  disabled={isEditMode} // VIN cannot be changed after creation
                />
                {errors.vin && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.vin}</p>
                )}
                {!errors.vin && formData.vin && (
                  <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                    {formData.vin.length}/17 characters
                  </p>
                )}
              </div>

              {/* Make */}
              <div>
                <label className="label">
                  Make <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => handleChange('make', e.target.value)}
                  className={`input-field ${errors.make ? 'border-red-500' : ''}`}
                  placeholder="e.g., Ford, Toyota, Volvo"
                />
                {errors.make && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.make}</p>
                )}
              </div>

              {/* Model */}
              <div>
                <label className="label">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className={`input-field ${errors.model ? 'border-red-500' : ''}`}
                  placeholder="e.g., Transit, Camry, FH16"
                />
                {errors.model && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.model}</p>
                )}
              </div>

              {/* Year */}
              <div>
                <label className="label">
                  Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className={`input-field ${errors.year ? 'border-red-500' : ''}`}
                />
                {errors.year && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.year}</p>
                )}
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="label">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleChange('vehicle_type', e.target.value)}
                  className="input-field"
                >
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chassis Number */}
              <div>
                <label className="label">Chassis Number</label>
                <input
                  type="text"
                  value={formData.chassis_number}
                  onChange={(e) => handleChange('chassis_number', e.target.value)}
                  className="input-field"
                  placeholder="Optional"
                />
              </div>

              {/* Engine Number */}
              <div>
                <label className="label">Engine Number</label>
                <input
                  type="text"
                  value={formData.engine_number}
                  onChange={(e) => handleChange('engine_number', e.target.value)}
                  className="input-field"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Operational Information Section */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
              Operational Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="label">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="input-field"
                >
                  {VEHICLE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Odometer Unit */}
              <div>
                <label className="label">
                  Odometer Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="input-field"
                >
                  {ODOMETER_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Odometer */}
              <div>
                <label className="label">
                  Current Odometer <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.current_odometer}
                  onChange={(e) => handleChange('current_odometer', parseInt(e.target.value) || 0)}
                  min={0}
                  className={`input-field ${errors.current_odometer ? 'border-red-500' : ''}`}
                  placeholder="0"
                />
                {errors.current_odometer && (
                  <p className="mt-1 text-sm font-normal leading-normal text-red-600 dark:text-red-400">{errors.current_odometer}</p>
                )}
              </div>

              {/* Assigned Driver */}
              <div>
                <label className="label">Assigned Driver</label>
                <DriverSelector
                  value={formData.assigned_driver_id || null}
                  onChange={(driverId) => handleChange('assigned_driver_id', driverId || '')}
                  placeholder="Select a driver..."
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                  Assign a driver to this vehicle (optional)
                </p>
              </div>

              {/* Assigned Route */}
              <div>
                <label className="label">Assigned Route</label>
                <input
                  type="text"
                  value={formData.assigned_route}
                  onChange={(e) => handleChange('assigned_route', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Route 101, Downtown Loop"
                />
              </div>

              {/* Depot Location */}
              <div>
                <label className="label">Depot Location</label>
                <input
                  type="text"
                  value={formData.depot_location}
                  onChange={(e) => handleChange('depot_location', e.target.value)}
                  className="input-field"
                  placeholder="e.g., Main Depot, North Yard"
                />
              </div>
            </div>
          </div>

          {/* GPS Configuration Section */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
              GPS Configuration
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {/* GPS Device ID */}
              <div>
                <label className="label">GPS Device ID</label>
                <input
                  type="text"
                  value={formData.gps_device_id}
                  onChange={(e) => handleChange('gps_device_id', e.target.value)}
                  className="input-field"
                  placeholder="e.g., GPS-12345"
                />
                <p className="mt-1 text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                  Enter the GPS device identifier for real-time tracking
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                isEditMode ? 'Update Vehicle' : 'Create Vehicle'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
