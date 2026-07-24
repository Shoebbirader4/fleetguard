import { useState, useCallback, useEffect } from 'react';
import Toast, { ToastMessage, ToastType } from './Toast';

let addToastFn: ((type: ToastType, message: string, duration?: number) => void) | null = null;

export const toast = {
  success: (message: string, duration?: number) => {
    addToastFn?.('success', message, duration);
  },
  error: (message: string, duration?: number) => {
    addToastFn?.('error', message, duration);
  },
  info: (message: string, duration?: number) => {
    addToastFn?.('info', message, duration);
  },
  warning: (message: string, duration?: number) => {
    addToastFn?.('warning', message, duration);
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toastMessage) => (
          <Toast key={toastMessage.id} toast={toastMessage} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
}
