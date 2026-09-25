<template>
  <aside
    class="absolute top-0 right-0 z-50 pointer-events-none flex flex-col h-full w-60 sm:w-64 max-w-[85vw] select-none">
    <!-- Right Panel Card Container -->
    <UiCard variant="slate" padding="none"
      custom-class="pointer-events-auto h-full flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-xl bg-slate-950/95 border-slate-800/80 rounded-none"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <!-- ================= 1. TOP GLOBAL STATS BAR ================= -->
      <div class="px-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-col gap-2 shrink-0">
        <!-- Main Stats Row -->
        <div class="flex items-center justify-between gap-1.5">
          <!-- Gold -->
          <div class="flex items-center gap-1 font-mono text-xs font-black text-amber-300" :title="$t('common.gold')">
            <Coins class="size-3.5 text-amber-400 shrink-0" />
            <span>{{ playerGold }}</span>
          </div>

          <!-- Lives -->
          <div class="flex items-center gap-1 font-mono text-xs font-black"
            :class="gameStore.playerLives <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-100'"
            :title="$t('common.lives')">
            <Heart class="size-3.5 text-rose-500 fill-rose-500 shrink-0" />
            <span>{{ gameStore.playerLives }}</span>
          </div>

          <!-- Total Kills -->
          <div class="flex items-center gap-1 font-mono text-xs font-bold text-rose-300" :title="$t('game.kills')">
            <Skull class="size-3.5 text-rose-400 shrink-0" />
            <span>{{ gameStore.totalKills }}</span>
          </div>

          <!-- Wave Number (Click to open all waves overview) -->
          <button type="button"
            class="flex items-center gap-1 font-mono text-xs font-bold text-purple-200 hover:text-purple-100 cursor-pointer p-0.5 rounded hover:bg-slate-800 transition-all"
            :title="$t('game.allWaves')" @click="isWaveModalOpen = true">
            <Swords class="size-3.5 text-purple-400 shrink-0" />
            <span>
              {{ waveStore.currentWaveIndex + 1 }}
              <span class="text-slate-500 font-normal">/{{ waveStore.waveConfigs.length || 0 }}</span>
            </span>
          </button>

          <!-- Tactical Menu Trigger -->
          <UiIconButton :icon="Menu" size="xs" variant="ghost" :title="$t('game.menu')" @click="isMenuOpen = true" />
        </div>

        <!-- Multiplayer Players Mini-Leaderboard (If in multiplayer room) -->
        <div v-if="multiplayerStore.roomId"
          class="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-800/60">
          <div v-for="p in multiplayerStore.players" :key="p.id"
            class="px-1.5 py-0.5 rounded-lg flex items-center gap-1 text-[10px] border transition-all"
            :class="p.id === multiplayerStore.myPlayerId ? 'bg-slate-900 border-emerald-500/60 text-white' : 'bg-slate-950/80 border-slate-800/80 text-slate-300'">
            <div class="size-2.5 rounded-full border border-white/40 shrink-0"
              :style="{ backgroundColor: p.color || '#38bdf8' }" />
            <span class="truncate max-w-14 font-semibold">{{ p.name }}</span>
            <span class="font-mono text-amber-300 font-bold flex items-center text-[9px]">
              <Coins class="size-2.5 text-amber-400 inline mr-0.5" />{{ p.gold ?? 0 }}
            </span>
          </div>
        </div>
      </div>


      <!-- ================= 2. DYNAMIC CONTENT AREA (SCROLLABLE) ================= -->
      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 text-xs">

        <!-- ===== CASE A: PLACED TOWER SELECTED ON MAP ===== -->
        <div v-if="towerStore.selectedPlacedTower" class="flex flex-col gap-2.5 animate-in fade-in duration-150">
          <!-- Tower Header -->
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="size-11 rounded-xl bg-slate-900 border border-sky-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                <img v-if="getPlacedTowerSprite(towerStore.selectedPlacedTower)"
                  :src="getPlacedTowerSprite(towerStore.selectedPlacedTower)" :alt="towerStore.selectedPlacedTower.name"
                  class="w-full h-full object-contain filter drop-shadow scale-110" />
                <ShieldAlert v-else class="size-5 text-sky-400" />
              </div>
              <div class="flex flex-col min-w-0 text-left">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-sky-200 truncate text-xs sm:text-sm">{{
                    towerStore.selectedPlacedTower.name }}</span>
                  <UiBadge variant="cyan" size="xs">
                    {{ $t('game.lvl', { level: towerStore.selectedPlacedTower.level }) }}
                  </UiBadge>
                </div>
                <!-- Trait Badges -->
                <div v-if="towerStore.selectedPlacedTower.traits && towerStore.selectedPlacedTower.traits.length > 0"
                  class="flex items-center gap-1 flex-wrap mt-0.5">
                  <span v-for="traitId in towerStore.selectedPlacedTower.traits" :key="traitId"
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5"
                    :class="getTraitDef(traitId).badgeClass">
                    <component :is="getTraitDef(traitId).icon" class="size-2.5" />
                    <span>{{ $t(getTraitDef(traitId).nameKey) }}</span>
                  </span>
                </div>
              </div>
            </div>

            <UiIconButton :icon="X" size="xs" variant="ghost" :title="$t('common.close')"
              @click="towerStore.selectPlacedTower(null)" />
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px] sm:text-[11px] text-slate-300">
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Flame class="size-3 text-rose-400" />{{ $t('common.damage') }}
              </span>
              <span class="font-bold text-white">{{ towerStore.selectedPlacedTower.damage }}</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Zap class="size-3 text-amber-400" />{{ $t('config.attackSpeed') }}
              </span>
              <span class="font-bold text-white">{{ (1 / towerStore.selectedPlacedTower.attackSpeed).toFixed(1)
              }}/s</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Crosshair class="size-3 text-sky-400" />{{ $t('config.attackRange') }}
              </span>
              <span class="font-bold text-white">{{ towerStore.selectedPlacedTower.range }} k</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Skull class="size-3 text-rose-400" />{{ $t('game.kills') }}
              </span>
              <span class="font-bold text-rose-300">{{ towerStore.selectedPlacedTower.killsCount }}</span>
            </div>
          </div>

          <!-- Target Strategy Selector -->
          <div v-if="isOwnerOfSelectedTower" class="flex flex-col gap-1 pt-1">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ $t('game.targetStrategy')
            }}</span>
            <UiTabs :model-value="towerStore.selectedPlacedTower.targetStrategy || 'first'" :items="targetStrategies"
              variant="segmented" size="xs"
              @update:model-value="(val) => towerStore.setTowerTargetStrategy(towerStore.selectedPlacedTower!.id, val as any)" />
          </div>
        </div>


        <!-- ===== CASE B: PLACING A TOWER (BLUEPRINT ACTIVE) ===== -->
        <div v-else-if="activeSelectedBlueprint" class="flex flex-col gap-2.5 animate-in fade-in duration-150">
          <!-- Blueprint Header -->
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="size-11 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                <img v-if="getTowerSpriteUrl(activeSelectedBlueprint)" :src="getTowerSpriteUrl(activeSelectedBlueprint)"
                  :alt="activeSelectedBlueprint.name"
                  class="w-full h-full object-contain filter drop-shadow scale-110" />
                <ShieldAlert v-else class="size-5 text-amber-400" />
              </div>
              <div class="flex flex-col min-w-0 text-left">
                <span class="font-bold text-white truncate text-xs sm:text-sm">{{ activeSelectedBlueprint.name }}</span>
                <span class="font-mono text-xs text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                  <Coins class="size-3 text-amber-400" />{{ $t('game.cost', { amount: activeSelectedBlueprint.cost ?? 100 }) }}
                </span>
              </div>
            </div>

            <UiIconButton :icon="X" size="xs" variant="ghost" :title="$t('game.cancelBuild')" @click="cancelBuild" />
          </div>

          <!-- Blueprint Stats Grid -->
          <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px] sm:text-[11px] text-slate-300">
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Flame class="size-3 text-rose-400" />{{ $t('common.damage') }}
              </span>
              <span class="font-bold text-white">{{ activeSelectedBlueprint.damage }}</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Zap class="size-3 text-amber-400" />{{ $t('config.attackSpeed') }}
              </span>
              <span class="font-bold text-white">{{ (1 / (activeSelectedBlueprint.attackSpeed || 1.0)).toFixed(1) }}/s</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Crosshair class="size-3 text-sky-400" />{{ $t('config.attackRange') }}
              </span>
              <span class="font-bold text-white">{{ activeSelectedBlueprint.range }} k</span>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1">
                <Crosshair class="size-3 text-purple-400" />{{ $t('common.type') }}
              </span>
              <span class="font-bold text-purple-300 uppercase text-[9px] truncate max-w-16">{{
                getProjectileLabel(activeSelectedBlueprint.projectileType) }}</span>
            </div>
          </div>

          <!-- Traits if configured -->
          <div v-if="activeSelectedBlueprint.traits && activeSelectedBlueprint.traits.length > 0"
            class="flex flex-col gap-1">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ $t('traits.title')
            }}</span>
            <div class="flex items-center gap-1 flex-wrap">
              <span v-for="traitId in activeSelectedBlueprint.traits" :key="String(traitId)"
                class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5"
                :class="getTraitDef(traitId as any).badgeClass">
                <component :is="getTraitDef(traitId as any).icon" class="size-2.5" />
                <span>{{ $t(getTraitDef(traitId as any).nameKey) }}</span>
              </span>
            </div>
          </div>
        </div>


        <!-- ===== CASE C: DEFAULT WAVE INFORMATION (NO TOWER SELECTED) ===== -->
        <div v-else class="flex flex-col gap-2.5 animate-in fade-in duration-150">
          <!-- Prominent Enemy Live 3D/Isometric Preview (Standing Idle pose) -->
          <div class="relative w-full overflow-hidden">

            <div
              class="absolute top-1 left-1 z-10 flex items-center gap-1 justify-between bg-slate-900/80 px-1.5 py-0.5 rounded-xl">
              <span class="text-slate-400 flex items-center gap-1">
                <Heart class="size-3 text-rose-500 fill-rose-500/50" /> {{ $t('game.hp') }}:
              </span>
              <span class="font-bold text-rose-300">{{ currentWaveConfig?.unitHp || 0 }}</span>
            </div>

            <!-- Speed (Tezlik) -->
            <div
              class="absolute top-1 right-1 z-10 flex items-center gap-1 justify-between bg-slate-900/80 px-1.5 py-0.5 rounded-xl">
              <span class="text-slate-400 flex items-center gap-1">
                <Footprints class="size-3 text-emerald-400" /> {{ $t('common.speed') }}:
              </span>
              <span class="font-bold text-emerald-300">{{ currentWaveConfig?.unitSpeed ?? 2.5 }}</span>
            </div>



            <!-- Bounty / Gold Reward (Mukofot) -->
            <div
              class="absolute bottom-1 left-1 z-10 flex items-center gap-1 justify-between text-amber-400 bg-slate-900/80 px-1.5 py-0.5 rounded-xl">
              <Coins class="size-3 text-amber-400" /> +{{ currentWaveConfig?.goldReward || 0 }}
            </div>


            <CharacterLivePreview :model-value="(currentWaveConfig?.characterModel as any) || 'male'"
              initial-action="Idle" :unit-variant="currentWaveConfig?.unitVariant || 'normal'"
              :variant-tint="currentWaveConfig?.variantTint" :unit-scale="currentWaveConfig?.unitScale || 1.0"
              :offset-y="currentWaveConfig?.offsetY || 0" :show-model-selector="false" :show-direction-bar="false"
              :show-action-buttons="false" height-class="h-28" />
          </div>

          <!-- Immunities / Resistances -->
          <div class="flex flex-col gap-1 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Shield class="size-3 text-indigo-400" /> {{ $t('game.immunities') }}
            </span>

            <div v-if="currentWaveConfig?.immunities && currentWaveConfig.immunities.length > 0"
              class="flex items-center gap-1 flex-wrap mt-0.5">
              <span v-for="immId in currentWaveConfig.immunities" :key="immId"
                class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5"
                :class="getTraitDef(immId).badgeClass">
                <component :is="getTraitDef(immId).icon" class="size-2.5" />
                <span>{{ $t(getTraitDef(immId).nameKey) }}</span>
              </span>
            </div>

            <div v-else class="text-[10px] text-slate-500 font-medium">
              {{ $t('game.noImmunities') }}
            </div>
          </div>
        </div>

      </div>


      <!-- ================= 3. BOTTOM ACTIONS FOOTER ================= -->
      <div class="p-2.5 bg-slate-900/95 border-t border-slate-800/80 flex flex-col gap-2 shrink-0">

        <!-- ===== BOTTOM ACTIONS FOR PLACED TOWER ===== -->
        <div v-if="towerStore.selectedPlacedTower" class="flex items-center gap-1.5 w-full">
          <!-- Upgrade button -->
          <UiButton v-if="isOwnerOfSelectedTower && nextLevelConfig" variant="game-green" size="sm"
            class="flex-1 font-bold shadow-md shadow-emerald-500/10" :leading-icon="Zap"
            :disabled="playerGold < upgradeCost" @click="upgradeSelectedTower">
            <span>+{{ Math.max(0, nextLevelConfig.damage - towerStore.selectedPlacedTower.damage) }}</span>
            <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1">
              <Coins class="size-3 text-amber-400 inline" />{{ upgradeCost }}
            </span>
          </UiButton>

          <!-- Max level badge -->
          <div v-else-if="isOwnerOfSelectedTower && !nextLevelConfig"
            class="flex-1 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
            <Shield class="size-3 text-amber-400" />
            <span>{{ $t('game.maxLevel') }}</span>
          </div>

          <!-- Sell button -->
          <UiButton v-if="isOwnerOfSelectedTower" variant="danger" size="sm" class="font-bold shrink-0"
            @click="sellSelectedTower">
            <span>{{ $t('common.sell') }}</span>
            <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1">
              <Coins class="size-3 text-amber-400 inline" />{{ sellRefund }}
            </span>
          </UiButton>
        </div>


        <!-- ===== BOTTOM ACTIONS FOR TOWER PLACEMENT (CONFIRM / CANCEL) ===== -->
        <div v-else-if="activeSelectedBlueprint" class="flex flex-col gap-1.5 w-full">
          <!-- When cell is selected on map -->
          <div v-if="towerStore.pendingBuildCell" class="flex items-center gap-1.5 w-full">
            <UiButton variant="danger" size="sm" class="flex-1 font-bold" :leading-icon="X" @click="cancelBuild">
              <span>{{ $t('game.cancelBuild') }}</span>
            </UiButton>

            <UiButton variant="game-green" size="sm" class="flex-1 font-bold shadow-lg shadow-emerald-500/20"
              :leading-icon="Check" :disabled="!isBuildAffordable" @click="confirmPendingBuild">
              <span>{{ $t('game.build') }}</span>

            </UiButton>
          </div>

          <!-- When blueprint is selected but cell not clicked yet -->
          <div v-else class="flex items-center justify-between gap-1.5 w-full">
            <div class="flex items-center gap-1.5 text-amber-300 text-[10px] font-medium animate-pulse">
              <span class="size-1.5 rounded-full bg-amber-400"></span>
              <span>{{ $t('game.tapToPlace') }}</span>
            </div>

            <UiButton variant="secondary" size="xs" :leading-icon="X" @click="cancelBuild">
              {{ $t('common.cancel') }}
            </UiButton>
          </div>
        </div>


        <!-- ===== BOTTOM ACTIONS FOR WAVE / PREPARATION ===== -->
        <div v-else class="flex flex-col gap-2 w-full">
          <!-- Build Prep Mode Countdown / Start button OR Wave Running Status -->
          <div class="flex items-center gap-1.5 w-full">
            <template v-if="gameStore.gameState === 'build_prep' || gameStore.gameState === 'ready'">
              <div v-if="multiplayerStore.roomId"
                class="flex items-center gap-1.5 text-amber-300 font-mono text-xs font-bold shrink-0">
                <span class="size-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>{{ Math.ceil(gameStore.prepCountdown) }}s</span>
              </div>

              <UiButton variant="game-amber" size="sm" class="font-bold flex-1" :leading-icon="Play"
                @click="handleStartWaveNow()">
                <span>{{ $t('game.startWaveNow') }}</span>
              </UiButton>
            </template>

            <!-- Wave Running Status -->
            <template v-else-if="gameStore.gameState === 'wave_running'">
              <div class="flex items-center justify-between w-full text-[11px] text-emerald-300 font-mono">
                <span class="flex items-center gap-1 font-bold">
                  <Swords class="size-3.5 text-emerald-400 animate-pulse" />
                  {{ $t('game.waveRunning') }}
                </span>
                <span class="font-bold text-white">
                  {{ characterStore.aliveEnemiesCount }} {{ $t('game.enemiesLeft') }}
                </span>
              </div>
            </template>

            <!-- Wave Completed / Next prep -->
            <template v-else>
              <div class="text-[11px] text-slate-400 font-medium text-center w-full">
                {{ $t('game.waitingNextWave') }}
              </div>
            </template>
          </div>

          <!-- Speed Multiplier Controls (1x, 2x, 3x, 5x) -->
          <div class="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/80">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap class="size-3 text-amber-400" />
              <span>{{ $t('common.speed') || 'Tezlik' }}</span>
            </span>
            <div class="flex items-center gap-1">
              <button v-for="s in [1, 2, 3, 5]" :key="s" type="button" :class="[
                'px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border',
                gameStore.gameSpeed === s
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-sm font-black'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              ]" @click="gameStore.setGameSpeed(s)">
                {{ s }}x
              </button>
            </div>
          </div>
        </div>

      </div>
    </UiCard>

    <!-- ================= 4. ALL WAVES OVERVIEW MODAL ================= -->
    <WavesOverviewModal v-model:is-open="isWaveModalOpen" />

    <!-- ================= 5. IN-GAME TACTICAL MENU MODAL ================= -->
    <InGameMenuModal v-model:is-open="isMenuOpen" :is-editor-mode="isEditorMode" :is-fullscreen-mode="isFullscreenMode"
      @restart="handleRestartGame" @exit="handleExitFromMenu" @toggle-fullscreen="handleToggleFullscreen" />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Heart, Swords, Skull, Maximize2, Minimize2, Menu, Play, RotateCcw,
  Layers, Home, Coins, Languages, Zap, Crosshair, Flame, Shield, ShieldAlert,
  X, Check, Users, Footprints, Crown, List
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiCard, UiBadge, UiTabs, UiLanguageSwitcher, UiModal } from '../ui'
import CharacterLivePreview from './CharacterLivePreview.vue'
import WavesOverviewModal from './WavesOverviewModal.vue'
import InGameMenuModal from './InGameMenuModal.vue'
import { useMapStore } from '../../stores/mapStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useGameStore } from '../../stores/gameStore'
import { useWaveStore } from '../../stores/waveStore'
import { useTowerStore, TowerBlueprint, PlacedTower } from '../../stores/towerStore'
import { useToolStore } from '../../stores/toolStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18nStore } from '../../stores/i18nStore'
import { sanitizeMapId } from '../../services/mapManager'
import { assetManager } from '../../services/assetManager'
import { getTraitDef } from '../../utils/towerTraits'
import { toggleAppFullscreen, isAppFullscreen } from '../../utils/fullscreen'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const gameStore = useGameStore()
const waveStore = useWaveStore()
const towerStore = useTowerStore()
const toolStore = useToolStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18nStore()

