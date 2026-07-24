import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const ALERT_TYPES = [
  { value: 'due_soon', label: 'Due Soon Alerts', description: 'Maintenance tasks approaching due date' },
  { value: 'overdue', label: 'Overdue Alerts', description: 'Maintenance tasks past due date' },
  { value: 'critical_failure_risk', label: 'Critical Failure Risk', description: 'High probability component failures' },
  { value: 'safety_risk', label: 'Safety Risk', description: 'Safety-related alerts' },
  { value: 'low_stock', label: 'Low Stock', description: 'Parts inventory below reorder level' },
  { value: 'document_expiry', label: 'Document Expiry Warning', description: 'Documents expiring within 30 days' },
  { value: 'document_expired', label: 'Document Expired', description: 'Expired certificates and documents' },
  { value: 'tire_replacement_forecast', label: 'Tire Replacement Forecast', description: 'Predicted tire replacement needs' },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push Notification' },
];

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [preferences, setPreferences] = useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing preferences
  useEffect(() => {
    if (user?.notification_preferences) {
      setPreferences(user.notification_preferences as Record<string, string[]>);
    } else {
      // Default: email for all alert types
      const defaultPrefs: Record<string, string[]> = {};
      ALERT_TYPES.forEach((alert) => {
        defaultPrefs[alert.value] = ['email'];
      });
      setPreferences(defaultPrefs);
    }
  }, [user]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: preferences })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setHasChanges(false);
    },
  });

  const handleToggleChannel = (alertType: string, channel: string) => {
    setPreferences((prev) => {
      const current = prev[alertType] || [];
      const updated = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];

      return { ...prev, [alertType]: updated };
    });
    setHasChanges(true);
  };

  const isChannelEnabled = (alertType: string, channel: string): boolean => {
    return preferences[alertType]?.includes(channel) || false;
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    if (user?.notification_preferences) {
      setPreferences(user.notification_preferences as Record<string, string[]>);
    }
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Notification Preferences
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configure how you receive alerts and notifications
              </p>
            </div>
            {hasChanges && (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                  disabled={saveMutation.isPending}
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="card">
          <div className="space-y-6">
            {ALERT_TYPES.map((alertType) => (
              <div
                key={alertType.value}
                className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0"
              >
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {alertType.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {alertType.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {CHANNELS.map((channel) => (
                    <label
                      key={channel.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChannelEnabled(alertType.value, channel.value)}
                        onChange={() => handleToggleChannel(alertType.value, channel.value)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {channel.label}
                      </span>
                    </label>
                  ))}
                </div>

                {preferences[alertType.value]?.length === 0 && (
                  <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                    Warning: No notification channels selected for this alert type
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              About Notification Channels
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• <strong>Email:</strong> Notifications sent to your registered email address</li>
              <li>• <strong>SMS:</strong> Text messages sent to your phone number</li>
              <li>• <strong>WhatsApp:</strong> Messages via WhatsApp Business API</li>
              <li>• <strong>Push:</strong> Mobile app push notifications</li>
            </ul>
          </div>

          {saveMutation.isError && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">
                Failed to save preferences. Please try again.
              </p>
            </div>
          )}

          {saveMutation.isSuccess && !hasChanges && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                Preferences saved successfully!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
