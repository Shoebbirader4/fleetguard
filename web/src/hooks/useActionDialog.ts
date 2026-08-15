import { useCallback, useState } from 'react';
import type { ActionDialogStatus } from '../components/ActionDialog';

export function useActionDialog() {
  const [state, setState] = useState<{ open: boolean; status: ActionDialogStatus; title: string; message: string }>({ open: false, status: 'progress', title: '', message: '' });
  const open = useCallback((status: ActionDialogStatus, title: string, message: string) => setState({ open: true, status, title, message }), []);
  const close = useCallback(() => setState((current) => ({ ...current, open: false })), []);
  return { state, open, close, confirm: (title: string, message: string) => open('confirm', title, message), progress: (title: string, message: string) => open('progress', title, message), success: (title: string, message: string) => open('success', title, message), error: (title: string, message: string) => open('error', title, message), locked: (title: string, message: string) => open('locked', title, message) };
}
