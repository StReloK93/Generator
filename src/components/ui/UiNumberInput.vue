<template>
  <div :class="['flex flex-col gap-1.5 select-none', customClass]">
    <!-- Label & live value badge -->
    <div v-if="label || $slots.label" class="flex items-center justify-between">
      <label class="text-xs font-semibold text-slate-300">
        <slot name="label">{{ label }}</slot>
      </label>
      <span v-if="unit" class="text-[10px] font-mono font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
        {{ modelValue }}{{ unit }}
      </span>
    </div>

    <!-- Stepper Container -->
    <div class="flex items-center rounded-xl bg-slate-950/80 border border-slate-700/80 p-1 gap-1 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/40 transition-all">
      <!-- Decrement Button -->
      <button
        type="button"
        :disabled="disabled || (min !== undefined && modelValue <= min)"
        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 shrink-0"
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
        class="w-full bg-transparent text-center text-xs sm:text-sm font-mono font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        @input="handleInput"
        @change="handleChange"
      />

      <!-- Increment Button -->
      <button
        type="button"
        :disabled="disabled || (max !== undefined && modelValue >= max)"
        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95 shrink-0"
        @click="increment"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

interface Props {
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
  unit?: string
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
  disabled: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

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
  if (isNaN(val)) val = props.min ?? 0
  val = clamp(val)
  emit('update:modelValue', val)
  emit('change', val)
}

function decrement() {
  const next = clamp(props.modelValue - props.step)
  emit('update:modelValue', next)
  emit('change', next)
}

function increment() {
  const next = clamp(props.modelValue + props.step)
  emit('update:modelValue', next)
  emit('change', next)
}
</script>
