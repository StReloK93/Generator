<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('common.selectMap')"
    :subtitle="$t('home.selectMapSubtitle')"
    :icon="Map"
    icon-color="amber"
    size="xl"
    body-class="flex flex-col gap-3 p-3 sm:p-5"
    @close="emit('update:isOpen', false)"
  >
    <!-- Search & Filter Bar -->
    <div class="relative shrink-0">
      <UiInput
        v-model="searchQuery"
        :placeholder="$t('home.searchMaps')"
        :leading-icon="Search"
        clearable
        size="sm"
        class="w-full"
      />
    </div>

    <!-- Scrollable Maps Grid (Designed for 100+ maps) -->
    <div class="max-h-72 sm:max-h-96 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      <div v-if="filteredMaps.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div
          v-for="mapItem in filteredMaps"
          :key="mapItem.id"
          :class="[
            'group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-md flex flex-col justify-between gap-2.5 active:scale-[0.99]',
            selectedMapId === mapItem.id
              ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
              : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
          ]"
          @click="emit('update:selectedMapId', mapItem.id)"
          @dblclick="emit('startMap', mapItem)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <h3 
                :class="[
                  'text-xs sm:text-sm font-bold truncate transition-colors',
                  selectedMapId === mapItem.id ? 'text-amber-300 font-extrabold' : 'text-white group-hover:text-amber-300'
                ]"
              >
                {{ mapItem.name }}
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5 font-medium font-mono">
                {{ mapItem.cols }} × {{ mapItem.rows }} Tiles
              </p>
            </div>

            <!-- Selected Checkmark or Player Badge -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {{ mapItem.playersCount }}P
              </span>
              <div 
                v-if="selectedMapId === mapItem.id" 
                class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm"
              >
                <Check class="w-3 h-3 stroke-3" />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <span class="text-slate-400 flex items-center gap-1.5 font-medium">
              <Shield class="w-3.5 h-3.5 text-amber-400" />
              {{ mapItem.wavesCount }} {{ $t('game.wave') }}
            </span>
            <span 
              :class="[
                'text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-0.5',
                selectedMapId === mapItem.id ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-300'
              ]"
            >
              <span>{{ selectedMapId === mapItem.id ? $t('common.selected') || 'Selected' : $t('common.select') }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Empty Search State -->
      <div v-else class="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Map class="w-8 h-8 text-slate-600 animate-pulse" />
        <p class="text-xs font-medium">{{ $t('home.noMapsFound') }}</p>
        <UiButton
          v-if="searchQuery"
          variant="ghost"
          size="xs"
          @click="searchQuery = ''"
        >
          {{ $t('common.clear') }}
        </UiButton>
      </div>
    </div>

    <!-- Modal Footer with Import Option & Play Game Action -->
    <template #footer>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <!-- Left: Custom Map Import & Total Counter -->
        <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <label class="cursor-pointer group flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <input type="file" accept=".json,.isomap.json" class="hidden" @change="handleFileChange" />
            <Upload class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
            <span>{{ $t('home.importMap') }}</span>
          </label>
          <span class="text-[11px] font-mono text-slate-500">
            {{ $t('home.mapCount', { count: filteredMaps.length }) }}
          </span>
        </div>

        <!-- Right: Play Game Primary Button -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <UiButton
            variant="secondary"
            size="sm"
            @click="emit('update:isOpen', false)"
          >
            {{ $t('common.cancel') }}
          </UiButton>

          <UiButton
            variant="game-amber"
            size="sm"
            :leading-icon="Play"
            :loading="isStartingGame"
            :disabled="!selectedMap || isStartingGame"
            class="w-full sm:w-auto justify-center px-5 font-black uppercase tracking-wider"
            @click="selectedMap && emit('startMap', selectedMap)"
          >
            {{ isStartingGame ? $t('home.loadingMap') : $t('home.playGame') }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Map, 
  Search, 
  Shield, 
  Check, 
  Upload, 
  Play 
} from 'lucide-vue-next'
import { UiModal, UiInput, UiButton } from '../ui'

export interface HomeMapItem {
  id: string
  name: string
  cols: number
  rows: number
  playersCount: number
  wavesCount: number
  raw?: any
}

const props = defineProps<{
  isOpen: boolean
  maps: HomeMapItem[]
  selectedMapId: string
  isStartingGame?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'update:selectedMapId', id: string): void
  (e: 'startMap', mapItem: HomeMapItem): void
  (e: 'importFile', file: File): void
}>()

const searchQuery = ref('')

const filteredMaps = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.maps
  return props.maps.filter(m => 
    m.name.toLowerCase().includes(q) || 
    `${m.cols}x${m.rows}`.includes(q)
  )
})

const selectedMap = computed(() => {
  return props.maps.find(m => m.id === props.selectedMapId) || props.maps[0] || null
})

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('importFile', file)
    // reset input value so re-importing the same file triggers change
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>
