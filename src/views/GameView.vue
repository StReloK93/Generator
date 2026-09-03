<template>
  <div class="relative h-dvh min-h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none flex flex-col pt-safe">
        <!-- <button 
          @click="handleExitGame"
          class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700 touch-target"
          title="Chiqish"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
        </button> -->
    <!-- Main Game Viewport -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Loading Overlay when map is transferring -->
      <div 
        v-if="!isMapLoaded" 
        class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center text-2xl sm:text-3xl shadow-xl shadow-brand-500/10 animate-bounce">
          🗺️
        </div>
        <div class="space-y-1">
          <h3 class="text-sm sm:text-base font-bold text-white">Karta Yuklanmoqda...</h3>
          <p class="text-xs text-slate-400">Barcha qatlamlar va chiqish yo'llari sinxronlashtirilmoqda</p>
        </div>
        <div class="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full bg-linear-to-r from-brand-500 to-indigo-500 animate-pulse w-3/4 rounded-full"></div>
        </div>
      </div>

      <CanvasViewport v-if="isMapLoaded" ref="viewportRef" />

      <!-- Floating In-Game Chat Sidebar (Mobile & Desktop Responsive) -->
      <div 
        v-if="isChatOpen"
        class="absolute inset-x-3 bottom-20 top-16 sm:inset-auto sm:right-4 sm:bottom-24 sm:w-80 sm:h-96 z-40 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-200 shadow-2xl"
      >
        <LobbyChat />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Clock, Heart, Coins, MessageSquare, Skull } from 'lucide-vue-next'
import CanvasViewport from '../components/CanvasViewport.vue'
import LobbyChat from '../components/LobbyChat.vue'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useAssetStore } from '../stores/assetStore'

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

const viewportRef = ref<any>(null)
const isChatOpen = ref(false)
const unreadCount = ref(0)

const isMapLoaded = computed(() => {
  return mapStore.project.layers && mapStore.project.layers.length > 0 && mapStore.project.cols > 0
})

onMounted(async () => {
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

function handleExitGame() {
  if (confirm("O'yindan chiqmoqchimisiz?")) {
    characterStore.exitPlayMode()
    multiplayerStore.leaveRoom(router)
  }
}

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
