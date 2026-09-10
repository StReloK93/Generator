<template>
  <div
    class="pointer-events-none z-30 flex items-center justify-between w-full px-2  landscape:pb-1 select-none">

    <!-- ================= 1. SELECTED PLACED TOWER UPGRADE/SELL MODAL (ON MAP TAP) ================= -->
    <UiCard v-if="towerStore.selectedPlacedTower" variant="slate" padding="sm"
      custom-class="absolute! right-4 -top-[calc(100%+2.5rem)] border-sky-500/60 shadow-2xl backdrop-blur-xl bg-slate-950/95 pointer-events-auto flex flex-col gap-2 text-xs text-slate-200 w-full max-w-lg animate-in slide-in-from-bottom-2 duration-150"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 w-full">
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-12 h-12 rounded-2xl bg-slate-900 border border-sky-400/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            <img v-if="getPlacedTowerSprite(towerStore.selectedPlacedTower)"
              :src="getPlacedTowerSprite(towerStore.selectedPlacedTower)" :alt="towerStore.selectedPlacedTower.name"
              class="w-full h-full object-contain filter drop-shadow scale-110" />
            <ShieldAlert v-else class="w-6 h-6 text-sky-400" />
          </div>

          <div class="flex flex-col min-w-0 text-left">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-sky-300 truncate text-xs sm:text-sm">{{ towerStore.selectedPlacedTower.name }}</span>
              <UiBadge variant="cyan" size="xs">
                {{ $t('game.lvl', { level: towerStore.selectedPlacedTower.level }) }}
              </UiBadge>
              <div v-if="towerStore.selectedPlacedTower.traits && towerStore.selectedPlacedTower.traits.length > 0" class="flex items-center gap-1">
                <span 
                  v-for="traitId in towerStore.selectedPlacedTower.traits" 
                  :key="traitId"
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-0.5"
                  :class="getTraitDef(traitId).badgeClass"
                >
                  <component :is="getTraitDef(traitId).icon" class="w-2.5 h-2.5" />
                  <span>{{ $t(getTraitDef(traitId).nameKey) }}</span>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono mt-0.5">
              <span class="flex items-center gap-1">
                <Flame class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.damage }} {{ $t('game.dmg') }}
              </span>
              <span class="flex items-center gap-1">
                <Crosshair class="w-3 h-3 text-sky-400" /> {{ towerStore.selectedPlacedTower.range }} {{ $t('common.cells') }}
              </span>
              <span class="flex items-center gap-1">
                <Skull class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.killsCount }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <UiButton v-if="isOwnerOfSelectedTower" variant="game-green" size="sm" :leading-icon="Zap"
            :disabled="characterStore.gold < upgradeCost" @click="upgradeSelectedTower">
            <span>+{{ Math.round(towerStore.selectedPlacedTower.damage * 0.3) }}</span>
            <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1">
              <Coins class="w-3 h-3 text-amber-400 inline" />{{ upgradeCost }}
            </span>
          </UiButton>

          <UiButton v-if="isOwnerOfSelectedTower" variant="danger" size="sm" @click="sellSelectedTower">
            <span>{{ $t('common.sell') }}</span>
            <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1">
              <Coins class="w-3 h-3 text-amber-400 inline" />{{ sellRefund }}
            </span>
          </UiButton>

          <UiIconButton :icon="X" size="sm" variant="ghost" @click="towerStore.selectPlacedTower(null)" />
        </div>
      </div>

      <!-- Target Priority Bar -->
      <div v-if="isOwnerOfSelectedTower" class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 w-full text-[11px]">
        <span class="text-slate-400 font-semibold shrink-0">{{ $t('game.targetStrategy') }}:</span>
        <UiTabs 
          :model-value="towerStore.selectedPlacedTower.targetStrategy || 'first'"
          :items="targetStrategies"
          variant="segmented"
          size="xs"
          @update:model-value="(val) => towerStore.setTowerTargetStrategy(towerStore.selectedPlacedTower!.id, val as any)"
        />
      </div>
    </UiCard>



    <!-- Mazgi -->
    <!-- ================= 2. ACTIVE SELECTED BUILDING INFO POPUP (COMPACT RIGHT SIDE) ================= -->
    <UiCard v-if="activeSelectedBlueprint" variant="default" padding="sm"
      custom-class="fixed right-3 bottom-20 z-40  pointer-events-auto flex flex-col gap-2.5  w-64 animate-in slide-in-from-right-3 duration-200"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>

      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        
        <div class="flex  gap-2.5">
          <div
            class="w-13 h-13 rounded-xl bg-slate-900  p-3 flex items-center justify-center ">
            <img v-if="getTowerSpriteUrl(activeSelectedBlueprint)" :src="getTowerSpriteUrl(activeSelectedBlueprint)"
              :alt="activeSelectedBlueprint.name" class="w-full h-full object-contain filter drop-shadow scale-110" />
            <ShieldAlert v-else class="w-6 h-6 text-amber-400" />
          </div>
          <div class="flex flex-col text-left">
            <span class="font-black text-white text-sm leading-tight">{{ activeSelectedBlueprint.name }}</span>
            <span class="font-mono text-xs text-amber-300 font-bold flex items-center gap-1 mt-0.5">
              <Coins class="w-3 h-3 text-amber-400" />{{ $t('game.cost', { amount: activeSelectedBlueprint.cost }) }}
            </span>
          </div>
        </div>

      </div>

      <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">
            <Flame class="w-3.5 h-3.5 text-rose-400" />{{ $t('config.damage') }}:
          </span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.damage }}</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">
            <Zap class="w-3.5 h-3.5 text-amber-400" />{{ $t('config.attackSpeed') }}:
          </span>
          <span class="font-bold text-white">{{ (1 / activeSelectedBlueprint.attackSpeed).toFixed(1) }}/s</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">
            <Crosshair class="w-3.5 h-3.5 text-sky-400" />{{ $t('config.attackRange') }}:
          </span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.range }} {{ $t('common.cells') }}</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">
            <Crosshair class="w-3.5 h-3.5 text-purple-400" />{{ $t('common.type') }}:
          </span>
          <span class="font-bold text-purple-300 uppercase text-[10px] truncate max-w-15">{{
            getProjectileLabel(activeSelectedBlueprint.projectileType) }}</span>
        </div>
      </div>

      <!-- <div
        class="flex items-center justify-between pt-1 text-[11px] text-amber-300 bg-amber-500/15 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
        <span class="font-bold">Click any cell on the map</span>
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
      </div> -->
    </UiCard>



    <!-- Tower Shop Buttons Row (Prominent Tower Images & Faction Indicator) -->
    <div class="flex items-center gap-2 pointer-events-auto" @mousedown.stop @mouseup.stop @click.stop @touchstart.stop
      @touchend.stop @touchmove.stop>
      
      <!-- Faction Emblem Button (If 2+ clans exist, click to open/switch Clan modal) -->
      <button 
        v-if="towerStore.clans.length > 1 && towerStore.selectedClan"
        type="button"
        @click="towerStore.openClanSelectModal()"
        :class="[
          'rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 touch-target shadow-md px-2.5 py-1 gap-1.5',
          'bg-slate-900/90 border-amber-400/80 hover:bg-slate-800'
        ]"
        :title="`${$t('clans.activeClan')}: ${towerStore.selectedClan.name}`"
      >
        <component 
          :is="getClanIcon(towerStore.selectedClan.iconName)" 
          class="w-4 h-4"
          :style="{ color: towerStore.selectedClan.color || '#38bdf8' }"
        />
        <span class="text-xs font-bold text-amber-300 hidden sm:inline">{{ towerStore.selectedClan.name }}</span>
      </button>

      <!-- Tower Buttons of the Selected Faction -->
      <button v-for="bp in towerStore.playerClanBlueprints" :key="bp.id" @click="selectTowerToBuild(bp)" :class="[
        towerStore.activeBuildTowerId === bp.id
          ? 'bg-amber-500/30 border-amber-400'
          : 'bg-slate-900/70 border-slate-400'
      ]"
        class="rounded-2xl border-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 touch-target"
        :title="`${bp.name} — ${$t('game.cost', { amount: bp.cost })}`">
        <div
          class="w-10 h-10 sm:w-11 sm:h-11 p-2">
          <img v-if="getTowerSpriteUrl(bp)" :src="getTowerSpriteUrl(bp)" :alt="bp.name"
            class="w-full h-full object-contain filter drop-shadow scale-110" />
          <ShieldAlert v-else class="w-5 h-5 text-amber-400" />
        </div>
      </button>

      <div v-if="towerStore.playerClanBlueprints.length === 0" class="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
        {{ $t('config.noTowers') }}
      </div>
    </div>

    
    <!-- ================= 3. BOTTOM COMPACT TOWER DOCK & CIRCULAR TIMER ================= -->
    <UiCard variant="slate" padding="none" custom-class="pointer-events-auto" @mousedown.stop @mouseup.stop @click.stop @touchstart.stop
      @touchend.stop @touchmove.stop>



      <!-- Right Side: Circular Timer / Combat Indicator / Test Speed Controls -->
      <div class="flex items-center gap-1.5 shrink-0 pl-0.5 border-l border-slate-800/80">

        <!-- Speed Multiplier (ONLY in Preview / Test Mode) -->
        <div v-if="!multiplayerStore.roomId" class="shrink-0">
          <UiTabs
            :model-value="characterStore.gameSpeed"
            :items="speedTabs"
            size="xs"
            variant="amber"
            @update:model-value="characterStore.setGameSpeed(Number($event))"
          />
        </div>

        <!-- 1. PREP PHASE: CIRCULAR TIMER (Multiplayer only) & START BUTTON -->
        <div v-if="characterStore.gameState === 'build_prep' || characterStore.gameState === 'ready'"
          class="flex items-center gap-1.5">
          <!-- Circular Countdown Badge (ONLY in Real Multiplayer Online Game) -->
          <div v-if="multiplayerStore.roomId"
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/15 border-2 border-amber-400/80 text-amber-300 flex items-center justify-center font-mono font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
            :title="$t('game.buildTimeRemaining')">
            {{ Math.ceil(characterStore.prepCountdown) }}s
          </div>

          <!-- Start Wave Button (Manual trigger in test mode) -->
          <UiButton variant="game-amber" size="sm" :leading-icon="Play"
            :title="multiplayerStore.roomId ? $t('game.startWaveNow') : $t('common.start')"
            @click="characterStore.startNextWaveInGame()">
            <span>{{ $t('common.start') }}</span>
          </UiButton>
        </div>
        <div v-else-if="characterStore.gameState === 'wave_running'"
          class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse">
          <Swords class="w-3.5 h-3.5" />
        </div>
      </div>

    </UiCard>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Zap, X, Swords, Play, Coins, Flame, Crosshair, Skull, ShieldAlert } from 'lucide-vue-next'
