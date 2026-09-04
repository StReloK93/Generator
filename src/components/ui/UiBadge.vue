<template>
  <span
    :class="[
      'inline-flex items-center font-bold tracking-wider uppercase select-none rounded-full transition-all border',
      variantClasses,
      sizeClasses,
      customClass
    ]"
  >
    <!-- Dot indicator -->
    <span
      v-if="dot"
      :class="[
        'rounded-full mr-1.5 shrink-0',
        dotSizeClass,
        dotColorClass,
        pulse ? 'animate-pulse' : ''
      ]"
    ></span>

    <!-- Leading Icon -->
    <component :is="icon" v-if="icon" :class="[iconSizeClass, 'mr-1 shrink-0']" />

    <!-- Badge Text -->
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type BadgeVariant = 'brand' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'slate'
export type BadgeStyleType = 'solid' | 'subtle' | 'outline' | 'glow'
export type BadgeSize = 'xs' | 'sm' | 'md'

interface Props {
  variant?: BadgeVariant
  styleType?: BadgeStyleType
  size?: BadgeSize
  dot?: boolean
  pulse?: boolean
  icon?: any
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'brand',
  styleType: 'subtle',
  size: 'sm',
  dot: false,
  pulse: false,
  customClass: '',
})

const variantClasses = computed(() => {
  const { variant, styleType } = props

  if (styleType === 'solid') {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-600 text-white border-emerald-500'
      case 'amber':
        return 'bg-amber-500 text-slate-950 border-amber-400 font-black'
      case 'rose':
        return 'bg-rose-600 text-white border-rose-500'
      case 'cyan':
        return 'bg-cyan-600 text-white border-cyan-500'
      case 'purple':
        return 'bg-purple-600 text-white border-purple-500'
      case 'slate':
        return 'bg-slate-700 text-white border-slate-600'
      case 'brand':
      default:
        return 'bg-brand-600 text-white border-brand-500'
    }
  }

  if (styleType === 'glow') {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
      case 'cyan':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
      case 'slate':
        return 'bg-slate-800 text-slate-300 border-slate-600'
      case 'brand':
      default:
        return 'bg-brand-500/20 text-brand-300 border-brand-400/40 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
    }
  }

  if (styleType === 'outline') {
    switch (variant) {
      case 'emerald':
        return 'bg-transparent text-emerald-400 border-emerald-500/50'
      case 'amber':
        return 'bg-transparent text-amber-400 border-amber-500/50'
      case 'rose':
        return 'bg-transparent text-rose-400 border-rose-500/50'
      case 'cyan':
        return 'bg-transparent text-cyan-400 border-cyan-500/50'
      case 'purple':
        return 'bg-transparent text-purple-400 border-purple-500/50'
      case 'slate':
        return 'bg-transparent text-slate-400 border-slate-700'
      case 'brand':
      default:
        return 'bg-transparent text-brand-400 border-brand-500/50'
    }
  }

  // Subtle (default)
  switch (variant) {
    case 'emerald':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    case 'amber':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'rose':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    case 'cyan':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
    case 'purple':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    case 'slate':
      return 'bg-slate-800/80 text-slate-300 border-slate-700/80'
    case 'brand':
    default:
      return 'bg-brand-500/15 text-brand-300 border-brand-500/30'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-1.5 py-0.2 text-[9px]'
    case 'md':
      return 'px-3 py-1 text-xs'
    case 'sm':
    default:
      return 'px-2 py-0.5 text-[10px]'
  }
})

const dotSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-1 h-1'
    case 'md':
      return 'w-2 h-2'
    case 'sm':
    default:
      return 'w-1.5 h-1.5'
  }
})

const iconSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-2.5 h-2.5'
    case 'md':
      return 'w-3.5 h-3.5'
    case 'sm':
    default:
      return 'w-3 h-3'
  }
})

const dotColorClass = computed(() => {
  switch (props.variant) {
    case 'emerald':
      return 'bg-emerald-400'
    case 'amber':
      return 'bg-amber-400'
    case 'rose':
      return 'bg-rose-400'
    case 'cyan':
      return 'bg-cyan-400'
    case 'purple':
      return 'bg-purple-400'
    case 'slate':
      return 'bg-slate-400'
    case 'brand':
    default:
      return 'bg-brand-400'
  }
})
</script>
