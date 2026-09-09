<template>
  <div class="relative h-dvh min-h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <!-- 1. FULL SCREEN GAME ISOMETRIC CANVAS VIEWPORT -->
    <div class="absolute inset-0 z-0 overflow-hidden w-full h-full">
      <GameCanvas v-if="isMapLoaded" ref="canvasRef" @ready="handleCanvasReady" />

      <!-- Seamless Canvas Readiness Preloader (Covers everything until PixiJS canvas is 100% rendered) -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-400 ease-in-out"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-102 pointer-events-none"
      >
        <div 
          v-if="!isCanvasReady" 
          class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <!-- Ambient Background Glows -->
          <div class="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none"></div>
          <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>

          <div class="relative z-10 flex flex-col items-center max-w-sm w-full">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-4 animate-bounce">
              <Shield class="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>

            <!-- Prominent Map Title -->
            <h2 class="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mb-1 drop-shadow-md">
              {{ mapStore.project.name || 'Battlefield' }}
            </h2>
            <p class="text-xs font-semibold text-amber-400 mb-6 tracking-widest uppercase flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>{{ characterStore.loadingMessage || $t('home.loadingMap') }}</span>
            </p>

            <!-- Minimal Linear Progress Bar -->
            <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner mb-2 p-0.5">
              <div 
                class="h-full bg-linear-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-200 rounded-full shadow-sm shadow-amber-500/50"
                :style="{ width: `${characterStore.loadingProgress || 50}%` }"
              ></div>
            </div>
            <span class="font-mono text-xs text-slate-500 font-bold">
              {{ Math.round(characterStore.loadingProgress || 50) }}%
            </span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 2. FLOATING TOP IN-GAME HUD (Semi-transparent, compact) -->
    <div class="absolute top-0 inset-x-0 z-30 pointer-events-none pt-safe">
      <GameHud />
    </div>

    <!-- 3. FLOATING BOTTOM CONTROLS & TOWER SHOP (Semi-transparent, compact) -->
    <div class="absolute bottom-0 inset-x-0 z-30 pointer-events-none pb-safe">
      <GameControls />
    </div>

    <!-- Floating In-Game Multiplayer Chat Sidebar -->
    <div 
      v-if="isChatOpen && multiplayerStore.roomId"
      class="absolute inset-x-3 bottom-20 top-16 sm:inset-auto sm:right-4 sm:bottom-24 sm:w-80 sm:h-96 z-40 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-200 shadow-2xl pointer-events-auto"
    >
      <LobbyChat />
    </div>

    <!-- 4. Mobile Portrait to Landscape Recommendation Overlay -->
    <div 
      v-if="isPortrait && !dismissOrientationAlert" 
      class="fixed inset-0 z-60 bg-slate-950/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 select-none"
    >
      <div class="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10">
        <Smartphone class="w-8 h-8 rotate-90 text-amber-400 animate-pulse" />
      </div>

      <h3 class="text-base font-black text-white mb-1.5 tracking-wide">
        {{ $t('game.rotateToLandscape') }}
      </h3>
      <p class="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
        {{ $t('game.rotateLandscapeDesc') }}
      </p>

      <div class="flex flex-col gap-2 w-full max-w-xs">
        <button 
          @click="handleEnableFullscreen" 
          class="w-full py-3 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-target"
        >
          <Maximize2 class="w-4 h-4" />
          <span>{{ $t('game.fullscreen') }}</span>
        </button>
        <button 
          @click="dismissOrientationAlert = true" 
          class="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs cursor-pointer active:scale-95 touch-target"
        >
          {{ $t('game.continue') }}
        </button>
      </div>
    </div>

    <!-- 5. Game Over & Victory Modals -->
    <GameOverModal />
    <GameVictoryModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { MessageSquare, Map, Shield, Smartphone, Maximize2 } from 'lucide-vue-next'
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
import { toggleAppFullscreen } from '../utils/fullscreen'

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()

const canvasRef = ref<any>(null)
const isCanvasReady = ref(false)
const isChatOpen = ref(false)
const unreadCount = ref(0)
const isPortrait = ref(false)
const dismissOrientationAlert = ref(false)

function handleCanvasReady() {
  isCanvasReady.value = true
}

function checkOrientation() {
  if (typeof window === 'undefined') return
  const isMobile = window.innerWidth < 1024 || ('ontouchstart' in window)
  isPortrait.value = isMobile && (window.innerHeight > window.innerWidth)
}

async function handleEnableFullscreen() {
  await toggleAppFullscreen()
  dismissOrientationAlert.value = true
}

const isMapLoaded = computed(() => {
  return mapStore.project.layers && mapStore.project.layers.length > 0 && mapStore.project.cols > 0
})

onMounted(async () => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)

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
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkOrientation)
    window.removeEventListener('orientationchange', checkOrientation)
  }
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
