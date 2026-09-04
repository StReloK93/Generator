<template>
  <label
    :class="[
      'flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 transition-all cursor-pointer select-none',
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-700 hover:bg-slate-900/40',
      customClass
    ]"
  >
    <!-- Label & Description -->
    <div class="flex flex-col min-w-0 pr-2">
      <span class="text-xs font-semibold text-slate-200">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="description || $slots.description" class="text-[11px] text-slate-400 leading-tight">
        <slot name="description">{{ description }}</slot>
      </span>
    </div>

    <!-- Toggle Track -->
    <div class="relative shrink-0">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="sr-only peer"
        @change="handleChange"
      />
      <div 
        :class="[
          'w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border',
          modelValue 
            ? activeTrackClass 
            : 'bg-slate-900 border-slate-700 peer-focus:ring-1 peer-focus:ring-slate-600'
        ]"
      ></div>
      <!-- Toggle Knob -->
      <div 
        :class="[
          'absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center',
          modelValue ? 'translate-x-5' : 'translate-x-0'
        ]"
      ></div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type SwitchVariant = 'brand' | 'emerald' | 'amber'

interface Props {
  modelValue: boolean
  label?: string
  description?: string
  variant?: SwitchVariant
  disabled?: boolean
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: '',
  description: '',
  variant: 'brand',
  disabled: false,
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.checked)
  emit('change', target.checked)
}

const activeTrackClass = computed(() => {
  switch (props.variant) {
    case 'emerald':
      return 'bg-emerald-600 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
    case 'amber':
      return 'bg-amber-600 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
    case 'brand':
    default:
      return 'bg-brand-600 border-brand-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
  }
})
</script>
