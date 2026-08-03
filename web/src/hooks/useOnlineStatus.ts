import { useState, useEffect } from 'react';
import { toast } from '../components/ToastContainer';

/**
 * Hook to detect online/offline status
 * Returns true when online, false when offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Handler for when going online
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online');
    };

    // Handler for when going offline
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will be saved when you reconnect.', 8000);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
