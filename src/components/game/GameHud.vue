<template>
  <div class="pointer-events-none z-30 flex flex-col justify-between select-none w-full gap-1 landscape:gap-0.5">
    <!-- Left & Center: Game Global Indicators + User Indicators -->
    <div class="flex flex-wrap justify-between  gap-1.5 sm:gap-2 pointer-events-auto px-2 sm:px-4 landscape:py-1">
      <!-- Right: Unified Action Dock (Exit, Fullscreen, Zoom In +, Zoom Out -, Center) -->
      <div class="flex items-center pointer-events-auto">
        <div
          class="p-0.5 landscape:p-0.5 rounded-xl sm:rounded-xl border border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/80 flex items-center gap-1 sm:gap-1.5 opacity-90 hover:opacity-100 transition-opacity">

          <!-- 1. Exit / Back to Editor Button -->
          <UiButton variant="danger" size="sm" :leading-icon="ArrowLeft" title="Exit game" @click="handleExitGame">
          </UiButton>

          <!-- 2. Fullscreen Button -->
          <UiButton variant="ghost" size="sm" :leading-icon="isFullscreenMode ? Minimize2 : Maximize2"
            title="Toggle Fullscreen" @click="handleToggleFullscreen" />

          <!-- 3. Center Focus Button -->
          <UiButton variant="ghost" size="sm" :leading-icon="Crosshair" title="Reset View to Center"
            @click="handleFocusCenter" />

        </div>
      </div>
      <!-- 2. GLOBAL GAME (BASE & WAVE) INDICATORS -->


      <!-- Singleplayer User Stats -->
      <UiCard v-if="!multiplayerStore.roomId" class="px-2.5 landscape:py-0.5 flex gap-3">
        <!-- Gold -->
        <div class="flex items-center gap-1" title="Current gold balance">
          <DollarSign class="size-4 text-amber-400 " />
          <span class="font-bold  text-amber-400">{{ characterStore.gold }}</span>
        </div>

        <!-- Total Kills -->
        <div class="flex items-center gap-1" title="Total enemies killed">
          <Skull class="size-4 text-rose-400 " />
          <span class="font-bold  text-rose-300">{{ characterStore.totalKills }}</span>
        </div>

        <!-- Base Lives -->
        <div class="flex items-center gap-1"
          :class="characterStore.playerLives <= 5 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-200'"
          title="Remaining base lives">
          <Heart class="size-4 text-rose-500 fill-rose-500" />
          <span class="font-bold ">
            {{ characterStore.playerLives }}
          </span>
        </div>


        <!-- Wave -->
        <div class="flex items-center gap-1 shrink-0" title="Current wave">
          <Swords class="size-4 text-purple-400 shrink-0" />
          <span class="font-mono font-bold text-xs text-purple-200">
            {{ characterStore.currentWaveIndex + 1 }}<span class="text-slate-500 font-normal text-[10px]">/{{
              characterStore.waveConfigs.length || 0 }}</span>
          </span>
        </div>
      </UiCard>

      <!-- Multiplayer Players Leaderboard Cards -->
      <div v-else class="flex flex-wrap items-center gap-1.5 sm:gap-2" @mousedown.stop @mouseup.stop @click.stop
        @touchstart.stop @touchend.stop @touchmove.stop>
        <div v-for="p in multiplayerStore.players" :key="p.id"
          class="px-2 sm:px-2.5 py-1 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs shadow-lg backdrop-blur-md transition-all border"
          :class="p.id === multiplayerStore.myPlayerId ? 'bg-slate-900/95 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-emerald-500/10' : 'bg-slate-950/85 border-slate-800/80'">
          <div
            class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg sm:rounded-xl border border-white/40 flex items-center justify-center text-[10px] font-black text-slate-950 shrink-0 shadow-sm"
            :style="{ backgroundColor: p.color || '#38bdf8' }" :title="p.name">
            {{ (p.name || 'P').slice(0, 1).toUpperCase() }}
          </div>

          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-bold truncate max-w-16.25 sm:max-w-21.25"
              :class="p.id === multiplayerStore.myPlayerId ? 'text-white' : 'text-slate-300'">
              {{ p.name }}
            </span>

            <span class="font-mono font-black text-amber-300 flex items-center gap-0.5 text-[11px]">
              <Coins class="w-3 h-3 text-amber-400 shrink-0" />{{ p.gold ?? 0 }}
            </span>

            <span class="text-slate-600 hidden sm:inline">•</span> <span
              class="font-mono text-rose-300 hidden sm:flex items-center gap-0.5 text-[10px]" title="Kills">
              <Skull class="w-2.5 h-2.5 text-rose-400 shrink-0" />{{ p.killsCount ?? 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>



    <!-- Network & Performance Diagnostics Overlay (When FPS badge is clicked) -->
    <div v-if="showDiagnostics"
      class="px-3 py-2 rounded-xl bg-slate-950/98 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col gap-1 text-[10px] font-mono text-slate-300 w-64 animate-in fade-in zoom-in-95 duration-150 absolute top-14 left-4 z-40"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <div class="flex items-center justify-between pb-1 border-b border-slate-800 font-bold text-sky-400">
        <span class="flex items-center gap-1.5">
          <Activity class="size-5" /> Performance Telemetry
        </span>
        <button type="button" class="text-slate-400 hover:text-white cursor-pointer"
          @click="showDiagnostics = false">✕</button>
      </div>

      <div class="flex justify-between">
        <span class="text-slate-400">FPS:</span>
        <span :class="characterStore.fps >= 50 ? 'text-emerald-400' : 'text-rose-400'">{{ characterStore.fps }} fps ({{
          (1000 / Math.max(1, characterStore.fps)).toFixed(1) }}ms)</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">Units on Field:</span>
        <span class="text-white">{{ (networkSyncBuffer.renderUnitsList.length > 0 ?
          networkSyncBuffer.renderUnitsList.length
          : characterStore.units.length) }}</span>
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
          <span class="text-emerald-300">{{ networkSyncBuffer.ppsOut }} pkt/s ({{ networkSyncBuffer.kbpsOut }}
            KB/s)</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Role:</span>
          <span class="text-purple-300 font-bold">
            {{ multiplayerStore.isHost ? 'Host (Authoritative)' : 'Client (P2P Lerp 60FPS)' }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Heart, DollarSign, Swords, Skull, ArrowLeft, Maximize2, Minimize2, Activity, Crosshair, Users, DoorOpen
} from 'lucide-vue-next'
import { UiButton,UiCard } from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { networkSyncBuffer } from '../../services/networkSync'
import { toggleAppFullscreen, isAppFullscreen } from '../../utils/fullscreen'

const router = useRouter()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()

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

function handleFocusCenter() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-focus-center'))
  }
}

async function handleExitGame() {
  const confirmed = await notify.confirm({
    title: 'O\'yindan chiqish',
    message: multiplayerStore.roomId
      ? 'Haqiqatan ham xonani tark etmoqchimisiz?'
      : 'O\'yindan chiqib, xarita tahrirlovchisiga (Editor) qaytmoqchimisiz?',
    confirmText: 'Chiqish',
    cancelText: 'Bekor qilish',
    variant: 'danger',
  })

  if (confirmed) {
    characterStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else {
      router.push('/editor')
    }
  }
}
</script>
