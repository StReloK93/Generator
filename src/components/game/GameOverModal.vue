<template>
  <UiModal
    :is-open="gameStore.gameState === 'game_over'"
    :title="$t('game.defeatTitle')"
    :subtitle="$t('game.defeatDesc')"
    :icon="Skull"
    icon-color="rose"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    body-class="flex flex-col items-center text-center gap-3.5"
  >
    <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-500 animate-pulse shrink-0">
      <Skull class="w-6 h-6 sm:w-8 sm:h-8" />
    </div>

    <!-- Multiplayer Player Scoreboard -->
    <div 
      v-if="multiplayerStore.roomId && multiplayerStore.players.length > 0"
      class="w-full flex flex-col gap-1.5 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800"
    >
      <div class="text-[11px] font-bold text-slate-300 flex items-center justify-between px-1 pb-1 border-b border-slate-800/80">
        <span>{{ $t('lobby.playersList') || 'Players' }}</span>
        <span class="text-purple-300 font-mono text-[10px]">{{ $t('game.wave') }}: {{ waveStore.currentWaveIndex + 1 }}</span>
      </div>

      <div class="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
        <div 
          v-for="p in multiplayerStore.players" 
          :key="p.id"
          class="flex items-center justify-between p-1.5 rounded-xl border text-xs font-mono transition-all"
          :class="p.id === multiplayerStore.myPlayerId 
            ? 'bg-brand-950/40 border-brand-500/50 shadow-xs' 
            : 'bg-slate-950/60 border-slate-800/80'"
        >
          <!-- Player Avatar & Name -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div 
              class="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-950"
              :style="{ backgroundColor: p.color || '#38bdf8' }"
            >
              {{ (p.slotIndex ?? 0) + 1 }}
            </div>
            <span class="font-sans font-bold truncate text-slate-200" :class="{ 'text-brand-300': p.id === multiplayerStore.myPlayerId }">
              {{ p.name }}
              <span v-if="p.id === multiplayerStore.myPlayerId" class="text-[10px] font-normal text-slate-400"> ({{ $t('lobby.you') }})</span>
            </span>
          </div>

          <!-- Player Stats -->
          <div class="flex items-center gap-3 shrink-0 text-[11px]">
            <span class="flex items-center gap-1 text-amber-400 font-semibold" :title="$t('game.goldEarned')">
              <Coins class="w-3.5 h-3.5" />
              {{ p.totalGoldEarned ?? p.gold ?? 0 }}
            </span>
            <span class="flex items-center gap-1 text-rose-400 font-semibold" :title="$t('game.kills')">
              <Skull class="w-3.5 h-3.5" />
              {{ p.killsCount ?? 0 }}
            </span>
            <span class="flex items-center gap-1 text-brand-400 font-semibold" :title="$t('tower.buildCount')">
              <Castle class="w-3.5 h-3.5" />
              {{ p.towersBuilt ?? 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Single Player Stats Bar -->
    <div 
      v-else 
      class="flex items-center gap-3 sm:gap-4 bg-slate-900/80 px-3 sm:px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs"
    >
      <span>{{ $t('game.wave') }}: <strong class="text-purple-300">{{ waveStore.currentWaveIndex + 1 }}</strong></span>
      <span class="flex items-center gap-1">{{ $t('game.goldEarned') }}: <Coins class="w-3.5 h-3.5 text-amber-400" /><strong class="text-amber-400">{{ gameStore.totalGoldEarned || gameStore.gold }}</strong></span>
      <span class="flex items-center gap-1">{{ $t('game.kills') }}: <Skull class="w-3.5 h-3.5 text-rose-400" /><strong class="text-rose-400">{{ gameStore.totalKills }}</strong></span>
    </div>

    <!-- Action Buttons Footer -->
    <template #footer>
      <div class="grid grid-cols-2 gap-2 w-full">
        <!-- In Multiplayer -->
        <template v-if="multiplayerStore.roomId">
          <UiButton
            variant="game-green"
            size="sm"
            :leading-icon="Home"
            @click="multiplayerStore.returnToLobby(router)"
          >
            {{ $t('lobby.title') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="LogOut"
            @click="multiplayerStore.leaveRoom(router)"
          >
            {{ $t('lobby.leaveLobby') }}
          </UiButton>
        </template>

        <!-- In Single Player Mode -->
        <template v-else>
          <UiButton
            variant="danger"
            size="sm"
            :leading-icon="RotateCcw"
            @click="handleRestartGame"
          >
            {{ $t('common.playAgain') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="gameStore.entrySource === 'editor' || route.name === 'editor-game' ? Layers : Home"
            @click="handleExit"
          >
            {{ gameStore.entrySource === 'editor' || route.name === 'editor-game' ? $t('game.returnEditor') : $t('game.returnHome') }}
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { Skull, Home, LogOut, RotateCcw, Layers, Coins, Castle } from 'lucide-vue-next'
import { UiModal, UiButton } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useGameStore } from '../../stores/gameStore'
import { useWaveStore } from '../../stores/waveStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { sanitizeMapId } from '../../services/mapManager'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const gameStore = useGameStore()
const waveStore = useWaveStore()
const multiplayerStore = useMultiplayerStore()

function handleRestartGame() {
  gameStore.restartGame()
}

function handleExit() {
  gameStore.exitPlayMode()
  if (gameStore.entrySource === 'editor' || route.name === 'editor-game') {
    const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || (route.params.mapId as string) || 'julion')
    router.push(`/editor/${cleanId}`)
  } else {
    router.push('/')
  }
}
</script>
