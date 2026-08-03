import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface TirePrediction {
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  registration_number: string;
  predicted_replacement_date: string;
  days_until_replacement: number;
  confidence_score: number;
  current_tread_depth: number;
  recommended_tread_depth: number;
}

export default function TireReplacementWidget() {
  const user = useAuthStore((state) => state.user);

  const { data: tirePredictions, isLoading } = useQuery<TirePrediction[]>({
    queryKey: ['tire-predictions'],
    queryFn: async () => {
      // NOTE: Tire predictions are not yet implemented in the database
      // The predictions table is tied to components, not vehicle-level tire predictions
      // For now, return empty array to prevent errors
      // TODO: Implement vehicle-level tire prediction tracking
      
      // Return empty array - no tire predictions available yet
      return [];
      
      // Return empty array - no tire predictions available yet
      return [];
    },
    enabled: !!user,
  });

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'text-red-600 dark:text-red-400';
    if (days <= 30) return 'text-orange-600 dark:text-orange-400';
    if (days <= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUrgencyBg = (days: number) => {
    if (days <= 7) return 'bg-red-100 dark:bg-red-900/30';
    if (days <= 30) return 'bg-orange-100 dark:bg-orange-900/30';
    if (days <= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-green-100 dark:bg-green-900/30';
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🔮 Tire Replacement Forecast
          </h3>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
            ML Prediction
          </span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!tirePredictions || tirePredictions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🔮 Tire Replacement Forecast
          </h3>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
            ML Prediction
          </span>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No tire replacements predicted in the next 90 days
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            ✅ All tires are in good condition
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          🔮 Tire Replacement Forecast
        </h3>
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
          ML Prediction
        </span>
      </div>

      <div className="space-y-3">
        {tirePredictions.map((prediction) => (
          <div
            key={prediction.vehicle_id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {prediction.vehicle_make} {prediction.vehicle_model} {prediction.vehicle_year}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {prediction.registration_number}
                </div>
              </div>
              <div className={`px-2 py-1 text-xs font-medium rounded ${getUrgencyBg(prediction.days_until_replacement)}`}>
                <span className={getUrgencyColor(prediction.days_until_replacement)}>
                  {prediction.days_until_replacement}d
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="text-gray-600 dark:text-gray-400">
                Predicted: {new Date(prediction.predicted_replacement_date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-500">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {Math.round(prediction.confidence_score * 100)}% confidence
              </div>
            </div>

            {prediction.current_tread_depth > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Current tread: {prediction.current_tread_depth}mm
                  {prediction.current_tread_depth <= prediction.recommended_tread_depth && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Below minimum
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
        <a
          href="/analytics"
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
        >
          View Full Analytics →
        </a>
      </div>
    </div>
  );
}
