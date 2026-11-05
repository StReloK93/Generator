<template>
  <div class="flex flex-col min-h-0">
    <div class="p-2 shrink-0">
      <UiInput
        v-model="searchQuery"
        :placeholder="$t('home.searchMaps')"
        :leading-icon="Search"
        clearable
        size="sm"
      />
    </div>

    <div ref="listRef" class="flex-1 min-h-0 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
      <UiButton
        v-for="mapItem in filteredMaps"
        :key="mapItem.id"
        variant="tool"
        size="md"
        block
        :active="modelValue === mapItem.id"
        :data-active="modelValue === mapItem.id"
        custom-class="justify-start! text-left min-h-10 shrink-0 [&>span]:flex-1 [&>span]:min-w-0"
        @click="emit('update:modelValue', mapItem.id)"
        @dblclick="emit('pick', mapItem)"
      >
        <span class="flex items-center gap-2 min-w-0">
          <component
            :is="mapItem.mode === 'td' ? Castle : Swords"
            :class="['size-3.5 shrink-0', mapItem.mode === 'td' ? 'text-brand-300' : 'text-rose-300']"
          />
          <span class="flex-1 min-w-0 truncate">{{ mapItem.name }}</span>
          <span v-if="showPlayers" class="shrink-0 flex items-center gap-1 text-[11px] font-semibold opacity-80">
            <Users class="size-3" /> {{ mapItem.playersCount }}
          </span>
        </span>
      </UiButton>

      <div v-if="filteredMaps.length === 0" class="py-6 text-center text-slate-500 flex flex-col items-center gap-2">
        <Map class="size-6 text-slate-600" />
        <p class="text-xs">{{ $t('home.noMapsFound') }}</p>
      </div>
    </div>

    <div class="shrink-0 px-2 py-1.5 border-t border-slate-800 flex items-center justify-between gap-2">
      <label v-if="importable" class="cursor-pointer group flex items-center gap-1.5 min-h-9 px-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-brand-200 transition-colors">
        <input type="file" accept=".json,.isomap.json" class="hidden" @change="handleFileChange" />
        <Upload class="size-3.5 group-hover:text-brand-300" />
        <span class="truncate">{{ $t('home.importMap') }}</span>
      </label>
      <span class="ml-auto text-[10px] text-slate-500 shrink-0">{{ filteredMaps.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Map, Search, Upload, Users, Castle, Swords } from 'lucide-vue-next'
import { UiInput, UiButton } from '../ui'
import { importMapFile, type MapSummary } from '../../services/mapManager'
import { useNotificationStore } from '../../stores/notificationStore'

/**
 * Searchable, name-only map list (with custom map import when `importable`). Scales to long map catalogs.
 * The caller owns the map list; imported maps are handed back via `imported`.
 */
const props = defineProps<{
  maps: MapSummary[]
  modelValue: string
  showPlayers?: boolean
  /** Offer loading a map file (single player; room games use the built-in maps) */
  importable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'pick', mapItem: MapSummary): void
  (e: 'imported', mapItem: MapSummary): void
}>()

const notify = useNotificationStore()
const searchQuery = ref('')
const listRef = ref<HTMLElement | null>(null)

const filteredMaps = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.maps
  return props.maps.filter(m => m.name.toLowerCase().includes(q))
})

// Keep the selected map visible in long lists
onMounted(() => {
  listRef.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
})

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
