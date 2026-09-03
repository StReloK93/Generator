<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans relative pt-safe">
    <!-- Background glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/3 left-1/3 w-[400px] sm:w-[600px] h-[300px] sm:h-[400px] bg-brand-600/10 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[350px] sm:w-[500px] h-[250px] sm:h-[350px] bg-amber-500/10 rounded-full blur-[140px]"></div>
    </div>

    <!-- Header Bar -->
    <header class="relative z-10 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <!-- Back to Home Button -->
        <button 
          @click="handleLeave"
          class="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60 shrink-0 touch-target"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="hidden sm:inline">Chiqish</span>
        </button>

        <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

        <div class="min-w-0">
          <h1 class="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
            <span class="truncate">{{ multiplayerStore.roomName || 'O\'yin Xonasi' }}</span>
            <span class="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-bold border border-emerald-500/30 shrink-0">
              LOBBY
            </span>
          </h1>
          <p class="text-[10px] sm:text-[11px] text-slate-400 truncate">Karta: <strong class="text-slate-200">{{ multiplayerStore.mapName }}</strong></p>
        </div>
      </div>

      <!-- Room Code Copy Badge -->
      <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <div class="glass-panel px-2.5 sm:px-3.5 py-1 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-slate-900/90 flex items-center gap-1.5 sm:gap-2">
          <span class="text-[10px] sm:text-xs text-slate-400 font-medium hidden xs:inline">Kod:</span>
          <span class="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wider">
            {{ multiplayerStore.roomId || route.params.roomId }}
          </span>
          <button 
            @click="copyRoomCode"
            class="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer touch-target flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
            :title="isCopied ? 'Nusxalandi!' : 'Kodni nusxalash'"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Tab Switcher (Visible only on mobile screens < lg) -->
    <div class="lg:hidden relative z-10 px-3 pt-2 shrink-0">
      <div class="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
        <button 
          @click="mobileActiveTab = 'slots'"
          :class="mobileActiveTab === 'slots' ? 'bg-brand-600 text-white font-bold shadow' : 'text-slate-400'"
          class="py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer touch-target"
        >
          <Users class="w-3.5 h-3.5" />
          <span>O'rinlar ({{ filledSlotsCount }}/{{ multiplayerStore.slots.length }})</span>
        </button>
        <button 
          @click="mobileActiveTab = 'chat'"
          :class="mobileActiveTab === 'chat' ? 'bg-brand-600 text-white font-bold shadow' : 'text-slate-400'"
          class="py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer touch-target"
        >
          <span>💬 Xona Chati</span>
        </button>
      </div>
    </div>

    <!-- Main Lobby Content (Scrollable & Responsive) -->
    <main class="relative z-10 flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 items-start overflow-y-auto custom-scrollbar">
      
      <!-- Left 2 Cols: Player Slots Grid -->
      <div 
        class="lg:col-span-2 space-y-3 sm:space-y-4"
        :class="{ 'hidden lg:block': mobileActiveTab !== 'slots' }"
      >
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-brand-400" />
            <h2 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              O'yinchi O'rinlari ({{ filledSlotsCount }} / {{ multiplayerStore.slots.length }})
            </h2>
          </div>
          <span class="text-[11px] text-slate-400 hidden sm:inline">
            Har bir o'yinchi bitta chiqish eshigiga biriktiriladi
          </span>
        </div>

        <!-- Player Slots List / Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
          <LobbyPlayerSlot 
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>

        <!-- Map Info Banner -->
        <div class="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0">
              🗺️
            </div>
            <div>
              <strong class="text-white text-xs block">{{ mapStore.project.name || 'Burbenog TD' }}</strong>
              <span class="text-[11px]">{{ mapStore.project.cols }}x{{ mapStore.project.rows }} | {{ mapStore.project.layers.length }} Qatlam</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="text-amber-400 font-semibold block text-[11px] sm:text-xs">{{ characterStore.waveConfigs.length || 10 }} To'lqin</span>
            <span class="text-[10px] text-slate-500">Avto sinxron</span>
          </div>
        </div>
      </div>

      <!-- Right Col: Lobby Chat & Controls -->
      <div 
        class="h-[360px] sm:h-[460px] lg:h-[500px] flex flex-col"
        :class="{ 'hidden lg:flex': mobileActiveTab !== 'chat' }"
      >
        <LobbyChat class="flex-1" />
      </div>
    </main>

    <!-- Bottom Action Bar (Fixed at bottom with safe area) -->
    <footer class="relative z-20 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between gap-2 shrink-0 pb-safe shadow-2xl">
      <div class="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="multiplayerStore.connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
        <span class="truncate text-[11px] sm:text-xs">{{ multiplayerStore.isHost ? '👑 Siz Hostsiz' : '🌐 Ulandingiz' }}</span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Ready Toggle (For Clients) with pulsating attention gesture -->
        <button 
          v-if="!multiplayerStore.isHost"
          @click="multiplayerStore.toggleReady()"
          class="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wide transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 touch-target"
          :class="[
            multiplayerStore.myPlayer?.isReady 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30 animate-pulse',
            multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady
              ? 'ring-4 ring-amber-400 animate-bounce'
              : ''
          ]"
        >
          <span>{{ multiplayerStore.myPlayer?.isReady ? '✅ Tayyorman' : '⏳ Tayyorman!' }}</span>
        </button>

        <!-- Start Game / Nudge Button (For Host) -->
        <template v-if="multiplayerStore.isHost">
          <!-- When players are not ready: Nudge button -->
          <button 
            v-if="!multiplayerStore.isAllReady"
            @click="multiplayerStore.sendReadyCheck()"
            class="px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-target"
            title="Barcha o'yinchilarga tayyor bo'lish so'rovini yuborish"
          >
            <BellRing class="w-4 h-4 animate-bounce shrink-0" />
            <span>🔔 Eslatish ({{ multiplayerStore.unreadyCount }} kutilmoqda)</span>
          </button>

          <!-- When everyone is ready (or solo): Start Game Button -->
          <button 
            v-else
            @click="handleStartGame"
            class="px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 animate-pulse touch-target"
          >
            <Play class="w-4 h-4 fill-current shrink-0" />
            <span>🚀 Boshlash (Start)</span>
          </button>
        </template>
      </div>
    </footer>

    <!-- Eye-catching Ready Check Alert Modal (For Clients when Host nudges) -->
    <div 
      v-if="multiplayerStore.isNudgeModalOpen && !multiplayerStore.isHost"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div class="glass-panel w-full max-w-sm rounded-3xl border-2 border-amber-500/80 bg-slate-900/95 shadow-2xl p-5 sm:p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center text-2xl sm:text-3xl shadow-lg animate-bounce">
          🔔
        </div>

        <div class="space-y-1">
          <h3 class="text-base font-bold text-white tracking-wide">
            O'yin Boshlanmoqda!
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            👑 Xona egasi (<strong class="text-amber-300">{{ multiplayerStore.nudgeHostName || 'Host' }}</strong>) o'yinni boshlashga tayyor. Iltimos, tayyorgarligingizni tasdiqlang!
          </p>
        </div>

        <button 
          @click="multiplayerStore.toggleReady()"
          class="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 touch-target"
        >
          <Check class="w-4 h-4 font-bold" />
          <span>✅ HA, MEN TAYYORMAN!</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Users, Copy, Check, Play, BellRing } from 'lucide-vue-next'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import LobbyPlayerSlot from '../components/LobbyPlayerSlot.vue'
