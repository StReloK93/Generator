<template>
  <div class="relative h-dvh w-screen citadel-backdrop text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-4 sm:px-8 py-3 sm:py-5 pt-safe pb-safe">
    <!-- ================= HORIZON: the clans' towers at dusk ================= -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-radial-[ellipse_at_50%_100%] from-brand-600/20 via-brand-900/5 to-transparent"></div>
    <img
      :src="homeHorizon"
      alt=""
      aria-hidden="true"
      draggable="false"
      class="horizon-rise pointer-events-none absolute z-10 bottom-7 left-1/2 -translate-x-1/2 w-full max-w-230 max-h-[40dvh] object-contain object-bottom short:max-h-none short:bottom-5 short:left-auto short:right-3 short:translate-x-0 short:w-1/2 short:max-w-115"
    />
    <div class="pointer-events-none absolute z-10 inset-x-0 bottom-0 h-16 bg-linear-to-t from-slate-950 to-transparent"></div>
    <!-- Embers rise over the towers, light rays and fog drift (Pixi) -->
    <HomeBackdrop class="z-15" />

    <!-- ================= TOP HEADER ================= -->
    <header class="relative z-40 w-full flex items-center justify-end">
      <!-- Right Header Actions -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Map Architect (Desktop only) -->
        <UiButton
          v-if="isDesktopDevice"
          variant="secondary"
          size="xs"
          :leading-icon="Layers"
          custom-class="desktop-only-btn hidden! lg:inline-flex!"
          @click="goToEditor"
        >
          {{ $t('home.mapArchitect') }}
        </UiButton>

        <!-- Asset Editor (Desktop only) -->
        <UiButton
          v-if="isDesktopDevice"
          variant="secondary"
          size="xs"
          :leading-icon="Palette"
          custom-class="desktop-only-btn hidden! lg:inline-flex!"
          @click="router.push('/asset-editor')"
        >
          {{ $t('home.assetEditor') || 'Assetlar' }}
        </UiButton>

        <!-- Projectile Editor (Desktop / Mobile) -->
        <UiButton
          v-if="isDesktopDevice"
          variant="secondary"
          size="xs"
          :leading-icon="Crosshair"
          custom-class="desktop-only-btn hidden! lg:inline-flex!"
          @click="router.push('/projectile-editor')"
        >
          {{ $t('towers.projectileStudio') }}
        </UiButton>

        <!-- Install PWA Button (When supported / installable) -->
        <UiButton
          v-if="canInstallPwa && !isTelegram"
          variant="game-amber"
          size="xs"
          :leading-icon="Download"
          class="animate-pulse"
          @click="promptPwaInstall"
        >
          {{ $t('home.install') }}
        </UiButton>

        <!-- Ghost Fullscreen Toggle (Telegram runs the app full screen itself) -->
        <UiButton
          v-if="!isTelegram"
          variant="ghost"
          size="icon-sm"
          :leading-icon="isFullscreenMode ? Minimize2 : Maximize2"
          :title="isFullscreenMode ? 'Exit Fullscreen' : 'Fullscreen'"
          @click="handleToggleFullscreen"
        />

        <!-- Ghost / Borderless Language Switcher -->
        <UiLanguageSwitcher />
      </div>
    </header>

    <!-- ================= 4. MINIMALIST CENTER MENU ================= -->
    <main class="relative z-20 flex-1 flex flex-col items-center justify-center gap-7 pb-[38dvh] short:pb-0 short:gap-4 short:w-1/2 max-w-md mx-auto w-full short:mx-0 short:max-w-none">
      <!-- Game Title -->
      <div class="flex flex-col items-center text-center">
        <div class="flex items-center gap-3 sm:gap-4">
          <span class="h-px w-10 sm:w-16 short:w-8 bg-linear-to-r from-transparent to-brand-400/70"></span>
          <span class="size-2 rotate-45 bg-brand-400 shadow-[0_0_10px_rgba(233,182,60,0.8)]"></span>
          <h1 class="font-display text-5xl sm:text-7xl short:text-4xl font-black uppercase tracking-[0.18em] pl-[0.18em] bg-linear-to-b from-brand-50 via-brand-300 to-brand-600 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(233,182,60,0.35)]">
            {{ $t('app.name') }}
          </h1>
          <span class="size-2 rotate-45 bg-brand-400 shadow-[0_0_10px_rgba(233,182,60,0.8)]"></span>
          <span class="h-px w-10 sm:w-16 short:w-8 bg-linear-to-l from-transparent to-brand-400/70"></span>
        </div>
        <p class="mt-2 font-display text-sm sm:text-base short:text-xs font-semibold text-brand-200/70 tracking-[0.3em] uppercase">
          {{ $t('home.tagline') }}
        </p>
      </div>

      <!-- Primary Action Buttons Only -->
      <div class="flex flex-col gap-3.5 short:gap-3 w-full max-w-xs sm:max-w-sm short:max-w-72">
        
        <!-- Single Player Button -> Opens Map Modal -->
        <UiButton
          variant="game-amber"
          size="lg"
          block
          :leading-icon="Play"
          class="py-3.5 sm:py-4 text-sm sm:text-base font-black tracking-wider uppercase shadow-lg shadow-amber-500/20 justify-center"
          @click="openMapModal"
        >
          {{ $t('home.singleplayer') }}
        </UiButton>

        <!-- Multiplayer Button -> Navigates to Online Mode -->
        <UiButton
          variant="game-green"
          size="lg"
          block
          :leading-icon="Users"
          class="py-3.5 sm:py-4 text-sm sm:text-base font-black tracking-wider uppercase shadow-lg shadow-emerald-500/20 justify-center"
          @click="isMultiplayerOpen = true"
        >
          {{ $t('home.multiplayer') }}
        </UiButton>
      </div>

    </main>


    <!-- ================= 6. SCALABLE MAP SELECTION MODAL ================= -->
    <MapSelectionModal
      v-model:is-open="isMapModalOpen"
      v-model:selected-map-id="selectedMapId"
      :maps="availableMaps"
      :is-starting-game="isStartingGame"
      @start-map="selectAndStartMap"
      @imported="customImportedMaps.unshift($event)"
    />

    <MultiplayerModal v-model:is-open="isMultiplayerOpen" />

    <!-- Editor Setup Modal -->
    <WelcomeProjectModal ref="editorSetupModalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Play,
  Users,
  Layers,
  Palette,
  Crosshair,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-vue-next'
