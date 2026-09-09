<template>
  <div :class="['flex flex-col gap-1.5 select-none', customClass]">
    <label v-if="label || $slots.label" class="text-xs font-semibold text-slate-300">
      <slot name="label">{{ label }}</slot>
    </label>

    <div class="flex items-center gap-2 pt-0.5 flex-wrap">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        :disabled="disabled"
        :style="{ backgroundColor: color }"
        :class="[
          'rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-40 disabled:pointer-events-none active:scale-95',
          sizeClasses,
          modelValue === color 
            ? 'ring-2 ring-white scale-110 shadow-md' 
            : 'opacity-75 hover:opacity-100 hover:scale-105'
        ]"
        @click="selectColor(color)"
      >
        <Check 
          v-if="modelValue === color" 
          :class="['text-slate-950 font-black', checkIconSizeClasses]" 
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'

export type ColorPickerSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string
  colors?: string[]
  label?: string
  size?: ColorPickerSize
  disabled?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
  ],
  label: '',
  size: 'md',
  disabled: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

function selectColor(color: string) {
  if (props.disabled) return
  emit('update:modelValue', color)
  emit('change', color)
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-6 h-6'
    case 'lg':
      return 'w-9 h-9 sm:w-10 sm:h-10'
    case 'md':
    default:
      return 'w-7.5 h-7.5 sm:w-8 sm:h-8'
  }
})

const checkIconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-3 h-3'
    case 'lg':
      return 'w-4.5 h-4.5'
    case 'md':
    default:
      return 'w-3.5 h-3.5 sm:w-4 sm:h-4'
  }
})
</script>
