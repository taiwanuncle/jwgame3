import { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastItem {
  id: number;
  message: string;
  type?: 'info' | 'success' | 'alert';
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}

function ToastMessage({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 1500);
    const removeTimer = setTimeout(onRemove, 2000);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [onRemove]);

  return (
    <div
      className={`toast-item ${toast.type === 'alert' ? 'toast-alert' : toast.type === 'success' ? 'toast-success' : ''} ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      {toast.message}
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
