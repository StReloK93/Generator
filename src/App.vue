<template>
  <div class="h-dvh w-screen min-h-dvh max-h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans select-none flex flex-col">
    <router-view v-slot="{ Component, route }">
      <Transition
        name="game-page"
        mode="out-in"
      >
        <component :is="Component" :key="route.name === 'editor' || route.name === 'game' ? String(route.name) : route.path" />
      </Transition>
    </router-view>

    <!-- Global App Asset Preloader -->
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
        class="fixed inset-0 z-100 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <!-- Background Ambient Glow -->
        <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none"></div>
        <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col items-center max-w-sm w-full">
          <!-- DEFENSOR Brand Title -->
          <h1 class="text-3xl sm:text-4xl font-black tracking-widest text-white mb-2 drop-shadow-md">
            DEFENSOR
          </h1>
          <p class="text-xs font-semibold text-amber-400/90 mb-8 tracking-wider uppercase min-h-4">
            {{ $t(preloadStageKey) }}
          </p>

          <!-- Minimal Linear Progress Bar with glowing fill -->
          <div class="w-full bg-slate-900/90 border border-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner mb-2.5 p-0.5">
            <div 
              class="h-full bg-linear-to-r from-amber-500 to-amber-300 transition-all duration-200 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              :style="{ width: `${preloadProgress}%` }"
            ></div>
          </div>
          <span class="font-mono text-xs text-slate-500 font-bold">
            {{ Math.round(preloadProgress) }}%
          </span>
        </div>
      </div>
    </Transition>

    <UiToastContainer />
    <UiConfirmModal />
    <DeviceOrientationGuard />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { UiToastContainer, UiConfirmModal } from './components/ui'
import DeviceOrientationGuard from './components/common/DeviceOrientationGuard.vue'
import { initPwaAndOrientation } from './utils/pwaOrientation'
import { assetManager } from './services/assetManager'
import { useAssetStore } from './stores/assetStore'

const assetStore = useAssetStore()

// Global App Preloader State
const isPreloading = ref(!assetManager.isBundleLoaded('core'))
const preloadProgress = ref(assetManager.isBundleLoaded('core') ? 100 : 0)
const preloadStageKey = ref(assetManager.isBundleLoaded('core') ? 'loader.ready' : 'loader.initEngine')

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

    // 5. Props & Atmosphere (85 - 93%)
    preloadStageKey.value = 'loader.loadProps'
    await assetManager.loadBundle('props', (p) => {
      preloadProgress.value = 85 + p * 8
    })

    // 6. Built-in Sprite Store Manifest sync (93 - 98%)
    preloadStageKey.value = 'loader.loadSprites'
    await assetStore.loadBuiltinSprites()
    preloadProgress.value = 98

    // 7. Complete Ready State (100%)
    preloadStageKey.value = 'loader.ready'
    preloadProgress.value = 100

    // Smooth buffer for clean visual transition
    setTimeout(() => {
      isPreloading.value = false
    }, 350)
  } catch (err) {
    console.warn('[App] Preloader caught error, completing gracefully:', err)
    preloadProgress.value = 100
    isPreloading.value = false
  }
}

onMounted(async () => {
  const cleanup = initPwaAndOrientation()
  onUnmounted(() => {
    cleanup()
  })

  // Start global asset preload sequence if not yet loaded
  if (!assetManager.isBundleLoaded('core')) {
    await runPreloadSequence()
  } else {
    isPreloading.value = false
  }
})
</script>