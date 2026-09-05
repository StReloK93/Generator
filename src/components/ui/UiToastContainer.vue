<template>
  <div 
    class="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-100! pointer-events-none flex flex-col items-center gap-2 w-full max-w-sm sm:max-w-md px-3 select-none"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform -translate-y-2 opacity-0 scale-95"
    >
      <div 
        v-for="toast in notificationStore.toasts"
        :key="toast.id"
        class="pointer-events-auto w-full p-3 sm:p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 transition-all duration-200 animate-in fade-in"
        :class="getToastStyles(toast.type)"
        @click="notificationStore.dismiss(toast.id)"
      >
        <!-- Type Icon -->
        <div 
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner border"
          :class="getIconBoxStyles(toast.type)"
        >
          <Coins v-if="toast.type === 'gold'" class="w-5 h-5 text-amber-300 animate-pulse" />
          <CheckCircle2 v-else-if="toast.type === 'success'" class="w-5 h-5 text-emerald-400" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-400" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-400" />
          <Info v-else class="w-5 h-5 text-sky-400" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pt-0.5">
          <h4 
            v-if="toast.title" 
            class="text-xs sm:text-sm font-black tracking-wide leading-tight"
            :class="getTitleColor(toast.type)"
          >
            {{ toast.title }}
          </h4>
          <p class="text-[11px] sm:text-xs text-slate-200 mt-0.5 leading-relaxed wrap-break-word">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close Button -->
        <button 
          type="button"
          class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 mt-0.5"
          title="Yopish"
          @click.stop="notificationStore.dismiss(toast.id)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { Coins, CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useNotificationStore, ToastType } from '../../stores/notificationStore'

const notificationStore = useNotificationStore()

function getToastStyles(type: ToastType): string {
  switch (type) {
    case 'gold':
      return 'bg-slate-950/95 border-amber-500/80 shadow-[0_10px_30px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/40'
    case 'success':
      return 'bg-slate-950/95 border-emerald-500/80 shadow-[0_10px_30px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/40'
    case 'error':
      return 'bg-slate-950/95 border-rose-500/80 shadow-[0_10px_30px_rgba(244,63,94,0.3)] ring-1 ring-rose-400/40'
    case 'warning':
      return 'bg-slate-950/95 border-amber-500/70 shadow-[0_10px_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
    default:
      return 'bg-slate-950/95 border-sky-500/70 shadow-[0_10px_30px_rgba(14,165,233,0.25)] ring-1 ring-sky-400/30'
  }
}

function getIconBoxStyles(type: ToastType): string {
  switch (type) {
    case 'gold':
      return 'bg-amber-500/20 border-amber-400/50'
    case 'success':
      return 'bg-emerald-500/20 border-emerald-400/50'
    case 'error':
      return 'bg-rose-500/20 border-rose-400/50'
    case 'warning':
      return 'bg-amber-500/20 border-amber-400/50'
    default:
      return 'bg-sky-500/20 border-sky-400/50'
  }
}

function getTitleColor(type: ToastType): string {
  switch (type) {
    case 'gold':
      return 'text-amber-300'
    case 'success':
      return 'text-emerald-300'
    case 'error':
      return 'text-rose-300'
    case 'warning':
      return 'text-amber-300'
    default:
      return 'text-sky-300'
  }
}
</script>