const isFullscreenMode = ref(false)
const isMenuOpen = ref(false)
const isWaveModalOpen = ref(false)
const isUpgrading = ref(false)

// Current Wave config
const currentWaveConfig = computed(() => waveStore.currentWaveConfig)

// Active currently selected blueprint for placement
const activeSelectedBlueprint = computed<TowerBlueprint | null>(() => {
  if (!towerStore.activeBuildTowerId) return null
  return towerStore.blueprints.find(b => b.id === towerStore.activeBuildTowerId) || null
})

const targetStrategies = computed(() => [
  { id: 'first', label: t('game.targetFirst') },
  { id: 'strongest', label: t('game.targetStrongest') },
  { id: 'weakest', label: t('game.targetWeakest') },
  { id: 'closest', label: t('game.targetClosest') },
  { id: 'last', label: t('game.targetLast') },
])

const playerGold = computed(() => {
  if (multiplayerStore.roomId) {
    const myPl = multiplayerStore.players.find((p: any) => p.id === multiplayerStore.myPlayerId)
    return myPl?.gold ?? 0
  }
  return gameStore.gold
})

const isBuildAffordable = computed(() => {
  if (!activeSelectedBlueprint.value) return false
  return playerGold.value >= (activeSelectedBlueprint.value.cost ?? 100)
})

