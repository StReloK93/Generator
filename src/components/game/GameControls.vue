<template>
  <div class="pointer-events-none z-30 flex flex-col items-center gap-1.5 w-full max-w-4xl mx-auto px-2 pb-2 landscape:pb-1 select-none">
    
    <!-- ================= 1. SELECTED PLACED TOWER UPGRADE/SELL MODAL (ON MAP TAP) ================= -->
    <div 
      v-if="towerStore.selectedPlacedTower"
      class="glass-panel p-2 sm:p-2.5 landscape:p-1.5 rounded-2xl border border-sky-500/50 shadow-2xl backdrop-blur-xl bg-slate-950/90 pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-200 w-full max-w-lg animate-in slide-in-from-bottom-2 duration-150 opacity-95"
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
            <span class="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
              Lvl {{ towerStore.selectedPlacedTower.level }}
            </span>
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
        <button 
          v-if="isOwnerOfSelectedTower"
          @click="upgradeSelectedTower"
          :disabled="characterStore.gold < upgradeCost"
          class="px-2.5 sm:px-3.5 py-1.5 landscape:py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:pointer-events-none active:scale-95 flex items-center gap-1 touch-target text-[11px]"
        >
          <Zap class="w-3.5 h-3.5 text-amber-300" />
          <span>+{{ Math.round(towerStore.selectedPlacedTower.damage * 0.3) }}</span>
          <span class="font-mono text-amber-300 flex items-center gap-0.5"><Coins class="w-3 h-3 text-amber-400 inline" />{{ upgradeCost }}</span>
        </button>

        <button 
          v-if="isOwnerOfSelectedTower"
          @click="sellSelectedTower"
          class="px-2 py-1.5 landscape:py-1 rounded-xl bg-slate-900 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 font-semibold transition-all cursor-pointer border border-rose-500/30 active:scale-95 flex items-center gap-0.5 touch-target text-[11px]"
        >
          <span>Sotish</span>
          <span class="font-mono text-amber-300 flex items-center gap-0.5"><Coins class="w-3 h-3 text-amber-400 inline" />{{ sellRefund }}</span>
        </button>

        <button 
          @click="towerStore.selectPlacedTower(null)"
          class="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>


    <!-- ================= 2. ACTIVE SELECTED BUILDING INFO POPUP (COMPACT RIGHT SIDE) ================= -->
    <div 
      v-if="activeSelectedBlueprint"
      class="fixed right-3 sm:right-6 bottom-20 z-40 glass-panel p-3 rounded-2xl border-2 border-amber-500/60 shadow-2xl backdrop-blur-xl bg-slate-950/95 pointer-events-auto flex flex-col gap-2.5 text-xs text-slate-200 w-68 sm:w-76 animate-in slide-in-from-right-3 duration-200"
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
              <Coins class="w-3 h-3 text-amber-400" />{{ activeSelectedBlueprint.cost }} oltin
            </span>
          </div>
        </div>

        <button 
          @click="towerStore.selectBuildTower(null)"
          class="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
          title="Bekor qilish"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Flame class="w-3.5 h-3.5 text-rose-400" />Zarar:</span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.damage }}</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Zap class="w-3.5 h-3.5 text-amber-400" />Tezlik:</span>
          <span class="font-bold text-white">{{ (1 / activeSelectedBlueprint.attackSpeed).toFixed(1) }}/s</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1"><Crosshair class="w-3.5 h-3.5 text-sky-400" />Masofa:</span>
          <span class="font-bold text-white">{{ activeSelectedBlueprint.range }} k</span>
        </div>
        <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span class="text-slate-400 flex items-center gap-1">🎯 Turi:</span>
          <span class="font-bold text-purple-300 uppercase text-[10px] truncate max-w-[60px]">{{ activeSelectedBlueprint.projectileType }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 text-[11px] text-amber-300 bg-amber-500/15 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
        <span class="font-bold">Xaritadagi katakni bosing</span>
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
      </div>
    </div>


    <!-- ================= 3. BOTTOM COMPACT TOWER DOCK & CIRCULAR TIMER ================= -->
    <div 
      class="glass-panel px-2.5 py-1.5 sm:px-3.5 sm:py-2 landscape:py-1 rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/85 pointer-events-auto flex items-center justify-between gap-2 sm:gap-3.5 w-full max-w-2xl landscape:max-w-xl opacity-95 hover:opacity-100 transition-opacity"
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
          :title="`${bp.name} — ${bp.cost} oltin`"
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
            title="Qurilish vaqti qoldi"
          >
            {{ Math.ceil(characterStore.prepCountdown) }}s
          </div>

          <!-- Quick Start Wave Button -->
          <button 
            @click="characterStore.startNextWaveInGame()"
            class="px-2.5 sm:px-3.5 py-1.5 landscape:py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1 touch-target"
            title="Kutmasdan to'lqinni boshlash"
          >
            <Play class="w-3.5 h-3.5 fill-slate-950" />
            <span class="hidden sm:inline">Boshlash</span>
          </button>
        </div>

        <!-- 2. CIRCULAR GREEN COMBAT INDICATOR (During active wave combat) -->
        <div 
          v-else-if="characterStore.gameState === 'wave_running'"
          class="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          title="Jang davom etmoqda"
        >
          <!-- Glowing Green Pulse Dot & Icon -->
          <div class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse">
            <Swords class="w-3.5 h-3.5" />
          </div>
          <span class="text-[10px] font-mono font-bold text-emerald-300">Jang</span>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Zap, X, Swords, Play, Coins, Flame, Crosshair, Skull, ShieldAlert } from 'lucide-vue-next'
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
  if (bp.assetPath && (bp.assetPath.startsWith('data:') || bp.assetPath.startsWith('http') || bp.assetPath.startsWith('/') || bp.assetPath.includes('.png'))) {
    return bp.assetPath
  }
  if (bp.assetId) {
    const clean = bp.assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    const asset = assetStore.assets.find(a => {
      if (a.id === bp.assetId) return true
      const aClean = a.id.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
      return aClean === clean || (a.fileRelativePath && a.fileRelativePath.toLowerCase().includes(clean))
    })
    if (asset) return asset.previewSrc || asset.src || ''
  }
  if (bp.assetName) {
    const cleanName = bp.assetName.toLowerCase()
    const asset = assetStore.assets.find(a => a.name?.toLowerCase().includes(cleanName) || a.fileRelativePath?.toLowerCase().includes(cleanName))
    if (asset) return asset.previewSrc || asset.src || ''
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
    alert(`Oltin yetarli emas! Bu minora narxi: ${bp.cost} oltin. Sizda: ${characterStore.gold} oltin.`)
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
    alert("Kuchaytirish uchun oltin yetarli emas!")
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
