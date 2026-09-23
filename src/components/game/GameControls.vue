<template>
  <div class="pointer-events-none z-30 flex items-center justify-between w-full  select-none">
    <!-- Tower Shop Buttons Row -->
    <div class="flex items-center gap-2 pointer-events-auto p-2" @mousedown.stop
      @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <!-- Tower Buttons of the Selected Faction -->
      <button v-for="bp in towerStore.playerClanBlueprints" :key="bp.id" type="button" @click="selectTowerToBuild(bp)"
        class="rounded-xl cursor-pointer  border touch-target relative overflow-visible" :class="[
          towerStore.activeBuildTowerId === bp.id
            ? 'bg-amber-500/50 border-amber-400 ring-2 ring-amber-400/40'
            : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500'
        ]" :title="`${bp.name} — ${$t('game.cost', { amount: bp.cost })}`">
        <div class="size-12 sm:size-14  flex items-center justify-center">
          <img v-if="getTowerSpriteUrl(bp)" :src="getTowerSpriteUrl(bp)" :alt="bp.name"
            class="size-9 object-contain filter drop-shadow scale-110" />
          <ShieldAlert v-else class="size-4 text-amber-400" />
        </div>
        <div class="absolute -top-2 -right-2 z-10 bg-slate-900/80 size-6.5 aspect-square flex justify-center items-center border border-slate-700 rounded-full  text-[10px]  font-bold text-amber-300">
          {{ bp.cost }}
        </div>
      </button>

      <div v-if="towerStore.playerClanBlueprints.length === 0"
        class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 font-medium">
        {{ $t('config.noTowers') }}
      </div>
    </div>

    <!-- Bottom Speed & Status Dock (Right side) -->
    <UiCard variant="slate" padding="none"
      custom-class="pointer-events-auto shadow-2xl backdrop-blur-xl bg-slate-950/95 border-slate-800/80 rounded-2xl"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <div class="flex items-center gap-1.5 p-1.5">
        <!-- Speed Multiplier (ONLY in Preview / Singleplayer Test Mode) -->
        <div v-if="!multiplayerStore.roomId" class="shrink-0">
          <UiTabs :model-value="gameStore.gameSpeed" :items="speedTabs" size="xs" variant="amber"
            @update:model-value="gameStore.setGameSpeed(Number($event))" />
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert, Coins } from 'lucide-vue-next'
import { UiCard, UiTabs } from '../ui'
import { useGameStore } from '../../stores/gameStore'
import { useTowerStore, TowerBlueprint } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'

const gameStore = useGameStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

const speedTabs = [
  { id: 1, label: '1x' },
  { id: 2, label: '2x' },
  { id: 3, label: '3x' },
  { id: 5, label: '5x' },
]

function getTowerSpriteUrl(bp: TowerBlueprint): string {
  if (bp.assetPath && bp.assetPath.startsWith('data:')) {
    return bp.assetPath
  }
  if (bp.assetId) {
    const preview = assetStore.getAssetPreview(bp.assetId)
    if (preview) return preview
  }
  if (bp.assetName) {
    const preview = assetStore.getAssetPreview(bp.assetName)
    if (preview) return preview
  }
  if (bp.assetPath) {
    const preview = assetStore.getAssetPreview(bp.assetPath)
    if (preview) return preview
  }
  return ''
}

function selectTowerToBuild(bp: TowerBlueprint) {
  if (towerStore.activeBuildTowerId === bp.id) {
    towerStore.cancelBuild()
  } else {
    towerStore.selectPlacedTower(null)
    towerStore.selectBuildTower(bp.id)
  }
}
</script>
