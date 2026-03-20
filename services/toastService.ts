/**
 * services/toastService.ts
 * Global toast notification queue management
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

type ToastCallback = (toasts: Toast[]) => void;

class ToastQueue {
  private toasts: Toast[] = [];
  private listeners: Set<ToastCallback> = new Set();
  private maxToasts = 5;
  private defaultDuration = 5000;

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private notify(): void {
    this.listeners.forEach(callback => callback([...this.toasts]));
  }

  subscribe(callback: ToastCallback): () => void {
    this.listeners.add(callback);
    callback([...this.toasts]);
    return () => this.listeners.delete(callback);
  }

  add(type: ToastType, message: string, duration?: number): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? this.defaultDuration,
      createdAt: Date.now(),
    };

    this.toasts = [toast, ...this.toasts].slice(0, this.maxToasts);
    this.notify();

    if (toast.duration > 0) {
      setTimeout(() => this.remove(id), toast.duration);
    }

    return id;
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  clear(): void {
    this.toasts = [];
    this.notify();
  }

  success(message: string, duration?: number): string {
    return this.add('success', message, duration);
  }

  error(message: string, duration?: number): string {
    return this.add('error', message, duration ?? 8000);
  }

  warning(message: string, duration?: number): string {
    return this.add('warning', message, duration);
  }

  info(message: string, duration?: number): string {
    return this.add('info', message, duration);
  }

  getToasts(): Toast[] {
    return [...this.toasts];
  }

  setMaxToasts(max: number): void {
    this.maxToasts = max;
    this.toasts = this.toasts.slice(0, max);
    this.notify();
  }

  setDefaultDuration(duration: number): void {
    this.defaultDuration = duration;
  }
}

export const toastQueue = new ToastQueue();

export const toast = {
  success: (message: string, duration?: number) => toastQueue.success(message, duration),
  error: (message: string, duration?: number) => toastQueue.error(message, duration),
  warning: (message: string, duration?: number) => toastQueue.warning(message, duration),
  info: (message: string, duration?: number) => toastQueue.info(message, duration),
  remove: (id: string) => toastQueue.remove(id),
  clear: () => toastQueue.clear(),
};

export type { Toast, ToastType };
