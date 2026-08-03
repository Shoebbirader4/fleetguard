import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiIcon } from '@heroicons/react/24/outline';

/**
 * Visual indicator that shows when the app is offline
 * Displays as a fixed banner at the top of the screen
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <WifiIcon className="h-5 w-5" />
        <p className="text-sm font-medium">
          You are currently offline. Changes will be saved when you reconnect.
        </p>
      </div>
    </div>
  );
}
