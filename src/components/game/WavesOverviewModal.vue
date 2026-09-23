<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.waveList')"
    :subtitle="`${waveStore.waveConfigs.length} ${$t('game.wave')}`"
    :teleport="true"
    size="md"
    @close="emit('update:isOpen', false)"
  >
    <div v-if="waveStore.waveConfigs.length > 0" class="flex flex-col gap-3">
      
      <!-- ========================================================================= -->
      <!-- FEATURED ACTIVE WAVE CAROUSEL PREVIEW CARD                                -->
      <!-- ========================================================================= -->
      <div class="relative rounded-2xl bg-linear-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 shadow-2xl p-3 sm:p-4 flex flex-col gap-3 overflow-hidden">
        
        <!-- Header Carousel Bar: Wave Name + Boss Badge + Carousel Nav -->
        <div class="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
          <div class="flex items-center gap-2">
            <UiBadge variant="brand" size="xs" class="font-mono font-bold">
              {{ $t('game.wave') }} {{ activeCarouselIndex + 1 }} / {{ waveStore.waveConfigs.length }}
            </UiBadge>

            <span class="font-bold text-slate-100 text-sm truncate max-w-44 sm:max-w-64">
              {{ activeWave?.name || `Wave ${activeCarouselIndex + 1}` }}
            </span>

            <UiBadge v-if="activeWave?.isBoss" variant="amber" size="xs">
              <Crown class="size-3 text-amber-400 inline mr-0.5" /> BOSS
            </UiBadge>

            <UiBadge v-if="activeCarouselIndex === waveStore.currentWaveIndex" variant="amber" size="xs" class="animate-pulse">
              {{ $t('game.active') }}
            </UiBadge>
          </div>

          <!-- Carousel Controls: Prev / Next Buttons -->
          <div class="flex items-center gap-1.5 ml-auto">
            <UiButton
              variant="secondary"
              size="xs"
              :leading-icon="ChevronLeft"
              :disabled="activeCarouselIndex <= 0"
              @click="prevCarouselWave"
            >
              {{ $t('common.prev') || 'Prev' }}
            </UiButton>

            <UiButton
              variant="secondary"
              size="xs"
              :trailing-icon="ChevronRight"
              :disabled="activeCarouselIndex >= waveStore.waveConfigs.length - 1"
              @click="nextCarouselWave"
            >
              {{ $t('common.next') || 'Next' }}
            </UiButton>
          </div>
        </div>

        <!-- Live Unit Running Animation & Elemental Variant Card -->
        <div v-if="activeWave" class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          
          <!-- Left: Live Character 'Run' Animation Canvas with Elemental Effects -->
          <div class="relative w-full rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950/80">
            <CharacterLivePreview
              :model-value="activeWave.characterModel || 'male'"
              initial-action="Run"
              :unit-variant="activeWave.unitVariant || 'normal'"
              :variant-tint="activeWave.variantTint"
              :unit-scale="activeWave.unitScale || 1.0"
              :anim-speed="activeWave.animSpeed || 1.0"
              :offset-y="activeWave.offsetY || 0"
              :show-model-selector="false"
              :show-direction-bar="false"
              :show-action-buttons="false"
              height-class="h-44 sm:h-52"
            />
          </div>

          <!-- Right: Detailed Wave Stats & Elemental Properties -->
          <div class="flex flex-col gap-2.5 justify-center text-xs">
            
            <!-- Elemental Variant Badge Row -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-slate-400 text-xs">{{ $t('config.unitVariant') }}:</span>
              <span 
                class="px-2 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 capitalize"
                :style="{ 
                  color: activeVariant.color, 
                  borderColor: activeVariant.color + '60', 
                  backgroundColor: activeVariant.color + '20' 
                }"
              >
                <component :is="getVariantIcon(activeVariant.icon)" class="size-3.5" />
                <span>{{ $t(activeVariant.nameKey) }}</span>
              </span>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <div class="flex items-center gap-1.5 text-rose-300">
                <Heart class="size-3.5 text-rose-500 fill-rose-500 shrink-0" />
                <span class="text-slate-400">HP:</span>
                <span class="font-bold">{{ activeWave.unitHp }}</span>
              </div>

              <div class="flex items-center gap-1.5 text-emerald-300">
                <Footprints class="size-3.5 text-emerald-400 shrink-0" />
                <span class="text-slate-400">Speed:</span>
                <span class="font-bold">{{ activeWave.unitSpeed || 2.5 }}</span>
              </div>

              <div class="flex items-center gap-1.5 text-sky-300">
                <Users class="size-3.5 text-sky-400 shrink-0" />
                <span class="text-slate-400">Count:</span>
                <span class="font-bold">{{ activeWave.unitCount }}x</span>
              </div>

              <div class="flex items-center gap-1.5 text-amber-300">
                <Coins class="size-3.5 text-amber-400 shrink-0" />
                <span class="text-slate-400">Reward:</span>
                <span class="font-bold">+{{ activeWave.goldReward }}</span>
              </div>
            </div>

            <!-- Immunities & Resistances -->
            <div class="flex flex-col gap-1">
              <span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                {{ $t('traits.title') || 'Immunities' }}:
              </span>
              <div v-if="activeWave.immunities && activeWave.immunities.length > 0" class="flex items-center gap-1 flex-wrap">
                <span 
                  v-for="immId in activeWave.immunities" 
                  :key="immId"
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1"
                  :class="getTraitDef(immId).badgeClass"
                >
                  <component :is="getTraitDef(immId).icon" class="size-2.5" />
                  <span>{{ $t(getTraitDef(immId).nameKey) }}</span>
                </span>
              </div>
              <span v-else class="text-[10px] text-slate-500 italic">
                {{ $t('game.noImmunities') }}
              </span>
            </div>

          </div>
        </div>

        <!-- Quick Wave Quick-Navigation Pills Bar -->
        <div class="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800/80 flex-wrap">
          <button
            v-for="(_, idx) in waveStore.waveConfigs"
            :key="idx"
            type="button"
            class="min-w-6 h-6 px-1 rounded-md text-[11px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer select-none"
            :class="[
              activeCarouselIndex === idx
                ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                : idx === waveStore.currentWaveIndex
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                  : idx < waveStore.currentWaveIndex
                    ? 'bg-slate-800/40 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            ]"
            @click="activeCarouselIndex = idx"
          >
            {{ idx + 1 }}
          </button>
        </div>

      </div>

    </div>

    <!-- Empty Waves State -->
    <div v-else class="text-center py-8 text-slate-400 text-xs">
      {{ $t('config.noWaves') }}
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Heart,
  Crown,
  Footprints,
  Users,
  Coins,
  ChevronLeft,
  ChevronRight,
  Shield,
  Flame,
  Snowflake,
  Skull,
  Ghost,
  Zap,
  Droplet
} from 'lucide-vue-next'
import { UiModal, UiBadge, UiButton } from '../ui'
import { useWaveStore } from '../../stores/waveStore'
import { getTraitDef } from '../../utils/towerTraits'
import { getVariantDef } from '../../utils/unitVariants'
import CharacterLivePreview from './CharacterLivePreview.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const waveStore = useWaveStore()

// Active carousel index (defaults to active match wave, or 0)
const activeCarouselIndex = ref(0)

watch(() => props.isOpen, (open) => {
  if (open) {
    activeCarouselIndex.value = Math.max(
      0, 
      Math.min(waveStore.waveConfigs.length - 1, waveStore.currentWaveIndex || 0)
    )
  }
})

const activeWave = computed(() => {
  if (waveStore.waveConfigs.length === 0) return null
  return waveStore.waveConfigs[activeCarouselIndex.value] || waveStore.waveConfigs[0]
})

const activeVariant = computed(() => {
  return getVariantDef(activeWave.value?.unitVariant)
})

function prevCarouselWave() {
  if (activeCarouselIndex.value > 0) {
    activeCarouselIndex.value--
  }
}

function nextCarouselWave() {
  if (activeCarouselIndex.value < waveStore.waveConfigs.length - 1) {
    activeCarouselIndex.value++
  }
}

const variantIconMap: Record<string, any> = {
  Shield,
  Flame,
  Snowflake,
  Skull,
  Ghost,
  Zap,
  Droplet,
  Crown,
}

function getVariantIcon(iconName?: string) {
  return variantIconMap[iconName || 'Shield'] || Shield
}
</script>
