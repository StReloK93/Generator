<template>
  <UiModal
    :is-open="characterStore.gameState === 'game_over'"
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

    <div class="flex items-center gap-3 sm:gap-4 bg-slate-900/80 px-3 sm:px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
      <span>{{ $t('game.wave') }}: <strong class="text-purple-300">{{ characterStore.currentWaveIndex + 1 }}</strong></span>
      <span class="flex items-center gap-1">{{ $t('game.goldEarned') }}: <Coins class="w-3.5 h-3.5 text-amber-400" /><strong class="text-amber-400">{{ characterStore.totalGoldEarned }}</strong></span>
      <span class="flex items-center gap-1">{{ $t('game.kills') }}: <Skull class="w-3.5 h-3.5 text-rose-400" /><strong class="text-rose-400">{{ characterStore.totalKills }}</strong></span>
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
            @click="characterStore.restartGame()"
          >
            {{ $t('game.playAgain') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="characterStore.entrySource === 'editor' ? Layers : Home"
            @click="handleExit"
          >
            {{ characterStore.entrySource === 'editor' ? $t('game.returnEditor') : $t('game.returnHome') }}
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { Skull, Home, LogOut, RotateCcw, Layers, Coins } from 'lucide-vue-next'
import { UiModal, UiButton } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { sanitizeMapId } from '../../services/mapManager'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const multiplayerStore = useMultiplayerStore()

function handleExit() {
  characterStore.exitPlayMode()
  if (characterStore.entrySource === 'editor') {
    const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || (route.params.mapId as string) || 'julion')
    router.push(`/editor/${cleanId}`)
  } else {
    router.push('/')
  }
}
</script>
