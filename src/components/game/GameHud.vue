<template>
  <div class="pointer-events-none z-30 flex flex-col justify-between select-none w-full gap-1.5">
    <!-- TOP GAME STATUS BAR -->
    <div class="flex items-center justify-between gap-2 w-full max-w-7xl mx-auto px-3 sm:px-5 py-2.5">
      <!-- Left: Exit Game Button -->
      <div class="flex items-center pointer-events-auto">
        <button
          @click="handleExitGame"
          class="px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors border border-slate-800 shadow-xl cursor-pointer active:scale-95 touch-target flex items-center gap-1.5 backdrop-blur-md"
          :title="props.isPreview ? 'Tahrirlashga qaytish' : 'O\'yindan chiqish'"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="text-xs font-bold">{{ props.isPreview ? 'Tahrir' : 'Chiqish' }}</span>
        </button>
      </div>

      <!-- Center: Multiplayer Leaderboard Cards OR Preview Mode Badge -->
      <div class="flex items-center pointer-events-auto">
        <!-- Preview Mode Badge -->
        <div v-if="props.isPreview" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 font-bold text-xs shadow-xl backdrop-blur-md">
          <Eye class="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Dizayn Ko'rinishi</span>
          <span class="text-[10px] text-indigo-400 font-normal hidden sm:inline">(Simulyatsiyasiz)</span>
        </div>

        <!-- Multiplayer Players Scoreboard (Each player's separate Gold, Kills, Score) -->
        <div
          v-else-if="multiplayerStore.roomId && multiplayerStore.players.length > 0"
          class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5"
          @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
        >
          <div
            v-for="p in multiplayerStore.players"
            :key="p.id"
            class="glass-panel px-2.5 sm:px-3.5 py-1.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-3 text-xs shadow-xl transition-all backdrop-blur-md"
            :class="p.id === multiplayerStore.myPlayerId ? 'bg-slate-900/95 border-brand-500/80 ring-1 ring-brand-500/50 shadow-brand-500/10' : 'bg-slate-950/85 border-slate-800/80'"
          >
            <!-- Player Color Dot + Name -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" :style="{ backgroundColor: p.color }"></span>
              <span class="font-bold text-[11px] sm:text-xs truncate max-w-[80px] sm:max-w-[120px]" :class="p.id === multiplayerStore.myPlayerId ? 'text-white' : 'text-slate-300'">
                {{ p.name }} <span v-if="p.id === multiplayerStore.myPlayerId" class="text-[9px] text-brand-400 font-normal">(Siz)</span>
              </span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Player Gold -->
            <div class="flex items-center gap-1 text-amber-300 font-mono text-[11px] sm:text-xs font-bold" title="Oltin">
              <Coins class="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{{ p.gold ?? 0 }}</span>
            </div>

            <div class="h-3 w-px bg-slate-800/60 shrink-0"></div>

            <!-- Player Kills -->
            <div class="flex items-center gap-1 text-rose-300 font-mono text-[11px] sm:text-xs font-bold" title="O'ldirilgan dushmanlar">
              <Skull class="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{{ p.killsCount ?? 0 }}</span>
            </div>

            <div class="h-3 w-px bg-slate-800/60 shrink-0 hidden sm:block"></div>

            <!-- Player Score -->
            <div class="hidden sm:flex items-center gap-1 text-yellow-300 font-mono text-[11px] font-semibold" title="Ochkolar">
              <Trophy class="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>{{ p.score ?? 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Singleplayer Minimal Status (Lives & Wave) -->
        <div
          v-else
          class="glass-panel px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl flex items-center gap-3 text-xs backdrop-blur-md"
        >
          <!-- Lives -->
          <div class="flex items-center gap-1 shrink-0" title="Qolgan jonlar">
            <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
            <span class="font-mono font-bold text-xs text-white">
              {{ characterStore.playerLives }}<span class="text-slate-500 font-normal">/{{ characterStore.maxLives }}</span>
            </span>
          </div>

          <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

          <!-- Gold -->
          <div class="flex items-center gap-1 shrink-0" title="Oltin">
            <Coins class="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span class="font-mono font-bold text-xs text-amber-300">{{ characterStore.gold }}</span>
          </div>

          <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

          <!-- Wave -->
          <div class="flex items-center gap-1 shrink-0" title="To'lqin">
            <Swords class="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span class="font-mono font-bold text-xs text-purple-200">
              {{ characterStore.currentWaveIndex + 1 }}/{{ characterStore.waveConfigs.length || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Fullscreen Toggle -->
      <div class="flex items-center pointer-events-auto">
        <button
          v-if="props.isPreview"
          @click="handleExitGame"
          class="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl transition-all active:scale-95 cursor-pointer"
          title="Tahrirlashga qaytish"
        >
          <EyeOff class="w-4 h-4" />
          <span>Tahrirga Qaytish</span>
        </button>

        <button
          v-else
          @click="handleToggleFullscreen"
          class="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800 shadow-xl cursor-pointer active:scale-95 touch-target flex items-center justify-center backdrop-blur-md"
          :title="isFullscreenMode ? 'To\'liq ekrandan chiqish' : 'To\'liq ekran'"
        >
          <Minimize2 v-if="isFullscreenMode" class="w-4 h-4" />
          <Maximize2 v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Network & Performance Diagnostics Overlay (When FPS badge is clicked) -->
    <div
      v-if="showDiagnostics"
      class="glass-panel px-3 py-2 rounded-xl bg-slate-950/98 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col gap-1 text-[10px] font-mono text-slate-300 w-64 animate-in fade-in zoom-in-95 duration-150 absolute top-14 left-4 z-40"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
    >
      <div class="flex items-center justify-between pb-1 border-b border-slate-800 font-bold text-sky-400">
        <span class="flex items-center gap-1.5"><Activity class="w-3.5 h-3.5" /> Performance Telemetry</span>
        <button @click="showDiagnostics = false" class="text-slate-400 hover:text-white cursor-pointer">✕</button>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">FPS:</span>
        <span :class="characterStore.fps >= 50 ? 'text-emerald-400' : 'text-rose-400'">{{ characterStore.fps }} fps ({{ (1000 / Math.max(1, characterStore.fps)).toFixed(1) }}ms)</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">Units on Field:</span>
        <span class="text-white">{{ (networkSyncBuffer.renderUnitsList.length > 0 ? networkSyncBuffer.renderUnitsList.length : characterStore.units.length) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">Towers:</span>
        <span class="text-amber-400">{{ towerStore.placedTowers.length }}</span>
      </div>
      <template v-if="multiplayerStore.roomId">
        <div class="pt-1 mt-0.5 border-t border-slate-800 flex justify-between">
          <span class="text-slate-400">Net Rx (In):</span>
          <span class="text-sky-300">{{ networkSyncBuffer.ppsIn }} pkt/s ({{ networkSyncBuffer.kbpsIn }} KB/s)</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Net Tx (Out):</span>
          <span class="text-emerald-300">{{ networkSyncBuffer.ppsOut }} pkt/s ({{ networkSyncBuffer.kbpsOut }} KB/s)</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Role:</span>
          <span class="text-purple-300 font-bold">{{ multiplayerStore.isHost ? 'Host (Authoritative)' : 'Client (P2P Lerp 60FPS)' }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Heart, Coins, Swords, Trophy, Skull, ArrowLeft, Maximize2, Minimize2, Eye, EyeOff, Activity 
} from 'lucide-vue-next'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useToolStore } from '../../stores/toolStore'
import { networkSyncBuffer } from '../../services/networkSync'
import { toggleAppFullscreen, isAppFullscreen } from '../../utils/fullscreen'

const props = defineProps<{
  isPreview?: boolean
}>()

const emit = defineEmits<{
  (e: 'exit-preview'): void
}>()

const router = useRouter()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const toolStore = useToolStore()

const showDiagnostics = ref(false)
const isFullscreenMode = ref(false)

const displayGold = computed(() => {
  if (multiplayerStore.roomId && multiplayerStore.myPlayer) {
    return multiplayerStore.myPlayer.gold !== undefined ? multiplayerStore.myPlayer.gold : characterStore.gold
  }
  return characterStore.gold
})

const displayKills = computed(() => {
  if (multiplayerStore.roomId && multiplayerStore.myPlayer) {
    return multiplayerStore.myPlayer.killsCount ?? 0
  }
  return characterStore.totalKills
})

const displayScore = computed(() => {
  if (multiplayerStore.roomId && multiplayerStore.myPlayer) {
    return multiplayerStore.myPlayer.score ?? 0
  }
  return characterStore.score
})

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

function handleExitGame() {
  if (props.isPreview) {
    toolStore.isPreviewMode = false
    emit('exit-preview')
    return
  }

  if (confirm("O'yindan chiqib, tahrirlovchiga qaytmoqchimisiz?")) {
    characterStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else {
      router.push('/editor')
    }
  }
}
</script>
