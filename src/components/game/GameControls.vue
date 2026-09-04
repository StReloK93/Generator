<template>
  <div class="pointer-events-none z-30 flex flex-col items-center gap-1.5 w-full max-w-4xl mx-auto px-2 pb-2 landscape:pb-1 select-none">
    
    <!-- ================= 1. SELECTED PLACED TOWER UPGRADE/SELL MODAL (ON MAP TAP) ================= -->
    <UiCard 
      v-if="towerStore.selectedPlacedTower"
      variant="slate"
      padding="sm"
      custom-class="border-sky-500/60 shadow-2xl backdrop-blur-xl bg-slate-950/95 pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-200 w-full max-w-lg animate-in slide-in-from-bottom-2 duration-150"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      <div class="flex items-center gap-3 min-w-0">
        <!-- Placed Tower Sprite Icon (Enlarged) -->
        <div class="w-12 h-12 rounded-2xl bg-slate-900 border border-sky-400/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          <img 
            v-if="getPlacedTowerSprite(towerStore.selectedPlacedTower)" 
            :src="getPlacedTowerSprite(towerStore.selectedPlacedTower)" 
            :alt="towerStore.selectedPlacedTower.name" 
            class="w-full h-full object-contain filter drop-shadow scale-110"
          />
          <ShieldAlert v-else class="w-6 h-6 text-sky-400" />
        </div>

        <div class="flex flex-col min-w-0 text-left">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-sky-300 truncate text-xs sm:text-sm">{{ towerStore.selectedPlacedTower.name }}</span>
            <UiBadge variant="cyan" size="xs">
              Lvl {{ towerStore.selectedPlacedTower.level }}
            </UiBadge>
          </div>
          <div class="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono mt-0.5">
            <span class="flex items-center gap-1"><Flame class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.damage }} DMG</span>
            <span class="flex items-center gap-1"><Crosshair class="w-3 h-3 text-sky-400" /> {{ towerStore.selectedPlacedTower.range }}k</span>
            <span class="flex items-center gap-1"><Skull class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.killsCount }}</span>
          </div>
        </div>
      </div>

      <!-- Actions: Upgrade, Sell, Close -->
      <div class="flex items-center gap-1.5 shrink-0">
        <UiButton 
          v-if="isOwnerOfSelectedTower"
          variant="game-green"
          size="sm"
          :leading-icon="Zap"
          :disabled="characterStore.gold < upgradeCost"
          @click="upgradeSelectedTower"
        >
          <span>+{{ Math.round(towerStore.selectedPlacedTower.damage * 0.3) }}</span>
          <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1"><Coins class="w-3 h-3 text-amber-400 inline" />{{ upgradeCost }}</span>
        </UiButton>

        <UiButton 
          v-if="isOwnerOfSelectedTower"
          variant="danger"
          size="sm"
          @click="sellSelectedTower"
        >
          <span>Sell</span>
          <span class="font-mono text-amber-300 flex items-center gap-0.5 ml-1"><Coins class="w-3 h-3 text-amber-400 inline" />{{ sellRefund }}</span>
        </UiButton>

        <UiIconButton 
          :icon="X"
          size="sm"
          variant="ghost"
          @click="towerStore.selectPlacedTower(null)"
        />
      </div>
    </UiCard>


    <!-- ================= 2. ACTIVE SELECTED BUILDING INFO POPUP (COMPACT RIGHT SIDE) ================= -->
    <UiCard 
      v-if="activeSelectedBlueprint"
      variant="default"
      padding="sm"
      custom-class="fixed right-3 sm:right-6 bottom-20 z-40 border-2 border-amber-500/60 shadow-2xl backdrop-blur-xl bg-slate-950/95 pointer-events-auto flex flex-col gap-2.5 text-xs text-slate-200 w-68 sm:w-76 animate-in slide-in-from-right-3 duration-200"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2.5">
          <!-- Large Tower Sprite in Info Card -->
          <div class="w-13 h-13 rounded-2xl bg-slate-900 border-2 border-amber-400/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
            <img 
              v-if="getTowerSpriteUrl(activeSelectedBlueprint)" 
              :src="getTowerSpriteUrl(activeSelectedBlueprint)" 
              :alt="activeSelectedBlueprint.name" 
              class="w-full h-full object-contain filter drop-shadow scale-110"
            />
            <ShieldAlert v-else class="w-6 h-6 text-amber-400" />
          </div>
          <div class="flex flex-col text-left">
            <span class="font-black text-white text-sm leading-tight">{{ activeSelectedBlueprint.name }}</span>
            <span class="font-mono text-xs text-amber-300 font-bold flex items-center gap-1 mt-0.5">
              <Coins class="w-3 h-3 text-amber-400" />{{ activeSelectedBlueprint.cost }} gold
            </span>
          </div>
        </div>

        <UiIconButton 
          :icon="X"
          size="sm"
          variant="ghost"
          title="Cancel"
          @click="towerStore.selectBuildTower(null)"
        />
      </div>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Flame class="w-3.5 h-3.5 text-rose-400" />DMG:</span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.damage }}</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Zap class="w-3.5 h-3.5 text-amber-400" />Speed:</span>
          <span class="font-bold text-white">{{ (1 / activeSelectedBlueprint.attackSpeed).toFixed(1) }}/s</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Crosshair class="w-3.5 h-3.5 text-sky-400" />Range:</span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.range }} cells</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">🎯 Type:</span>
          <span class="font-bold text-purple-300 uppercase text-[10px] truncate max-w-[60px]">{{ activeSelectedBlueprint.projectileType }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 text-[11px] text-amber-300 bg-amber-500/15 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
        <span class="font-bold">Click any cell on the map</span>
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
      </div>
    </UiCard>


    <!-- ================= 3. BOTTOM COMPACT TOWER DOCK & CIRCULAR TIMER ================= -->
    <UiCard 
      variant="slate"
      padding="none"
      custom-class="px-2.5 py-1.5 sm:px-3.5 sm:py-2 landscape:py-1 rounded-2xl sm:rounded-3xl border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/90 pointer-events-auto flex items-center justify-between gap-2 sm:gap-3.5 w-full max-w-2xl landscape:max-w-xl opacity-95 hover:opacity-100"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      
      <!-- Tower Shop Buttons Row (Prominent Tower Images) -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button 
          v-for="bp in towerStore.blueprints" 
          :key="bp.id"
          @click="selectTowerToBuild(bp)"
          :class="[
            towerStore.activeBuildTowerId === bp.id 
              ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/20 scale-102' 
              : 'bg-slate-900/90 border-slate-800 hover:bg-slate-850 hover:border-slate-700',
            characterStore.gold < bp.cost ? 'opacity-40' : 'opacity-100'
          ]"
          class="p-1 sm:p-1.5 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 touch-target"
          :title="`${bp.name} — ${bp.cost} gold`"
        >
          <!-- Prominent Enlarged Tower Sprite Image -->
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-slate-800/90 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            <img 
              v-if="getTowerSpriteUrl(bp)" 
              :src="getTowerSpriteUrl(bp)" 
              :alt="bp.name" 
              class="w-full h-full object-contain filter drop-shadow scale-110"
            />
            <ShieldAlert v-else class="w-5 h-5 text-amber-400" />
          </div>

          <div class="flex flex-col text-left leading-tight gap-0.5 pr-1">
            <span class="font-bold text-[11px] sm:text-xs text-white truncate max-w-[75px] sm:max-w-[95px]">{{ bp.name }}</span>
            <span class="font-mono text-[10px] sm:text-[11px] text-amber-300 font-bold flex items-center gap-0.5">
              <Coins class="w-3 h-3 text-amber-400 inline" />{{ bp.cost }}
            </span>
          </div>
        </button>
      </div>

      <!-- Right Side: Circular Timer / Combat Indicator / Test Speed Controls -->
      <div class="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800/80">
        
        <!-- Speed Multiplier (ONLY in Preview / Test Mode) -->
        <div v-if="props.isPreview" class="flex items-center gap-0.5 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            v-for="spd in [1, 2, 5, 10, 20, 50]"
            :key="spd"
            @click="characterStore.setGameSpeed(spd)"
            :class="characterStore.gameSpeed === spd ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'"
            class="px-1 py-0.5 rounded-lg text-[9px] font-mono transition-all cursor-pointer active:scale-95"
          >
            {{ spd }}x
          </button>
        </div>

        <!-- 1. CIRCULAR PREP TIMER (Countdown in prep phase) -->
        <div 
          v-if="characterStore.gameState === 'build_prep' || characterStore.gameState === 'ready'"
          class="flex items-center gap-1.5"
        >
          <!-- Circular Countdown Badge -->
          <div 
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/15 border-2 border-amber-400/80 text-amber-300 flex items-center justify-center font-mono font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
            title="Build time remaining"
          >
            {{ Math.ceil(characterStore.prepCountdown) }}s
          </div>

          <!-- Quick Start Wave Button -->
          <UiButton 
            variant="game-amber"
            size="sm"
            :leading-icon="Play"
            title="Start wave immediately"
            @click="characterStore.startNextWaveInGame()"
          >
            <span class="hidden sm:inline">Start</span>
          </UiButton>
        </div>

        <!-- 2. CIRCULAR GREEN COMBAT INDICATOR (During active wave combat) -->
        <div 
          v-else-if="characterStore.gameState === 'wave_running'"
          class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          title="Combat in progress"
        >
          <!-- Glowing Green Pulse Dot & Icon -->
          <div class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse">
            <Swords class="w-3.5 h-3.5" />
          </div>
          <span class="text-[10px] font-mono font-bold text-emerald-300">Combat</span>
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
  UiBadge 
} from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore, TowerBlueprint, PlacedTower } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'

