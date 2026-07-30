import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Component as ComponentType, Prediction, Vehicle, ComponentWithPrediction, ComponentsByType } from '../types/components';
import Layout from '../components/Layout';
import { toast } from '../components/ToastContainer';
import ConfirmationModal from '../components/ConfirmationModal';

export default function ComponentsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const vehicleIdParam = searchParams.get('vehicleId');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleIdParam || '');
  const [componentsByType, setComponentsByType] = useState<ComponentsByType>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [componentToDelete, setComponentToDelete] = useState<ComponentWithPrediction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch vehicles on mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setVehicles(data || []);
        
        // If vehicleIdParam exists, set it as selected
        if (vehicleIdParam && data && data.length > 0) {
          setSelectedVehicleId(vehicleIdParam);
        } else if (data && data.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load vehicles');
      }
    };

    fetchVehicles();
  }, [vehicleIdParam]);

  // Fetch components when vehicle is selected
  useEffect(() => {
    if (!selectedVehicleId) return;

    const fetchComponentsAndPredictions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch components for the selected vehicle using Supabase client directly
        const { data: componentsData, error: componentsError } = await supabase
          .from('components')
          .select('*')
          .eq('vehicle_id', selectedVehicleId);

        if (componentsError) throw componentsError;
        
        // Fetch predictions for the vehicle
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('predictions')
          .select('*')
          .eq('vehicle_id', selectedVehicleId)
          .order('created_at', { ascending: false });

        if (predictionsError) {
          console.warn('Error fetching predictions:', predictionsError);
          // Don't throw - predictions are optional
        }
        
        // Create a map of component_id to latest prediction
        const predictionMap = new Map();
        if (predictionsData) {
          predictionsData.forEach((pred) => {
            const existing = predictionMap.get(pred.component_id);
            if (!existing || new Date(pred.created_at) > new Date(existing.created_at)) {
              predictionMap.set(pred.component_id, pred);
            }
          });
        }

        // Get vehicle details
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', selectedVehicleId)
          .single();

        if (vehicleError) throw vehicleError;

        // Merge components with predictions and vehicle data
        const componentsWithData = (componentsData || []).map((comp) => ({
          ...comp,
          prediction: predictionMap.get(comp.id),
          vehicle,
        }));

        // Group components by type
        const grouped: Record<string, any[]> = {};
        componentsWithData.forEach((comp) => {
          const type = comp.component_type;
          if (!grouped[type]) {
            grouped[type] = [];
          }
          grouped[type].push(comp);
        });

        setComponentsByType(grouped);
      } catch (err) {
        console.error('Error fetching components:', err);
        setError(err instanceof Error ? err.message : 'Failed to load components and predictions');
      } finally {
        setLoading(false);
      }
    };

    fetchComponentsAndPredictions();
  }, [selectedVehicleId]);

  // Calculate remaining useful life percentage
  const calculateRemainingLifePercentage = (component: ComponentWithPrediction): number => {
    const vehicle = component.vehicle;
    if (!vehicle) return 0;

    const currentOdometer = vehicle.current_odometer;
    const installationOdometer = component.installation_odometer;
    const expectedLifeKm = component.expected_life_km;

    if (!expectedLifeKm || expectedLifeKm <= 0) return 0;

    const usedKm = currentOdometer - installationOdometer;
    const remainingKm = Math.max(0, expectedLifeKm - usedKm);
    const percentage = (remainingKm / expectedLifeKm) * 100;

    return Math.max(0, Math.min(100, percentage));
  };

  // Get color based on percentage
  const getLifePercentageColor = (percentage: number): string => {
    if (percentage >= 50) return 'text-green-600 dark:text-green-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get progress bar color
  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 50) return 'bg-green-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get risk badge color
  const getRiskBadgeColor = (riskScore: string): string => {
    switch (riskScore) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Format component type for display
  const formatComponentType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (componentId: string) => {
      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', componentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Component deleted successfully!');
      setShowDeleteModal(false);
      setComponentToDelete(null);
      // Refetch components
      if (selectedVehicleId) {
        fetchComponentsAndPredictions();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete component: ${error.message}`);
    },
  });

  const fetchComponentsAndPredictions = async () => {
    if (!selectedVehicleId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch components for the selected vehicle using Supabase client directly
      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .select('*')
        .eq('vehicle_id', selectedVehicleId);

      if (componentsError) throw componentsError;
      
      // Fetch predictions for the vehicle
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('predictions')
        .select('*')
        .eq('vehicle_id', selectedVehicleId)
        .order('created_at', { ascending: false });

      if (predictionsError) {
        console.warn('Error fetching predictions:', predictionsError);
        // Don't throw - predictions are optional
      }
      
      // Create a map of component_id to latest prediction
      const predictionMap = new Map();
      if (predictionsData) {
        predictionsData.forEach((pred) => {
          const existing = predictionMap.get(pred.component_id);
          if (!existing || new Date(pred.created_at) > new Date(existing.created_at)) {
            predictionMap.set(pred.component_id, pred);
          }
        });
      }

      // Get vehicle details
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', selectedVehicleId)
        .single();

      if (vehicleError) throw vehicleError;

      // Merge components with predictions and vehicle data
      const componentsWithData = (componentsData || []).map((comp) => ({
        ...comp,
        prediction: predictionMap.get(comp.id),
        vehicle,
      }));

      // Group components by type
      const grouped: Record<string, any[]> = {};
      componentsWithData.forEach((comp) => {
        const type = comp.component_type;
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(comp);
      });

      setComponentsByType(grouped);
    } catch (err) {
      console.error('Error fetching components:', err);
      setError(err instanceof Error ? err.message : 'Failed to load components and predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComponent = (componentId: string) => {
    navigate(`/components/${componentId}/edit`);
  };

  const handleDeleteClick = (component: ComponentWithPrediction) => {
    setComponentToDelete(component);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (componentToDelete) {
      deleteMutation.mutate(componentToDelete.id);
    }
  };

  const handleAddComponent = () => {
    if (selectedVehicleId) {
      navigate(`/vehicles/${selectedVehicleId}/components/new?vehicleId=${selectedVehicleId}`);
    } else {
      navigate('/components/new');
    }
  };

  const selectedVehicle = Array.isArray(vehicles) ? vehicles.find((v) => v.id === selectedVehicleId) : undefined;

  return (
    <Layout>
      <div className="bg-white dark:bg-gray-800 shadow-soft border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Components Tracking
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor component lifecycle, health, and predictive maintenance insights
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Vehicle Selector */}
        <div className="card mb-6">
          <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Vehicle
          </label>
          <select
            id="vehicle-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Choose a vehicle...</option>
            {Array.isArray(vehicles) && vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} {vehicle.year} - VIN: {vehicle.vin}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Info */}
        {selectedVehicle && (
          <div className="card mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  VIN: {selectedVehicle.vin}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedVehicle.current_odometer.toLocaleString()} {selectedVehicle.unit}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Odometer</p>
                </div>
                <button
                  onClick={handleAddComponent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Component
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading components...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Components List */}
        {!loading && !error && selectedVehicleId && (
          <>
            {Object.keys(componentsByType).length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No components found for this vehicle
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(componentsByType).map(([type, typeComponents]) => (
                  <div key={type} className="card">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      {formatComponentType(type)} ({typeComponents.length})
                    </h2>

                    <div className="space-y-4">
                      {typeComponents.map((component) => {
                        const remainingLifePercentage = calculateRemainingLifePercentage(component);
                        const prediction = component.prediction;

                        return (
                          <div
                            key={component.id}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                          >
                            {/* Component Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {component.component_subtype
                                    ? formatComponentType(component.component_subtype)
                                    : formatComponentType(component.component_type)}
                                </h3>
                                {component.brand && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {component.brand} {component.model && `- ${component.model}`}
                                  </p>
                                )}
                                {component.serial_number && (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    S/N: {component.serial_number}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    component.status === 'active'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {component.status.toUpperCase()}
                                </span>
                                <button
                                  onClick={() => handleEditComponent(component.id)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit component"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(component)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Delete component"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Component Lifecycle Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Installation Date</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {formatDate(component.installation_date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Installation Odometer</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {component.installation_odometer.toLocaleString()} {component.vehicle?.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Expected Life</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {component.expected_life_km
                                    ? `${component.expected_life_km.toLocaleString()} ${component.vehicle?.unit}`
                                    : component.expected_life_days
                                    ? `${component.expected_life_days} days`
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Remaining Useful Life */}
                            {component.expected_life_km && component.vehicle && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Remaining Useful Life
                                  </p>
                                  <p className={`text-sm font-bold ${getLifePercentageColor(remainingLifePercentage)}`}>
                                    {remainingLifePercentage.toFixed(0)}%
                                  </p>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${getProgressBarColor(
                                      remainingLifePercentage
                                    )}`}
                                    style={{ width: `${remainingLifePercentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {Math.max(
                                    0,
                                    component.expected_life_km -
                                      (component.vehicle.current_odometer - component.installation_odometer)
                                  ).toLocaleString()}{' '}
                                  {component.vehicle.unit} remaining
                                </p>
                              </div>
                            )}

                            {/* ML Predictions */}
                            {prediction && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                  ML Predictions
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Failure Probability</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                      {(prediction.failure_probability * 100).toFixed(1)}%
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Risk Score</p>
                                    <span
                                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeColor(
                                        prediction.risk_score
                                      )}`}
                                    >
                                      {prediction.risk_score.toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Predicted RUL</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {prediction.remaining_useful_life_km
                                        ? `${prediction.remaining_useful_life_km.toLocaleString()} ${
                                            component.vehicle?.unit
                                          }`
                                        : prediction.remaining_useful_life_days
                                        ? `${prediction.remaining_useful_life_days} days`
                                        : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {prediction.recommended_action && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                      Recommended Action
                                    </p>
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                      {prediction.recommended_action}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty State - No Vehicle Selected */}
        {!selectedVehicleId && !loading && (
          <div className="card text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Vehicle Selected</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a vehicle from the dropdown above to view its components
            </p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Component?"
        message={`Are you sure you want to delete this ${componentToDelete?.component_type || 'component'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
      />
    </Layout>
  );
}
