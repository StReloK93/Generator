<template>
  <UiModal
    :is-open="characterStore.gameState === 'victory'"
    title="Victory!"
    subtitle="All waves successfully defended! The stronghold is safe."
    :icon="Trophy"
    icon-color="amber"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    body-class="flex flex-col items-center text-center gap-3.5"
  >
    <div 
      class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-600/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 animate-bounce shrink-0"
    >
      <Trophy class="w-6 h-6 sm:w-8 sm:h-8" />
    </div>

    <div 
      class="flex items-center gap-3 sm:gap-4 bg-slate-900/80 px-3 sm:px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs"
    >
      <span class="flex items-center gap-1">Gold: <Coins class="w-3.5 h-3.5 text-amber-400" /><strong class="text-amber-400">{{ characterStore.gold }}</strong></span>
      <span class="flex items-center gap-1">Score: <Trophy class="w-3.5 h-3.5 text-yellow-300" /><strong class="text-yellow-300">{{ characterStore.score }}</strong></span>
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
            Lobby
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="LogOut"
            @click="multiplayerStore.leaveRoom(router)"
          >
            Leave
          </UiButton>
        </template>

        <!-- In Single Player Mode -->
        <template v-else>
          <UiButton
            variant="game-amber"
            size="sm"
            @click="characterStore.restartGame()"
          >
            Play Again
          </UiButton>
          <UiButton
            variant="secondary"
            size="sm"
            @click="handleReturnToEditor"
          >
            Editor
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Trophy, Coins, Home, LogOut } from 'lucide-vue-next'
import { UiModal, UiButton } from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'

const router = useRouter()
const characterStore = useCharacterStore()
const multiplayerStore = useMultiplayerStore()

function handleReturnToEditor() {
  characterStore.exitPlayMode()
  router.push('/editor')
}
</script>