import LobbyChat from '../components/LobbyChat.vue'

const route = useRoute()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()

const isCopied = ref(false)
const mobileActiveTab = ref<'slots' | 'chat'>('slots')

const filledSlotsCount = computed(() => {
  return multiplayerStore.slots.filter(s => s.player !== null).length
})

onMounted(() => {
  multiplayerStore.setRouter(router)
  const code = (route.params.roomId as string) || ''
  if (code && !multiplayerStore.roomId) {
    multiplayerStore.joinGame(code, router)
  }
})

// Auto-navigate to game whenever room game state becomes 'in_game'
watch(
  () => multiplayerStore.roomGameState,
  (state) => {
    if (state === 'in_game') {
      const code = multiplayerStore.roomId || (route.params.roomId as string)
      router.push(`/game/${code}`)
    }
  },
  { immediate: true }
)

function copyRoomCode() {
  const code = multiplayerStore.roomId || (route.params.roomId as string)
  if (code) {
    navigator.clipboard.writeText(code)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

function handleStartGame() {
  multiplayerStore.startGame(router)
}

function handleLeave() {
  if (confirm("Xonadan chiqmoqchimisiz?")) {
    multiplayerStore.leaveRoom(router)
  }
}

function handleBeforeUnload() {
  if (multiplayerStore.roomId) {
    multiplayerStore.leaveRoom()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
