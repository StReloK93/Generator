<template>
  <div class="pointer-events-none z-30 flex flex-col justify-between select-none w-full gap-1 landscape:gap-0.5">
    <!-- Left & Center: Game Global Indicators + User Indicators -->
    <div class="flex flex-wrap justify-between gap-1.5 sm:gap-2 pointer-events-auto px-2 sm:px-4 landscape:py-1">
      <!-- Right: Unified Action Dock (Menu, Exit, Fullscreen, Center, Language) -->
      <div class="flex items-center pointer-events-auto">
        <div
          class="p-0.5 landscape:p-0.5 rounded-xl sm:rounded-xl border border-slate-800/80 shadow-2xl backdrop-blur-xl bg-slate-950/80 flex items-center gap-1 sm:gap-1.5 opacity-90 hover:opacity-100 transition-opacity">

          <!-- 1. Tactical In-Game Menu Button -->
          <UiButton
            variant="ghost"
            size="sm"
            :leading-icon="Menu"
            :title="$t('game.menu')"
            @click="isMenuOpen = true"
          />

          <!-- 2. Exit / Back Button -->
          <UiButton
            variant="danger"
            size="sm"
            :leading-icon="ArrowLeft"
            :title="characterStore.entrySource === 'editor' ? $t('game.returnEditor') : $t('game.returnHome')"
            @click="handleExitGame"
          />

          <!-- 3. Fullscreen Button -->
          <UiButton
            variant="ghost"
            size="sm"
            :leading-icon="isFullscreenMode ? Minimize2 : Maximize2"
            :title="$t('game.fullscreen')"
            @click="handleToggleFullscreen"
          />

          <!-- 4. Center Focus Button -->
          <UiButton
            variant="ghost"
            size="sm"
            :leading-icon="Crosshair"
            :title="$t('header.centerToggle')"
            @click="handleFocusCenter"
          />

        </div>
      </div>
      <!-- 2. GLOBAL GAME (BASE & WAVE) INDICATORS -->


      <!-- Singleplayer User Stats -->
      <UiCard v-if="!multiplayerStore.roomId" class="px-2.5 landscape:py-0.5 flex gap-3">
        <!-- Gold -->
        <div class="flex items-center gap-1" :title="$t('game.gold')">
          <DollarSign class="size-4 text-amber-400" />
          <span class="font-bold text-amber-400">{{ characterStore.gold }}</span>
        </div>

        <!-- Total Kills -->
        <div class="flex items-center gap-1" :title="$t('game.kills')">
          <Skull class="size-4 text-rose-400" />
          <span class="font-bold text-rose-300">{{ characterStore.totalKills }}</span>
        </div>

        <!-- Base Lives -->
        <div class="flex items-center gap-1"
          :class="characterStore.playerLives <= 5 ? 'text-rose-400 animate-pulse font-black' : 'text-slate-200'"
          :title="$t('game.lives')">
          <Heart class="size-4 text-rose-500 fill-rose-500" />
          <span class="font-bold">
            {{ characterStore.playerLives }}
          </span>
        </div>


        <!-- Wave -->
        <div class="flex items-center gap-1 shrink-0" :title="$t('game.wave')">
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

    <!-- In-Game Tactical Menu Modal -->
    <UiModal
      :is-open="isMenuOpen"
      :title="$t('game.pauseMenu')"
      :subtitle="$t('game.menu')"
      :icon="Gamepad2"
      icon-color="brand"
      size="sm"
      body-class="flex flex-col gap-2.5 p-3 sm:p-4"
      @close="isMenuOpen = false"
    >
      <div class="flex flex-col gap-2.5 w-full">
        <!-- Resume Game -->
        <UiButton
          variant="game-green"
          size="md"
          class="w-full justify-center text-xs sm:text-sm font-bold"
          :leading-icon="Play"
          @click="isMenuOpen = false"
        >
          {{ $t('game.resumeGame') }}
        </UiButton>

        <!-- Restart Game (Singleplayer only) -->
        <UiButton
          v-if="!multiplayerStore.roomId"
          variant="game-amber"
          size="md"
          class="w-full justify-center text-xs sm:text-sm font-bold"
          :leading-icon="RotateCcw"
          @click="handleRestartGame"
        >
          {{ $t('game.restartGame') }}
        </UiButton>

        <!-- Exit to Home / Editor -->
        <UiButton
          variant="secondary"
          size="md"
          class="w-full justify-center text-xs sm:text-sm font-bold"
          :leading-icon="characterStore.entrySource === 'editor' ? Layers : Home"
          @click="handleExitFromMenu"
        >
          {{ characterStore.entrySource === 'editor' ? $t('game.returnEditor') : $t('game.returnHome') }}
        </UiButton>

        <!-- Language Switcher in Menu -->
        <div class="flex items-center justify-between px-3 py-2 mt-1 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
          <span class="text-slate-300 font-semibold flex items-center gap-1.5">
            <Languages class="w-4 h-4 text-cyan-400" />
            {{ $t('common.settings') }}
          </span>
          <UiLanguageSwitcher />
        </div>
      </div>
    </UiModal>

    <!-- Network & Performance Diagnostics Overlay (When FPS badge is clicked) -->
    <div v-if="showDiagnostics"
      class="px-3 py-2 rounded-xl bg-slate-950/98 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col gap-1 text-[10px] font-mono text-slate-300 w-64 animate-in fade-in zoom-in-95 duration-150 absolute top-14 left-4 z-40"
      @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop>
      <div class="flex items-center justify-between pb-1 border-b border-slate-800 font-bold text-sky-400">
        <span class="flex items-center gap-1.5">
          <Activity class="size-5" /> {{ $t('hud.telemetry') }}
        </span>
        <UiIconButton 
          :icon="X"
          size="xs"
          variant="ghost"
          @click="showDiagnostics = false"
        />
      </div>

      <div class="flex justify-between">
        <span class="text-slate-400">{{ $t('hud.fps') }}</span>
        <span :class="characterStore.fps >= 50 ? 'text-emerald-400' : 'text-rose-400'">{{ characterStore.fps }} fps ({{
          (1000 / Math.max(1, characterStore.fps)).toFixed(1) }}ms)</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">{{ $t('hud.unitsOnField') }}</span>
        <span class="text-white">{{ (networkSyncBuffer.renderUnitsList.length > 0 ?
          networkSyncBuffer.renderUnitsList.length
          : characterStore.units.length) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">{{ $t('hud.towers') }}</span>
        <span class="text-amber-400">{{ towerStore.placedTowers.length }}</span>
      </div>
      <template v-if="multiplayerStore.roomId">
        <div class="flex justify-between">
          <span class="text-slate-400">{{ $t('hud.role') }}</span>
          <span class="text-amber-300 font-bold">{{ multiplayerStore.isHost ? 'Host (Authoritative)' : 'Client (P2P)'
            }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">{{ $t('hud.packets') }}</span>
          <span>{{ networkSyncBuffer.packetsReceived }} / {{ networkSyncBuffer.packetsSent }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">{{ $t('hud.dataReceived') }}</span>
          <span>{{ (networkSyncBuffer.bytesReceived / 1024).toFixed(1) }} KB</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Heart, DollarSign, Swords, Skull, ArrowLeft, Maximize2, Minimize2, Activity, Crosshair, Users, DoorOpen, X, Menu, Gamepad2, Play, RotateCcw, Layers, Home, Coins, Languages
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiCard, UiLanguageSwitcher, UiModal } from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18nStore } from '../../stores/i18nStore'
import { networkSyncBuffer } from '../../services/networkSync'
import { toggleAppFullscreen, isAppFullscreen } from '../../utils/fullscreen'

const router = useRouter()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()
const { t } = useI18nStore()

const showDiagnostics = ref(false)
const isFullscreenMode = ref(false)
const isMenuOpen = ref(false)

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

function handleRestartGame() {
  isMenuOpen.value = false
  characterStore.restartGame()
}

function handleExitFromMenu() {
  isMenuOpen.value = false
  handleExitGame()
}

async function handleExitGame() {
  const isEditor = characterStore.entrySource === 'editor'
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
    characterStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else if (isEditor) {
      router.push('/editor')
    } else {
      router.push('/')
    }
  }
}
</script>
