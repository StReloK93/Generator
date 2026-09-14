<template>
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="shouldShowGuard"
      class="fixed inset-0 z-999999 flex flex-col items-center justify-center p-6 bg-slate-950/98 backdrop-blur-2xl text-slate-100 select-none overflow-hidden touch-none"
    >
      <!-- Background Ambient Glow -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-sky-500/10 rounded-full blur-2xl" />
      </div>

      <!-- Main Modal Card -->
      <div class="relative z-10 flex flex-col items-center text-center max-w-88 sm:max-w-96">
        <!-- Top Badge -->
        <div class="mb-6">
          <UiBadge variant="emerald" size="md" class="px-3 py-1 font-semibold tracking-wider uppercase text-xs">
            <template #leading>
              <Smartphone class="w-3.5 h-3.5 mr-1 text-emerald-400" />
            </template>
            Albom (Landscape) Rejimi
          </UiBadge>
        </div>

        <!-- Animated Rotating Phone Graphic -->
        <div class="relative w-36 h-36 flex items-center justify-center mb-6">
          <!-- Circular Track & Pulse Rings -->
          <div class="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-25" />
          <div class="absolute inset-2 rounded-full border border-slate-800 bg-slate-900/60 shadow-inner" />

          <!-- Orbiting Arrow / Direction Cue -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <RotateCcw class="w-28 h-28 text-emerald-500/20 rotate-45" />
          </div>

          <!-- Phone Vector Model (Rotates via CSS keyframes) -->
          <div class="phone-rotate-anim relative w-14 h-24 rounded-xl border-2 border-emerald-400/80 bg-slate-900/90 shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-between p-1.5">
            <!-- Speaker Notch -->
            <div class="w-4 h-1 bg-emerald-400/60 rounded-full" />
            
            <!-- Center Mini Tower Icon / Game Graphic -->
            <div class="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck class="w-4 h-4 text-emerald-400" />
            </div>

            <!-- Home Bar Indicator -->
            <div class="w-6 h-0.5 bg-slate-500 rounded-full" />
          </div>
        </div>

        <!-- Title & Explanations -->
        <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Telefoningizni Yonboshga Buring
        </h2>
        
        <p class="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6 font-medium">
          Defensor TD keng izometrik taktik jang maydoniga ega. To'liq vizual effektlar va qulay boshqaruv uchun qurilmangizni albom (gorizontal) rejimiga o'giring.
        </p>

        <!-- Action Buttons -->
        <div class="w-full flex flex-col gap-2.5">
          <!-- Fullscreen & Lock Landscape Button -->
          <UiButton
            variant="game-green"
            size="md"
            block
            @click="handleForceLandscape"
          >
            <template #leading>
              <Maximize2 class="w-4 h-4 mr-1.5" />
            </template>
            To'liq Ekran & Burish
          </UiButton>

          <!-- PWA Install Button (If supported/installable) -->
          <UiButton
            v-if="canInstallPwa"
            variant="game-amber"
            size="md"
            block
            @click="handleInstallPwa"
          >
            <template #leading>
              <Download class="w-4 h-4 mr-1.5" />
            </template>
            Ilovani O'rnatish (PWA)
          </UiButton>

          <!-- Temporary Dismiss / Preview link -->
          <button
            type="button"
            class="mt-2 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer transition-colors"
            @click="dismissForSession"
          >
            Baribir vertikal ko'rish (Eksperimental)
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Smartphone,
  RotateCcw,
  Maximize2,
  Download,
  ShieldCheck,
} from 'lucide-vue-next'
import { UiButton, UiBadge } from '@/components/ui'
import {
  isPortrait,
  isMobileDevice,
  canInstallPwa,
  lockLandscape,
  promptPwaInstall,
} from '@/utils/pwaOrientation'

const isDismissed = ref(false)

const shouldShowGuard = computed(() => {
  return isPortrait.value && isMobileDevice.value && !isDismissed.value
})

async function handleForceLandscape() {
  await lockLandscape()
}

async function handleInstallPwa() {
  await promptPwaInstall()
}

function dismissForSession() {
  isDismissed.value = true
}
</script>

<style scoped>
@keyframes phoneRotate {
  0%, 15% {
    transform: rotate(0deg);
  }
  45%, 70% {
    transform: rotate(-90deg);
  }
  85%, 100% {
    transform: rotate(0deg);
  }
}

.phone-rotate-anim {
  animation: phoneRotate 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  transform-origin: center center;
}
</style>
