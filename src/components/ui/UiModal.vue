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
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none pt-safe pb-safe"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
        @wheel.stop
      >
        <!-- Backdrop click zone -->
        <div 
          class="absolute inset-0"
          @click="handleBackdropClick"
        ></div>

        <!-- Modal Dialog Box -->
        <div 
          :class="[
            'relative glass-panel w-full rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] animate-in zoom-in-95 duration-200 z-10',
            sizeClasses,
            customClass
          ]"
        >
          <!-- Modal Header -->
          <div 
            v-if="!hideHeader"
            class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0"
          >
            <slot name="header">
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                <!-- Icon container -->
                <div 
                  v-if="icon"
                  :class="[
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 border',
                    iconColorClasses
                  ]"
                >
                  <component :is="icon" class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>

                <!-- Titles -->
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                    <slot name="title">{{ title }}</slot>
                  </h2>
                  <p v-if="subtitle || $slots.subtitle" class="text-[11px] sm:text-xs text-slate-400 truncate">
                    <slot name="subtitle">{{ subtitle }}</slot>
                  </p>
                </div>
              </div>
            </slot>

            <!-- Close button -->
            <button 
              v-if="showClose"
              type="button"
              class="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-target shrink-0"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div :class="['overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5', bodyClass]">
            <slot />
          </div>

          <!-- Modal Footer -->
          <div 
            v-if="$slots.footer"
            class="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5 shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
export type IconColor = 'amber' | 'brand' | 'emerald' | 'rose' | 'cyan' | 'slate'

interface Props {
  isOpen: boolean
  title?: string
  subtitle?: string
  icon?: any
  iconColor?: IconColor
  size?: ModalSize
  showClose?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  hideHeader?: boolean
  customClass?: string | string[] | Record<string, any>
  bodyClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: '',
  subtitle: '',
  iconColor: 'brand',
  size: 'md',
  showClose: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  hideHeader: false,
  customClass: '',
  bodyClass: '',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:isOpen', value: boolean): void
}>()

function close() {
  emit('close')
  emit('update:isOpen', false)
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (props.isOpen && props.closeOnEscape && e.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-sm'
    case 'md':
      return 'max-w-md'
    case 'lg':
      return 'max-w-lg'
    case 'xl':
      return 'max-w-xl'
    case '2xl':
      return 'max-w-2xl'
    case '3xl':
      return 'max-w-3xl'
    case '4xl':
      return 'max-w-4xl'
    case '5xl':
      return 'max-w-5xl'
    case 'full':
      return 'max-w-6xl'
    default:
      return 'max-w-md'
  }
})

const iconColorClasses = computed(() => {
  switch (props.iconColor) {
    case 'amber':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'emerald':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'rose':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    case 'cyan':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    case 'slate':
      return 'bg-slate-800 text-slate-300 border-slate-700'
    case 'brand':
    default:
      return 'bg-brand-500/20 text-brand-400 border-brand-500/30'
  }
})
</script>
