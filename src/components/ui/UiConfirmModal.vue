<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="notificationStore.confirmState?.isOpen"
        class="fixed inset-0 z-100! flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none"
        @click.self="notificationStore.confirmState?.resolve(false)"
      >
        <div 
          class="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 relative overflow-hidden"
        >
          <!-- Ambient header glow -->
          <div 
            class="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-2xl pointer-events-none"
            :class="notificationStore.confirmState?.variant === 'danger' ? 'bg-rose-500/20' : 'bg-amber-500/20'"
          ></div>

          <div class="flex items-start gap-3.5 relative z-10">
            <div 
              class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
              :class="notificationStore.confirmState?.variant === 'danger' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'"
            >
              <AlertTriangle class="w-5 h-5" />
            </div>

            <div class="flex-1 min-w-0 pt-0.5">
              <h3 class="text-sm sm:text-base font-black text-white tracking-wide leading-tight">
                {{ notificationStore.confirmState?.title }}
              </h3>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed wrap-break-word">
                {{ notificationStore.confirmState?.message }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2.5 pt-1 relative z-10">
            <UiButton
              variant="secondary"
              size="md"
              @click="notificationStore.confirmState?.resolve(false)"
            >
              {{ notificationStore.confirmState?.cancelText || 'Bekor qilish' }}
            </UiButton>

            <UiButton
              :variant="notificationStore.confirmState?.variant === 'danger' ? 'danger' : 'game-amber'"
              size="md"
              @click="notificationStore.confirmState?.resolve(true)"
            >
              {{ notificationStore.confirmState?.confirmText || 'Tasdiqlash' }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { UiButton } from './index'
import { useNotificationStore } from '../../stores/notificationStore'

const notificationStore = useNotificationStore()
</script>
