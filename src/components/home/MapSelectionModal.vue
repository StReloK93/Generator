<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('common.selectMap')"
    :icon="Map"
    icon-color="amber"
    size="3xl"
    custom-class="h-120 portrait:h-full"
    body-class="p-0! space-y-0! overflow-hidden! flex"
    @close="emit('update:isOpen', false)"
  >
    <!-- Wide screens: folders on the left, the picked map on the right. An upright phone shows one at a time:
         the folders, then (after a tap on a map) the map with a way back. -->
    <MapBrowser
      :maps="maps"
      :model-value="selectedMap?.id || ''"
      importable
      :class="['w-44 sm:w-60 shrink-0 border-r border-slate-800 bg-slate-950/30 portrait:w-full portrait:border-r-0', showDetails ? 'portrait:hidden' : '']"
      @update:model-value="pickMap"
      @pick="emit('startMap', $event)"
      @imported="emit('imported', $event)"
    />

    <section :class="['flex-1 min-w-0 flex flex-col min-h-0', showDetails ? '' : 'portrait:hidden']">
      <div class="hidden portrait:flex shrink-0 px-2 pt-2">
        <UiButton variant="ghost" size="sm" :leading-icon="ChevronLeft" @click="showDetails = false">{{ $t('common.back') }}</UiButton>
      </div>
      <MapDetails v-if="selectedMap" :map="selectedMap" class="flex-1 min-h-0" />
      <div class="shrink-0 p-2.5 sm:p-4 short:py-2 border-t border-slate-800 bg-slate-950/30 mt-auto">
        <UiButton
          variant="game-amber"
          size="lg"
          block
          :leading-icon="Play"
          :loading="isStartingGame"
          :disabled="!selectedMap || isStartingGame"
          custom-class="uppercase tracking-wider short:py-2"
          @click="selectedMap && emit('startMap', selectedMap)"
        >
          {{ isStartingGame ? $t('home.loadingMap') : $t('home.playGame') }}
        </UiButton>
      </div>
    </section>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, Map, Play } from 'lucide-vue-next'
import { UiModal, UiButton } from '../ui'
import type { MapSummary } from '../../services/mapManager'
import MapBrowser from './MapBrowser.vue'
import MapDetails from './MapDetails.vue'

const props = defineProps<{
  isOpen: boolean
  maps: MapSummary[]
  selectedMapId: string
  isStartingGame?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'update:selectedMapId', id: string): void
  (e: 'startMap', mapItem: MapSummary): void
  (e: 'imported', mapItem: MapSummary): void
}>()

const selectedMap = computed(() => props.maps.find(m => m.id === props.selectedMapId) || props.maps[0] || null)

/** Upright phone: the picked map's page is open (the folders are behind it) */
const showDetails = ref(false)
watch(() => props.isOpen, open => {
  if (open) showDetails.value = false
})

function pickMap(id: string) {
  emit('update:selectedMapId', id)
  showDetails.value = true
}
</script>