import {
  UiButton,
  UiIconButton,
  UiCard,
  UiBadge,
  UiTabs
} from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore, TowerBlueprint, PlacedTower } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { TOWER_TRAITS, getTraitDef } from '../../utils/towerTraits'
import { getClanIcon } from '../../utils/towerClans'

const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

const targetStrategies = computed(() => [
  { id: 'first', label: t('game.targetFirst') },
  { id: 'strongest', label: t('game.targetStrongest') },
  { id: 'weakest', label: t('game.targetWeakest') },
  { id: 'closest', label: t('game.targetClosest') },
  { id: 'last', label: t('game.targetLast') },
])

const speedTabs = [
  { id: 1, label: '1x' },
  { id: 2, label: '2x' },
  { id: 5, label: '5x' },
  { id: 10, label: '10x' },
  { id: 20, label: '20x' },
  { id: 50, label: '50x' }
]

// Active currently selected blueprint for placement
const activeSelectedBlueprint = computed<TowerBlueprint | null>(() => {
  if (!towerStore.activeBuildTowerId) return null
  return towerStore.blueprints.find(b => b.id === towerStore.activeBuildTowerId) || null
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

// Helper to reliably find tower sprite images
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

function selectTowerToBuild(bp: TowerBlueprint) {
  if (towerStore.activeBuildTowerId === bp.id) {
    towerStore.selectBuildTower(null)
  } else {
    towerStore.selectPlacedTower(null)
    towerStore.selectBuildTower(bp.id)
  }
}

const isOwnerOfSelectedTower = computed(() => {
  if (!multiplayerStore.roomId) return true
  const tower = towerStore.selectedPlacedTower
  if (!tower || !tower.builderId) return true
  return tower.builderId === multiplayerStore.myPlayerId
})

const upgradeCost = computed(() => {
  const tower = towerStore.selectedPlacedTower
  if (!tower) return 50
  const bp = towerStore.blueprints.find(b => b.id === tower.blueprintId)
  const baseCost = bp ? bp.cost : 100
  return Math.round(baseCost * 0.6 * tower.level)
})

const sellRefund = computed(() => {
  const tower = towerStore.selectedPlacedTower
  if (!tower) return 50
  const bp = towerStore.blueprints.find(b => b.id === tower.blueprintId)
  const baseCost = bp ? bp.cost : 100
  return Math.round(baseCost * 0.7 * (1 + (tower.level - 1) * 0.5))
})

const isUpgrading = ref(false)

function upgradeSelectedTower() {
  const tower = towerStore.selectedPlacedTower
  if (!tower || isUpgrading.value) return

  let currentGold = characterStore.gold
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
</script>
