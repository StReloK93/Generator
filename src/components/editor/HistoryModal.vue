<template>
  <UiModal
    :is-open="toolStore.isHistoryModalOpen"
    :title="$t('history.title')"
    :subtitle="$t('history.subtitle')"
    :icon="History"
    icon-color="brand"
    size="lg"
    @close="toolStore.isHistoryModalOpen = false"
  >
    <div class="flex flex-col gap-3">
      <!-- Status & Stats Summary Header -->
      <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        <div class="flex items-center gap-2">
          <span class="font-medium text-slate-400">{{ $t('history.step') }}:</span>
          <UiBadge variant="brand" size="sm">
            {{ mapStore.historyIndex + 1 }} / {{ mapStore.history.length }}
          </UiBadge>
        </div>

        <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span class="flex items-center gap-1">
            <Layers class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ mapStore.totalTilesCount }} {{ $t('history.tiles') }}</span>
          </span>
        </div>
      </div>

      <!-- History Steps List -->
      <div 
        ref="listContainerRef"
        class="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1 select-none custom-scrollbar"
      >
        <div
          v-for="(item, idx) in reversedHistoryList"
          :key="item.originalIndex"
          @click="handleJump(item.originalIndex)"
          class="group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer"
          :class="[
            item.isActive
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/30'
              : item.isPast
                ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                : 'bg-slate-950/30 border-slate-850 opacity-60 hover:opacity-90 hover:bg-slate-900/40 hover:border-slate-800 text-slate-400'
          ]"
        >
          <!-- Left: Step number & Action description -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <!-- Step index indicator -->
            <div 
              class="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 border transition-all"
              :class="[
                item.isActive 
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-xs' 
                  : item.isPast
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-400 group-hover:text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-600'
              ]"
            >
              #{{ item.originalIndex + 1 }}
            </div>

            <!-- Description & Timestamp -->
            <div class="flex flex-col min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span 
                  class="font-semibold text-xs truncate transition-colors"
                  :class="[
                    item.isActive 
                      ? 'text-emerald-200' 
                      : item.isPast 
                        ? 'text-slate-200 group-hover:text-white' 
                        : 'text-slate-400'
                  ]"
                >
                  {{ item.description }}
                </span>

                <UiBadge 
                  v-if="item.isActive" 
                  variant="emerald" 
                  size="xs"
                  class="shrink-0"
                >
                  {{ $t('history.currentState') }}
                </UiBadge>
              </div>

              <div class="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                <span>{{ formatTime(item.timestamp) }}</span>
                <span v-if="item.tilesCount !== undefined">• {{ item.tilesCount }} {{ $t('history.tiles') }}</span>
              </div>
            </div>
          </div>

          <!-- Right: Action indicator icon -->
          <div class="flex items-center gap-1.5 shrink-0 pl-2">
            <div 
              v-if="item.isActive" 
              class="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse"
            ></div>
            <span 
              v-else 
              class="text-[11px] font-medium text-slate-500 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {{ $t('history.jumpTo') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state fallback -->
      <div 
        v-if="mapStore.history.length === 0" 
        class="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2"
      >
        <History class="w-8 h-8 text-slate-600" />
        <span>{{ $t('history.empty') }}</span>
      </div>
    </div>

    <!-- Footer Controls -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <!-- Quick Undo / Redo in Modal -->
        <div class="flex items-center gap-2">
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="Undo2"
            :disabled="!mapStore.canUndo"
            @click="mapStore.undo()"
          >
            {{ $t('header.undo') }}
          </UiButton>

          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="Redo2"
            :disabled="!mapStore.canRedo"
            @click="mapStore.redo()"
          >
            {{ $t('header.redo') }}
          </UiButton>
        </div>

        <!-- Close Button -->
        <UiButton
          variant="primary"
          size="sm"
          @click="toolStore.isHistoryModalOpen = false"
        >
          {{ $t('common.close') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { History, Layers, Undo2, Redo2 } from 'lucide-vue-next'
import { UiModal, UiButton, UiBadge } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'

const mapStore = useMapStore()
const toolStore = useToolStore()
const listContainerRef = ref<HTMLElement | null>(null)

interface HistoryListItem {
  originalIndex: number
  description: string
  timestamp: number
  tilesCount?: number
  isActive: boolean
  isPast: boolean
  isFuture: boolean
}

// Reversed view so newest actions appear on top, oldest at bottom
const reversedHistoryList = computed<HistoryListItem[]>(() => {
  const result: HistoryListItem[] = []
  const total = mapStore.history.length
  for (let i = total - 1; i >= 0; i--) {
    const item = mapStore.history[i]
    if (!item) continue
    result.push({
      originalIndex: i,
      description: item.description || `Action #${i + 1}`,
      timestamp: item.timestamp,
      tilesCount: item.tilesCount,
      isActive: i === mapStore.historyIndex,
      isPast: i < mapStore.historyIndex,
      isFuture: i > mapStore.historyIndex,
    })
  }
  return result
})

function handleJump(index: number) {
  mapStore.jumpToHistory(index)
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Auto scroll to active item when modal opens or index changes
watch(() => [toolStore.isHistoryModalOpen, mapStore.historyIndex], async ([isOpen]) => {
  if (isOpen) {
    await nextTick()
    const container = listContainerRef.value
    if (container) {
      const activeEl = container.querySelector('.border-emerald-500\\/60') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.6);
}
</style>
