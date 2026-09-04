<template>
  <div :class="['flex items-center justify-between gap-3 pb-2 border-b border-slate-800/80 select-none', customClass]">
    <!-- Left Title with Icon -->
    <div class="flex items-center gap-2 min-w-0">
      <component
        :is="icon"
        v-if="icon"
        :class="['w-4 h-4 shrink-0', iconColorClass]"
      />
      <div class="min-w-0">
        <h4 class="text-xs sm:text-sm font-bold text-slate-200 tracking-wide truncate">
          <slot>{{ title }}</slot>
        </h4>
        <p v-if="subtitle" class="text-[10px] text-slate-400 truncate">
          {{ subtitle }}
        </p>
      </div>
      <slot name="badge" />
    </div>

    <!-- Right Actions Slot -->
    <div v-if="$slots.actions" class="flex items-center gap-1.5 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  icon?: any
  iconColor?: 'brand' | 'amber' | 'emerald' | 'rose' | 'cyan' | 'slate'
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  iconColor: 'brand',
  customClass: '',
})

const iconColorClass = computed(() => {
  switch (props.iconColor) {
    case 'amber':
      return 'text-amber-400'
    case 'emerald':
      return 'text-emerald-400'
    case 'rose':
      return 'text-rose-400'
    case 'cyan':
      return 'text-cyan-400'
    case 'slate':
      return 'text-slate-400'
    case 'brand':
    default:
      return 'text-brand-400'
  }
})
</script>
