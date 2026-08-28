<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95 pointer-events-none"
  >
    <div 
      v-if="characterStore.isLoadingGame"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-dark-950/95 backdrop-blur-2xl select-none"
    >
      <div class="w-full max-w-md flex flex-col items-center text-center gap-5 sm:gap-6 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
        
        <!-- Glowing Center Icon -->
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-3 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-500 opacity-40 blur-lg animate-pulse"></div>
          
          <div class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 border-2 border-emerald-500/60 shadow-2xl flex items-center justify-center text-emerald-400">
            <Gamepad2 class="w-10 h-10 sm:w-12 sm:h-12 animate-bounce" />
          </div>
        </div>

        <!-- Title & Status Text -->
        <div class="flex flex-col gap-1.5 w-full">
          <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
            O'yin Yuklanmoqda
          </span>
          <h2 class="text-lg sm:text-xl font-black text-white truncate" :title="characterStore.loadingMapTitle">
            {{ characterStore.loadingMapTitle || 'Izometrik Xarita' }}
          </h2>
          <p class="text-xs text-slate-400 min-h-[20px] transition-all">
            {{ characterStore.loadingMessage }}
          </p>
        </div>

        <!-- Progress Bar Container -->
        <div class="w-full flex flex-col gap-2">
          <div class="w-full h-3 sm:h-3.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative shadow-inner">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-150 ease-out shadow-glow-emerald"
              :style="{ width: `${characterStore.loadingProgress}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span v-if="characterStore.loadingAssetsCount > 0" class="text-emerald-400 font-semibold">
              ⚡ {{ characterStore.loadingAssetsCount }} ta tekstura yuklandi
            </span>
            <span v-else class="text-slate-500">Tayyorlanmoqda...</span>
            <span class="font-bold text-white">{{ Math.round(characterStore.loadingProgress) }}%</span>
          </div>
        </div>

        <!-- Fullscreen & Performance Badge Info -->
        <div class="flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80 w-full text-[10px] text-slate-500 font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Avtomatik Fullscreen & 60 FPS GPU Kesh</span>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Gamepad2 } from 'lucide-vue-next'
import { useCharacterStore } from '../stores/characterStore'

const characterStore = useCharacterStore()
</script>
