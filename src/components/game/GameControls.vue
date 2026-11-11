<template>
  <!-- Tower defence controls along the bottom edge, where thumbs rest. Upright phone: the picked tower's card, the one
       main action (start the wave / build here) full width, the tower shop at the very bottom. Sideways: card and shop
       on the left, the main action on the right. -->
  <div class="grid grid-cols-[minmax(0,1fr)_auto] portrait:grid-cols-1 items-end gap-x-2 gap-y-1.5 w-full pb-safe pl-safe pr-safe select-none pointer-events-none">
    <div class="col-start-1 row-start-1 empty:hidden">
      <TowerInfoCard />
    </div>
    <div class="col-start-1 row-start-2 portrait:row-start-3 min-w-0">
      <div class="pointer-events-auto flex items-center gap-2 max-w-full w-fit overflow-x-auto no-scrollbar pt-2.5 pr-2.5">
        <UiButton
          v-for="bp in towerStore.playerClanBlueprints"
          :key="bp.id"
          variant="secondary"
          :custom-class="[
            'relative shrink-0 size-12 sm:size-14 p-0! rounded-xl! overflow-visible backdrop-blur-md',
            towerStore.activeBuildTowerId === bp.id ? 'bg-amber-500/50! border-amber-400! ring-2 ring-amber-400/40' : 'bg-slate-900/90!',
            towerStore.myGold < (bp.levels[0].cost ?? 100) ? 'opacity-60' : '',
          ]"
          :title="`${bp.name} — ${$t('game.cost', { amount: bp.levels[0].cost ?? 100 })}`"
          @click="selectTowerToBuild(bp)"
        >
          <template #leading>
            <img v-if="assetStore.getTowerAssetPreview(bp.asset)" :src="assetStore.getTowerAssetPreview(bp.asset)" :alt="bp.name" class="size-9 object-contain drop-shadow scale-110" />
            <ShieldAlert v-else class="size-4 text-amber-400" />
            <span class="absolute -top-2 -right-2 z-10 size-6.5 flex justify-center items-center rounded-full border border-slate-700 bg-slate-900/90 text-[10px] font-bold text-amber-300">
              {{ bp.levels[0].cost }}
            </span>
          </template>
        </UiButton>
        <span v-if="towerStore.playerClanBlueprints.length === 0" class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 font-medium">
          {{ $t('config.noTowers') }}
        </span>
      </div>
    </div>

    <!-- What comes next, then the main action -->
    <div class="col-start-2 row-start-1 row-span-2 portrait:col-start-1 portrait:row-start-2 portrait:row-span-1 pointer-events-auto flex flex-col items-end gap-1.5">
      <div
        v-if="isPreparing && !buildBlueprint && nextWave"
        class="flex items-center gap-2 h-7 px-2.5 rounded-full border border-slate-700/70 bg-slate-950/80 backdrop-blur-md text-[11px] font-bold tabular-nums"
      >
        <span class="text-purple-200">{{ $t('game.wave') }} {{ waveStore.currentWaveIndex + 1 }}</span>
        <span class="flex items-center gap-0.5 text-rose-300" :title="$t('game.hp')"><Heart class="size-3 text-rose-500 fill-rose-500/50" />{{ nextWave.unitHp }}</span>
        <span class="hidden sm:flex items-center gap-0.5 text-emerald-300" :title="$t('common.speed')"><Footprints class="size-3" />{{ nextWave.unitSpeed }}</span>
        <span class="flex items-center gap-0.5 text-amber-300" :title="$t('common.gold')"><Coins class="size-3" />+{{ nextWave.goldReward }}</span>
        <span
          v-for="immunity in nextWave.immunities ?? []"
          :key="immunity"
          class="size-5 rounded-full border flex items-center justify-center"
          :class="getTraitDef(immunity).badgeClass"
          :title="`${$t('game.immunities')}: ${$t(getTraitDef(immunity).nameKey)}`"
        >
          <component :is="getTraitDef(immunity).icon" class="size-3" />
        </span>
      </div>

      <div class="flex items-center gap-1.5 portrait:w-full">
        <UiButton
          v-if="!multiplayerStore.roomId"
          variant="secondary"
          size="md"
          :leading-icon="FastForward"
          custom-class="h-11 bg-slate-900/90! backdrop-blur-md tabular-nums"
          :title="$t('common.speed')"
          @click="nextSpeed"
        >
          {{ gameStore.gameSpeed }}x
        </UiButton>

        <!-- Building: pick a cell, then confirm it here -->
        <template v-if="buildBlueprint">
          <span v-if="!towerStore.pendingBuildCell" class="flex items-center justify-center gap-1.5 h-11 px-3 portrait:flex-1 rounded-xl bg-slate-950/80 border border-amber-500/40 backdrop-blur-md text-amber-200 text-xs font-bold">
            <span class="size-1.5 rounded-full bg-amber-400 animate-pulse" />{{ $t('game.tapToPlace') }}
          </span>
          <UiIconButton :icon="X" size="lg" custom-class="h-11! w-11! bg-slate-950/85! text-rose-300! border-rose-500/50! backdrop-blur-md" :title="$t('game.cancelBuild')" @click="towerStore.cancelBuild()" />
          <UiButton v-if="towerStore.pendingBuildCell" variant="game-green" size="lg" :leading-icon="Check" custom-class="h-11 portrait:flex-1" :disabled="towerStore.myGold < buildCost" @click="confirmBuild">
            {{ $t('game.build') }}
          </UiButton>
        </template>

        <!-- Between waves: start the next one (a room's host; everyone sees the countdown) -->
        <template v-else-if="isPreparing">
          <span v-if="multiplayerStore.roomId" class="flex items-center gap-1.5 h-11 px-3 shrink-0 rounded-xl bg-slate-950/80 border border-amber-500/40 backdrop-blur-md text-amber-300 text-sm font-black tabular-nums">
            <Timer class="size-4" />{{ Math.ceil(gameStore.prepCountdown) }}s
          </span>
          <UiButton v-if="canStartWave" variant="game-amber" size="lg" :leading-icon="Play" custom-class="h-11 portrait:flex-1" @click="startWave">
            {{ $t('game.startWaveNow') }}
          </UiButton>
        </template>

        <span v-else-if="gameStore.gameState === 'wave_running'" class="flex items-center justify-center gap-1.5 h-11 px-3 portrait:flex-1 rounded-xl bg-slate-950/80 border border-emerald-500/40 backdrop-blur-md text-emerald-200 text-xs font-bold">
          <Swords class="size-4 text-emerald-400 animate-pulse" />{{ $t('game.waveRunning') }}
        </span>

        <span v-else class="flex items-center justify-center h-11 px-3 portrait:flex-1 rounded-xl bg-slate-950/80 border border-slate-700/70 backdrop-blur-md text-slate-300 text-xs font-medium">
          {{ $t('game.waitingNextWave') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Coins, FastForward, Footprints, Heart, Play, ShieldAlert, Swords, Timer, X } from 'lucide-vue-next'
import { UiButton, UiIconButton } from '../ui'
import TowerInfoCard from './TowerInfoCard.vue'
import { useGameStore } from '../../stores/gameStore'
import { useTowerStore } from '../../stores/towerStore'
import { useWaveStore } from '../../stores/waveStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'
import { useToolStore } from '../../stores/toolStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { getTraitDef } from '../../utils/towerTraits'
import type { TowerBlueprint } from '../../types/tower'

const gameStore = useGameStore()
const towerStore = useTowerStore()
const waveStore = useWaveStore()
const characterStore = useCharacterStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const notify = useNotificationStore()
const { t } = useI18n()

const SPEEDS = [1, 2, 3, 5]

const isPreparing = computed(() => gameStore.gameState === 'build_prep' || gameStore.gameState === 'ready')
const nextWave = computed(() => waveStore.currentWaveConfig)
/** In a room only the host starts waves */
const canStartWave = computed(() => !multiplayerStore.roomId || multiplayerStore.isHost)

const buildBlueprint = computed(() => (towerStore.activeBuildTowerId ? towerStore.blueprintMap.get(towerStore.activeBuildTowerId) ?? null : null))
const buildCost = computed(() => buildBlueprint.value?.levels[0].cost ?? 100)

function selectTowerToBuild(bp: TowerBlueprint) {
  if (towerStore.activeBuildTowerId === bp.id) {
    towerStore.cancelBuild()
  } else {
    towerStore.selectPlacedTower(null)
    towerStore.selectBuildTower(bp.id)
  }
}

function nextSpeed() {
  gameStore.setGameSpeed(SPEEDS[(SPEEDS.indexOf(gameStore.gameSpeed) + 1) % SPEEDS.length])
}

function confirmBuild() {
  const cell = towerStore.pendingBuildCell
  if (!buildBlueprint.value || !cell) return
  if (towerStore.myGold < buildCost.value) {
    notify.gold(t('game.needGoldForTower', { cost: buildCost.value, current: towerStore.myGold }), t('game.notEnoughGold'))
    return
  }
  if (towerStore.placeTowerAt(cell.col, cell.row)) {
    towerStore.setPendingBuildCell(null)
    toolStore.setHoveredCell(null)
    towerStore.selectBuildTower(null)
    towerStore.selectPlacedTower(null)
  }
}

function startWave() {
  if (!canStartWave.value) return
  characterStore.spawnAtRoute(0)
  gameStore.startNextWaveInGame()
  characterStore.startTour()
}
</script>
