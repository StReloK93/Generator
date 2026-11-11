<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('common.selectMap')"
    :icon="Map"
    icon-color="amber"
    size="3xl"
    custom-class="h-120"
    body-class="p-0! space-y-0! overflow-hidden! flex"
    @close="emit('update:isOpen', false)"
  >
    <!-- Left: genre folders with the maps' names -->
    <MapBrowser
      :maps="maps"
      :model-value="selectedMap?.id || ''"
      importable
      class="w-44 sm:w-60 shrink-0 border-r border-slate-800 bg-slate-950/30"
      @update:model-value="emit('update:selectedMapId', $event)"
      @pick="emit('startMap', $event)"
      @imported="emit('imported', $event)"
    />

    <!-- Right: the picked map explained, with its picture in the corner -->
    <section class="flex-1 min-w-0 flex flex-col min-h-0">
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
import { computed } from 'vue'
import { Map, Play } from 'lucide-vue-next'
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
</script>
