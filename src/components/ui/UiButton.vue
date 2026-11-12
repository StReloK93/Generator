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
    @click="onClick"
  >
    <!-- Loading spinner -->
    <UiSpinner v-if="loading" custom-class="-ml-0.5 mr-2 h-4 w-4" />

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
import { UiSpinner } from '../svg'
import { haptic } from '../../services/telegram'
import { gameAudio } from '../../services/gameAudio'

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
  /** Old-world menu buttons: beaten gold, and dark stone with a gold rim (they sink in when pressed) */
  | 'regal'
  | 'regal-dark'

/** `hero`: the big menu buttons (a tall, easy target) */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero' | 'icon' | 'icon-sm'

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

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

/** Every tap gives a light vibration in Telegram */
function onClick(event: MouseEvent) {
  haptic()
  gameAudio.playTap()
  emit('click', event)
}

const variantClasses = computed(() => {
  if (props.variant === 'tool') {
    return props.active
      ? 'bg-brand-500/25 text-brand-300 border border-brand-500/60 shadow-[0_0_12px_rgba(233,182,60,0.35)]'
      : 'text-slate-400 hover:text-white border border-transparent hover:bg-slate-800/80 hover:border-slate-700/60'
  }

  switch (props.variant) {
    case 'primary':
    case 'game-brand':
      return 'bg-linear-to-b from-brand-300 to-brand-500 hover:from-brand-200 hover:to-brand-400 text-slate-950 font-extrabold shadow-md shadow-brand-500/30 border border-brand-200/60 inset-shadow-[0_1px_0_rgba(255,255,255,0.35)]'
    
    case 'game-green':
      return 'bg-linear-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white font-extrabold text-shadow-sm text-shadow-emerald-900/50 shadow-md shadow-emerald-600/30 border border-emerald-300/50 inset-shadow-[0_1px_0_rgba(255,255,255,0.35)]'
    
    case 'game-amber':
      return 'bg-linear-to-b from-amber-300 to-orange-500 hover:from-amber-200 hover:to-orange-400 text-slate-950 font-black shadow-md shadow-orange-500/30 border border-amber-200/70 inset-shadow-[0_1px_0_rgba(255,255,255,0.35)]'
    
    case 'danger':
      return 'bg-linear-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white font-extrabold shadow-md shadow-rose-700/30 border border-rose-300/40 inset-shadow-[0_1px_0_rgba(255,255,255,0.35)]'
    
    case 'secondary':
      return 'bg-slate-800/90 hover:bg-slate-750 text-slate-100 hover:text-white border border-slate-700 hover:border-slate-600 shadow-sm inset-shadow-[0_1px_0_rgba(255,255,255,0.06)]'
    
    case 'outline':
      return 'bg-transparent border border-slate-700 hover:border-brand-400/60 text-slate-300 hover:text-brand-200 hover:bg-slate-800/50'
    
    case 'ghost':
      return 'bg-transparent text-slate-400 hover:text-slate-50 hover:bg-slate-800/70 border border-transparent'

    case 'regal':
      return 'font-display font-semibold uppercase tracking-[0.16em] text-brand-950 bg-linear-to-b from-brand-200 to-brand-400 border border-brand-200/80 shadow-[0_8px_24px_-10px_rgba(233,182,60,0.7)] hover:from-brand-100 hover:to-brand-300 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]!'

    case 'regal-dark':
      return 'font-display font-semibold uppercase tracking-[0.16em] text-brand-100 bg-slate-950/50 backdrop-blur-sm border border-brand-300/35 hover:border-brand-200/70 hover:bg-slate-900/60 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]!'
    
    default:
      return 'bg-brand-400 text-slate-950'
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
    case 'hero':
      return 'h-13 px-6 text-sm sm:text-[15px] rounded-xl gap-3'
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
