<template>
  <div :class="['flex flex-col gap-1.5 w-full select-none', customClass]">
    <!-- Label -->
    <div v-if="label || $slots.label || $slots.extra" class="flex items-center justify-between">
      <label v-if="label || $slots.label" class="text-xs font-semibold text-slate-300">
        <slot name="label">{{ label }}</slot>
      </label>
      <slot name="extra" />
    </div>

    <!-- Input Container -->
    <div class="relative flex items-center w-full">
      <!-- Leading Icon -->
      <div 
        v-if="leadingIcon || $slots.leading" 
        class="absolute left-3 flex items-center pointer-events-none text-slate-400"
      >
        <slot name="leading">
          <component :is="leadingIcon" class="w-4 h-4" />
        </slot>
      </div>

      <!-- Input Element -->
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :class="[
          'w-full bg-slate-950/80 border rounded-xl text-white placeholder-slate-500 transition-all duration-150 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed',
          error 
            ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/40 text-rose-100' 
            : 'border-slate-700/80 focus:border-brand-500 focus:ring-brand-500/40 hover:border-slate-600',
          leadingIcon || $slots.leading ? 'pl-9.5' : 'pl-3.5',
          trailingIcon || $slots.trailing || (clearable && modelValue) ? 'pr-9.5' : 'pr-3.5',
          sizeClasses
        ]"
        @input="handleInput"
        @change="$emit('change', $event)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />

      <!-- Trailing Icon / Clear Button -->
      <div 
        v-if="clearable && modelValue && !disabled && !readonly" 
        class="absolute right-3 flex items-center"
      >
        <button
          type="button"
          class="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          @click="clearInput"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <div 
        v-else-if="trailingIcon || $slots.trailing" 
        class="absolute right-3 flex items-center pointer-events-none text-slate-400"
      >
        <slot name="trailing">
          <component :is="trailingIcon" class="w-4 h-4" />
        </slot>
      </div>
    </div>

    <!-- Error or Hint message -->
    <p v-if="error" class="text-[11px] text-rose-400 font-medium">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-[11px] text-slate-400">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

export type InputSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: string
  leadingIcon?: any
  trailingIcon?: any
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
  maxlength?: number
  clearable?: boolean
  size?: InputSize
  customClass?: string | string[] | Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  type: 'text',
  error: '',
  hint: '',
  disabled: false,
  readonly: false,
  clearable: false,
  size: 'md',
  customClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', event: Event): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'clear'): void
}>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const val = props.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value
  emit('update:modelValue', val)
}

function clearInput() {
  emit('update:modelValue', '')
  emit('clear')
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'py-1.5 text-xs'
    case 'lg':
      return 'py-3 text-sm sm:text-base'
    case 'md':
    default:
      return 'py-2 sm:py-2.5 text-xs sm:text-sm'
  }
})
</script>
