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
    <!-- Left: searchable name-only list -->
    <MapListPicker
      :maps="maps"
      :model-value="selectedMap?.id || ''"
      importable
      class="w-44 sm:w-60 shrink-0 border-r border-slate-800 bg-slate-950/30"
      @update:model-value="emit('update:selectedMapId', $event)"
      @pick="emit('startMap', $event)"
      @imported="emit('imported', $event)"
    />

    <!-- Right: details of the selected map + primary action -->
    <section class="flex-1 min-w-0 flex flex-col min-h-0">
      <div v-if="selectedMap && details" class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 short:py-2.5 flex flex-col gap-3 short:gap-2">
        <div class="min-w-0 flex items-center gap-2">
          <h3 class="text-base sm:text-xl font-extrabold text-brand-200 truncate">{{ selectedMap.name }}</h3>
          <UiBadge :variant="selectedMap.mode === 'td' ? 'brand' : 'rose'" size="xs" class="shrink-0">
            {{ selectedMap.mode === 'td' ? $t('game.modeTd') : $t('game.modePvp') }}
          </UiBadge>
          <span class="ml-auto text-[11px] sm:text-xs text-slate-400 shrink-0">{{ selectedMap.cols }} × {{ selectedMap.rows }}</span>
        </div>
        <p v-if="selectedMap.mode === 'hero'" class="text-xs text-slate-400 leading-relaxed">{{ $t('home.info.pvpDesc') }}</p>

        <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-xl bg-slate-950/50 border border-slate-800 px-2 sm:px-2.5 py-1.5 sm:py-2 short:py-1 flex items-center gap-2 min-w-0"
          >
            <component :is="stat.icon" :class="['size-4 shrink-0', stat.color]" />
            <div class="min-w-0">
              <div class="text-sm sm:text-base font-extrabold text-slate-50 leading-tight">{{ stat.value }}</div>
              <div class="text-[10px] text-slate-400 truncate">{{ stat.label }}</div>
            </div>
          </div>
        </div>

        <div v-if="selectedMap.mode === 'td' && details.clans.length > 0" class="flex flex-col gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('home.info.clans') }}</span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="clan in details.clans"
              :key="clan.id"
              class="px-2 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
            >
              <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: clan.color }" />
              {{ clan.name }}
            </span>
          </div>
        </div>
      </div>

      <div class="shrink-0 p-2.5 sm:p-4 short:py-2 border-t border-slate-800 bg-slate-950/30">
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
import { Map, Play, Swords, Crown, Users, Coins, Heart, Castle } from 'lucide-vue-next'
import { UiModal, UiButton, UiBadge } from '../ui'
import { getMapDetails, type MapSummary } from '../../services/mapManager'
import { useI18n } from '../../stores/i18nStore'
import MapListPicker from './MapListPicker.vue'

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

const { t } = useI18n()

const selectedMap = computed(() => {
  return props.maps.find(m => m.id === props.selectedMapId) || props.maps[0] || null
})

const details = computed(() => (selectedMap.value ? getMapDetails(selectedMap.value.raw) : null))

const stats = computed(() => {
  const d = details.value
  if (!d || !selectedMap.value) return []
  if (selectedMap.value.mode === 'hero') {
    return [{ icon: Users, color: 'text-sky-400', value: selectedMap.value.playersCount, label: t('home.info.players') }]
  }
  return [
    { icon: Swords, color: 'text-brand-300', value: d.waves, label: t('home.info.waves') },
    { icon: Crown, color: 'text-amber-400', value: d.bossWaves, label: t('home.info.bosses') },
    { icon: Users, color: 'text-sky-400', value: selectedMap.value.playersCount, label: t('home.info.players') },
    { icon: Coins, color: 'text-amber-300', value: d.startingGold, label: t('home.info.gold') },
    { icon: Heart, color: 'text-rose-400', value: d.startingLives, label: t('home.info.lives') },
    { icon: Castle, color: 'text-emerald-400', value: d.towers, label: t('home.info.towers') },
  ]
})
</script>
