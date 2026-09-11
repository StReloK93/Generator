<template>
  <div class="relative h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-4 sm:px-8 py-3 sm:py-5 pt-safe pb-safe">
    
    <!-- Subtle Ambient Background -->
    <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none"></div>
    <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

    <!-- ================= 1. INITIAL APP ASSET PRELOADER ================= -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-400 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 pointer-events-none"
    >
      <div 
        v-if="isPreloading" 
        class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div class="relative z-10 flex flex-col items-center max-w-sm w-full">
          <p class="text-xs font-semibold text-slate-400 mb-6 tracking-widest uppercase">
            {{ $t(preloadStageKey) }}
          </p>

          <!-- Minimal Linear Progress Bar -->
          <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden shadow-inner mb-2">
            <div 
              class="h-full bg-amber-400 transition-all duration-200 rounded-full"
              :style="{ width: `${preloadProgress}%` }"
            ></div>
          </div>
          <span class="font-mono text-xs text-slate-500 font-bold">
            {{ Math.round(preloadProgress) }}%
          </span>
        </div>
      </div>
    </Transition>


    <!-- ================= 3. TOP HEADER (ONLY PLACE WITH DEFENSOR LOGO) ================= -->
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
          {{ $t('home.assetEditor') }}
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

    <!-- ================= 6. SCALABLE MAP SELECTION MODAL (SUPPORTS 100+ MAPS) ================= -->
    <UiModal
      v-model:is-open="isMapModalOpen"
      :title="$t('home.selectMapTitle')"
      :subtitle="$t('home.selectMapSubtitle')"
      :icon="Map"
      icon-color="amber"
      size="xl"
      body-class="flex flex-col gap-3 p-3 sm:p-5"
    >
      <!-- Search & Filter Bar -->
      <div class="relative shrink-0">
        <UiInput
          v-model="mapSearchQuery"
          :placeholder="$t('home.searchMaps')"
          :leading-icon="Search"
          clearable
          size="sm"
          class="w-full"
        />
      </div>

      <!-- Scrollable Maps Grid (Designed for 100+ maps) -->
      <div class="max-h-72 sm:max-h-96 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        <div v-if="filteredMaps.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            v-for="mapItem in filteredMaps"
            :key="mapItem.id"
            @click="selectedMapId = mapItem.id"
            @dblclick="startSelectedMap"
            :class="[
              'group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-md flex flex-col justify-between gap-2.5 active:scale-[0.99]',
              selectedMapId === mapItem.id
                ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/20'
                : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <h3 
                  :class="[
                    'text-xs sm:text-sm font-bold truncate transition-colors',
                    selectedMapId === mapItem.id ? 'text-amber-300 font-extrabold' : 'text-white group-hover:text-amber-300'
                  ]"
                >
                  {{ mapItem.name }}
                </h3>
                <p class="text-[11px] text-slate-400 mt-0.5 font-medium font-mono">
                  {{ mapItem.cols }} × {{ mapItem.rows }} Tiles
                </p>
              </div>

              <!-- Selected Checkmark or Player Badge -->
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {{ mapItem.playersCount }}P
                </span>
                <div 
                  v-if="selectedMapId === mapItem.id" 
                  class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm"
                >
                  <Check class="w-3 h-3 stroke-3" />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
              <span class="text-slate-400 flex items-center gap-1.5 font-medium">
                <Shield class="w-3.5 h-3.5 text-amber-400" />
                {{ mapItem.wavesCount }} {{ $t('game.wave') }}
              </span>
              <span 
                :class="[
                  'text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-0.5',
                  selectedMapId === mapItem.id ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-300'
                ]"
              >
                <span>{{ selectedMapId === mapItem.id ? $t('common.selected') || 'Selected' : $t('common.select') }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Empty Search State -->
        <div v-else class="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Map class="w-8 h-8 text-slate-600 animate-pulse" />
          <p class="text-xs font-medium">{{ $t('home.noMapsFound') }}</p>
          <UiButton
            v-if="mapSearchQuery"
            variant="ghost"
            size="xs"
            @click="mapSearchQuery = ''"
          >
            {{ $t('common.clear') }}
          </UiButton>
        </div>
      </div>

      <!-- Modal Footer with Import Option & Play Game Action -->
      <template #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <!-- Left: Custom Map Import & Total Counter -->
          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <label class="cursor-pointer group flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <input type="file" accept=".json,.isomap.json" class="hidden" @change="handleCustomMapFile" />
              <Upload class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span>{{ $t('home.importMap') }}</span>
            </label>
            <span class="text-[11px] font-mono text-slate-500">
              {{ $t('home.mapCount', { count: filteredMaps.length }) }}
            </span>
          </div>

          <!-- Right: Play Game Primary Button -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <UiButton
              variant="secondary"
              size="sm"
              @click="isMapModalOpen = false"
            >
              {{ $t('common.cancel') }}
            </UiButton>

            <UiButton
              variant="game-amber"
              size="sm"
              :leading-icon="Play"
              :loading="isStartingGame"
              :disabled="!selectedMapObject || isStartingGame"
              class="w-full sm:w-auto justify-center px-5 font-black uppercase tracking-wider"
              @click="startSelectedMap"
            >
              {{ isStartingGame ? $t('home.loadingMap') : $t('home.playGame') }}
            </UiButton>
          </div>
        </div>
      </template>
    </UiModal>

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
  Map,
  Shield,
  Upload,
  Search,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-vue-next'
import { UiButton, UiModal, UiInput, UiLanguageSwitcher } from '../components/ui'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import { assetManager } from '../services/assetManager'
import { toggleAppFullscreen, isAppFullscreen } from '../utils/fullscreen'
import { 
  getBuiltinMaps, 
  sanitizeMapId, 
  applyMapPayloadToStores,
  registerSessionCustomMap
} from '../services/mapManager'

const router = useRouter()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const assetStore = useAssetStore()
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
const mapSearchQuery = ref('')
const selectedMapId = ref<string>('')

// Preloader State
const isPreloading = ref(true)
const preloadProgress = ref(0)
const preloadStageKey = ref('loader.initEngine')

// Auto-load available maps
const rawAvailableMaps = getBuiltinMaps()

const customImportedMaps = ref<any[]>([])

const availableMaps = computed(() => {
  return [...customImportedMaps.value, ...rawAvailableMaps]
})

const filteredMaps = computed(() => {
  const q = mapSearchQuery.value.trim().toLowerCase()
  if (!q) return availableMaps.value
  return availableMaps.value.filter(m => 
    m.name.toLowerCase().includes(q) || 
    `${m.cols}x${m.rows}`.includes(q)
  )
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

  // Start initial asset preloader
  await runPreloadSequence()
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

async function runPreloadSequence() {
  try {
    // 1. Initial WebGPU/Engine initialization phase (0 - 15%)
    preloadStageKey.value = 'loader.initEngine'
    preloadProgress.value = 10

    // 2. Terrains & Core Atlases (15 - 40%)
    preloadStageKey.value = 'loader.loadTerrains'
    await assetManager.loadCore((p) => {
      preloadProgress.value = 10 + p * 30
    })

    // 3. Structures & Towers (40 - 65%)
    preloadStageKey.value = 'loader.loadStructures'
    await assetManager.loadBundle('structures', (p) => {
      preloadProgress.value = 40 + p * 25
    })

    // 4. Characters & Monsters (65 - 85%)
    preloadStageKey.value = 'loader.loadCharacters'
    await assetManager.loadBundle('characters', (p) => {
      preloadProgress.value = 65 + p * 20
    })

    // 5. Props & Atmosphere (85 - 95%)
    preloadStageKey.value = 'loader.loadProps'
    await assetManager.loadBundle('props', (p) => {
      preloadProgress.value = 85 + p * 10
    })

    // 6. Built-in Sprite Store Manifest sync
    await assetStore.loadBuiltinSprites()

    // 7. Complete Ready State (100%)
    preloadStageKey.value = 'loader.ready'
    preloadProgress.value = 100

    // Short buffer for smooth visual transition
    setTimeout(() => {
      isPreloading.value = false
    }, 350)
  } catch (err) {
    console.warn('[HomeView] Preloader caught error, completing gracefully:', err)
    preloadProgress.value = 100
    isPreloading.value = false
  }
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
    await Promise.all([
      assetManager.loadGame(),
      assetStore.loadBuiltinSprites()
    ])

    // Provide a smooth feedback buffer for the button loading spinner
    await new Promise(resolve => setTimeout(resolve, 350))

    await router.push(`/game/${cleanId}`)
  } catch (err) {
    console.error('Error starting map:', err)
    notify.error('Failed to load map')
  } finally {
    isStartingGame.value = false
  }
}

function handleCustomMapFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      const raw = JSON.parse(evt.target?.result as string)
      const project = raw.project || raw
      const waves = raw.waveData?.waveConfigs || raw.waveConfigs || project.waveConfigs || []
      const customId = sanitizeMapId('custom-' + (project.name || file.name.replace(/\.json$/i, '')).toLowerCase() + '-' + Date.now().toString(36))
      const customMap = {
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