<template>
  <div ref="rootRef" class="relative inline-flex">
    <slot name="trigger" :open="isOpen" :toggle="toggle" />

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        :class="[
          'absolute top-full mt-1.5 min-w-56 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-black/80 py-1 z-100',
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        ]"
      >
        <slot name="header" />
        <template v-for="item in items" :key="item.id">
          <div v-if="item.divider" class="my-1 h-px bg-slate-800" />
          <button
            type="button"
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer',
              item.danger ? 'text-rose-300 hover:bg-rose-500/15' : 'text-slate-200 hover:text-white hover:bg-slate-800/80',
            ]"
            @click="choose(item.id)"
          >
            <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0 text-slate-400" />
            <span class="flex-1">{{ item.label }}</span>
            <span v-if="item.hint" class="text-[10px] text-slate-500 font-mono">{{ item.hint }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, type Component } from 'vue'

export interface MenuItem {
  id: string
  label: string
  icon?: Component
  /** Shown on the right: a shortcut or a short note */
  hint?: string
  danger?: boolean
  /** A line above this item: starts a new group */
  divider?: boolean
}

/** A dropdown of actions under its trigger (slot `trigger`, given `open` and `toggle`); closes on a pick or a click outside */
withDefaults(defineProps<{ items: MenuItem[]; align?: 'left' | 'right' }>(), { align: 'left' })
const emit = defineEmits<{ (e: 'select', id: string): void }>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function choose(id: string) {
  isOpen.value = false
  emit('select', id)
}

function onPointerDown(e: PointerEvent) {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) isOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onPointerDown))
</script>
