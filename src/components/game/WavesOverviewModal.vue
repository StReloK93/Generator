<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.waveList')"
    :subtitle="`${characterStore.waveConfigs.length} ${$t('game.wave')}`"
    :teleport="true"
    size="md"
    @close="emit('update:isOpen', false)"
  >
    <div class="flex flex-col gap-2 max-h-[65vh] overflow-y-auto pr-1">
      <div 
        v-for="(w, idx) in characterStore.waveConfigs" 
        :key="w.waveNumber || idx"
        class="p-2 sm:p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 text-xs"
        :class="[
          idx === characterStore.currentWaveIndex 
            ? 'bg-slate-900/95 border-amber-500/70 ring-1 ring-amber-500/30 shadow-lg' 
            : idx < characterStore.currentWaveIndex
              ? 'bg-slate-950/60 border-slate-800/60 opacity-60'
              : 'bg-slate-950/90 border-slate-800/90 hover:border-slate-700'
        ]"
      >
        <!-- Left: Enemy Thumbnail & Stats Info -->
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Enemy Sprite Frame -->
          <div class="size-11 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            <img 
              v-if="getWaveEnemySprite(w.characterModel)" 
              :src="getWaveEnemySprite(w.characterModel)" 
              :alt="w.name"
              class="size-9 object-contain filter drop-shadow scale-125" 
            />
            <ShieldAlert v-else class="size-5 text-slate-500" />
          </div>

          <div class="flex flex-col min-w-0 text-left">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-slate-100 truncate text-xs">{{ w.name || `To'lqin ${idx + 1}` }}</span>
              <UiBadge v-if="w.isBoss" variant="amber" size="xs">
                <Crown class="size-2.5 text-amber-400 inline mr-0.5" /> BOSS
              </UiBadge>
              <UiBadge v-if="idx < characterStore.currentWaveIndex" variant="emerald" size="xs">
                {{ $t('game.cleared') }}
              </UiBadge>
              <UiBadge v-else-if="idx === characterStore.currentWaveIndex" variant="amber" size="xs" class="animate-pulse">
                {{ $t('game.active') }}
              </UiBadge>
              <UiBadge v-else variant="slate" size="xs">
                {{ $t('game.upcoming') }}
              </UiBadge>
            </div>

            <!-- Stats summary row -->
            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
              <span class="flex items-center gap-0.5 text-rose-300">
                <Heart class="size-2.5 text-rose-500 fill-rose-500" /> {{ w.unitHp }}
              </span>
              <span>•</span>
              <span class="flex items-center gap-0.5 text-emerald-300">
                <Footprints class="size-2.5 text-emerald-400" /> {{ w.unitSpeed || 2.5 }}
              </span>
              <span>•</span>
              <span class="flex items-center gap-0.5 text-sky-300">
                <Users class="size-2.5 text-sky-400" /> {{ w.unitCount }}
              </span>
              <span>•</span>
              <span class="flex items-center gap-0.5 text-amber-300">
                <Coins class="size-2.5 text-amber-400" /> +{{ w.goldReward }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: Immunities / Traits -->
        <div v-if="w.immunities && w.immunities.length > 0" class="flex items-center gap-1 shrink-0 flex-wrap max-w-24 justify-end">
          <span 
            v-for="immId in w.immunities" 
            :key="immId"
            class="px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5"
            :class="getTraitDef(immId).badgeClass"
          >
            <component :is="getTraitDef(immId).icon" class="size-2.5" />
            <span>{{ $t(getTraitDef(immId).nameKey) }}</span>
          </span>
        </div>
        <div v-else class="text-[9px] text-slate-500 shrink-0">
          {{ $t('game.noImmunities') }}
        </div>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import {
  Heart,
  Crown,
  ShieldAlert,
  Footprints,
  Users,
  Coins
} from 'lucide-vue-next'
import { UiModal, UiBadge } from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { assetManager } from '../../services/assetManager'
import { getTraitDef } from '../../utils/towerTraits'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const characterStore = useCharacterStore()

function getWaveEnemySprite(model?: string): string {
  const m = (model || 'male').toLowerCase()
  return assetManager.getCharacterPreviewDataUrl(m, 2, 'Idle', 0) 
    || assetManager.getCharacterPreviewDataUrl(m, 2, 'Run', 0)
    || assetManager.getCharacterPreviewDataUrl('male', 2, 'Idle', 0)
}
</script>
