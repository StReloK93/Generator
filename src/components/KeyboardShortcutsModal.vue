<template>
  <UiModal
    :is-open="toolStore.isShortcutsModalOpen"
    :title="$t('shortcuts.title')"
    :subtitle="$t('shortcuts.subtitle')"
    :icon="Keyboard"
    icon-color="brand"
    size="lg"
    @close="toolStore.isShortcutsModalOpen = false"
  >
    <!-- Shortcuts Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div 
        v-for="item in shortcutsList" 
        :key="item.key"
        class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
      >
        <span class="text-slate-300">{{ $t(item.actionKey) }}</span>
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
        {{ $t('shortcuts.gotIt') }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Keyboard } from 'lucide-vue-next'
import { UiModal, UiButton } from './ui'
import { useToolStore } from '../stores/toolStore'

const toolStore = useToolStore()

const shortcutsList = [
  { actionKey: 'shortcuts.selectInspect', key: 'V' },
  { actionKey: 'shortcuts.brush', key: 'B' },
  { actionKey: 'shortcuts.bucketFill', key: 'G' },
  { actionKey: 'shortcuts.eraser', key: 'E' },
  { actionKey: 'shortcuts.eyedropper', key: 'I' },
  { actionKey: 'shortcuts.lineTool', key: 'L' },
  { actionKey: 'shortcuts.rectangleTool', key: 'U' },
  { actionKey: 'shortcuts.panCanvas', key: 'Space + Drag' },
  { actionKey: 'shortcuts.zoomCanvas', key: 'Mouse Wheel' },
  { actionKey: 'shortcuts.togglePlayPause', key: 'P' },
  { actionKey: 'shortcuts.continuousPlace', key: 'Shift + Click' },
  { actionKey: 'shortcuts.undo', key: 'Ctrl + Z' },
  { actionKey: 'shortcuts.redo', key: 'Ctrl + Y' },
]
</script>
