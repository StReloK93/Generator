<template>
  <div class="relative h-dvh min-h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <!-- 1. FULL SCREEN GAME ISOMETRIC CANVAS VIEWPORT -->
    <div class="absolute inset-0 z-0 overflow-hidden w-full h-full">
      <GameCanvas v-if="isMapLoaded" ref="canvasRef" @ready="handleCanvasReady" />

      <!-- Seamless Canvas Readiness Preloader (Covers everything until PixiJS canvas is 100% rendered) -->
      <Transition name="preloader-fade">
        <div 
          v-if="!isCanvasReady && !isLeavingRoute" 
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
              {{ mapStore.project.name || $t('game.battlefield') }}
            </h2>
            <p class="text-xs font-semibold text-amber-400 mb-6 tracking-widest uppercase flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>{{ characterStore.loadingMessage || $t('home.loadingMap') }}</span>
            </p>

            <!-- Minimal Linear Progress Bar -->
            <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner mb-2 p-0.5">
              <div 
                class="h-full bg-linear-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-300 ease-out rounded-full shadow-sm shadow-amber-500/50"
                :style="{ width: `${characterStore.loadingProgress}%` }"
              ></div>
            </div>
            <span class="font-mono text-xs text-slate-500 font-bold">
              {{ Math.round(characterStore.loadingProgress) }}%
            </span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 2. FLOATING TOP IN-GAME HUD (Slides smoothly in from top when canvas is ready) -->
    <Transition name="hud-slide-top">
        <GameHud v-if="isCanvasReady"  />
    </Transition>

    <!-- 3. FLOATING BOTTOM CONTROLS & TOWER SHOP (Slides smoothly in from bottom when canvas is ready) -->
    <Transition name="controls-slide-bottom">
      <div 
        v-if="isCanvasReady" 
        class="absolute bottom-0 inset-x-0 z-30 pointer-events-none"
      >
        <GameControls />
      </div>
    </Transition>

    <!-- 4. Floating In-Game Multiplayer Chat Sidebar -->
    <div 
      v-if="isChatOpen && multiplayerStore.roomId"
      class="absolute inset-x-3 bottom-20 top-16 sm:inset-auto sm:right-4 sm:bottom-24 sm:w-80 sm:h-96 z-40 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-200 shadow-2xl pointer-events-auto"
    >
      <LobbyChat />
    </div>

    <!-- 5. Game Over, Victory & Clan Select Modals -->
    <GameOverModal />
    <GameVictoryModal />
    <ClanSelectModal />

    <!-- 6. Slot for Editor-Only Test Tools & Overlays -->
    <slot name="editor-tools" v-if="isCanvasReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { Shield } from 'lucide-vue-next'
import GameCanvas from './GameCanvas.vue'
import GameHud from './GameHud.vue'
import GameControls from './GameControls.vue'
import GameOverModal from './GameOverModal.vue'
import GameVictoryModal from './GameVictoryModal.vue'
import ClanSelectModal from './ClanSelectModal.vue'
import LobbyChat from '../LobbyChat.vue'
import { useMapStore } from '../../stores/mapStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useAssetStore } from '../../stores/assetStore'
import { useI18n } from '../../stores/i18nStore'
import { networkSyncBuffer } from '../../services/networkSync'
import { lockLandscape } from '../../utils/pwaOrientation'
import { 
  getGameMapDataById, 
  getEditorMapDataById,
  applyMapPayloadToStores 
} from '../../services/mapManager'
import { useNotificationStore } from '../../stores/notificationStore'

const props = withDefaults(
  defineProps<{
    isEditorMode?: boolean
  }>(),
  {
    isEditorMode: false,
  }
)

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

const canvasRef = ref<any>(null)
const isCanvasReady = ref(false)
const isLeavingRoute = ref(false)
const isChatOpen = ref(false)
const unreadCount = ref(0)

function handleCanvasReady() {
  isCanvasReady.value = true
}

const isMapLoaded = computed(() => {
  return mapStore.project.layers && mapStore.project.layers.length > 0 && mapStore.project.cols > 0
})

onMounted(async () => {
  // Lock screen to landscape orientation if supported
  lockLandscape()

  // Track entry source explicitly based on mode
  if (props.isEditorMode) {
    characterStore.entrySource = 'editor'
  } else if (!characterStore.entrySource || characterStore.entrySource === 'editor') {
    characterStore.entrySource = multiplayerStore.roomId ? 'lobby' : 'play'
  }

  // 1. Resolve Map or Multiplayer Room from route params
  const rawId = (route.params.mapId as string) || (route.params.roomId as string) || ''
  
  // DIRECT ACCESS FORBIDDEN: without mapId or roomId redirects to home
  if (!rawId) {
    router.replace('/')
    return
  }

  const isRoomCode = rawId && /^[A-Za-z0-9]{6}$/.test(rawId) && !getGameMapDataById(rawId)

  // 2. Single Player game / Editor game:
  if (!isRoomCode && (!multiplayerStore.roomId || multiplayerStore.roomId === '')) {
    if (props.isEditorMode || characterStore.entrySource === 'editor') {
      const editorData = getEditorMapDataById(rawId) || getGameMapDataById(rawId)
      if (editorData) {
        applyMapPayloadToStores(editorData.payload)
      } else if (!isMapLoaded.value) {
        notify.error(t('common.error') || 'Xarita topilmadi')
        router.replace('/')
        return
      }
    } else {
      const mapData = getGameMapDataById(rawId)
      if (!mapData) {
        notify.error(t('common.error') || 'Xarita topilmadi')
        router.replace('/')
        return
      }
      applyMapPayloadToStores(mapData.payload)
    }
  }

  isCanvasReady.value = false
  characterStore.startLoadingScreen(mapStore.project.name || t('game.battlefield'))

  mapStore.isGameMap = true
  multiplayerStore.setRouter(router)
  await assetStore.loadBuiltinSprites()

  if (isMapLoaded.value) {
    initializeGameSession()
  }
})

function initializeGameSession() {
  if (!isMapLoaded.value) return
  towerStore.initGameClanSelection()
  if (!multiplayerStore.roomId || multiplayerStore.isHost) {
    characterStore.startPlayMode()
  } else {
    characterStore.isGameMode = true
    characterStore.isEnabled = true
    towerStore.clearCombatEffects()
  }
}

watch(isMapLoaded, (loaded) => {
  if (loaded && !characterStore.isGameMode) {
    initializeGameSession()
  }
})

// Full lifecycle teardown when leaving the game
function cleanupGameSession() {
  isCanvasReady.value = false
  characterStore.exitPlayMode()
  towerStore.clearCombatEffects()
  networkSyncBuffer.clear()
}

onBeforeRouteLeave((_to, _from, next) => {
  isLeavingRoute.value = true
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

<style scoped>
/* Preloader Smooth Fade Out */
.preloader-fade-leave-active {
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.preloader-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
  pointer-events: none;
}

/* Top In-Game HUD slide-down from top with smooth spring-like curve */
.hud-slide-top-enter-active {
  transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out;
  transition-delay: 80ms;
}
.hud-slide-top-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.hud-slide-top-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.hud-slide-top-leave-active {
  transition: transform 0.25s ease-in, opacity 0.25s ease-in;
}
.hud-slide-top-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Bottom Controls slide-up from bottom with smooth spring-like curve */
.controls-slide-bottom-enter-active {
  transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out;
  transition-delay: 150ms;
}
.controls-slide-bottom-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.controls-slide-bottom-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.controls-slide-bottom-leave-active {
  transition: transform 0.25s ease-in, opacity 0.25s ease-in;
}
.controls-slide-bottom-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
