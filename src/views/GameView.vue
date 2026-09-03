<template>
  <div class="relative h-dvh min-h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none flex flex-col justify-between pt-safe pb-safe">
    <!-- 1. Top In-Game HUD -->
    <GameHud />

    <!-- 2. Main Game Isometric Canvas Viewport -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Loading Overlay when map is transferring or loading -->
      <div 
        v-if="!isMapLoaded" 
        class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center shadow-xl shadow-brand-500/10 animate-bounce">
          <Map class="w-7 h-7 sm:w-8 sm:h-8 text-brand-400" />
        </div>
        <div class="space-y-1">
          <h3 class="text-sm sm:text-base font-bold text-white">Karta Yuklanmoqda...</h3>
          <p class="text-xs text-slate-400">Barcha qatlamlar va chiqish yo'llari sinxronlashtirilmoqda</p>
        </div>
        <div class="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full bg-linear-to-r from-brand-500 to-indigo-500 animate-pulse w-3/4 rounded-full"></div>
        </div>
      </div>

      <GameCanvas v-if="isMapLoaded" ref="canvasRef" />

      <!-- Floating In-Game Multiplayer Chat Sidebar -->
      <div 
        v-if="isChatOpen && multiplayerStore.roomId"
        class="absolute inset-x-3 bottom-20 top-16 sm:inset-auto sm:right-4 sm:bottom-24 sm:w-80 sm:h-96 z-40 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-200 shadow-2xl"
      >
        <LobbyChat />
      </div>

      <!-- Chat Toggle Button (In Multiplayer) -->
      <button 
        v-if="multiplayerStore.roomId"
        @click="isChatOpen = !isChatOpen"
        class="absolute right-4 bottom-28 z-30 p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-sky-500/40 shadow-2xl cursor-pointer active:scale-95 touch-target flex items-center gap-1.5"
        title="Chatni ochish"
      >
        <MessageSquare class="w-4 h-4" />
        <span v-if="unreadCount > 0" class="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
          {{ unreadCount }}
        </span>
      </button>
    </div>

    <!-- 3. Bottom Controls & Tower Shop -->
    <GameControls />

    <!-- 4. Game Over & Victory Modals -->
    <GameOverModal />
    <GameVictoryModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { MessageSquare, Map } from 'lucide-vue-next'
import GameCanvas from '../components/game/GameCanvas.vue'
import GameHud from '../components/game/GameHud.vue'
import GameControls from '../components/game/GameControls.vue'
import GameOverModal from '../components/game/GameOverModal.vue'
import GameVictoryModal from '../components/game/GameVictoryModal.vue'
import LobbyChat from '../components/LobbyChat.vue'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useAssetStore } from '../stores/assetStore'
import { networkSyncBuffer } from '../services/networkSync'

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

const canvasRef = ref<any>(null)
const isChatOpen = ref(false)
const unreadCount = ref(0)

const isMapLoaded = computed(() => {
  return mapStore.project.layers && mapStore.project.layers.length > 0 && mapStore.project.cols > 0
})

onMounted(async () => {
  mapStore.isGameMap = true
  multiplayerStore.setRouter(router)
  await assetStore.loadBuiltinSprites()

  if (isMapLoaded.value) {
    characterStore.detectDoors()
    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.startPlayMode()
    } else {
      characterStore.isGameMode = true
      characterStore.isEnabled = true
      towerStore.clearCombatEffects()
    }
  }
})

watch(isMapLoaded, async (loaded) => {
  if (loaded) {
    await assetStore.loadBuiltinSprites()
    characterStore.detectDoors()
    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.startPlayMode()
    } else {
      characterStore.isGameMode = true
      characterStore.isEnabled = true
      towerStore.clearCombatEffects()
    }
  }
})

// Full lifecycle teardown when leaving the game
function cleanupGameSession() {
  characterStore.exitPlayMode()
  characterStore.isPlaying = false
  characterStore.isGameMode = false
  characterStore.gameState = 'ready'
  characterStore.units = []
  towerStore.clearCombatEffects()
  networkSyncBuffer.clear()
}

onBeforeRouteLeave((_to, _from, next) => {
  cleanupGameSession()
  next()
})

onUnmounted(() => {
  cleanupGameSession()
})

watch(
  () => multiplayerStore.chatMessages.length,
  () => {
    if (!isChatOpen.value) {
      unreadCount.value++
    }
  }
)

watch(isChatOpen, (open) => {
  if (open) {
    unreadCount.value = 0
  }
})
</script>
