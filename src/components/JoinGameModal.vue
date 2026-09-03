<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none pt-safe pb-safe"
    @click.self="close"
  >
    <div class="glass-panel w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]">
      <!-- Header -->
      <div class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center text-base sm:text-lg font-bold shrink-0">
            🌐
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5 sm:gap-2">
              <span>Onlayn O'yinlar</span>
              <span class="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-bold border border-emerald-500/30 animate-pulse">
                JONLI
              </span>
            </h2>
            <p class="text-[11px] sm:text-xs text-slate-400 line-clamp-1">Xona tanlang va 1 bosishda kiring</p>
          </div>
        </div>

        <button 
          @click="close"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-target"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
        <!-- Player Nickname & Color Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 items-center">
          <div class="space-y-1 sm:space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Ismingiz (Nickname):</label>
            <input 
              v-model="playerName"
              type="text"
              maxlength="16"
              placeholder="Ismingizni kiriting"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
            />
          </div>

          <div class="space-y-1 sm:space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">Rangingiz:</label>
            <div class="flex items-center gap-1.5 pt-0.5">
              <button 
                v-for="color in PLAYER_COLORS"
                :key="color"
                @click="selectedColor = color"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm touch-target"
                :style="{ backgroundColor: color }"
                :class="selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'"
              >
                <Check v-if="selectedColor === color" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 font-bold" />
              </button>
            </div>
          </div>
        </div>

        <!-- Section: Active Lobbies (Server Browser) -->
        <div class="space-y-2.5 sm:space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Radio class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
              <h3 class="text-xs font-bold text-white uppercase tracking-wider">
                Mavjud Ochiq Xonalar ({{ activeLobbies.length }})
              </h3>
            </div>
            
            <button 
              @click="handleManualRefresh"
              class="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800 touch-target"
            >
              <RefreshCw class="w-3 h-3" :class="isRefreshing ? 'animate-spin text-brand-400' : ''" />
              <span>Yangilash</span>
            </button>
          </div>

          <!-- Active Lobbies Grid / List -->
          <div v-if="activeLobbies.length > 0" class="space-y-2 sm:space-y-2.5">
            <div 
              v-for="room in activeLobbies"
              :key="room.roomId"
              class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-slate-700/80 hover:border-emerald-500/80 hover:shadow-xl hover:shadow-emerald-500/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
            >
              <!-- Room & Host Info -->
              <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div 
                  class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-slate-950 font-black text-xs sm:text-base shadow-lg shrink-0 relative"
                  :style="{ backgroundColor: room.hostColor || '#38bdf8' }"
                >
                  <span>{{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}</span>
                  <span class="absolute -top-1 -right-1 text-[10px]">👑</span>
                </div>

                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 sm:gap-2">
                    <h4 class="font-black text-xs sm:text-sm text-white truncate">{{ room.roomName }}</h4>
                    <span class="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      LOBBY
                    </span>
                  </div>

                  <div class="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    <span class="text-slate-200 font-medium truncate max-w-[100px]">🗺️ {{ room.mapName }}</span>
                    <span>•</span>
                    <span class="text-amber-300 font-semibold font-mono">
                      👥 {{ room.playersCount }}/{{ room.maxPlayers }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 1-Click Join Button -->
              <button 
                @click="joinSpecificRoom(room.roomId)"
                :disabled="isJoining"
                class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 touch-target"
              >
                <LogIn class="w-4 h-4" />
                <span>{{ isJoining ? 'Ulanilmoqda...' : 'Kirish' }}</span>
              </button>
            </div>
          </div>

          <!-- Empty State: No active rooms found -->
          <div 
            v-else 
            class="p-6 sm:p-8 rounded-3xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-2.5 sm:space-y-3"
          >
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400 shadow-inner">
              <Radio class="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 animate-pulse" />
            </div>

            <div>
              <p class="text-xs sm:text-sm font-bold text-white">Hozircha ochiq xonalar topilmadi</p>
              <p class="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Do'stingiz xona ochishini kuting yoki yangi xona oching!
              </p>
            </div>

            <div class="pt-1 sm:pt-2">
              <button 
                @click="handleCreateGameInstead"
                class="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5 touch-target"
              >
                <span>➕ Yangi Xona Ochish</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Optional: Private Room Code Accordion -->
        <div class="pt-2 border-t border-slate-800/80">
          <button 
            @click="showCodeInput = !showCodeInput"
            class="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors touch-target"
          >
            <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="showCodeInput ? 'rotate-180' : ''" />
            <span>Maxfiy xona kodini qo'lda kiritish</span>
          </button>

          <div v-if="showCodeInput" class="mt-2.5 flex items-center gap-2 animate-in fade-in duration-150">
            <input 
              v-model="roomCode"
              type="text"
              maxlength="8"
              placeholder="Masalan: 7X9K2A"
              class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-center text-xs sm:text-sm font-mono font-bold text-amber-300 tracking-widest uppercase focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
              @keyup.enter="handleJoinGame"
            />
            <button 
              @click="handleJoinGame"
              :disabled="!roomCode.trim() || isJoining"
              class="px-4 py-2 sm:py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs tracking-wide shadow transition-all cursor-pointer active:scale-95 disabled:opacity-40 touch-target"
            >
              Ulanish
            </button>
          </div>
        </div>
      </div>

      <!-- Sticky Footer -->
      <div class="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/90 text-xs text-slate-500 shrink-0">
        <button 
          @click="close"
          class="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer touch-target"
        >
          Yopish
        </button>

        <span class="font-mono text-[10px] sm:text-[11px]">
          P2P Multi-Player
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { X, Check, LogIn, Radio, RefreshCw, ChevronDown } from 'lucide-vue-next'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { PLAYER_COLORS } from '../types/multiplayer'

const emit = defineEmits<{
  (e: 'open-create-game'): void
}>()

const router = useRouter()
const multiplayerStore = useMultiplayerStore()

const isOpen = ref(false)
const roomCode = ref('')
const playerName = ref(multiplayerStore.myPlayerName)
const selectedColor = ref(multiplayerStore.myPlayerColor)
const isJoining = ref(false)
const isRefreshing = ref(false)
const showCodeInput = ref(false)

const activeLobbies = computed(() => {
  return multiplayerStore.availableRooms.filter(r => r.roomId !== multiplayerStore.roomId)
})

function open(initialCode = '') {
  roomCode.value = initialCode
  playerName.value = multiplayerStore.myPlayerName
  selectedColor.value = multiplayerStore.myPlayerColor
  multiplayerStore.refreshDiscovery()
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function handleManualRefresh() {
  isRefreshing.value = true
  multiplayerStore.refreshDiscovery()
  setTimeout(() => {
    multiplayerStore.refreshDiscovery()
    isRefreshing.value = false
  }, 400)
}

function handleCreateGameInstead() {
  close()
  emit('open-create-game')
}

async function joinSpecificRoom(targetCode: string) {
  roomCode.value = targetCode
  await handleJoinGame()
}

async function handleJoinGame() {
  if (!roomCode.value.trim() || isJoining.value) return
  isJoining.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value, selectedColor.value)
    await multiplayerStore.joinGame(roomCode.value, router)
    isOpen.value = false
  } catch (err) {
    console.error('Failed to join room:', err)
    alert('Xonaga ulanishda xatolik yuz berdi')
  } finally {
    isJoining.value = false
  }
}

defineExpose({
  open,
  close,
})
</script>
