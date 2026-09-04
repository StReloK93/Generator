<template>
  <div class="flex flex-col gap-2.5 h-full select-none">
    
    <!-- Layers Header & Order Tools -->
    <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 shrink-0">
      <div class="flex items-center gap-2">
        <Layers class="w-4 h-4 text-amber-400" />
        <span class="font-bold text-xs text-white">Layers & Z-Index</span>
        <UiBadge variant="amber" size="xs">
          {{ store.parts.length }}
        </UiBadge>
      </div>

      <!-- Z-Index Reorder Toolbar for Selected Items -->
      <div v-if="store.selectedParts.length > 0" class="flex items-center gap-1">
        <UiIconButton 
          :icon="ChevronsUp" 
          size="sm" 
          variant="ghost" 
          title="Bring to Front" 
          @click="store.bringToFront()" 
        />
        <UiIconButton 
          :icon="ChevronUp" 
          size="sm" 
          variant="ghost" 
          title="Move Up" 
          @click="store.moveUp()" 
        />
        <UiIconButton 
          :icon="ChevronDown" 
          size="sm" 
          variant="ghost" 
          title="Move Down" 
          @click="store.moveDown()" 
        />
        <UiIconButton 
          :icon="ChevronsDown" 
          size="sm" 
          variant="ghost" 
          title="Send to Back" 
          @click="store.sendToBack()" 
        />
      </div>
    </div>

    <!-- Multi-selection batch toolbar banner -->
    <div 
      v-if="store.selectedParts.length > 1" 
      class="flex items-center justify-between p-2 rounded-xl bg-brand-500/15 border border-brand-500/40 text-xs shrink-0"
    >
      <div class="flex items-center gap-1.5 font-bold text-brand-300">
        <CheckSquare class="w-3.5 h-3.5" />
        <span>{{ store.selectedParts.length }} selected</span>
      </div>

      <div class="flex items-center gap-1">
        <button 
          type="button" 
          class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer"
          @click="store.copySelection()"
          title="Copy (Ctrl+C)"
        >
          Copy
        </button>
        <button 
          type="button" 
          class="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-white text-[10px] font-bold cursor-pointer"
          @click="store.deleteSelected()"
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div 
      v-if="store.parts.length === 0" 
      class="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40"
    >
      <Layers class="w-8 h-8 text-slate-600" />
      <span class="text-xs font-semibold text-slate-400">No elements on canvas</span>
      <p class="text-[10px] text-slate-500">Select and add sprites from the left library panel</p>
    </div>

    <!-- Layers List (Reversed so top Z-index is visually at top) -->
    <div v-else class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
      <div
        v-for="part in reversedParts"
        :key="part.id"
        class="group flex items-center justify-between p-2 rounded-xl border transition-all duration-150 cursor-pointer text-xs"
        :class="store.isSelected(part.id)
          ? 'bg-amber-500/15 border-amber-500/50 shadow-sm shadow-amber-500/10 text-white ring-1 ring-amber-400/40' 
          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 text-slate-300'"
        @click="handleItemClick($event, part.id)"
      >
        <!-- Left: Thumbnail & Name -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
            <img :src="part.src || assetStore.getAssetPreview(part.assetId || part.assetName)" :alt="part.assetName" class="max-w-full max-h-full object-contain" />
          </div>

          <div class="flex flex-col min-w-0">
            <span class="font-bold text-[11px] truncate" :class="store.isSelected(part.id) ? 'text-amber-300' : 'text-slate-200'">
              {{ part.assetName }}
            </span>
            <span class="text-[9px] font-mono text-slate-500">
              Z: {{ part.zIndex }} &bull; ({{ part.x }}, {{ part.y }})
            </span>
          </div>
        </div>

        <!-- Right: Actions (Visibility, Lock, Duplicate, Delete) -->
        <div class="flex items-center gap-1 shrink-0" @click.stop>
          <!-- Eye Visibility Toggle -->
          <button 
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            :title="part.visible ? 'Hide' : 'Show'"
            @click="store.updatePartProperties(part.id, { visible: !part.visible })"
          >
            <Eye v-if="part.visible" class="w-3.5 h-3.5 text-slate-300" />
            <EyeOff v-else class="w-3.5 h-3.5 text-slate-600" />
          </button>

          <!-- Lock Toggle -->
          <button 
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            :title="part.locked ? 'Unlock' : 'Lock'"
            @click="store.updatePartProperties(part.id, { locked: !part.locked })"
          >
            <Lock v-if="part.locked" class="w-3.5 h-3.5 text-amber-400" />
            <Unlock v-else class="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
          </button>

          <!-- Duplicate -->
          <button 
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
            title="Duplicate (Ctrl+D)"
            @click="store.duplicatePart(part.id)"
          >
            <Copy class="w-3.5 h-3.5" />
          </button>

          <!-- Delete -->
          <button 
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete (Delete)"
            @click="store.removePart(part.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Actions: Paste, Select All & Clear All -->
    <div v-if="store.parts.length > 0" class="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-1.5">
        <UiButton 
          variant="secondary" 
          size="xs" 
          :leading-icon="ClipboardPaste"
          :disabled="store.clipboard.length === 0"
          title="Paste from clipboard (Ctrl+V)"
          @click="store.pasteSelection()"
        >
          Paste
        </UiButton>
        <UiButton 
          variant="secondary" 
          size="xs" 
          title="Select all (Ctrl+A)"
          @click="store.selectAll()"
        >
          Select All
        </UiButton>
      </div>

      <UiButton 
        variant="danger" 
        size="xs" 
        :leading-icon="Trash2" 
        @click="store.clearAll()"
      >
        Clear All
      </UiButton>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Copy, 
  Trash2, 
  ClipboardPaste,
  CheckSquare
} from 'lucide-vue-next'
import { UiBadge, UiIconButton, UiButton } from '../ui'
import { useAssetEditorStore } from '../../stores/assetEditorStore'
import { useAssetStore } from '../../stores/assetStore'

const store = useAssetEditorStore()
const assetStore = useAssetStore()

const reversedParts = computed(() => {
  return [...store.sortedParts].reverse()
})

function handleItemClick(e: MouseEvent, partId: string) {
  if (e.shiftKey) {
    store.selectPart(partId, true)
  } else {
    store.selectPart(partId, false)
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}
</style>
