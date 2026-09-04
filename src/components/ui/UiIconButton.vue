<template>
  <button
    type="button"
    :title="title || tooltip"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-95 disabled:pointer-events-none disabled:opacity-40 select-none aspect-square touch-target',
      variantClasses,
      sizeClasses,
      customClass
    ]"
    @click="$emit('click', $event)"
  >
    <slot>
      <component :is="icon" :class="iconSizeClass" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type IconButtonVariant = 'default' | 'tool' | 'ghost' | 'danger' | 'success' | 'amber'
export type IconButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  icon?: any
  title?: string
  tooltip?: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
  disabled?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  tooltip: '',
  variant: 'default',
  size: 'md',
  active: false,
  disabled: false,
  customClass: '',
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const variantClasses = computed(() => {
  if (props.variant === 'tool') {
    return props.active
      ? 'bg-brand-500/25 text-brand-300 border border-brand-500/60 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
      : 'text-slate-400 hover:text-white border border-transparent hover:bg-slate-800/80 hover:border-slate-700/60'
  }

  switch (props.variant) {
    case 'ghost':
      return 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
    case 'danger':
      return 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40'
    case 'success':
      return 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40'
    case 'amber':
      return 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold'
    case 'default':
    default:
      return 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 shadow-sm'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-7 h-7 p-1 rounded-lg'
    case 'lg':
      return 'w-10 h-10 p-2.5 rounded-2xl'
    case 'md':
    default:
      return 'w-8 h-8 sm:w-9 sm:h-9 p-2 rounded-xl'
  }
})

const iconSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-3.5 h-3.5'
    case 'lg':
      return 'w-5 h-5'
    case 'md':
    default:
      return 'w-4 h-4'
  }
})
</script>
