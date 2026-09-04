<template>
  <div :class="['flex flex-col gap-1.5 select-none w-full', customClass]">
    <!-- Header: Label & Live Value Badge -->
    <div class="flex items-center justify-between">
      <label v-if="label || $slots.label" class="text-xs font-semibold text-slate-300">
        <slot name="label">{{ label }}</slot>
      </label>
      <span class="text-[11px] font-mono font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
        {{ displayValue }}
      </span>
    </div>

    <!-- Range Input with custom styling -->
    <div class="relative flex items-center py-1">
      <input
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
        @input="handleInput"
      />
    </div>

    <!-- Min/Max legend -->
    <div v-if="showMinMax" class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
      <span>{{ min }}{{ unit }}</span>
      <span>{{ max }}{{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  showMinMax?: boolean
  formatValue?: (val: number) => string
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  label: '',
  min: 0,
  max: 100,
  step: 1,
  unit: '',
  disabled: false,
  showMinMax: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const displayValue = computed(() => {
  if (props.formatValue) {
    return props.formatValue(props.modelValue)
  }
  return `${props.modelValue}${props.unit}`
})

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  const val = Number(target.value)
  emit('update:modelValue', val)
  emit('change', val)
}
</script>
