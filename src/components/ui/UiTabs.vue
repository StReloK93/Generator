<template>
  <div
    :class="[
      'flex items-center p-1 rounded-2xl select-none',
      variantContainerClasses,
      customClass
    ]"
  >
    <button
      v-for="tab in items"
      :key="tab.id"
      type="button"
      :disabled="tab.disabled"
      :class="[
        'flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none rounded-xl',
        tabButtonSizeClasses,
        modelValue === tab.id ? activeTabClass : inactiveTabClass,
        fill ? 'flex-1' : ''
      ]"
      @click="selectTab(tab.id)"
    >
      <!-- Tab Icon -->
      <component
        :is="tab.icon"
        v-if="tab.icon"
        :class="['w-4 h-4 shrink-0 mr-1.5', modelValue === tab.id ? 'text-white' : 'text-slate-400']"
      />

      <!-- Tab Label -->
      <span>{{ tab.label }}</span>

      <!-- Tab Counter / Badge -->
      <span
        v-if="tab.count !== undefined || tab.badge"
        :class="[
          'ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono',
          modelValue === tab.id 
            ? 'bg-white/20 text-white' 
            : 'bg-slate-800 text-slate-400'
        ]"
      >
        {{ tab.count !== undefined ? tab.count : tab.badge }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface TabItem {
  id: string | number
  label: string
  icon?: any
  count?: number
  badge?: string
  disabled?: boolean
}

export type TabVariant = 'segmented' | 'pills' | 'amber' | 'emerald'

interface Props {
  modelValue: string | number
  items: TabItem[]
  variant?: TabVariant
  size?: 'sm' | 'md'
  fill?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'segmented',
  size: 'md',
  fill: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

function selectTab(id: string | number) {
  emit('update:modelValue', id)
  emit('change', id)
}

const variantContainerClasses = computed(() => {
  switch (props.variant) {
    case 'pills':
      return 'bg-transparent gap-1.5 p-0'
    case 'amber':
    case 'emerald':
    case 'segmented':
    default:
      return 'bg-slate-950/80 border border-slate-800 gap-1'
  }
})

const tabButtonSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2.5 py-1 text-xs'
    case 'md':
    default:
      return 'px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm'
  }
})

const activeTabClass = computed(() => {
  switch (props.variant) {
    case 'amber':
      return 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
    case 'emerald':
      return 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
    case 'pills':
      return 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30'
    case 'segmented':
    default:
      return 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30'
  }
})

const inactiveTabClass = computed(() => {
  return 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
})
</script>
