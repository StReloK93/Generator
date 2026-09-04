<template>
  <div
    :class="[
      'rounded-2xl border transition-all duration-200 select-none relative overflow-hidden',
      variantClasses,
      paddingClasses,
      selected ? selectedClasses : '',
      interactive ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : '',
      customClass
    ]"
    @click="$emit('click', $event)"
  >
    <!-- Card Header -->
    <div 
      v-if="title || $slots.header || $slots.actions" 
      class="flex items-center justify-between gap-3 mb-3 border-b border-slate-800/80 pb-2.5"
    >
      <slot name="header">
        <div class="flex items-center gap-2.5 min-w-0">
          <div 
            v-if="icon" 
            class="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0"
          >
            <component :is="icon" class="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div class="min-w-0">
            <h3 class="font-bold text-xs sm:text-sm text-white tracking-wide truncate">
              {{ title }}
            </h3>
            <p v-if="subtitle" class="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {{ subtitle }}
            </p>
          </div>
        </div>
      </slot>

      <!-- Header actions slot -->
      <div v-if="$slots.actions" class="shrink-0 flex items-center gap-1.5">
        <slot name="actions" />
      </div>
    </div>

    <!-- Default Content Slot -->
    <slot />

    <!-- Card Footer -->
    <div 
      v-if="$slots.footer" 
      class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type CardVariant = 'default' | 'subtle' | 'amber' | 'brand' | 'emerald' | 'danger' | 'slate' | 'ghost'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface Props {
  title?: string
  subtitle?: string
  icon?: any
  variant?: CardVariant
  padding?: CardPadding
  selected?: boolean
  interactive?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  variant: 'default',
  padding: 'md',
  selected: false,
  interactive: false,
  customClass: '',
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'subtle':
      return 'bg-slate-950/60 border-slate-800/80'
    case 'amber':
      return 'bg-amber-500/10 border-amber-500/40 text-amber-200'
    case 'brand':
      return 'bg-brand-500/10 border-brand-500/40 text-brand-200'
    case 'emerald':
      return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
    case 'danger':
      return 'bg-rose-500/10 border-rose-500/40 text-rose-200'
    case 'slate':
      return 'bg-slate-900/90 border-slate-700/80'
    case 'ghost':
      return 'bg-transparent border-transparent'
    case 'default':
    default:
      return 'bg-slate-900/80 border-slate-800 backdrop-blur-md hover:border-slate-700/80 shadow-md'
  }
})

const selectedClasses = computed(() => {
  switch (props.variant) {
    case 'amber':
      return 'ring-2 ring-amber-400 border-amber-400 bg-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
    case 'emerald':
      return 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
    case 'brand':
    default:
      return 'ring-2 ring-brand-400 border-brand-400 bg-brand-500/20 shadow-[0_0_16px_rgba(99,102,241,0.3)]'
  }
})

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0'
    case 'sm':
      return 'p-2.5 sm:p-3'
    case 'lg':
      return 'p-4 sm:p-6'
    case 'md':
    default:
      return 'p-3.5 sm:p-4'
  }
})
</script>
