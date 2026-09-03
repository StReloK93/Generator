<template>
  <div class="pointer-events-none z-30 flex flex-col items-center gap-2 sm:gap-3 w-full max-w-4xl mx-auto px-2 pb-2 select-none">
    <!-- 1. Selected Placed Tower Actions Card (When inspecting a placed tower on map) -->
    <div 
      v-if="towerStore.selectedPlacedTower"
      class="glass-panel p-2.5 sm:p-3 rounded-2xl border border-sky-500/60 shadow-2xl backdrop-blur-xl bg-slate-900/98 pointer-events-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-200 w-full max-w-lg animate-in slide-in-from-bottom-2 duration-150"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      <div class="flex flex-col min-w-35">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-sky-300 truncate">{{ towerStore.selectedPlacedTower.name }}</span>
          <span class="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
            Lvl {{ towerStore.selectedPlacedTower.level }}
          </span>
        </div>
        <div class="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono mt-0.5">
          <span class="flex items-center gap-1"><Flame class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.damage }} DMG</span>
          <span class="flex items-center gap-1"><Crosshair class="w-3 h-3 text-sky-400" /> {{ towerStore.selectedPlacedTower.range }}k</span>
          <span class="flex items-center gap-1"><Skull class="w-3 h-3 text-rose-400" /> {{ towerStore.selectedPlacedTower.killsCount }}</span>
        </div>

        <!-- Builder Info Badge -->
        <div v-if="towerStore.selectedPlacedTower.builderName" class="flex items-center gap-1.5 mt-1">
          <div 
            class="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
            :style="{ backgroundColor: towerStore.selectedPlacedTower.builderColor || '#38bdf8' }"
          ></div>
          <span class="text-[10px] text-slate-300 font-medium">Quruvchi: <strong>{{ towerStore.selectedPlacedTower.builderName }}</strong></span>
        </div>
      </div>

      <!-- Actions: Upgrade, Sell, Close -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <!-- Upgrade Button -->
        <button 
          v-if="isOwnerOfSelectedTower"
          @click="upgradeSelectedTower"
          :disabled="characterStore.gold < upgradeCost"
          class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:pointer-events-none active:scale-95 flex items-center gap-1 touch-target text-[11px]"
        >
          <Zap class="w-3.5 h-3.5 text-amber-300" />
          <span>Kuchaytirish (+{{ Math.round(towerStore.selectedPlacedTower.damage * 0.3) }})</span>
          <span class="font-mono text-amber-300 ml-0.5 flex items-center gap-0.5"><Coins class="w-3 h-3 text-amber-400 inline" />{{ upgradeCost }}</span>
        </button>

        <!-- Sell Button -->
        <button 
          v-if="isOwnerOfSelectedTower"
          @click="sellSelectedTower"
          class="px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 font-semibold transition-all cursor-pointer border border-rose-500/30 active:scale-95 flex items-center gap-1 touch-target text-[11px]"
        >
          <span>Sotish</span>
          <span class="font-mono text-amber-300 flex items-center gap-0.5"><Coins class="w-3 h-3 text-amber-400 inline" />{{ sellRefund }}</span>
        </button>

        <!-- Close Card -->
        <button 
          @click="towerStore.selectPlacedTower(null)"
          class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 2. Bottom Tower Shop & Wave Action Bar -->
    <div 
      class="glass-panel p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/95 pointer-events-auto flex flex-col gap-2 w-full max-w-2xl"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      <!-- Tower Shop Bar (Horizontal scroll on mobile) -->
      <div class="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 hidden sm:inline">Minoralar:</span>
          
          <button 
            v-for="bp in towerStore.blueprints" 
            :key="bp.id"
            @click="selectTowerToBuild(bp)"
            :class="[
              towerStore.activeBuildTowerId === bp.id 
                ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-102' 
                : 'bg-slate-800/90 border-slate-700/80 hover:bg-slate-750 hover:border-slate-600',
              characterStore.gold < bp.cost ? 'opacity-50' : 'opacity-100'
            ]"
            class="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 touch-target"
            :title="`${bp.name} — Narxi: ${bp.cost} oltin | Zarar: ${bp.damage} | Masofa: ${bp.range}`"
          >
            <!-- Tower Sprite / Shield Icon -->
            <div class="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden">
              <img 
                v-if="getAsset(bp.assetId)?.previewSrc || getAsset(bp.assetId)?.src" 
                :src="getAsset(bp.assetId)?.previewSrc || getAsset(bp.assetId)?.src" 
                :alt="bp.name" 
                class="w-full h-full object-contain filter drop-shadow scale-125"
              />
              <ShieldAlert v-else class="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div class="flex flex-col text-left leading-tight">
              <span class="font-bold text-[11px] sm:text-xs text-white truncate max-w-[90px]">{{ bp.name }}</span>
              <span class="font-mono text-[9px] sm:text-[10px] text-amber-300 font-semibold flex items-center gap-0.5">
                <Coins class="w-2.5 h-2.5 text-amber-400 inline" />{{ bp.cost }}
              </span>
            </div>
          </button>
        </div>

        <!-- Simulation Speed Multiplier Controls (1x, 2x, 5x, 10x, 20x, 50x) -->
        <div class="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            v-for="spd in [1, 2, 5, 10, 20, 50]"
            :key="spd"
            @click="characterStore.setGameSpeed(spd)"
            :class="characterStore.gameSpeed === spd ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'"
            class="px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-mono transition-all cursor-pointer active:scale-95"
          >
            {{ spd }}x
          </button>
        </div>
      </div>

      <!-- Wave Prep 10s Timer Banner & "To'lqinni Boshlash" Action Button -->
      <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
        <!-- Status indicator -->
        <div class="flex items-center gap-2 text-xs">
          <template v-if="characterStore.gameState === 'build_prep'">
            <div class="flex items-center gap-1.5 text-amber-400 font-bold animate-pulse">
              <Clock class="w-4 h-4" />
              <span>Qurilish vaqti: <strong class="font-mono text-sm">{{ Math.ceil(characterStore.prepCountdown) }}s</strong></span>
            </div>
          </template>
          <template v-else-if="characterStore.gameState === 'wave_running'">
            <div class="flex items-center gap-1.5 text-rose-400 font-bold">
              <Swords class="w-4 h-4 animate-spin text-rose-400" />
              <span>To'lqin davom etmoqda...</span>
            </div>
          </template>
          <template v-else>
            <span class="text-slate-400 font-medium">To'lqin tayyor</span>
          </template>
        </div>

        <!-- Action Button -->
        <div class="flex items-center gap-2">
          <!-- Cancel tower placement if placing -->
          <button 
            v-if="towerStore.activeBuildTowerId"
            @click="towerStore.selectBuildTower(null)"
            class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer active:scale-95"
          >
            Bekor qilish
          </button>

          <!-- Start Wave / Skip countdown -->
          <button 
            v-if="characterStore.gameState === 'build_prep' || characterStore.gameState === 'ready'"
            @click="characterStore.startNextWaveInGame()"
            class="px-3.5 sm:px-5 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 touch-target"
          >
            <Play class="w-3.5 h-3.5 fill-slate-950" />
            <span>To'lqinni Boshlash</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Zap, X, Clock, Swords, Play, Coins, Flame, Crosshair, Skull, ShieldAlert } from 'lucide-vue-next'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'

const props = defineProps<{
  isPreview?: boolean
}>()

const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

function getAsset(assetId?: string) {
  if (!assetId) return null
  const cleanId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
  return assetStore.assets.find(a => {
    if (a.id === assetId) return true
    const aClean = a.id.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    return aClean === cleanId || (a.fileRelativePath && a.fileRelativePath.toLowerCase().includes(cleanId))
  }) || null
}

function selectTowerToBuild(bp: any) {
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

function upgradeSelectedTower() {
  const t = towerStore.selectedPlacedTower
  if (!t) return
  if (characterStore.gold < upgradeCost.value) {
    alert("Kuchaytirish uchun oltin yetarli emas!")
    return
  }
  towerStore.upgradePlacedTower(t.id)
  if (multiplayerStore.roomId) {
    multiplayerStore.broadcastTowerUpgrade(t.id)
  }
}

function sellSelectedTower() {
  const t = towerStore.selectedPlacedTower
  if (!t) return
  towerStore.sellPlacedTower(t.id)
  if (multiplayerStore.roomId) {
    multiplayerStore.broadcastTowerSell(t.id)
  }
}
</script>
