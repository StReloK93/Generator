<template>
  <div class="pointer-events-none z-30 flex flex-col justify-between select-none w-full gap-1 landscape:gap-0.5">
    <!-- TOP GAME STATUS BAR -->
    <div class="flex items-center justify-between gap-1.5 sm:gap-2 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 landscape:py-1">
      
      <!-- Left & Center: Game Global Indicators + User Indicators -->
      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
        
        <!-- 1. PREVIEW MODE BADGE (If preview) -->
        <UiBadge
          v-if="props.isPreview"
          variant="purple"
          style-type="glow"
          size="md"
          :icon="Eye"
        >
          Design Preview Mode
        </UiBadge>

        <template v-else>
          <!-- 2. GLOBAL GAME (BASE & WAVE) INDICATORS -->
          <div class="glass-panel px-2.5 sm:px-3 py-1 landscape:py-0.5 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-xl flex items-center gap-2 sm:gap-2.5 text-xs backdrop-blur-md">
            
            <!-- Base Lives -->
            <div 
              class="flex items-center gap-1 shrink-0" 
              :class="characterStore.playerLives <= 5 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-200'"
              title="Remaining base lives"
            >
              <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
              <span class="font-mono font-bold text-xs">
                {{ characterStore.playerLives }}<span class="text-slate-500 font-normal text-[10px]">/{{ characterStore.maxLives }}</span>
              </span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Wave -->
            <div class="flex items-center gap-1 shrink-0" title="Current wave">
              <Swords class="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-purple-200">
                {{ characterStore.currentWaveIndex + 1 }}<span class="text-slate-500 font-normal text-[10px]">/{{ characterStore.waveConfigs.length || 0 }}</span>
              </span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Alive Enemies -->
            <div class="flex items-center gap-1 shrink-0 text-slate-300" title="Enemies alive on map">
              <Users class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-cyan-200">
                {{ characterStore.aliveEnemiesCount }}
              </span>
            </div>

            <!-- Leaked Enemies -->
            <template v-if="characterStore.leakedEnemiesCount > 0">
              <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>
              <div class="flex items-center gap-1 shrink-0 text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded-lg border border-rose-500/40" title="Enemies leaked into base">
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
            <div class="flex items-center gap-1 shrink-0" title="Current gold balance">
              <Coins class="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-amber-300">{{ characterStore.gold }}</span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0"></div>

            <!-- Total Kills -->
            <div class="flex items-center gap-1 shrink-0" title="Total enemies killed">
              <Skull class="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span class="font-mono font-bold text-xs text-rose-300">{{ characterStore.totalKills }}</span>
            </div>

            <div class="h-3.5 w-px bg-slate-800 shrink-0 hidden sm:block"></div>

            <!-- Score -->
            <div class="hidden sm:flex items-center gap-1 shrink-0" title="Score points">
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
              class="glass-panel px-2 sm:px-2.5 py-1 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs shadow-lg backdrop-blur-md transition-all border"
              :class="p.id === multiplayerStore.myPlayerId ? 'bg-slate-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-emerald-500/10' : 'bg-slate-950/85 border-slate-800/80'"
            >
              <div 
                class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg sm:rounded-xl border border-white/40 flex items-center justify-center text-[10px] font-black text-slate-950 shrink-0 shadow-sm"
                :style="{ backgroundColor: p.color || '#38bdf8' }"
                :title="p.name"
              >
                {{ (p.name || 'P').slice(0, 1).toUpperCase() }}
              </div>

              <div class="flex items-center gap-1.5 min-w-0">
                <span 
                  class="font-bold truncate max-w-[65px] sm:max-w-[85px]"
                  :class="p.id === multiplayerStore.myPlayerId ? 'text-white' : 'text-slate-300'"
                >
                  {{ p.name }}
                </span>

                <span class="font-mono font-black text-amber-300 flex items-center gap-0.5 text-[11px]">
                  <Coins class="w-3 h-3 text-amber-400 shrink-0" />{{ p.gold ?? 0 }}
                </span>

                <span class="text-slate-600 hidden sm:inline">•</span>

                <span class="font-mono text-rose-300 hidden sm:flex items-center gap-0.5 text-[10px]" title="Kills">
                  <Skull class="w-2.5 h-2.5 text-rose-400 shrink-0" />{{ p.killsCount ?? 0 }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Right: Unified Action Dock (Exit, Fullscreen, Zoom In +, Zoom Out -, Center) -->
      <div class="flex items-center pointer-events-auto">
        <div class="glass-panel p-1 landscape:p-0.5 rounded-xl sm:rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/80 flex items-center gap-1 sm:gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
          
          <!-- 1. Exit / Back to Editor Button -->
          <UiButton
            variant="danger"
            size="xs"
            :leading-icon="ArrowLeft"
            :title="props.isPreview ? 'Back to editor' : 'Exit game'"
            @click="handleExitGame"
          >
            <span class="text-[11px] sm:text-xs font-bold">{{ props.isPreview ? 'Edit' : 'Exit' }}</span>
          </UiButton>

          <div class="h-4 w-px bg-slate-800/80"></div>

          <!-- 2. Fullscreen Button -->
          <UiIconButton
            variant="default"
            size="sm"
            :icon="isFullscreenMode ? Minimize2 : Maximize2"
            :title="isFullscreenMode ? 'Exit Fullscreen' : 'Enter Fullscreen'"
            @click="handleToggleFullscreen"
          />

          <div class="h-4 w-px bg-slate-800/80"></div>

          <!-- 3. Zoom In (+) Button -->
          <UiIconButton
            variant="default"
            size="sm"
            :icon="Plus"
            title="Zoom In (+)"
            @click="handleZoomIn"
          />

          <!-- 4. Zoom Out (-) Button -->
          <UiIconButton
            variant="default"
            size="sm"
            :icon="Minus"
            title="Zoom Out (-)"
            @click="handleZoomOut"
          />

          <!-- 5. Center Focus Button -->
          <UiIconButton
            variant="success"
            size="sm"
            :icon="Crosshair"
            title="Reset View to Center"
            @click="handleFocusCenter"
          />

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
        <button type="button" class="text-slate-400 hover:text-white cursor-pointer" @click="showDiagnostics = false">✕</button>
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
  Heart, Coins, Swords, Trophy, Skull, ArrowLeft, Maximize2, Minimize2, Eye, Activity, Plus, Minus, Crosshair, Users, DoorOpen 
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiBadge } from '../ui'
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

  if (confirm("Exit game and return to editor?")) {
    characterStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else {
      router.push('/editor')
    }
  }
}
</script>
