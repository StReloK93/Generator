<template>
  <!-- Compact game-style notices at the top centre, just below the game HUD row (never over gold / lives / menu) -->
  <div class="fixed inset-x-0 top-0 z-100! pointer-events-none flex flex-col items-center gap-1.5 px-4 select-none pt-safe">
    <div class="h-11 shrink-0" />
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-for="toast in notificationStore.toasts"
        :key="toast.id"
        class="pointer-events-auto cursor-pointer w-max max-w-80 flex items-start gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border-l-3 bg-slate-950/85 backdrop-blur-md shadow-lg shadow-black/40"
        :class="accent(toast.type).border"
        :title="$t('common.close')"
        @click="notificationStore.dismiss(toast.id)"
      >
        <component :is="accent(toast.type).icon" :class="['size-3.5 shrink-0 mt-px', accent(toast.type).text]" />
        <p class="min-w-0 text-[11px] leading-snug text-slate-200 line-clamp-2 wrap-break-word">
          <span v-if="toast.title" class="font-extrabold mr-1" :class="accent(toast.type).text">{{ toast.title }}</span>
          {{ toast.message }}
        </p>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { Coins, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useNotificationStore, ToastType } from '../../stores/notificationStore'

const notificationStore = useNotificationStore()

function accent(type: ToastType) {
  switch (type) {
    case 'gold':
      return { icon: Coins, text: 'text-amber-300', border: 'border-amber-400' }
    case 'success':
      return { icon: CheckCircle2, text: 'text-emerald-300', border: 'border-emerald-400' }
    case 'error':
      return { icon: AlertCircle, text: 'text-rose-300', border: 'border-rose-400' }
    case 'warning':
      return { icon: AlertTriangle, text: 'text-amber-300', border: 'border-amber-400' }
    default:
      return { icon: Info, text: 'text-sky-300', border: 'border-sky-400' }
  }
}
</script>
