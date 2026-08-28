<template>
  <div 
    v-if="characterStore.isGameMode" 
    class="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 select-none"
  >
    <!-- 1. TOP GAME STATUS BAR -->
    <div class="flex items-center justify-between gap-3 w-full max-w-5xl mx-auto">
      
      <!-- Left: Lives, Gold, Score -->
      <div 
        class="glass-panel px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/95 pointer-events-auto flex items-center gap-4 text-xs"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
      >
        <!-- Lives -->
        <div class="flex items-center gap-1.5">
          <Heart class="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Jonlar</span>
            <span class="font-mono font-bold text-sm text-white">{{ characterStore.playerLives }} / {{ characterStore.maxLives }}</span>
          </div>
        </div>

        <div class="h-6 w-px bg-slate-800"></div>

        <!-- Gold -->
        <div class="flex items-center gap-1.5">
          <Coins class="w-5 h-5 text-amber-400" />
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Oltin</span>
            <span class="font-mono font-bold text-sm text-amber-300">💰 {{ characterStore.gold }}</span>
          </div>
        </div>

        <div class="h-6 w-px bg-slate-800"></div>

        <!-- Wave Indicator -->
        <div class="flex items-center gap-1.5">
          <Swords class="w-5 h-5 text-purple-400" />
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-purple-300 font-bold">To'lqin</span>
            <span class="font-mono font-bold text-sm text-purple-200">
              {{ characterStore.currentWaveIndex + 1 }} / {{ characterStore.waveConfigs.length }}
            </span>
          </div>
        </div>

        <div class="h-6 w-px bg-slate-800"></div>

        <!-- Score -->
        <div class="flex items-center gap-1.5">
          <Trophy class="w-4 h-4 text-yellow-400" />
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Hisob</span>
            <span class="font-mono font-bold text-xs text-yellow-300">{{ characterStore.score }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Speed controls & Exit Game Mode -->
      <div 
        class="glass-panel px-3 py-2 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/95 pointer-events-auto flex items-center gap-2 text-xs"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
      >
        <!-- Game Speed Multipliers -->
        <div class="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button 
            v-for="spd in [1, 2, 5]" 
            :key="spd"
            @click="characterStore.gameSpeed = spd"
            :class="characterStore.gameSpeed === spd ? 'bg-amber-500 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
            class="py-1 px-2 rounded-lg text-[11px] font-mono transition-all cursor-pointer"
          >
            {{ spd }}x
          </button>
        </div>

        <!-- Exit to Editor Button -->
        <button 
          @click="characterStore.exitPlayMode()"
          class="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Xarita Redaktoriga qaytish"
        >
          <Hammer class="w-3.5 h-3.5 text-amber-400" />
          <span>🛠️ Redaktor</span>
        </button>
      </div>
    </div>

    <!-- 2. BOTTOM TOWER SHOP & WAVE ACTION BAR -->
    <div class="flex flex-col items-center gap-3 w-full max-w-4xl mx-auto">
      
      <!-- Selected Placed Tower Actions Card (If a tower on map is clicked) -->
      <div 
        v-if="towerStore.selectedPlacedTower"
        class="glass-panel p-3 rounded-2xl border border-sky-500/50 shadow-2xl backdrop-blur-xl bg-slate-900/98 pointer-events-auto flex items-center justify-between gap-4 text-xs text-slate-200 w-full max-w-md animate-in slide-in-from-bottom-2 duration-150"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
      >
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-sky-300">{{ towerStore.selectedPlacedTower.name }}</span>
            <span class="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
              Lvl {{ towerStore.selectedPlacedTower.level }}
            </span>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">
            💥 {{ towerStore.selectedPlacedTower.damage }} DMG | 🎯 {{ towerStore.selectedPlacedTower.range }}k | ☠️ {{ towerStore.selectedPlacedTower.killsCount }} kills
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Upgrade Button -->
          <button 
            @click="upgradeSelectedTower"
            :disabled="characterStore.gold < upgradeCost"
            :class="characterStore.gold >= upgradeCost ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'"
            class="py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md"
          >
            <Zap class="w-3.5 h-3.5 text-amber-300" />
            <span>Kuchaytirish (💰{{ upgradeCost }})</span>
          </button>

          <!-- Sell Button -->
          <button 
            @click="sellSelectedTower"
            class="py-1.5 px-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Coins class="w-3.5 h-3.5 text-amber-400" />
            <span>Sotish (+{{ sellRefund }})</span>
          </button>

          <button 
            @click="towerStore.selectedPlacedTowerId = null"
            class="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Main Shop & Start Wave Row -->
      <div 
        class="glass-panel p-3 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/95 pointer-events-auto flex items-center justify-between gap-4 w-full"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
      >
        <!-- Tower Blueprints Shop (Minoralar do'koni) -->
        <div class="flex items-center gap-2 overflow-x-auto">
          <span class="text-[10px] uppercase font-bold text-amber-400 tracking-wider shrink-0 mr-1">
            🏰 Minora Do'koni:
          </span>

          <span v-if="towerStore.blueprints.length === 0" class="text-[11px] text-slate-400 italic shrink-0">
            Hali birorta minora yaratilmagan. "🛠️ Redaktor"ga o'tib minora yarating!
          </span>

          <div 
            v-for="bp in towerStore.blueprints" 
            :key="bp.id"
            @click="selectTowerToBuild(bp)"
            :class="[
              towerStore.activeBuildTowerId === bp.id ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-500 shadow-lg' : 'bg-slate-950/80 border-slate-800 hover:border-slate-600',
              characterStore.gold < bp.cost ? 'opacity-50' : 'cursor-pointer'
            ]"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 select-none group"
            :title="`Zarar: ${bp.damage} | Masofa: ${bp.range}k | Narxi: ${bp.cost} oltin`"
          >
            <div class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
              <ShieldAlert class="w-4 h-4 text-amber-400" />
            </div>

            <div class="flex flex-col">
              <span class="text-[11px] font-bold text-white group-hover:text-amber-300 transition-colors">
                {{ bp.name }}
              </span>
              <div class="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                <span>💥 {{ bp.damage }}</span>
                <span class="text-amber-400 font-bold">💰 {{ bp.cost }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Wave Starter Button / Build Prep Countdown -->
        <div class="shrink-0 flex items-center gap-2">
          <div v-if="characterStore.waveConfigs.length === 0" class="text-[11px] text-amber-300/80 font-mono">
            ⚠️ To'lqinlar mavjud emas
          </div>

          <!-- 10s Building & Prep Phase -->
          <div 
            v-else-if="characterStore.gameState === 'build_prep'"
            class="flex items-center gap-2"
          >
            <div class="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-inner">
              <Clock class="w-4 h-4 text-amber-400 animate-spin" />
              <span>🏰 Qurilish vaqti: <strong class="font-mono text-sm text-white">{{ Math.ceil(characterStore.prepCountdown) }}s</strong></span>
            </div>

            <button 
              @click="characterStore.startNextWaveInGame()"
              class="py-2 px-3.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Kutmasdan darhol to'lqinni boshlash"
            >
              <Play class="w-3.5 h-3.5 fill-white" />
              <span>▶️ Hozir Boshlash</span>
            </button>
          </div>

          <div 
            v-else-if="characterStore.gameState === 'wave_running'" 
            class="py-2 px-4 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-2"
          >
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <span>To'lqin Hujumi Ketmoqda...</span>
          </div>

          <button 
            v-else
            @click="characterStore.startNextWaveInGame()"
            class="py-2.5 px-5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer animate-pulse"
          >
            <Play class="w-4 h-4 fill-white" />
            <span>{{ characterStore.gameState === 'wave_completed' ? "Keyingi To'lqinni Boshlash ▶" : "1-To'lqinni Boshlash ▶" }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3. GAME OVER MODAL -->
    <div 
      v-if="characterStore.gameState === 'game_over'"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none pointer-events-auto animate-in fade-in duration-200"
      @mousedown.stop
      @mouseup.stop
      @click.stop
    >
      <div class="glass-panel border border-rose-500/60 w-full max-w-sm rounded-3xl p-6 shadow-2xl bg-slate-950 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
        <div class="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-500">
          <Skull class="w-8 h-8" />
        </div>

        <div>
          <h2 class="text-xl font-black text-rose-400">Mag'lubiyat!</h2>
          <p class="text-xs text-slate-400 mt-1">Dushmanlar markazga kirib, barcha jonlaringizni tugatishdi.</p>
        </div>

        <div class="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span>Qaytarilgan to'lqin: <strong class="text-purple-300">{{ characterStore.currentWaveIndex }}</strong></span>
          <span>Hisob: <strong class="text-yellow-300">{{ characterStore.score }}</strong></span>
        </div>

        <div class="grid grid-cols-2 gap-2 w-full pt-2">
          <button 
            @click="characterStore.restartGame()"
            class="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg"
          >
            Qayta O'ynash
          </button>
          <button 
            @click="characterStore.exitPlayMode()"
            class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Redaktorga Qaytish
          </button>
        </div>
      </div>
    </div>

    <!-- 4. VICTORY MODAL -->
    <div 
      v-if="characterStore.gameState === 'victory'"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none pointer-events-auto animate-in fade-in duration-200"
      @mousedown.stop
      @mouseup.stop
      @click.stop
    >
      <div class="glass-panel border border-yellow-500/60 w-full max-w-sm rounded-3xl p-6 shadow-2xl bg-slate-950 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
        <div class="w-16 h-16 rounded-full bg-yellow-600/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 animate-bounce">
          <Trophy class="w-8 h-8" />
        </div>

        <div>
          <h2 class="text-xl font-black text-yellow-400">G'alaba!</h2>
          <p class="text-xs text-slate-300 mt-1">Barcha to'lqinlar muvaffaqiyatli qaytarildi! Xaritani to'liq himoya qildingiz.</p>
        </div>

        <div class="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
          <span>Oltin: <strong class="text-amber-400">💰 {{ characterStore.gold }}</strong></span>
          <span>Hisob: <strong class="text-yellow-300">⭐ {{ characterStore.score }}</strong></span>
        </div>

        <div class="grid grid-cols-2 gap-2 w-full pt-2">
          <button 
            @click="characterStore.restartGame()"
            class="py-2.5 px-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg"
          >
            Yana O'ynash
          </button>
          <button 
            @click="characterStore.exitPlayMode()"
            class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Redaktorga Qaytish
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Heart, Coins, Swords, Trophy, Hammer, ShieldAlert, Zap, Play, Skull, X, Clock 
} from 'lucide-vue-next'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'

const characterStore = useCharacterStore()
const towerStore = useTowerStore()

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
}

function sellSelectedTower() {
  const t = towerStore.selectedPlacedTower
  if (!t) return
  towerStore.sellPlacedTower(t.id)
}
</script>
