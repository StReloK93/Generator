<template>
  <div class="relative h-dvh w-screen citadel-backdrop text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans px-4 sm:px-8 py-3 sm:py-5 pt-safe pb-safe">
    <!-- ================= HORIZON: the clans' towers at dusk ================= -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-radial-[ellipse_at_50%_100%] portrait:inset-y-0 portrait:h-auto portrait:bg-radial-[ellipse_at_50%_50%] from-brand-600/20 via-brand-900/5 to-transparent"></div>
    <img
      :src="homeHorizon"
      alt=""
      aria-hidden="true"
      draggable="false"
      class="horizon-rise portrait:hidden pointer-events-none absolute z-10 bottom-7 left-1/2 -translate-x-1/2 w-full max-w-230 max-h-[40dvh] object-contain object-bottom short:max-h-none short:bottom-5 short:left-auto short:right-3 short:translate-x-0 short:w-1/2 short:max-w-115"
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

        <!-- The game's characters (set once for every map): the signed-in admin's only -->
        <UiButton
          v-if="isDesktopDevice && admin.isAdmin"
          variant="secondary"
          size="xs"
          :leading-icon="PersonStanding"
          custom-class="desktop-only-btn hidden! lg:inline-flex!"
          @click="router.push('/characters')"
        >
          {{ $t('characters.button') }}
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

        <!-- Sound, vibration, full screen and language: one settings window -->
        <UiIconButton :icon="Settings" size="lg" :title="$t('common.settings')" custom-class="icon-gold spin-icon" @click="isSettingsOpen = true" />
      </div>
    </header>

    <!-- ================= 4. MENU =================
         Wide screens: title and buttons in the middle above the towers.
         Upright phone: one picture in the middle (title, the clans' towers on a lit stage, the buttons). -->
    <main class="relative z-20 flex-1 flex flex-col items-center justify-center gap-7 pb-[38dvh] short:pb-0 short:gap-4 short:w-1/2 max-w-md mx-auto w-full short:mx-0 short:max-w-none portrait:justify-center portrait:pb-4 portrait:gap-10 tall:gap-14">
      <div class="flex flex-col items-center text-center portrait:w-full">
        <div class="flex flex-col items-center">
        <div class="flex items-center gap-3 sm:gap-4 portrait:gap-2">
          <span class="h-px w-6 sm:w-16 short:w-8 portrait:w-3 tall:w-2 bg-linear-to-r from-transparent to-brand-400/70"></span>
          <span class="size-2 rotate-45 bg-brand-400 shadow-[0_0_10px_rgba(233,182,60,0.8)]"></span>
          <h1 class="font-display text-5xl portrait:text-4xl sm:text-7xl short:text-4xl tall:text-5xl font-black uppercase tracking-[0.18em] pl-[0.18em] portrait:tracking-[0.06em] portrait:pl-[0.06em] bg-linear-to-b from-brand-50 via-brand-300 to-brand-600 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(233,182,60,0.35)]">
            {{ $t('app.name') }}
          </h1>
          <span class="size-2 rotate-45 bg-brand-400 shadow-[0_0_10px_rgba(233,182,60,0.8)]"></span>
          <span class="h-px w-6 sm:w-16 short:w-8 portrait:w-3 tall:w-2 bg-linear-to-l from-transparent to-brand-400/70"></span>
        </div>
        <p class="mt-2 font-display text-sm sm:text-base short:text-xs portrait:text-xs portrait:tracking-[0.18em] tall:text-sm font-semibold text-brand-200/70 tracking-[0.3em] uppercase text-balance">
          {{ $t('home.tagline') }}
        </p>
        </div>

        <!-- Upright phone: the clans' towers, all of them, standing on a lit stage under the title -->
        <div class="hidden portrait:block relative w-full max-w-md mt-8 tall:mt-12">
          <!-- Light falling on the stage, the stage's glow and the shadow it throws -->
          <div class="absolute left-1/2 -translate-x-1/2 -top-10 w-3/5 h-[130%] bg-linear-to-b from-brand-300/10 via-brand-400/5 to-transparent blur-xl"></div>
          <div class="absolute inset-x-[4%] -bottom-3 h-1/3 rounded-[50%] bg-brand-500/25 blur-2xl"></div>
          <div class="absolute inset-x-[10%] bottom-0 h-3 rounded-[50%] bg-slate-950/70 blur-md"></div>
          <!-- The picture cut to the towers (the empty margins of the image left out), so they fill the width -->
          <img :src="homeHorizon" alt="" aria-hidden="true" draggable="false" class="horizon-rise relative w-full aspect-805/380 object-cover object-[48%_50%]" />
        </div>
      </div>

      <!-- Primary Action Buttons Only -->
      <div class="flex flex-col gap-3.5 short:gap-3 w-full max-w-xs sm:max-w-sm short:max-w-72 portrait:max-w-sm">
        
        <!-- The two ways to play: beaten gold, and dark stone with a gold rim; a small diamond either side of the words -->
        <UiButton variant="regal" size="hero" block custom-class="tall:h-15" @click="router.push('/play')">
          {{ $t('home.singleplayer') }}
        </UiButton>

        <UiButton variant="regal-dark" size="hero" block custom-class="tall:h-15" @click="router.push('/multiplayer')">
          {{ $t('home.multiplayer') }}
        </UiButton>
      </div>

    </main>



    <UiModal :is-open="isSettingsOpen" :title="$t('common.settings')" :icon="Settings" size="sm" custom-class="short:max-w-2xl" :teleport="true" @close="isSettingsOpen = false">
      <SettingsPanel />
    </UiModal>

    <!-- Editor Setup Modal -->
    <WelcomeProjectModal ref="editorSetupModalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Layers,
  Palette,
  Crosshair,
  PersonStanding,
  Settings,
  Download
} from 'lucide-vue-next'
import homeHorizon from '../assets/ui/home-horizon.webp'
import { UiButton, UiIconButton, UiModal } from '../components/ui'
import SettingsPanel from '../components/SettingsPanel.vue'
import { canInstallPwa, promptPwaInstall } from '../utils/pwaOrientation'
import { isTelegram } from '../services/telegram'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import { useAdminStore } from '../stores/adminStore'
import HomeBackdrop from '../components/home/HomeBackdrop.vue'

const router = useRouter()
const admin = useAdminStore()

const editorSetupModalRef = ref<any>(null)
const isDesktopDevice = ref(false)

function checkIsDesktopDevice() {
  if (typeof window === 'undefined') return
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  const isSmallDevice = Math.min(window.innerWidth, window.innerHeight) < 600
  const isSmallWidth = window.innerWidth < 1024

  isDesktopDevice.value = !isMobileUA && !isTouch && !isSmallDevice && !isSmallWidth
}

const isSettingsOpen = ref(false)

onMounted(async () => {
  checkIsDesktopDevice()
  window.addEventListener('resize', checkIsDesktopDevice)
  window.addEventListener('orientationchange', checkIsDesktopDevice)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIsDesktopDevice)
  window.removeEventListener('orientationchange', checkIsDesktopDevice)
})

/** The editor starts from the game's maps (open one, or make a new one) */
function goToEditor() {
  editorSetupModalRef.value?.open('maps', false)
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