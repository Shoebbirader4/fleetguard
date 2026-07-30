import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { VehicleWithDriver, VEHICLE_TYPES, VEHICLE_STATUSES } from '../types/vehicle';
import { formatVIN } from '../lib/validations';
import { toast } from '../components/ToastContainer';
import ConfirmationModal from '../components/ConfirmationModal';
import DriverSelector from '../components/DriverSelector';
import { useAssignDriverToVehicle } from '../hooks/useDrivers';

interface Component {
  id: string;
  component_type: string;
  component_subtype?: string;
  brand?: string;
  model?: string;
  installation_date: string;
  installation_odometer: number;
  status: string;
  expected_life_km?: number;
  expected_life_days?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Modal states
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangeDriverModal, setShowChangeDriverModal] = useState(false);
  const [newOdometer, setNewOdometer] = useState('');
  const [odometerError, setOdometerError] = useState('');
  const [isUpdatingOdometer, setIsUpdatingOdometer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Driver assignment mutation
  const assignDriverMutation = useAssignDriverToVehicle();

  // Load Google Maps API
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Fetch vehicle details
  const { data: vehicle, isLoading: vehicleLoading, error: vehicleError } = useQuery<VehicleWithDriver>({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      if (!id) throw new Error('Vehicle ID is required');

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          driver:assigned_driver_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        driver: data.driver,
        last_location: data.last_location ? {
          latitude: data.last_location.coordinates[1],
          longitude: data.last_location.coordinates[0],
        } : undefined,
      };
    },
    enabled: !!id,
  });

  // Fetch vehicle components
  const { data: components, isLoading: componentsLoading } = useQuery<Component[]>({
    queryKey: ['components', id],
    queryFn: async () => {
      if (!id) throw new Error('Vehicle ID is required');

      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('vehicle_id', id)
        .eq('status', 'active')
        .order('installation_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleEdit = () => {
    navigate(`/vehicles/${id}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Vehicle deleted successfully!');
      navigate('/vehicles');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleBack = () => {
    navigate('/vehicles');
  };

  const handleCreateWorkOrder = () => {
    navigate(`/work-orders/new?vehicleId=${id}`);
  };

  const handleAddComponent = () => {
    navigate(`/vehicles/${id}/components/new?vehicleId=${id}`);
  };

  const handleUpdateOdometer = () => {
    if (vehicle) {
      setNewOdometer(vehicle.current_odometer.toString());
      setShowOdometerModal(true);
    }
  };

  const submitOdometerUpdate = async () => {
    if (!vehicle || !id) return;

    const odometerValue = parseFloat(newOdometer);
    
    if (isNaN(odometerValue) || odometerValue < 0) {
      setOdometerError('Please enter a valid odometer reading');
      return;
    }

    if (odometerValue < vehicle.current_odometer) {
      setOdometerError(`Odometer cannot be less than current reading (${vehicle.current_odometer.toLocaleString()} ${vehicle.unit})`);
      return;
    }

    setIsUpdatingOdometer(true);
    setOdometerError('');

    try {
      // Update vehicle odometer
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ 
          current_odometer: odometerValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Insert odometer reading
      const { error: readingError } = await supabase
        .from('odometer_readings')
        .insert([{
          vehicle_id: id,
          reading: odometerValue,
          recorded_at: new Date().toISOString(),
        }]);

      if (readingError) console.warn('Failed to log odometer reading:', readingError);

      toast.success('Odometer updated successfully!');
      setShowOdometerModal(false);
      setNewOdometer('');
      
      // Refetch vehicle data
      window.location.reload();
    } catch (error) {
      console.error('Error updating odometer:', error);
      toast.error('Failed to update odometer');
    } finally {
      setIsUpdatingOdometer(false);
    }
  };

  const handleViewServiceHistory = () => {
    navigate(`/work-orders?vehicleId=${id}`);
  };

  const handleChangeDriver = () => {
    setSelectedDriverId(vehicle?.assigned_driver_id || null);
    setShowChangeDriverModal(true);
  };

  const handleViewDriverDetail = (driverId: string) => {
    navigate(`/drivers/${driverId}`);
  };

  const submitDriverChange = async () => {
    if (!id) return;

    try {
      await assignDriverMutation.mutateAsync({
        vehicleId: id,
        driverId: selectedDriverId,
      });

      toast.success(
        selectedDriverId 
          ? 'Driver assigned successfully!' 
          : 'Driver unassigned successfully!'
      );
      setShowChangeDriverModal(false);
      
      // Refetch vehicle data
      window.location.reload();
    } catch (error) {
      console.error('Error changing driver:', error);
      toast.error('Failed to change driver assignment');
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = VEHICLE_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = VEHICLE_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };

  const calculateRemainingLife = (component: Component, currentOdometer: number) => {
    if (!component.expected_life_km) return null;
    
    const usedKm = currentOdometer - component.installation_odometer;
    const remainingKm = component.expected_life_km - usedKm;
    const percentage = Math.max(0, Math.min(100, (remainingKm / component.expected_life_km) * 100));
    
    return {
      remainingKm,
      percentage,
      usedKm,
    };
  };

  const getRemainingLifeColor = (percentage: number) => {
    if (percentage >= 50) return 'text-green-600 dark:text-green-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 10) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (vehicleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading vehicle: {vehicleError instanceof Error ? vehicleError.message : 'Vehicle not found'}
            </p>
            <button onClick={handleBack} className="mt-4 btn-primary">
              Back to Vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mapCenter = vehicle.last_location 
    ? { lat: vehicle.last_location.latitude, lng: vehicle.last_location.longitude }
    : defaultCenter;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {vehicle.make} {vehicle.model} ({vehicle.year})
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  VIN: {formatVIN(vehicle.vin)}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleEdit} className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Vehicle
              </button>
              <button 
                onClick={handleDelete} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Vehicle Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <p className={`font-medium ${getStatusColor(vehicle.status)}`}>
                    {getStatusBadge(vehicle.status)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label || vehicle.vehicle_type}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Odometer</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {vehicle.current_odometer.toLocaleString()} {vehicle.unit}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Year</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.year}</p>
                </div>
                {vehicle.chassis_number && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Chassis Number</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.chassis_number}</p>
                  </div>
                )}
                {vehicle.engine_number && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Engine Number</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.engine_number}</p>
                  </div>
                )}
                {vehicle.assigned_route && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Assigned Route</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.assigned_route}</p>
                  </div>
                )}
                {vehicle.depot_location && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Depot Location</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.depot_location}</p>
                  </div>
                )}
                {vehicle.gps_device_id && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">GPS Device ID</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vehicle.gps_device_id}</p>
                    {vehicle.last_gps_update && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last update: {new Date(vehicle.last_gps_update).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* GPS Location Card */}
            {isMapLoaded && vehicle.gps_device_id && (
              <div className="card">
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                  GPS Location
                </h2>
                {vehicle.last_location ? (
                  <>
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={15}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      <Marker position={mapCenter} />
                    </GoogleMap>
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <p>Latitude: {vehicle.last_location.latitude.toFixed(6)}</p>
                      <p>Longitude: {vehicle.last_location.longitude.toFixed(6)}</p>
                      {vehicle.last_gps_update && (
                        <p className="mt-1">
                          Updated: {new Date(vehicle.last_gps_update).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="mt-2">No GPS location available yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Components Card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Components ({components?.length || 0})
              </h2>
              {componentsLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading components...
                </div>
              ) : components && components.length > 0 ? (
                <div className="space-y-3">
                  {components.map((component) => {
                    const remainingLife = calculateRemainingLife(component, vehicle.current_odometer);
                    return (
                      <div
                        key={component.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {component.component_type}
                              {component.component_subtype && ` - ${component.component_subtype}`}
                            </h3>
                            {(component.brand || component.model) && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {component.brand} {component.model}
                              </p>
                            )}
                          </div>
                          {remainingLife && (
                            <div className={`text-right ${getRemainingLifeColor(remainingLife.percentage)}`}>
                              <p className="text-lg font-bold">{Math.round(remainingLife.percentage)}%</p>
                              <p className="text-xs">Remaining</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Installed:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">
                              {new Date(component.installation_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">At Odometer:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">
                              {component.installation_odometer.toLocaleString()} {vehicle.unit}
                            </span>
                          </div>
                          {remainingLife && (
                            <>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Used:</span>
                                <span className="ml-2 text-gray-900 dark:text-gray-100">
                                  {remainingLife.usedKm.toLocaleString()} {vehicle.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                                <span className="ml-2 text-gray-900 dark:text-gray-100">
                                  {remainingLife.remainingKm.toLocaleString()} {vehicle.unit}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="mt-2">No components installed yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Driver Information Card */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Assigned Driver
                </h2>
                <button
                  onClick={handleChangeDriver}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  Change Driver
                </button>
              </div>
              {vehicle.driver ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => handleViewDriverDetail(vehicle.driver!.id)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left"
                      >
                        {vehicle.driver.full_name}
                      </button>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {vehicle.driver.email}
                      </p>
                      {vehicle.driver.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {vehicle.driver.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">No driver assigned</p>
                  <button
                    onClick={handleChangeDriver}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Assign a driver
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button 
                  onClick={handleCreateWorkOrder}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Create Work Order
                </button>
                <button 
                  onClick={handleUpdateOdometer}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Update Odometer
                </button>
                <button 
                  onClick={handleAddComponent}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Add Component
                </button>
                <button 
                  onClick={handleViewServiceHistory}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  View Service History
                </button>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                Metadata
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(vehicle.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(vehicle.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Odometer Update Modal */}
      {showOdometerModal && vehicle && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75" aria-hidden="true" onClick={() => !isUpdatingOdometer && setShowOdometerModal(false)}></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                    Update Odometer
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Current reading: <span className="font-semibold">{vehicle.current_odometer.toLocaleString()} {vehicle.unit}</span>
                    </p>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="new-odometer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-2">
                      New Odometer Reading ({vehicle.unit})
                    </label>
                    <input
                      type="number"
                      id="new-odometer"
                      value={newOdometer}
                      onChange={(e) => {
                        setNewOdometer(e.target.value);
                        setOdometerError('');
                      }}
                      min={vehicle.current_odometer}
                      step="1"
                      disabled={isUpdatingOdometer}
                      className={`block w-full rounded-md shadow-sm ${
                        odometerError
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed`}
                    />
                    {odometerError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-left">{odometerError}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  disabled={isUpdatingOdometer}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
                  onClick={submitOdometerUpdate}
                >
                  {isUpdatingOdometer ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingOdometer}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-1 sm:mt-0 sm:text-sm"
                  onClick={() => setShowOdometerModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${vehicle?.make} ${vehicle?.model} (${vehicle?.year})? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Change Driver Modal */}
      {showChangeDriverModal && vehicle && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75" 
              aria-hidden="true" 
              onClick={() => !assignDriverMutation.isPending && setShowChangeDriverModal(false)}
            ></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                    Change Driver Assignment
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {vehicle.driver 
                        ? `Currently assigned to: ${vehicle.driver.full_name}` 
                        : 'No driver currently assigned'}
                    </p>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="driver-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-2">
                      Select Driver
                    </label>
                    <DriverSelector
                      value={selectedDriverId}
                      onChange={setSelectedDriverId}
                      placeholder="Select a driver or choose 'No driver' to unassign"
                      disabled={assignDriverMutation.isPending}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  disabled={assignDriverMutation.isPending}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm"
                  onClick={submitDriverChange}
                >
                  {assignDriverMutation.isPending ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Assignment'
                  )}
                </button>
                <button
                  type="button"
                  disabled={assignDriverMutation.isPending}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-1 sm:mt-0 sm:text-sm"
                  onClick={() => setShowChangeDriverModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
