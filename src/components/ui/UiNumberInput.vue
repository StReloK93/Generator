<template>
  <div :class="['flex select-none', containerClasses, customClass]">
    <!-- Label & live value badge (for Stepper and Compact modes) -->
    <div v-if="(label || $slots.label) && variant !== 'inline'" class="flex items-center justify-between">
      <label :class="labelSizeClasses">
        <slot name="label">{{ label }}</slot>
      </label>
      <span v-if="unit" class="text-[10px] font-mono font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
        {{ modelValue }}{{ unit }}
      </span>
    </div>

    <!-- 1. Inline Mode: Label on left, input on right -->
    <div v-if="variant === 'inline'" class="flex items-center justify-between gap-2 w-full">
      <label :class="labelSizeClasses">
        <slot name="label">{{ label }}</slot>
      </label>
      <div class="flex items-center gap-1">
        <input
          type="number"
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :placeholder="placeholder"
          :class="[
            'bg-slate-950 border border-slate-700/90 rounded-lg text-center font-mono font-bold text-white focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all',
            compactInputSizeClasses
          ]"
          @input="handleInput"
          @change="handleChange"
        />
        <span v-if="unit" class="text-[10px] text-slate-500 font-mono">{{ unit }}</span>
      </div>
    </div>

    <!-- 2. Compact Mode: Direct numeric box with unit -->
    <div v-else-if="variant === 'compact'" class="flex items-center gap-1.5">
      <div class="relative flex items-center flex-1">
        <input
          type="number"
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :placeholder="placeholder"
          :class="[
            'w-full bg-slate-950 border border-slate-700/90 rounded-lg text-center font-mono font-bold text-white focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all',
            compactInputSizeClasses
          ]"
          @input="handleInput"
          @change="handleChange"
        />
      </div>
      <span v-if="unit" class="text-[10px] text-slate-500 font-mono shrink-0">{{ unit }}</span>
    </div>

    <!-- 3. Standard Stepper Mode: [-] [ Input ] [+] -->
    <div 
      v-else 
      class="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 p-1 gap-1 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/40 transition-all"
    >
      <!-- Decrement Button -->
      <button
        type="button"
        :disabled="disabled || (min !== undefined && modelValue <= min)"
        :class="[
          'rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 shrink-0',
          stepperButtonSizeClasses
        ]"
        @click="decrement"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>

      <!-- Center Number Display / Input -->
      <input
        type="number"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :placeholder="placeholder"
        class="w-full bg-transparent text-center text-xs sm:text-sm font-mono font-bold text-white focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        @input="handleInput"
        @change="handleChange"
      />

      <!-- Increment Button -->
      <button
        type="button"
        :disabled="disabled || (max !== undefined && modelValue >= max)"
        :class="[
          'rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 shrink-0',
          stepperButtonSizeClasses
        ]"
        @click="increment"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'

export type NumberInputVariant = 'stepper' | 'compact' | 'inline'
export type NumberInputSize = 'xs' | 'sm' | 'md'

interface Props {
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  variant?: NumberInputVariant
  size?: NumberInputSize
  placeholder?: string
  disabled?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  label: '',
  min: undefined,
  max: undefined,
  step: 1,
  unit: '',
  variant: 'stepper',
  size: 'md',
  placeholder: '',
  disabled: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const containerClasses = computed(() => {
  if (props.variant === 'inline') {
    return 'flex-row items-center justify-between'
  }
  return 'flex-col gap-1.5'
})

const labelSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-[10px] font-semibold text-slate-400'
    case 'sm':
      return 'text-[11px] font-semibold text-slate-300'
    case 'md':
    default:
      return 'text-xs font-semibold text-slate-300'
  }
})

const compactInputSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-1.5 py-0.5 text-[11px] h-6'
    case 'sm':
      return 'px-2 py-1 text-xs h-7.5'
    case 'md':
    default:
      return 'px-2.5 py-1.5 text-xs sm:text-sm h-9'
  }
})

const stepperButtonSizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-6'
    case 'sm':
      return 'w-7 h-7'
    case 'md':
    default:
      return 'w-7 h-7 sm:w-8 sm:h-8'
  }
})

function clamp(val: number): number {
  let result = val
  if (props.min !== undefined && result < props.min) result = props.min
  if (props.max !== undefined && result > props.max) result = props.max
  // Fix floating point precision
  const decimals = (props.step.toString().split('.')[1] || '').length
  return Number(result.toFixed(decimals))
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  const val = Number(target.value)
  if (!isNaN(val)) {
    emit('update:modelValue', val)
  }
}

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  let val = Number(target.value)
  if (isNaN(val)) {
    val = props.min !== undefined ? props.min : 0
  }
  const clamped = clamp(val)
  emit('update:modelValue', clamped)
  emit('change', clamped)
}

function increment() {
  if (props.disabled) return
  const current = Number(props.modelValue) || 0
  const next = clamp(current + props.step)
  emit('update:modelValue', next)
  emit('change', next)
}

function decrement() {
  if (props.disabled) return
  const current = Number(props.modelValue) || 0
  const next = clamp(current - props.step)
  emit('update:modelValue', next)
  emit('change', next)
}
</script>