function getProjectileLabel(type?: string): string {
  switch (type) {
    case 'arrow': return t('config.projectileArrow')
    case 'fireball': return t('config.projectileFireball')
    case 'lightning': return t('config.projectileLightning')
    case 'frost': return t('config.projectileFrost')
    case 'boulder': return t('config.projectileBoulder')
    default: return type || t('common.default')
  }
}

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

function getPlacedTowerSprite(placedTower: PlacedTower): string {
  const bp = towerStore.blueprints.find(b => b.id === placedTower.blueprintId)
  if (bp) return getTowerSpriteUrl(bp)
  return ''
}

function getWaveEnemySprite(model?: string): string {
  const m = (model || 'male').toLowerCase()
  return assetManager.getCharacterPreviewDataUrl(m, 2, 'Idle', 0)
    || assetManager.getCharacterPreviewDataUrl(m, 2, 'Run', 0)
    || assetManager.getCharacterPreviewDataUrl('male', 2, 'Idle', 0)
}

function cancelBuild() {
  towerStore.cancelBuild()
}

function confirmPendingBuild() {
  if (!activeSelectedBlueprint.value || !towerStore.pendingBuildCell) return

  if (!isBuildAffordable.value) {
    notify.gold(
      t('game.needGoldForTower', { cost: activeSelectedBlueprint.value.cost ?? 100, current: playerGold.value }),
      t('game.notEnoughGold')
    )
    return
  }

  const { col, row } = towerStore.pendingBuildCell
  const placed = towerStore.placeTowerAt(col, row)
  if (placed) {
    towerStore.setPendingBuildCell(null)
    toolStore.setHoveredCell(null)
    towerStore.selectBuildTower(null)
    towerStore.selectPlacedTower(null)
  }
}

