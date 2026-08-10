import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  type?: 'info' | 'error' | 'success' | 'liked';
  duration?: number;
  imageUrl?: string;
  action?: ToastAction;
}

interface ToastState {
  message: string | null;
  type: 'info' | 'error' | 'success' | 'liked';
  imageUrl: string | null;
  action: ToastAction | null;
  isVisible: boolean;
  showToast: (messageOrOptions: string | ToastOptions, type?: 'info' | 'error' | 'success' | 'liked', duration?: number) => void;
  hideToast: () => void;
}

let timeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Global Zustand store governing the visibility, payload, and lifecycle of custom in-app toast notifications.
 * Automatically handles timeout clearing to prevent overlapping or lingering toasts.
 */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  imageUrl: null,
  action: null,
  isVisible: false,

  showToast: (messageOrOptions, type = 'info', duration = 3000) => {
    if (timeoutId) clearTimeout(timeoutId);

    if (typeof messageOrOptions === 'string') {
      set({ message: messageOrOptions, type, imageUrl: null, action: null, isVisible: true });
    } else {
      set({ 
        message: messageOrOptions.message, 
        type: messageOrOptions.type || 'info', 
        imageUrl: messageOrOptions.imageUrl || null,
        action: messageOrOptions.action || null,
        isVisible: true 
      });
      duration = messageOrOptions.duration || 3000;
    }

    timeoutId = setTimeout(() => {
      set({ isVisible: false });
      setTimeout(() => set({ message: null, imageUrl: null, action: null }), 300);
    }, duration);
  },

  hideToast: () => {
    if (timeoutId) clearTimeout(timeoutId);
    set({ isVisible: false });
    setTimeout(() => set({ message: null, imageUrl: null, action: null }), 300);
  }
}));
