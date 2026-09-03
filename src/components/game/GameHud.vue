<template>
  <div class="pointer-events-none z-30 flex flex-col justify-between select-none w-full gap-1 landscape:gap-0.5">
    <!-- TOP GAME STATUS BAR -->
    <div class="flex items-center justify-between gap-1.5 sm:gap-2 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 landscape:py-1">
      
      <!-- Left & Center: Game Global Indicators + User Indicators -->
      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
        
        <!-- 1. PREVIEW MODE BADGE (If preview) -->
        <div v-if="props.isPreview" class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 font-bold text-xs shadow-xl backdrop-blur-md">
          <Eye class="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Dizayn Ko'rinishi</span>
          <span class="text-[10px] text-indigo-400 font-normal hidden sm:inline">(Simulyatsiyasiz)</span>
        </div>

        <template v-else>
          <!-- 2. GLOBAL GAME (BASE & WAVE) INDICATORS -->
          <div class="glass-panel px-2.5 sm:px-3 py-1 landscape:py-0.5 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-xl flex items-center gap-2 sm:gap-2.5 text-xs backdrop-blur-md">
            
            <!-- Baza Jonlari (Base Lives) -->
            <div 
              class="flex items-center gap-1 shrink-0" 
              :class="characterStore.playerLives <= 5 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-200'"
              title="Qolgan baza jonlari"
            >
              <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
              <span class="font-mono font-bold text-xs">
                {{ characterStore.playerLives }}<span class="text-slate-500 font-normal text-[10px]">/{{ characterStore.maxLives }}</span>
              </span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- To'lqin (Wave) -->
            <div class="flex items-center gap-1 shrink-0" title="To'lqin raqami">
              <Swords class="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-purple-200">
                {{ characterStore.currentWaveIndex + 1 }}<span class="text-slate-500 font-normal text-[10px]">/{{ characterStore.waveConfigs.length || 0 }}</span>
              </span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Xaritadagi Tirik Dushmanlar (Alive Enemies) -->
            <div class="flex items-center gap-1 shrink-0 text-slate-300" title="Xaritada tirik dushmanlar soni">
              <Users class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-cyan-200">
                {{ characterStore.aliveEnemiesCount }}
              </span>
            </div>

            <!-- O'tib ketgan dushmanlar (Leaked Enemies) -->
            <template v-if="characterStore.leakedEnemiesCount > 0">
              <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>
              <div class="flex items-center gap-1 shrink-0 text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded-lg border border-rose-500/40" title="Bazaga o'tib ketgan dushmanlar soni">
                <DoorOpen class="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span class="font-mono font-black text-xs text-rose-300">
                  -{{ characterStore.leakedEnemiesCount }}
                </span>
              </div>
            </template>

          </div>

          <!-- 3. USER (PLAYER / COMMANDER) INDICATORS -->
          <!-- Singleplayer User Stats -->
          <div 
            v-if="!multiplayerStore.roomId"
            class="glass-panel px-2.5 sm:px-3 py-1 landscape:py-0.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl flex items-center gap-2 sm:gap-2.5 text-xs backdrop-blur-md"
          >
            <!-- Gold -->
            <div class="flex items-center gap-1 shrink-0" title="Sizning oltiningiz">
              <Coins class="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-amber-300">{{ characterStore.gold }}</span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Total Kills -->
            <div class="flex items-center gap-1 shrink-0" title="Jami o'ldirilgan dushmanlar">
              <Skull class="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-rose-300">{{ characterStore.totalKills }}</span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0 hidden sm:block"></div>

            <!-- Score -->
            <div class="hidden sm:flex items-center gap-1 shrink-0" title="Ochkolar">
              <Trophy class="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-yellow-300">{{ characterStore.score }}</span>
            </div>
          </div>

          <!-- Multiplayer Players Leaderboard Cards -->
          <div
            v-else
            class="flex flex-wrap items-center gap-1.5 sm:gap-2"
            @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
          >
            <div
              v-for="p in multiplayerStore.players"
              :key="p.id"
              class="glass-panel px-2.5 sm:px-3 py-1 landscape:py-0.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-2.5 text-xs shadow-xl transition-all backdrop-blur-md"
              :class="p.id === multiplayerStore.myPlayerId ? 'bg-slate-900/95 border-brand-500/80 ring-1 ring-brand-500/50 shadow-brand-500/10' : 'bg-slate-950/85 border-slate-800/80'"
            >
              <!-- Player Dot & Name -->
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" :style="{ backgroundColor: p.color }"></span>
                <span class="font-bold text-[11px] sm:text-xs truncate max-w-[65px] sm:max-w-[100px]" :class="p.id === multiplayerStore.myPlayerId ? 'text-white' : 'text-slate-300'">
                  {{ p.name }} <span v-if="p.id === multiplayerStore.myPlayerId" class="text-[9px] text-brand-400 font-normal">(Siz)</span>
                </span>
              </div>

              <div class="h-3 w-px bg-slate-800 shrink-0"></div>

              <!-- Player Gold -->
              <div class="flex items-center gap-1 text-amber-300 font-mono text-[11px] font-bold" title="Oltin">
                <Coins class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{{ p.gold ?? 0 }}</span>
              </div>

              <div class="h-3 w-px bg-slate-800/60 shrink-0"></div>

              <!-- Player Kills -->
              <div class="flex items-center gap-1 text-rose-300 font-mono text-[11px] font-bold" title="O'ldirilgan dushmanlar">
                <Skull class="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{{ p.killsCount ?? 0 }}</span>
              </div>
            </div>
          </div>
        </template>

      </div>

      <!-- Right: Unified Action Dock (Exit, Fullscreen, Zoom In +, Zoom Out -, Center) -->
      <div class="flex items-center pointer-events-auto">
        <div class="glass-panel p-1 landscape:p-0.5 rounded-xl sm:rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/80 flex items-center gap-1 sm:gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
          
          <!-- 1. Exit / Back to Editor Button -->
          <button
            @click="handleExitGame"
            class="px-2 sm:px-2.5 py-1.5 landscape:py-1 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors border border-slate-800/80 shadow-md cursor-pointer active:scale-95 touch-target flex items-center gap-1"
            :title="props.isPreview ? 'Tahrirlashga qaytish' : 'O\'yindan chiqish'"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span class="text-[11px] sm:text-xs font-bold">{{ props.isPreview ? 'Tahrir' : 'Chiqish' }}</span>
          </button>

          <div class="h-4 w-px bg-slate-800/80"></div>

          <!-- 2. Fullscreen Button -->
          <button
            @click="handleToggleFullscreen"
            class="p-1.5 landscape:p-1 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800/80 shadow-md cursor-pointer active:scale-95 touch-target flex items-center justify-center"
            :title="isFullscreenMode ? 'To\'liq ekrandan chiqish' : 'To\'liq ekran'"
          >
            <Minimize2 v-if="isFullscreenMode" class="w-3.5 h-3.5" />
            <Maximize2 v-else class="w-3.5 h-3.5" />
          </button>

          <div class="h-4 w-px bg-slate-800/80"></div>

          <!-- 3. Zoom In (+) Button -->
          <button
            @click="handleZoomIn"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-slate-800/80 shadow-md cursor-pointer active:scale-95 touch-target flex items-center justify-center font-bold"
            title="Kattalashtirish (+)"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>

          <!-- 4. Zoom Out (-) Button -->
          <button
            @click="handleZoomOut"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-slate-800/80 shadow-md cursor-pointer active:scale-95 touch-target flex items-center justify-center font-bold"
            title="Kichiklashtirish (-)"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>

          <!-- 5. Center Focus Button -->
          <button
            @click="handleFocusCenter"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900/90 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 transition-colors border border-slate-800/80 shadow-md cursor-pointer active:scale-95 touch-target flex items-center justify-center"
            title="Xaritani markazga qaytarish"
          >
            <Crosshair class="w-3.5 h-3.5" />
          </button>

        </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Heart, Coins, Swords, Trophy, Skull, ArrowLeft, Maximize2, Minimize2, Eye, EyeOff, Activity, Plus, Minus, Crosshair, Users, DoorOpen 
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

function handleZoomIn() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-zoom-in'))
  }
}

function handleZoomOut() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-zoom-out'))
  }
}

function handleFocusCenter() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-focus-center'))
  }
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
