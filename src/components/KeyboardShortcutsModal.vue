<template>
  <UiModal
    :is-open="toolStore.isShortcutsModalOpen"
    title="Keyboard Shortcuts & Controls"
    subtitle="Quick access keys for map editor and game mode"
    :icon="Keyboard"
    icon-color="brand"
    size="lg"
    @close="toolStore.isShortcutsModalOpen = false"
  >
    <!-- Shortcuts Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div 
        v-for="item in shortcuts" 
        :key="item.action"
        class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
      >
        <span class="text-slate-300">{{ item.action }}</span>
        <kbd class="px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 font-mono text-[11px] font-semibold">
          {{ item.key }}
        </kbd>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <UiButton
        variant="primary"
        size="sm"
        @click="toolStore.isShortcutsModalOpen = false"
      >
        Got it
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { Keyboard } from 'lucide-vue-next'
import { UiModal, UiButton } from './ui'
import { useToolStore } from '../stores/toolStore'

const toolStore = useToolStore()

const shortcuts = [
  { action: 'Select / Inspect Element', key: 'V' },
  { action: 'Brush (Place Tile)', key: 'B' },
  { action: 'Bucket Fill', key: 'G' },
  { action: 'Eraser', key: 'E' },
  { action: 'Eyedropper (Pick Tile)', key: 'I' },
  { action: 'Line Tool', key: 'L' },
  { action: 'Rectangle Tool', key: 'U' },
  { action: 'Pan Canvas', key: 'Space + Drag' },
  { action: 'Zoom Canvas', key: 'Mouse Wheel' },
  { action: 'Toggle Play / Pause', key: 'P' },
  { action: 'Continuous Place / Multi-select', key: 'Shift + Click' },
  { action: 'Undo', key: 'Ctrl + Z' },
  { action: 'Redo', key: 'Ctrl + Y' },
]
</script>
