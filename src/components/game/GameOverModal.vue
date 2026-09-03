<template>
  <div 
    v-if="characterStore.gameState === 'game_over'"
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none pointer-events-auto animate-in fade-in duration-200"
    @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
  >
    <div 
      class="glass-panel border border-rose-500/60 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl bg-slate-950 flex flex-col items-center text-center gap-3.5 max-h-[85dvh] overflow-y-auto animate-in zoom-in-95 duration-200"
    >
      <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-500 animate-pulse shrink-0">
        <Skull class="w-6 h-6 sm:w-8 sm:h-8" />
      </div>

      <div>
        <h2 class="text-lg sm:text-xl font-black text-rose-400">Mag'lubiyat!</h2>
        <p class="text-xs text-slate-300 mt-1">Barcha jonlar tugadi! Dushmanlar bazangizni egallab oldi.</p>
      </div>

      <div class="flex items-center gap-3 sm:gap-4 bg-slate-900/80 px-3 sm:px-4 py-2 rounded-xl border border-slate-800 font-mono text-xs">
        <span>To'lqin: <strong class="text-purple-300">{{ characterStore.currentWaveIndex + 1 }}</strong></span>
        <span class="flex items-center gap-1">O'ldirildi: <Skull class="w-3.5 h-3.5 text-rose-400" /><strong class="text-rose-400">{{ characterStore.totalKills }}</strong></span>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-2 w-full pt-2">
        <!-- In Multiplayer -->
        <template v-if="multiplayerStore.roomId">
          <button 
            @click="multiplayerStore.returnToLobby(router)"
            class="py-2.5 px-3 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 touch-target"
          >
            <Home class="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>
          <button 
            @click="multiplayerStore.leaveRoom(router)"
            class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 touch-target"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </button>
        </template>

        <!-- In Single Player Mode -->
        <template v-else>
          <button 
            @click="characterStore.restartGame()"
            class="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg active:scale-95 touch-target"
          >
            Qayta Boshlash
          </button>
          <button 
            @click="handleReturnToEditor"
            class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer active:scale-95 touch-target"
          >
            Redaktor
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Skull, Home, LogOut } from 'lucide-vue-next'
import { useCharacterStore } from '../../stores/characterStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'

const router = useRouter()
const characterStore = useCharacterStore()
const multiplayerStore = useMultiplayerStore()

function handleReturnToEditor() {
  characterStore.exitPlayMode()
  router.push('/editor')
}
</script>
