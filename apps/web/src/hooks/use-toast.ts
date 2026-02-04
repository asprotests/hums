import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCount = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let memoryToasts: Toast[] = [];

const addToast = (toast: ToastOptions) => {
  const id = String(++toastCount);
  const newToast: Toast = { id, ...toast };
  memoryToasts = [...memoryToasts, newToast];
  listeners.forEach((listener) => listener(memoryToasts));

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(memoryToasts));
  }, 5000);
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useState(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  });

  const toast = useCallback((options: ToastOptions) => {
    addToast(options);
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      memoryToasts = memoryToasts.filter((t) => t.id !== toastId);
    } else {
      memoryToasts = [];
    }
    listeners.forEach((listener) => listener(memoryToasts));
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}
