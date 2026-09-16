<template>
  <div :class="['flex flex-col gap-2 select-none', customClass]">
    <label v-if="label || $slots.label" class="text-xs font-semibold text-slate-300 flex items-center justify-between">
      <slot name="label">{{ label }}</slot>
      <span class="text-[10px] font-mono text-slate-400 font-normal uppercase">{{ modelValue }}</span>
    </label>

    <div class="flex items-center gap-2 flex-wrap">
      <!-- Native Spectrum Color Picker Input & Swatch Trigger -->
      <div class="relative flex items-center shrink-0">
        <label
          class="relative flex items-center justify-center rounded-xl cursor-pointer border border-slate-700/80 hover:border-amber-400 transition-all shadow-md overflow-hidden group active:scale-95"
          :class="sizeClasses"
          title="Ranglar palitrasi (Full Spectrum Color Picker)"
        >
          <span 
            class="absolute inset-0 block rounded-xl"
            :style="{ backgroundColor: modelValue }"
          />
          <!-- Rainbow outline indicator on hover -->
          <span class="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <input
            type="color"
            :value="hexInputValue"
            :disabled="disabled"
            class="opacity-0 absolute inset-0 w-full h-full cursor-pointer pointer-events-auto"
            @input="handleNativeColorInput"
          />
        </label>
      </div>

      <!-- Quick Preset Color Chips -->
      <div class="flex items-center gap-1.5 flex-wrap flex-1">
        <button
          v-for="color in colors"
          :key="color"
          type="button"
          :disabled="disabled"
          :style="{ backgroundColor: color }"
          :class="[
            'rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-40 disabled:pointer-events-none active:scale-95 border border-white/10',
            sizeClasses,
            isMatch(color)
              ? 'ring-2 ring-white scale-105 shadow-md z-10' 
              : 'opacity-80 hover:opacity-100 hover:scale-105'
          ]"
          @click="selectColor(color)"
        >
          <Check 
            v-if="isMatch(color)" 
            :class="['text-slate-950 font-black drop-shadow-sm', checkIconSizeClasses]" 
          />
        </button>
      </div>

      <!-- Inline Hex Text Input -->
      <div v-if="showTextInput" class="relative w-24 shrink-0">
        <input
          type="text"
          :value="modelValue"
          :disabled="disabled"
          placeholder="#rrggbb"
          maxlength="9"
          class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs font-mono font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-center"
          @input="handleTextInput"
        />
      </div>
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
  showTextInput?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => [
    '#f97316', // Orange / Fire
    '#ef4444', // Red
    '#fbbf24', // Amber / Gold
    '#eab308', // Yellow
    '#10b981', // Emerald / Poison
    '#06b6d4', // Cyan / Frost
    '#3b82f6', // Blue / Electro
    '#8b5cf6', // Violet / Arcane
    '#ec4899', // Pink
    '#ffffff', // White
    '#64748b', // Slate / Metal
    '#0f172a', // Dark Void
  ],
  label: '',
  size: 'md',
  disabled: false,
  showTextInput: true,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

function toHex6(val: string): string {
  if (!val) return '#f97316'
  const trimmed = val.trim()
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 7) return trimmed
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
    }
    if (trimmed.length > 7) return trimmed.slice(0, 7)
  }
  const m = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) {
    const r = parseInt(m[1]).toString(16).padStart(2, '0')
    const g = parseInt(m[2]).toString(16).padStart(2, '0')
    const b = parseInt(m[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#f97316'
}

const hexInputValue = computed(() => {
  return toHex6(props.modelValue)
})

function isMatch(color: string): boolean {
  return toHex6(props.modelValue).toLowerCase() === color.toLowerCase()
}

function selectColor(color: string) {
  if (props.disabled) return
  emit('update:modelValue', color)
  emit('change', color)
}

function handleNativeColorInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target && target.value) {
    emit('update:modelValue', target.value)
    emit('change', target.value)
  }
}

function handleTextInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target) {
    let val = target.value.trim()
    if (val && !val.startsWith('#') && !val.startsWith('rgba') && !val.startsWith('rgb')) {
      val = '#' + val
    }
    emit('update:modelValue', val)
    emit('change', val)
  }
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
