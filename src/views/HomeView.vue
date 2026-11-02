<template>
  <div class="relative h-dvh w-screen citadel-backdrop text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-4 sm:px-8 py-3 sm:py-5 pt-safe pb-safe">
    <!-- ================= TOP HEADER ================= -->
    <header class="relative z-40 w-full flex items-center justify-between">
      <div class="flex items-center gap-2 text-slate-500">
        <Castle class="size-4 text-brand-400/80" />
        <span class="text-[11px] font-bold tracking-widest uppercase">Tower Defense</span>
      </div>

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
          v-if="canInstallPwa"
          variant="game-amber"
          size="xs"
          :leading-icon="Download"
          class="animate-pulse"
          @click="promptPwaInstall"
        >
          O'rnatish
        </UiButton>

        <!-- Ghost Fullscreen Toggle -->
        <UiButton
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
    <main class="relative z-20 flex-1 flex flex-col items-center justify-center gap-6 short:gap-3 max-w-md mx-auto w-full my-auto">
      <!-- Game Title Crest -->
      <div class="flex flex-col items-center text-center">
        <div class="short:hidden mb-3 size-16 rounded-2xl rotate-45 border-2 border-brand-400/60 bg-linear-to-br from-brand-500/25 to-brand-900/40 shadow-lg shadow-brand-500/20 flex items-center justify-center">
          <Castle class="size-7 -rotate-45 text-brand-300" />
        </div>
        <h1 class="font-display text-5xl sm:text-6xl short:text-4xl font-black tracking-widest bg-linear-to-b from-brand-100 via-brand-300 to-brand-600 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(233,182,60,0.25)]">
          DEFENSOR
        </h1>
        <p class="mt-1.5 text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">
          {{ $t('home.tagline') }}
        </p>
      </div>

      <!-- Primary Action Buttons Only -->
      <div class="flex flex-col gap-3.5 w-full max-w-xs sm:max-w-sm">
        
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

    <!-- ================= 5. MINIMAL FOOTER ================= -->
    <footer class="relative z-20 w-full flex items-center justify-between text-[11px] font-medium text-slate-600 pt-2 border-t border-slate-800/60">
      <span>v1.0.0</span>
    </footer>

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
  Download,
  Castle
} from 'lucide-vue-next'
import { UiButton, UiLanguageSwitcher } from '../components/ui'
import { canInstallPwa, promptPwaInstall, lockLandscape } from '../utils/pwaOrientation'
import { useGameStore } from '../stores/gameStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
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

    await router.push(`/game/${cleanId}`)
  } catch (err) {
    console.error('Error starting map:', err)
    notify.error('Failed to load map')
  } finally {
    isStartingGame.value = false
  }
}
</script>

<style scoped>
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