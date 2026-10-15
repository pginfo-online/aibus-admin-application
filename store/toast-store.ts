import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id, duration: toast.duration || 4500 };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, newToast.duration);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

// Quick helper functions for dispatching toasts anywhere
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'error' }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'warning' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().addToast({ title, description, variant: 'info' }),
};
