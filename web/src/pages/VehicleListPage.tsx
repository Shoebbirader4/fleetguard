import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { VehicleWithDriver, VEHICLE_TYPES, VEHICLE_STATUSES } from '../types/vehicle';
import { formatVIN } from '../lib/validations';
import ExportButton from '../components/ExportButton';
import Layout from '../components/Layout';
import { VirtualList } from '../components/VirtualList';
import { GridCardSkeleton } from '../components/SkeletonScreens';

export default function VehicleListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Fetch vehicles with driver information
  const { data: vehicles, isLoading, error } = useQuery<VehicleWithDriver[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((vehicle: any) => ({
        ...vehicle,
        driver: vehicle.driver,
        last_location: vehicle.last_location ? {
          latitude: vehicle.last_location.coordinates[1],
          longitude: vehicle.last_location.coordinates[0],
        } : undefined,
      }));
    },
  });

  // Filter and search vehicles
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((vehicle) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        vehicle.vin.toLowerCase().includes(searchLower) ||
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.chassis_number?.toLowerCase().includes(searchLower) ||
        vehicle.assigned_route?.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType = !filterType || vehicle.vehicle_type === filterType;

      // Status filter
      const matchesStatus = !filterStatus || vehicle.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, searchQuery, filterType, filterStatus]);

  const getStatusColor = (status: string) => {
    const statusConfig = VEHICLE_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = VEHICLE_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };

  const handleCreateVehicle = () => {
    navigate('/vehicles/new');
  };

  const handleViewVehicle = (id: string) => {
    navigate(`/vehicles/${id}`);
  };

  const handleEditVehicle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/vehicles/${id}/edit`);
  };

  // Extracted VehicleCard component for reuse in both regular and virtual list rendering
  const VehicleCard = ({ vehicle, onView, onEdit }: {
    vehicle: VehicleWithDriver;
    onView: (id: string) => void;
    onEdit: (id: string, e: React.MouseEvent) => void;
  }) => (
    <div
      onClick={() => onView(vehicle.id)}
      className="card hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </h3>
          <p className="text-sm font-normal leading-normal text-gray-600 dark:text-gray-400 font-mono">
            VIN: {formatVIN(vehicle.vin)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${getStatusColor(vehicle.status)}`}>
            {getStatusBadge(vehicle.status)}
          </span>
          <button
            onClick={(e) => onEdit(vehicle.id, e)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit vehicle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm font-normal leading-normal">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Type:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
            {VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label || vehicle.vehicle_type}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Odometer:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
            {vehicle.current_odometer.toLocaleString()} {vehicle.unit}
          </span>
        </div>
        {vehicle.assigned_route && (
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Route:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
              {vehicle.assigned_route}
            </span>
          </div>
        )}
        <div className="col-span-2">
          <span className="text-gray-600 dark:text-gray-400">Driver:</span>
          {vehicle.driver ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/drivers/${vehicle.driver!.id}`);
              }}
              className="ml-2 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {vehicle.driver.full_name}
            </button>
          ) : (
            <span className="ml-2 font-medium text-gray-500 dark:text-gray-400">
              Unassigned
            </span>
          )}
        </div>
        {vehicle.gps_device_id && (
          <div className="col-span-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-normal leading-tight text-green-600 dark:text-green-400">GPS Enabled</span>
            {vehicle.last_gps_update && (
              <span className="text-xs font-normal leading-tight text-gray-500 dark:text-gray-400">
                • Last update: {new Date(vehicle.last_gps_update).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              Vehicles
            </h1>
            <div className="flex gap-3">
              {filteredVehicles.length > 0 && (
                <>
                  <ExportButton
                    data={filteredVehicles.map((v) => ({
                      VIN: v.vin,
                      Make: v.make,
                      Model: v.model,
                      Year: v.year,
                      Type: v.vehicle_type,
                      Status: v.status,
                      Odometer: v.current_odometer,
                      Unit: v.unit,
                      Driver: v.driver?.full_name || 'Unassigned',
                    }))}
                    filename={`vehicles_${new Date().toISOString().split('T')[0]}`}
                    format="excel"
                    label="Export Excel"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  />
                  <ExportButton
                    data={filteredVehicles.map((v) => ({
                      VIN: v.vin,
                      Make: v.make,
                      Model: v.model,
                      Year: v.year,
                      Type: v.vehicle_type,
                      Status: v.status,
                      Odometer: v.current_odometer,
                      Unit: v.unit,
                      Driver: v.driver?.full_name || 'Unassigned',
                    }))}
                    filename={`vehicles_${new Date().toISOString().split('T')[0]}`}
                    format="csv"
                    label="Export CSV"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors text-sm font-medium"
                  />
                </>
              )}
              <button
                onClick={handleCreateVehicle}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Vehicle
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label className="label">Search</label>
              <input
                type="text"
                placeholder="Search by VIN, make, model, chassis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="label">Vehicle Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="label">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                {VEHICLE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {vehicles && (
            <div className="mt-4 text-sm font-normal leading-normal text-gray-600 dark:text-gray-400">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </div>
          )}
        </div>

        {/* Vehicle List */}
        {isLoading ? (
          <GridCardSkeleton count={6} />
        ) : error ? (
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              Error loading vehicles: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No vehicles found
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchQuery || filterType || filterStatus
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first vehicle'}
            </p>
            {!searchQuery && !filterType && !filterStatus && (
              <button
                onClick={handleCreateVehicle}
                className="mt-4 btn-primary"
              >
                Add Vehicle
              </button>
            )}
          </div>
        ) : filteredVehicles.length < 50 ? (
          // For small lists, use regular rendering
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onView={handleViewVehicle}
                onEdit={handleEditVehicle}
              />
            ))}
          </div>
        ) : (
          // For large lists (50+), use virtual scrolling for better performance
          <div className="h-[calc(100vh-400px)]">
            <VirtualList
              items={filteredVehicles}
              renderItem={(vehicle) => (
                <div className="px-4 lg:px-0 lg:grid lg:grid-cols-2 lg:gap-4">
                  <VehicleCard
                    vehicle={vehicle}
                    onView={handleViewVehicle}
                    onEdit={handleEditVehicle}
                  />
                </div>
              )}
              estimateSize={200}
              overscan={5}
              emptyMessage="No vehicles found"
            />
          </div>
        )}
      </main>
    </Layout>
  );
}
