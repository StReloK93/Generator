<template>
  <div class="relative h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-4 sm:px-8 py-3 sm:py-5 pt-safe pb-safe">
    <!-- ================= TOP HEADER ================= -->
    <header class="relative z-40 w-full flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-lg sm:text-xl font-black tracking-widest text-white">
          DEFENSOR
        </span>
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
    <main class="relative z-20 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full my-auto">
      
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
          @click="router.push('/play')"
        >
          {{ $t('home.multiplayer') }}
        </UiButton>
      </div>

    </main>

    <!-- ================= 5. MINIMAL FOOTER ================= -->
    <footer class="relative z-20 w-full flex items-center justify-between text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-900">
      <span>v1.0.0</span>
    </footer>

    <!-- ================= 6. SCALABLE MAP SELECTION MODAL ================= -->
    <MapSelectionModal
      v-model:is-open="isMapModalOpen"
      v-model:selected-map-id="selectedMapId"
      :maps="availableMaps"
      :is-starting-game="isStartingGame"
      @start-map="selectAndStartMap"
      @import-file="handleImportMapFile"
    />

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
  Map,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-vue-next'
import { UiButton, UiLanguageSwitcher } from '../components/ui'
import { canInstallPwa, promptPwaInstall, lockLandscape } from '../utils/pwaOrientation'
import { useCharacterStore } from '../stores/characterStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import MapSelectionModal, { HomeMapItem } from '../components/home/MapSelectionModal.vue'
import { assetManager } from '../services/assetManager'
import { toggleAppFullscreen, isAppFullscreen } from '../utils/fullscreen'
import { 
  getBuiltinMaps, 
  sanitizeMapId, 
  applyMapPayloadToStores,
  registerSessionCustomMap
} from '../services/mapManager'

const router = useRouter()
const characterStore = useCharacterStore()
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
const isStartingGame = ref(false)
const selectedMapId = ref<string>('')

// Auto-load available maps
const rawAvailableMaps = getBuiltinMaps()

const customImportedMaps = ref<HomeMapItem[]>([])

const availableMaps = computed<HomeMapItem[]>(() => {
  return [...customImportedMaps.value, ...rawAvailableMaps]
})

const selectedMapObject = computed(() => {
  return availableMaps.value.find(m => m.id === selectedMapId.value) || availableMaps.value[0] || null
})

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

function startSelectedMap() {
  const mapData = selectedMapObject.value
  if (!mapData) return
  selectAndStartMap(mapData)
}

async function selectAndStartMap(mapData: any) {
  if (isStartingGame.value) return
  isStartingGame.value = true

  try {
    const cleanId = sanitizeMapId(mapData.id || mapData.name || 'julion')
    characterStore.entrySource = 'home'
    characterStore.startLoadingScreen(mapData?.name || t('game.battlefield'))
    
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

function handleImportMapFile(file: File) {
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      const raw = JSON.parse(evt.target?.result as string)
      const project = raw.project || raw
      const waves = raw.waveData?.waveConfigs || raw.waveConfigs || project.waveConfigs || []
      const customId = sanitizeMapId('custom-' + (project.name || file.name.replace(/\.json$/i, '')).toLowerCase() + '-' + Date.now().toString(36))
      const customMap: HomeMapItem = {
        id: customId,
        name: project.name || file.name.replace(/\.json$/i, ''),
        cols: project.cols || 60,
        rows: project.rows || 60,
        playersCount: project.playersCount || 2,
        wavesCount: waves.length || 20,
        raw
      }
      
      // Register custom map in session cache
      registerSessionCustomMap(customMap.id, raw)

      customImportedMaps.value.unshift(customMap)
      selectedMapId.value = customMap.id
      notify.success(`Loaded "${customMap.name}"`)
    } catch (err) {
      notify.error('Invalid map JSON file')
    }
  }
  reader.readAsText(file)
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