const isOwnerOfSelectedTower = computed(() => {
  if (!multiplayerStore.roomId) return true
  const tower = towerStore.selectedPlacedTower
  if (!tower || !tower.builderId) return true
  return tower.builderId === multiplayerStore.myPlayerId
})

const nextLevelConfig = computed(() => {
  const tower = towerStore.selectedPlacedTower
  if (!tower) return null
  return towerStore.getNextLevelConfig(tower)
})

const upgradeCost = computed(() => {
  return nextLevelConfig.value ? (nextLevelConfig.value.cost || 0) : 0
})

const sellRefund = computed(() => {
  const tower = towerStore.selectedPlacedTower
  if (!tower) return 50
  const bp = towerStore.blueprints.find(b => b.id === tower.blueprintId)
  const baseCost = bp ? (bp.cost ?? 100) : 100
  let investedUpgrades = 0
  if (bp && bp.levels && tower.level > 1) {
    for (let i = 1; i < Math.min(tower.level, bp.levels.length); i++) {
      investedUpgrades += bp.levels[i].cost || 0
    }
  }
  return Math.round((baseCost + investedUpgrades) * 0.7)
})

function upgradeSelectedTower() {
  const tower = towerStore.selectedPlacedTower
  if (!tower || isUpgrading.value) return

  let currentGold = gameStore.gold
  if (multiplayerStore.roomId) {
    const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
    if (myPl) currentGold = myPl.gold ?? 0
  }

  if (currentGold < upgradeCost.value) {
    notify.gold(t('game.upgradeNeedGold', { cost: upgradeCost.value, current: currentGold }), t('game.cannotAfford'))
    return
  }

  isUpgrading.value = true
  towerStore.upgradePlacedTower(tower.id)
  notify.success(t('game.towerUpgraded', { level: tower.level + 1 }), t('game.towerUpgradedTitle'))

  setTimeout(() => {
    isUpgrading.value = false
  }, 350)
}

