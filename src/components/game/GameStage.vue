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
          <div class="absolute inset-0 bg-[radial-gradient(#e9b63c_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none"></div>
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
              <span>{{ gameStore.loadingMessage || $t('home.loadingMap') }}</span>
            </p>

            <!-- Minimal Linear Progress Bar -->
            <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner mb-2 p-0.5">
              <div 
                class="h-full bg-linear-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-300 ease-out rounded-full shadow-sm shadow-amber-500/50"
                :style="{ width: `${gameStore.loadingProgress}%` }"
              ></div>
            </div>
            <span class="text-xs text-slate-500 font-bold">
              {{ Math.round(gameStore.loadingProgress) }}%
            </span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 2. FLOATING TOP IN-GAME HUD (Slides smoothly in from top when canvas is ready) -->
    <Transition name="hud-slide-top">
        <GameHud v-if="isCanvasReady"  />
    </Transition>

    <!-- 3. FLOATING BOTTOM CONTROLS & TOWER SHOP (Slides smoothly in from bottom when canvas is ready - Only in TD mode) -->
    <Transition name="controls-slide-bottom">
      <div 
        v-if="isCanvasReady && mapMode === 'td'"
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

    <!-- 5. Game Over, Victory, Clan Select & TD Config Modals -->
    <GameResultModal />
    <ClanSelectModal v-if="mapMode === 'td'" />
    <GameConfigModal />

    <!-- Floating Hero Control Widget (Only in Hero Adventure mode) -->
    <div 
      v-if="isCanvasReady && mapMode === 'hero'"
      class="absolute top-3 left-3 sm:top-4 sm:left-4 mt-tg z-40 pointer-events-auto"
    >
      <HeroControlWidget />
    </div>

    <!-- Hide & seek: phase banner, touch joystick and match result -->
    <HideSeekOverlay v-if="isCanvasReady && mapMode === 'hideseek'" @tap="(x, y) => canvasRef?.tapAt(x, y)" />

    <!-- 6. Developer Test & Sandbox Toolbar (Only in TD Redactor/Editor Playtest Mode) -->
    <DevTestSandboxToolbar v-if="isCanvasReady && isEditorPlaytestMode && mapMode === 'td'" />

    <!-- 7. Slot for Editor-Only Overlays -->
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
import HeroControlWidget from './HeroControlWidget.vue'
import HideSeekOverlay from './HideSeekOverlay.vue'
import DevTestSandboxToolbar from './DevTestSandboxToolbar.vue'
import GameResultModal from './GameResultModal.vue'
import ClanSelectModal from './ClanSelectModal.vue'
import GameConfigModal from '../GameConfigModal.vue'
import LobbyChat from '../LobbyChat.vue'
import { useMapStore } from '../../stores/mapStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useGameStore } from '../../stores/gameStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { useI18n } from '../../stores/i18nStore'
import { networkSyncBuffer } from '../../services/networkSync'
import { getMapMode } from '../../domain/map'
import {
  getGameMapDataById,
  getEditorMapDataById,
  applyMapPayloadToStores,
  sanitizeMapId,
  getProjectMapId
} from '../../services/mapManager'
import { saveMatch, restoreMatch, clearMatch } from '../../services/sessionResume'
import { useNotificationStore } from '../../stores/notificationStore'
import { hapticResult } from '../../services/telegram'

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
const gameStore = useGameStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const hideSeekStore = useHideSeekStore()
const notify = useNotificationStore()
const { t } = useI18n()

const mapMode = computed(() => getMapMode(mapStore.project))

const isEditorPlaytestMode = computed(() => {
  return props.isEditorMode || gameStore.entrySource === 'editor' || route.name === 'editor-game'
})

const canvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
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
  const roomCode = (route.params.roomId as string) || ''

  // Track entry source explicitly based on mode
  if (props.isEditorMode) {
    gameStore.entrySource = 'editor'
  } else if (roomCode) {
    gameStore.entrySource = 'lobby'
  } else if (!gameStore.entrySource || gameStore.entrySource === 'editor') {
    gameStore.entrySource = 'play'
  }

  multiplayerStore.setRouter(router)

  // 1. Multiplayer room game: after a refresh get back into the room (the host / saved session provides the map)
  if (roomCode) {
    if (multiplayerStore.roomId !== roomCode && !(await multiplayerStore.resumeRoom(roomCode, router))) {
      // No saved seat in this tab: join like a new player (lands in the lobby, follows the room into the game)
      multiplayerStore.joinGame(roomCode, router)
      return
    }
  }

  // 2. Resolve the map from route params
  let rawId = (route.params.mapId as string) || ''

  if (!rawId && !roomCode) {
    if (props.isEditorMode || route.name === 'editor-game' || gameStore.entrySource === 'editor') {
      rawId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
    } else {
      // DIRECT ACCESS FORBIDDEN: without mapId or roomId redirects to home
      router.replace('/')
      return
    }
  }

  // 3. Single Player game / Editor game:
  if (!roomCode) {
    if (props.isEditorMode || gameStore.entrySource === 'editor' || route.name === 'editor-game') {
      const editorData = getEditorMapDataById(rawId) || getGameMapDataById(rawId)
      if (editorData) {
        applyMapPayloadToStores(editorData.payload)
      } else if (!isMapLoaded.value) {
        notify.error(t('common.error') || 'Xarita topilmadi')
        router.replace('/')
        return
      }
    } else {
      const mapData = getGameMapDataById(rawId) || getEditorMapDataById(rawId)
      if (!mapData) {
        notify.error(t('common.error') || 'Xarita topilmadi')
        router.replace('/')
        return
      }
      applyMapPayloadToStores(mapData.payload)
    }
  }

  isCanvasReady.value = false
  gameStore.startLoadingScreen(mapStore.project.name || t('game.battlefield'))

  mapStore.isGameMap = true

  if (isMapLoaded.value) {
    initializeGameSession()
  }
})

/** Owner of the saved match: the room in multiplayer, otherwise the screen + map (so another map never resumes it) */
const matchOwner = computed(() => {
  const roomCode = route.params.roomId as string
  return roomCode ? `room:${roomCode}` : `${String(route.name)}:${route.params.mapId || getProjectMapId(mapStore.project)}`
})

/** Single player and the multiplayer host run the simulation, so they keep the match for a page refresh. */
const ownsSimulation = computed(() => !multiplayerStore.roomId || multiplayerStore.isHost)

function saveRunningMatch() {
  if (!gameStore.isGameMode) return
  // Hide & seek: every player keeps their own character (the host / solo also the whole match)
  if (mapMode.value === 'hideseek') hideSeekStore.saveSession()
  else if (mapMode.value === 'td' && ownsSimulation.value) saveMatch(matchOwner.value)
}

let matchAutosaveTimer: ReturnType<typeof setInterval> | null = null
function saveMatchWhenHidden() {
  if (document.hidden) saveRunningMatch()
}

function initializeGameSession() {
  if (!isMapLoaded.value) return
  towerStore.initGameClanSelection()
  if (multiplayerStore.resumedClanId) {
    towerStore.setPlayerClan(multiplayerStore.resumedClanId)
    multiplayerStore.resumedClanId = ''
  }
  if (ownsSimulation.value) {
    characterStore.resetTour()
    gameStore.startPlayMode()
    // Page refresh: continue the saved match instead of starting over
    if (mapMode.value === 'td' && restoreMatch(matchOwner.value)) {
      notify.info(t('game.matchResumed'))
    }
  } else {
    gameStore.isGameMode = true
    characterStore.isEnabled = true
    towerStore.clearCombatEffects()
  }

  if (!matchAutosaveTimer) {
    matchAutosaveTimer = setInterval(saveRunningMatch, 1000)
    window.addEventListener('pagehide', saveRunningMatch)
    document.addEventListener('visibilitychange', saveMatchWhenHidden)
  }
}

function stopMatchAutosave() {
  if (matchAutosaveTimer) clearInterval(matchAutosaveTimer)
  matchAutosaveTimer = null
  window.removeEventListener('pagehide', saveRunningMatch)
  document.removeEventListener('visibilitychange', saveMatchWhenHidden)
}

watch(isMapLoaded, (loaded) => {
  if (loaded && !gameStore.isGameMode) {
    initializeGameSession()
  }
})

// Full lifecycle teardown when leaving the game
function cleanupGameSession() {
  // The game screen was left on purpose (a refresh never unmounts): nothing to resume any more
  stopMatchAutosave()
  clearMatch()
  isCanvasReady.value = false
  characterStore.resetTour()
  gameStore.exitPlayMode()
  towerStore.clearCombatEffects()
  networkSyncBuffer.clear()
}

onBeforeRouteLeave((_to, _from, next) => {
  isLeavingRoute.value = true
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

// The phone buzzes at the end of a game (Telegram)
watch(
  () => gameStore.gameState,
  (state) => {
    if (state === 'victory') hapticResult('success')
    else if (state === 'game_over') hapticResult('error')
  }
)
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
