import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, LockClosedIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

export type ActionDialogStatus = 'confirm' | 'progress' | 'success' | 'error' | 'locked';

interface ActionDialogProps {
  open: boolean;
  status: ActionDialogStatus;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function ActionDialog({ open, status, title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', busyLabel = 'Working…', onConfirm, onClose, onUpgrade }: ActionDialogProps) {
  const isTerminal = status === 'success' || status === 'error' || status === 'locked';
  const Icon = status === 'success' ? CheckCircleIcon : status === 'error' ? ExclamationTriangleIcon : status === 'locked' ? LockClosedIcon : status === 'progress' ? InformationCircleIcon : ExclamationTriangleIcon;
  const iconClass = status === 'success' ? 'text-emerald-600' : status === 'error' ? 'text-rose-600' : status === 'locked' ? 'text-indigo-600' : 'text-amber-500';
  return <Modal isOpen={open} onClose={isTerminal ? onClose : () => undefined} title={title} closeOnBackdrop={isTerminal} closeOnEscape={isTerminal}>
    <div className="flex gap-4"><Icon className={`h-7 w-7 shrink-0 ${iconClass}`} /><div className="min-w-0 flex-1"><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>{status === 'progress' && <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-600" /></div>}</div></div>
    <div className="mt-7 flex justify-end gap-3">{status === 'confirm' && <button type="button" onClick={onClose} className="btn-secondary">{cancelLabel}</button>}{status === 'confirm' && <button type="button" onClick={onConfirm} className="btn-primary">{confirmLabel}</button>}{status === 'progress' && <span className="text-sm font-semibold text-indigo-600">{busyLabel}</span>}{isTerminal && status !== 'locked' && <button type="button" onClick={onClose} className="btn-primary">Close</button>}{status === 'locked' && <button type="button" onClick={onUpgrade || onClose} className="btn-primary">View plans</button>}</div>
  </Modal>;
}
