<template>
  <div class="flex flex-col min-h-0">
    <div v-if="maps.length > SEARCH_FROM" class="shrink-0 p-2 pb-1">
      <UiInput v-model="searchQuery" :placeholder="$t('home.searchMaps')" :leading-icon="Search" clearable size="sm" />
    </div>

    <!-- Genre folders, each opening into its maps -->
    <div ref="listRef" class="flex-1 min-h-0 overflow-y-auto p-1.5 flex flex-col gap-0.5">
      <template v-for="folder in folders" :key="folder.mode">
        <UiButton
          variant="tool"
          size="md"
          block
          custom-class="justify-start! text-left min-h-10 short:min-h-8 short:py-1! shrink-0 [&>span]:flex-1 [&>span]:min-w-0"
          @click="toggleFolder(folder.mode)"
        >
          <span class="flex items-center gap-2 min-w-0">
            <ChevronRight :class="['size-3.5 shrink-0 text-slate-500 transition-transform', isOpen(folder.mode) ? 'rotate-90' : '']" />
            <component :is="isOpen(folder.mode) ? FolderOpen : Folder" :class="['size-4 shrink-0', MAP_MODE_PLAY_INFO[folder.mode].accent]" />
            <span class="flex-1 min-w-0 truncate text-slate-100">{{ $t(MAP_MODE_PLAY_INFO[folder.mode].label) }}</span>
            <span class="shrink-0 text-[11px] font-bold text-slate-500 tabular-nums">{{ folder.maps.length }}</span>
          </span>
        </UiButton>

        <div v-if="isOpen(folder.mode)" class="ml-4 pl-2 border-l border-slate-800 flex flex-col gap-0.5">
          <UiButton
            v-for="mapItem in folder.maps"
            :key="mapItem.id"
            variant="tool"
            size="sm"
            block
            :active="modelValue === mapItem.id"
            :data-active="modelValue === mapItem.id"
            custom-class="justify-start! text-left min-h-9 short:min-h-8 short:py-1! shrink-0 [&>span]:flex-1 [&>span]:min-w-0"
            @click="emit('update:modelValue', mapItem.id)"
            @dblclick="emit('pick', mapItem)"
          >
            <span class="flex items-center gap-2 min-w-0">
              <MapIcon class="size-3.5 shrink-0 opacity-70" />
              <span class="flex-1 min-w-0 truncate">{{ mapItem.name }}</span>
              <span class="shrink-0 flex items-center gap-1 text-[11px] font-semibold opacity-70">
                <Users class="size-3" /> {{ mapItem.playersCount }}
              </span>
            </span>
          </UiButton>
        </div>
      </template>

      <div v-if="folders.length === 0" class="py-6 text-center text-slate-500 flex flex-col items-center gap-2">
        <MapIcon class="size-6 text-slate-600" />
        <p class="text-xs">{{ $t('home.noMapsFound') }}</p>
      </div>
    </div>

    <div v-if="importable" class="shrink-0 px-2 py-1.5 border-t border-slate-800 flex items-center">
      <label class="cursor-pointer group flex items-center gap-1.5 min-h-9 px-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-brand-200 transition-colors">
        <input type="file" accept=".json,.isomap.json" class="hidden" @change="handleFileChange" />
        <Upload class="size-3.5 group-hover:text-brand-300" />
        <span class="truncate">{{ $t('home.importMap') }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronRight, Folder, FolderOpen, Map as MapIcon, Search, Upload, Users } from 'lucide-vue-next'
import { UiButton, UiInput } from '../ui'
import { MAP_GAME_MODES } from '../../domain/map'
import type { MapGameMode } from '../../types/map'
import { importMapFile, type MapSummary } from '../../services/mapManager'
import { useNotificationStore } from '../../stores/notificationStore'
import { MAP_MODE_PLAY_INFO } from '../mapModeInfo'

/**
 * The maps as folders, one per genre (Tower Defense, Hide & Seek, PvP): a folder opens into its maps' names, and only
 * one is open at a time (opening one closes the other). The caller owns the map list and the picked map.
 */
const props = defineProps<{
  maps: MapSummary[]
  modelValue: string
  /** Offer loading a map file (single player; room games use the built-in maps) */
  importable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'pick', mapItem: MapSummary): void
  (e: 'imported', mapItem: MapSummary): void
}>()

/** A search box shows up once there are more maps than this */
const SEARCH_FROM = 8

const notify = useNotificationStore()
const searchQuery = ref('')
const listRef = ref<HTMLElement | null>(null)
/** The one open folder (null: all closed) */
const openFolder = ref<MapGameMode | null>(null)

const folders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const found = q ? props.maps.filter(m => m.name.toLowerCase().includes(q)) : props.maps
  return MAP_GAME_MODES.map(mode => ({ mode, maps: found.filter(m => m.mode === mode) })).filter(f => f.maps.length > 0)
})

/** While searching every folder with a match is open */
const isOpen = (mode: MapGameMode) => openFolder.value === mode || searchQuery.value.trim() !== ''

function toggleFolder(mode: MapGameMode) {
  openFolder.value = openFolder.value === mode ? null : mode
}

// The picked map's folder is open and the map in view
watch(
  () => props.maps.find(m => m.id === props.modelValue)?.mode,
  async (mode) => {
    if (!mode || openFolder.value === mode) return
    openFolder.value = mode
    await nextTick()
    listRef.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true },
)

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // reset input value so re-importing the same file triggers change
  input.value = ''
  if (!file) return
  try {
    const mapItem = await importMapFile(file)
    emit('imported', mapItem)
    emit('update:modelValue', mapItem.id)
    notify.success(`Loaded "${mapItem.name}"`)
  } catch {
    notify.error('Invalid map JSON file')
  }
}
</script>
