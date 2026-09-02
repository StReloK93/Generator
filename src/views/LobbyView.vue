<template>
  <div class="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans relative">
    <!-- Background glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[140px]"></div>
    </div>

    <!-- Header Bar -->
    <header class="relative z-10 w-full px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Back to Home Button -->
        <button 
          @click="handleLeave"
          class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Bosh Sahifa</span>
        </button>

        <div class="h-5 w-px bg-slate-800"></div>

        <div>
          <h1 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>{{ multiplayerStore.roomName || 'O\'yin Xonasi' }}</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              LOBBY
            </span>
          </h1>
          <p class="text-[11px] text-slate-400">Karta: <strong class="text-slate-200">{{ multiplayerStore.mapName }}</strong></p>
        </div>
      </div>

      <!-- Room Code Copy Badge -->
      <div class="flex items-center gap-2.5">
        <div class="glass-panel px-4 py-1.5 rounded-2xl border border-amber-500/40 bg-slate-900/90 flex items-center gap-3">
          <span class="text-xs text-slate-400 font-medium">Xona Kodi:</span>
          <span class="font-mono text-base font-black text-amber-300 tracking-wider">
            {{ multiplayerStore.roomId || route.params.roomId }}
          </span>
          <button 
            @click="copyRoomCode"
            class="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer"
            :title="isCopied ? 'Nusxalandi!' : 'Kodni nusxalash'"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Lobby Content -->
    <main class="relative z-10 flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      <!-- Left 2 Cols: Player Slots Grid -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-brand-400" />
            <h2 class="text-sm font-bold text-white uppercase tracking-wider">
              O'yinchi O'rinlari ({{ filledSlotsCount }} / {{ multiplayerStore.slots.length }})
            </h2>
          </div>
          <span class="text-xs text-slate-400">
            Har bir o'yinchi bitta chiqish eshigiga biriktiriladi
          </span>
        </div>

        <!-- Player Slots List / Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <LobbyPlayerSlot 
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>

        <!-- Map Info Banner -->
        <div class="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-base">
              🗺️
            </div>
            <div>
              <strong class="text-white text-xs block">{{ mapStore.project.name || 'Burbenog TD' }}</strong>
              <span>O'lchami: {{ mapStore.project.cols }}x{{ mapStore.project.rows }} | {{ mapStore.project.layers.length }} ta Qatlam</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-amber-400 font-semibold block">{{ characterStore.waveConfigs.length || 10 }} ta To'lqin</span>
            <span class="text-[11px] text-slate-500">Avtomatik sinxron</span>
          </div>
        </div>
      </div>

      <!-- Right Col: Lobby Chat & Controls -->
      <div class="h-[520px] flex flex-col">
        <LobbyChat class="flex-1" />
      </div>
    </main>

    <!-- Bottom Action Bar -->
    <footer class="relative z-10 w-full px-6 py-4 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between">
      <div class="flex items-center gap-3 text-xs text-slate-400">
        <span class="w-2.5 h-2.5 rounded-full" :class="multiplayerStore.connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
        <span>{{ multiplayerStore.isHost ? '👑 Siz xona egasisiz (Host)' : '🌐 Siz xonaga ulandingiz' }}</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Ready Toggle (For Clients) with pulsating attention gesture -->
        <button 
          v-if="!multiplayerStore.isHost"
          @click="multiplayerStore.toggleReady()"
          class="px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
          :class="[
            multiplayerStore.myPlayer?.isReady 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30',
            multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady
              ? 'ring-4 ring-amber-400 animate-bounce'
              : ''
          ]"
        >
          <span v-if="multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady">👉</span>
          <span>{{ multiplayerStore.myPlayer?.isReady ? '✅ Tayyorman (Kutilmoqda)' : '⏳ Tayyor emasman (Bosing!)' }}</span>
          <span v-if="multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady">👈</span>
        </button>

        <!-- Start Game / Nudge Button (For Host) -->
        <template v-if="multiplayerStore.isHost">
          <!-- When players are not ready: Nudge button -->
          <button 
            v-if="!multiplayerStore.isAllReady"
            @click="multiplayerStore.sendReadyCheck()"
            class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Barcha o'yinchilarga tayyor bo'lish so'rovini yuborish"
          >
            <BellRing class="w-4 h-4 animate-bounce" />
            <span>🔔 Hamma Tayyormi? ({{ multiplayerStore.unreadyCount }} ta o'yinchi kutilmoqda)</span>
          </button>

          <!-- When everyone is ready (or solo): Start Game Button -->
          <button 
            v-else
            @click="handleStartGame"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs tracking-wide shadow-xl shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 animate-pulse"
          >
            <Play class="w-4 h-4 fill-current" />
            <span>🚀 O'yinni Boshlash (Start Game)</span>
          </button>
        </template>
      </div>
    </footer>

    <!-- Eye-catching Ready Check Alert Modal (For Clients when Host nudges) -->
    <div 
      v-if="multiplayerStore.isNudgeModalOpen && !multiplayerStore.isHost"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div class="glass-panel w-full max-w-sm rounded-3xl border-2 border-amber-500/80 bg-slate-900/95 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center text-3xl shadow-lg animate-bounce">
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
          class="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
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
