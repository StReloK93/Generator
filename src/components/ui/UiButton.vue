<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-bold select-none transition-all duration-200 cursor-pointer active:scale-95 disabled:pointer-events-none disabled:opacity-40',
      variantClasses,
      sizeClasses,
      block ? 'w-full' : '',
      customClass
    ]"
    @click="$emit('click', $event)"
  >
    <!-- Loading spinner -->
    <svg 
      v-if="loading" 
      class="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- Leading / Left Icon -->
    <slot name="leading">
      <component :is="leadingIcon" v-if="leadingIcon && !loading" :class="iconSizeClasses" class="shrink-0" />
    </slot>

    <!-- Content -->
    <span v-if="$slots.default" :class="[leadingIcon || $slots.leading || trailingIcon || $slots.trailing ? 'mx-1' : '']">
      <slot />
    </span>

    <!-- Trailing / Right Icon -->
    <slot name="trailing">
      <component :is="trailingIcon" v-if="trailingIcon" :class="iconSizeClasses" class="shrink-0" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type ButtonVariant = 
  | 'primary' 
  | 'game-green' 
  | 'game-amber' 
  | 'game-brand' 
  | 'secondary' 
  | 'danger' 
  | 'ghost' 
  | 'outline' 
  | 'tool'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  active?: boolean
  block?: boolean
  leadingIcon?: any
  trailingIcon?: any
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  active: false,
  block: false,
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
    case 'primary':
    case 'game-brand':
      return 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-600/30 border border-brand-400/40'
    
    case 'game-green':
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
    
    case 'game-amber':
      return 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 border border-amber-300/60'
    
    case 'danger':
      return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40'
    
    case 'secondary':
      return 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 shadow-sm'
    
    case 'outline':
      return 'bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800/50'
    
    case 'ghost':
      return 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
    
    default:
      return 'bg-brand-600 text-white'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-2 py-1 text-[10px] rounded-lg gap-1'
    case 'sm':
      return 'px-2.5 sm:px-3 py-1.5 text-xs rounded-xl gap-1.5'
    case 'md':
      return 'px-3.5 sm:px-4 py-2 text-xs sm:text-sm rounded-xl gap-2'
    case 'lg':
      return 'px-5 py-2.5 sm:py-3 text-sm sm:text-base rounded-2xl gap-2.5'
    case 'icon-sm':
      return 'p-1.5 sm:p-2 rounded-lg aspect-square'
    case 'icon':
      return 'p-2 sm:p-2.5 rounded-xl aspect-square'
    default:
      return 'px-3.5 py-2 text-xs rounded-xl'
  }
})

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3 h-3'
    case 'sm':
      return 'w-3.5 h-3.5'
    case 'md':
      return 'w-4 h-4'
    case 'lg':
      return 'w-5 h-5'
    case 'icon-sm':
      return 'w-3.5 h-3.5'
    case 'icon':
      return 'w-4 h-4'
    default:
      return 'w-4 h-4'
  }
})
</script>