import homeHorizon from '../assets/ui/home-horizon.webp'
import { UiButton, UiLanguageSwitcher } from '../components/ui'
import { canInstallPwa, promptPwaInstall, lockLandscape } from '../utils/pwaOrientation'
import { isTelegram } from '../services/telegram'
import { useGameStore } from '../stores/gameStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import HomeBackdrop from '../components/home/HomeBackdrop.vue'
import MapSelectionModal from '../components/home/MapSelectionModal.vue'
import MultiplayerModal from '../components/home/MultiplayerModal.vue'
import { assetManager } from '../services/assetManager'
import { toggleAppFullscreen, isAppFullscreen } from '../utils/fullscreen'
import {
  getBuiltinMaps,
  sanitizeMapId,
  applyMapPayloadToStores,
  type MapSummary
} from '../services/mapManager'
import { gamePath } from '../router/paths'

const router = useRouter()
const gameStore = useGameStore()
const notify = useNotificationStore()
const { t } = useI18n()

const editorSetupModalRef = ref<any>(null)
const isFullscreenMode = ref(false)
const isDesktopDevice = ref(false)

function checkIsDesktopDevice() {
  if (typeof window === 'undefined') return
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  const isSmallDevice = Math.min(window.innerWidth, window.innerHeight) < 600
  const isSmallWidth = window.innerWidth < 1024

  isDesktopDevice.value = !isMobileUA && !isTouch && !isSmallDevice && !isSmallWidth
}

function checkFullscreenState() {
  isFullscreenMode.value = isAppFullscreen()
}

// Modals & Button States
const isMapModalOpen = ref(false)
const isMultiplayerOpen = ref(false)
const isStartingGame = ref(false)
const selectedMapId = ref<string>('')

// Auto-load available maps
const rawAvailableMaps = getBuiltinMaps()

const customImportedMaps = ref<MapSummary[]>([])

// Hide & seek maps are played against a bot here (the 2 player match is in multiplayer)
const availableMaps = computed<MapSummary[]>(() => [...customImportedMaps.value, ...rawAvailableMaps])

function openMapModal() {
  if (!selectedMapId.value && availableMaps.value.length > 0) {
    selectedMapId.value = availableMaps.value[0].id
  }
  isMapModalOpen.value = true
}

onMounted(async () => {
  checkFullscreenState()
  checkIsDesktopDevice()
  window.addEventListener('resize', checkIsDesktopDevice)
  window.addEventListener('orientationchange', checkIsDesktopDevice)
  document.addEventListener('fullscreenchange', checkFullscreenState)
  document.addEventListener('webkitfullscreenchange', checkFullscreenState)

  if (availableMaps.value.length > 0) {
    selectedMapId.value = availableMaps.value[0].id
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIsDesktopDevice)
  window.removeEventListener('orientationchange', checkIsDesktopDevice)
  document.removeEventListener('fullscreenchange', checkFullscreenState)
  document.removeEventListener('webkitfullscreenchange', checkFullscreenState)
})

async function handleToggleFullscreen() {
  const active = await toggleAppFullscreen()
  isFullscreenMode.value = active
}

function goToEditor() {
  editorSetupModalRef.value?.open('new', false)
}

async function selectAndStartMap(mapData: any) {
  if (isStartingGame.value) return
  isStartingGame.value = true

  try {
    const cleanId = sanitizeMapId(mapData.id || mapData.name || 'julion')
    gameStore.entrySource = 'home'
    gameStore.startLoadingScreen(mapData?.name || t('game.battlefield'))
    
    if (mapData.raw) {
      applyMapPayloadToStores(mapData.raw)
    }

    // Preload all game textures and sprites while button spinner is running
    await assetManager.loadGame()

    // Provide a smooth feedback buffer for the button loading spinner
    await new Promise(resolve => setTimeout(resolve, 350))

    // Attempt to lock landscape orientation on game start
    lockLandscape()

    await router.push(gamePath(cleanId))
  } catch (err) {
    console.error('Error starting map:', err)
    notify.error('Failed to load map')
  } finally {
    isStartingGame.value = false
  }
}
</script>

<style scoped>
/* The towers rise out of the dusk when the menu opens */
.horizon-rise {
  animation: horizon-rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes horizon-rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .horizon-rise { animation: none; }
}

/* Strictly hide editor buttons on all mobile phones, touch devices, and landscape mobile views */
@media (pointer: coarse), (max-height: 550px), (hover: none) {
  .desktop-only-btn {
    display: none !important;
  }
}
@media (pointer: fine) and (min-width: 1024px) and (min-height: 550px) {
  .desktop-only-btn {
    display: inline-flex !important;
  }
}
</style>