function sellSelectedTower() {
  const tower = towerStore.selectedPlacedTower
  if (!tower) return
  const refund = sellRefund.value
  towerStore.sellPlacedTower(tower.id)
  notify.info(t('game.towerSold', { gold: refund }), t('game.towerSoldTitle'))
}

function checkFullscreenState() {
  isFullscreenMode.value = isAppFullscreen()
}

onMounted(() => {
  checkFullscreenState()
  document.addEventListener('fullscreenchange', checkFullscreenState)
  document.addEventListener('webkitfullscreenchange', checkFullscreenState)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', checkFullscreenState)
  document.removeEventListener('webkitfullscreenchange', checkFullscreenState)
})

async function handleToggleFullscreen() {
  const active = await toggleAppFullscreen()
  isFullscreenMode.value = active
}

function handleStartWaveNow() {
  if (multiplayerStore.roomId && !multiplayerStore.isHost) return
  characterStore.spawnAtRoute(0)
  gameStore.startNextWaveInGame()
  characterStore.startTour()
}

function handleRestartGame() {
  towerStore.initGameClanSelection()
  isMenuOpen.value = false
  characterStore.resetTour()
  gameStore.restartGame()
}

function handleExitFromMenu() {
  isMenuOpen.value = false
  handleExitGame()
}

const isEditorMode = computed(() => gameStore.entrySource === 'editor' || route.name === 'editor-game')

async function handleExitGame() {
  const isEditor = isEditorMode.value
  const isMulti = !!multiplayerStore.roomId

  const title = isMulti ? t('lobby.confirmLeaveTitle') : (isEditor ? t('game.returnEditor') : t('game.returnHome'))
  const message = isMulti
    ? t('game.exitRoomConfirm')
    : (isEditor ? t('game.confirmExitEditor') : t('game.confirmExitHome'))

  const confirmed = await notify.confirm({
    title,
    message,
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    variant: 'danger',
  })

  if (confirmed) {
    characterStore.resetTour()
    gameStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else if (isEditor) {
      const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || (route.params.mapId as string) || 'julion')
      router.push(`/editor/${cleanId}`)
    } else {
      router.push('/')
    }
  }
}
</script>
