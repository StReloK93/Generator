<template>
  <div
    :class="[
      'flex items-center select-none',
      variantContainerClasses,
      customClass
    ]"
  >
    <button
      v-for="tab in normalizedItems"
      :key="tab.id"
      type="button"
      :disabled="tab.disabled"
      :class="[
        'flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none',
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
        :class="[
          size === 'xs' ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5',
          'shrink-0',
          modelValue === tab.id ? '' : 'text-slate-400'
        ]"
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

export type TabVariant = 'segmented' | 'pills' | 'amber' | 'emerald' | 'cyan' | 'brand' | 'subtle'

interface Props {
  modelValue: string | number
  items: (TabItem | string | number)[]
  variant?: TabVariant
  size?: 'xs' | 'sm' | 'md' | 'lg'
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

const normalizedItems = computed<TabItem[]>(() => {
  return props.items.map(item => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return item as TabItem
    }
    return {
      id: item,
      label: String(item),
    }
  })
})

function selectTab(id: string | number) {
  emit('update:modelValue', id)
  emit('change', id)
}

const variantContainerClasses = computed(() => {
  switch (props.variant) {
    case 'pills':
      return 'bg-transparent gap-1 p-0'
    case 'subtle':
      return 'bg-slate-900/60 border border-slate-800/80 p-0.5 rounded-xl gap-0.5'
    case 'amber':
    case 'emerald':
    case 'cyan':
    case 'brand':
    case 'segmented':
    default:
      if (props.size === 'xs') {
        return 'bg-slate-950/90 border border-slate-800 p-0.5 rounded-lg gap-0.5'
      }
      return 'bg-slate-950/80 border border-slate-800 p-1 rounded-2xl gap-1'
  }
})

const tabButtonSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-2 py-0.5 text-[10px] rounded-md'
    case 'sm':
      return 'px-2.5 py-1 text-xs rounded-xl'
    case 'lg':
      return 'px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-2xl'
    case 'md':
    default:
      return 'px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl'
  }
})

const activeTabClass = computed(() => {
  switch (props.variant) {
    case 'amber':
      return 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
    case 'emerald':
      return 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
    case 'cyan':
      return 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
    case 'pills':
      return 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30'
    case 'subtle':
      return 'bg-slate-800 text-brand-300 font-bold shadow-xs'
    case 'brand':
    case 'segmented':
    default:
      return 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30'
  }
})

const inactiveTabClass = computed(() => {
  switch (props.variant) {
    case 'pills':
      return 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
    default:
      return 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
  }
})
</script>