const props = defineProps<{
  isPreview?: boolean
}>()

const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

// Active currently selected blueprint for placement
const activeSelectedBlueprint = computed<TowerBlueprint | null>(() => {
  if (!towerStore.activeBuildTowerId) return null
  return towerStore.blueprints.find(b => b.id === towerStore.activeBuildTowerId) || null
})

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
  if (characterStore.gold < bp.cost) {
    alert(`Not enough gold! This tower costs ${bp.cost} gold. You have: ${characterStore.gold} gold.`)
    return
  }
  if (towerStore.activeBuildTowerId === bp.id) {
    towerStore.selectBuildTower(null)
  } else {
    towerStore.selectBuildTower(bp.id)
  }
}

const isOwnerOfSelectedTower = computed(() => {
  if (!multiplayerStore.roomId) return true
  const t = towerStore.selectedPlacedTower
  if (!t || !t.builderId) return true
  return t.builderId === multiplayerStore.myPlayerId
})

const upgradeCost = computed(() => {
  const t = towerStore.selectedPlacedTower
  if (!t) return 50
  const bp = towerStore.blueprints.find(b => b.id === t.blueprintId)
  const baseCost = bp ? bp.cost : 100
  return Math.round(baseCost * 0.6 * t.level)
})

const sellRefund = computed(() => {
  const t = towerStore.selectedPlacedTower
  if (!t) return 50
  const bp = towerStore.blueprints.find(b => b.id === t.blueprintId)
  const baseCost = bp ? bp.cost : 100
  return Math.round(baseCost * 0.7 * (1 + (t.level - 1) * 0.5))
})

const isUpgrading = ref(false)

function upgradeSelectedTower() {
  const t = towerStore.selectedPlacedTower
  if (!t || isUpgrading.value) return

  let currentGold = characterStore.gold
  if (multiplayerStore.roomId) {
    const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
    if (myPl) currentGold = myPl.gold ?? 0
  }

  if (currentGold < upgradeCost.value) {
    alert("Not enough gold to upgrade!")
    return
  }

  isUpgrading.value = true
  towerStore.upgradePlacedTower(t.id)

  setTimeout(() => {
    isUpgrading.value = false
  }, 350)
}

function sellSelectedTower() {
  const t = towerStore.selectedPlacedTower
  if (!t) return
  towerStore.sellPlacedTower(t.id)
}
</script>
