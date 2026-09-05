import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'gold'

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: string
  duration: number
  createdAt: number
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary' | 'game-amber'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: (value: boolean) => void
}

export const useNotificationStore = defineStore('notificationStore', () => {
  const toasts = ref<ToastItem[]>([])
  const confirmState = ref<ConfirmState | null>(null)

  function show(options: {
    type?: ToastType
    title?: string
    message: string
    duration?: number
  }): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const duration = options.duration ?? (options.type === 'error' ? 4500 : 3200)

    const item: ToastItem = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration,
      createdAt: Date.now(),
    }

    // Keep maximum 4 visible toasts at a time
    if (toasts.value.length >= 4) {
      toasts.value.shift()
    }

    toasts.value.push(item)

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }

  function dismiss(id: string) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  function success(message: string, title?: string, duration?: number) {
    return show({ type: 'success', title: title || 'Muvaffaqiyatli', message, duration })
  }

  function error(message: string, title?: string, duration?: number) {
    return show({ type: 'error', title: title || 'Xatolik', message, duration })
  }

  function warning(message: string, title?: string, duration?: number) {
    return show({ type: 'warning', title: title || 'Diqqat', message, duration })
  }

  function info(message: string, title?: string, duration?: number) {
    return show({ type: 'info', title: title || 'Ma\'lumot', message, duration })
  }

  function gold(message: string, title?: string, duration?: number) {
    return show({ type: 'gold', title: title || 'Oltin yetarli emas', message, duration })
  }

  // Interactive Promise-based Confirm Modal
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.value = {
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Tasdiqlash',
        cancelText: options.cancelText || 'Bekor qilish',
        variant: options.variant || 'danger',
        resolve: (val: boolean) => {
          if (confirmState.value) {
            confirmState.value.isOpen = false
          }
          resolve(val)
          setTimeout(() => {
            confirmState.value = null
          }, 200)
        }
      }
    })
  }

  return {
    toasts,
    confirmState,
    show,
    dismiss,
    success,
    error,
    warning,
    info,
    gold,
    confirm,
  }
})
