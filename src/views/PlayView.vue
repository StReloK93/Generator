<template>
  <div class="min-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans pt-safe pb-safe relative">
    <!-- Ambient Background Glows -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-brand-600/15 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[140px]"></div>
      <div class="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
    </div>

    <!-- Top Compact Header -->
    <header class="relative z-10 w-full px-3 sm:px-6 py-2.5 sm:py-3.5 max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
      <div class="flex items-center gap-2 sm:gap-3">
        <button 
          @click="router.push('/')"
          class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer active:scale-95 touch-target flex items-center gap-1 text-xs font-bold"
          title="Bosh sahifaga qaytish"
        >
          <ArrowLeft class="w-4 h-4" />
          <span class="hidden xs:inline">Chiqish</span>
        </button>

        <h1 class="font-black text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
          <span>O'YINGA KIRISH</span>
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </h1>
      </div>

      <!-- Player Profile Indicator -->
      <div class="flex items-center gap-2">
        <div class="glass-panel px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5 text-xs bg-slate-900/90 shadow-sm">
          <span 
            class="w-3 h-3 rounded-full border border-white/50 shrink-0" 
            :style="{ backgroundColor: selectedColor }"
          ></span>
          <span class="font-bold text-white text-[11px] sm:text-xs truncate max-w-[85px] sm:max-w-[120px]">
            {{ playerName || 'O\'yinchi' }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Mobile Content Area -->
    <main class="relative z-10 flex-1 max-w-2xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-5 flex flex-col gap-3.5 sm:gap-4 overflow-y-auto custom-scrollbar">
      
      <!-- 1. Player Setup Strip (Name & Color) -->
      <div class="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-md flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <User class="w-4 h-4 text-brand-400 shrink-0" />
            <input 
              v-model="playerName"
              type="text"
              maxlength="16"
              placeholder="O'yinchi nomi"
              class="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
            />
          </div>

          <!-- Quick Colors Palette -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              v-for="color in PLAYER_COLORS"
              :key="color"
              @click="selectedColor = color"
              class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center touch-target"
              :style="{ backgroundColor: color }"
              :class="selectedColor === color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-60 hover:opacity-100'"
            >
              <Check v-if="selectedColor === color" class="w-3 h-3 text-slate-950 font-black" />
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Segmented Mode Switcher (Host / Join) -->
      <div class="grid grid-cols-2 p-1 rounded-2xl bg-slate-900/95 border border-slate-800/90 shadow-lg text-xs font-bold">
        <button 
          @click="activeTab = 'host'"
          class="py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
          :class="activeTab === 'host' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-black' : 'text-slate-400 hover:text-white'"
        >
          <Gamepad2 class="w-4 h-4" />
          <span>XONA OCHISH</span>
        </button>

        <button 
          @click="activeTab = 'join'"
          class="py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
          :class="activeTab === 'join' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20 font-black' : 'text-slate-400 hover:text-white'"
        >
          <Globe class="w-4 h-4" />
          <span>ULANISH (JOIN)</span>
        </button>
      </div>

      <!-- TAB 1: HOST GAME (Yangi Xona Ochish) -->
      <div v-if="activeTab === 'host'" class="flex flex-col gap-3 animate-in fade-in duration-150">
        <!-- Room Name Input -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Xona Nomi:</label>
          <input 
            v-model="roomName"
            type="text"
            maxlength="32"
            placeholder="Masalan: Burbenog TD Co-op"
            class="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        <!-- Map Selection Grid -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between pl-1">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Karta Tanlash:</label>
            <span class="text-[10px] text-amber-400 font-semibold">{{ availableMaps[selectedMapIndex]?.playersCount || 4 }} o'yinchi</span>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div 
              v-for="(m, idx) in availableMaps"
              :key="m.id"
              @click="selectedMapIndex = idx"
              class="p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 touch-target relative overflow-hidden"
              :class="selectedMapIndex === idx 
                ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10' 
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0">
                  <h4 class="font-bold text-xs sm:text-sm text-white truncate">{{ m.name }}</h4>
                  <span class="text-[10px] text-slate-400 font-mono">{{ m.cols }}x{{ m.rows }} katak</span>
                </div>
                <div 
                  v-if="selectedMapIndex === idx" 
                  class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0"
                >
                  <Check class="w-3 h-3 font-black" />
                </div>
              </div>

              <div class="flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold pt-1 border-t border-slate-800/80">
                <Users class="w-3 h-3 text-amber-400 shrink-0" />
                <span>Maks: {{ m.playersCount }} o'yinchi</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Create Room Primary Button -->
        <button 
          @click="handleCreateRoom"
          :disabled="isCreatingRoom"
          class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 touch-target mt-2 disabled:opacity-50"
        >
          <Gamepad2 class="w-4 h-4" />
          <span>{{ isCreatingRoom ? 'XONA YARATILMOQDA...' : 'XONA OCHISH' }}</span>
        </button>
      </div>

      <!-- TAB 2: JOIN GAME (O'yinga Ulanish) -->
      <div v-else class="flex flex-col gap-3 animate-in fade-in duration-150">
        <!-- Direct 6-Digit Code Input Strip -->
        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex items-center gap-2">
          <KeyRound class="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
          <input 
            v-model="roomCodeInput"
            type="text"
            maxlength="12"
            placeholder="Xona kodi (masalan: 6 xonali)"
            class="w-full bg-transparent border-none text-xs sm:text-sm text-white font-mono font-bold uppercase focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-slate-500"
            @keyup.enter="handleJoinByCode"
          />
          <button 
            @click="handleJoinByCode"
            :disabled="!roomCodeInput.trim() || isJoining"
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 touch-target flex items-center gap-1.5"
          >
            <span>{{ isJoining ? '...' : 'Ulanish' }}</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Active Lobbies Header with Refresh -->
        <div class="flex items-center justify-between pl-1 pt-1">
          <div class="flex items-center gap-2">
            <Radio class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Ochiq Xonalar ({{ multiplayerStore.availableRooms.length }})
            </span>
          </div>

          <button 
            @click="refreshRooms"
            class="p-1 text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px] touch-target"
            title="Yangilash"
          >
            <RefreshCw class="w-3 h-3" :class="isRefreshing ? 'animate-spin text-emerald-400' : ''" />
            <span>Yangilash</span>
          </button>
        </div>

        <!-- Active Lobbies List -->
        <div v-if="multiplayerStore.availableRooms.length > 0" class="flex flex-col gap-2">
          <div 
            v-for="room in multiplayerStore.availableRooms"
            :key="room.roomId"
            class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/80 transition-all flex items-center justify-between gap-2.5 shadow-md"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div 
                class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow"
                :style="{ backgroundColor: room.hostColor || '#10b981' }"
              >
                {{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-xs sm:text-sm text-white truncate">{{ room.roomName }}</h4>
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span class="text-slate-300 truncate max-w-[110px]">{{ room.mapName }}</span>
                  <span>•</span>
                  <span class="text-emerald-400 font-bold font-mono">{{ room.playersCount }}/{{ room.maxPlayers }}</span>
                </div>
              </div>
            </div>

            <button 
              @click="joinRoom(room.roomId)"
              :disabled="isJoining"
              class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shrink-0 active:scale-95 touch-target flex items-center gap-1"
            >
              <span>Kirish</span>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div 
          v-else 
          class="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center flex flex-col items-center gap-2"
        >
          <Radio class="w-5 h-5 text-slate-500 animate-pulse" />
          <p class="text-xs text-slate-400">Hozircha ochiq xonalar yo'q</p>
          <button 
            @click="activeTab = 'host'"
            class="px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer active:scale-95 touch-target"
          >
            Yangi xona ochish
          </button>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation / Status -->
    <footer class="relative z-10 w-full px-4 py-2.5 max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900">
      <span>Isocraft TD Mobile</span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Online Server</span>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, ArrowRight, Gamepad2, Globe, User, Check, Users, KeyRound, Radio, RefreshCw 
} from 'lucide-vue-next'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import burbenogMapData from '../maps/Burbenog.json'
import twoLineMapData from '../maps/TwoLineMap.json'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const activeTab = ref<'host' | 'join'>('host')
const PLAYER_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#ec4899']

const playerName = ref(multiplayerStore.myPlayerName || 'Player')
const selectedColor = ref(multiplayerStore.myPlayerColor || '#38bdf8')
const roomName = ref('Burbenog TD Co-op')
const roomCodeInput = ref('')
const selectedMapIndex = ref(0)
const isCreatingRoom = ref(false)
const isJoining = ref(false)
const isRefreshing = ref(false)

const availableMaps = [
  {
    id: 'burbenog-td',
    name: 'Burbenog TD',
    cols: 64,
    rows: 64,
    playersCount: 4,
    data: burbenogMapData,
  },
  {
    id: 'two-line-map',
    name: 'Two Line Co-op',
    cols: 50,
    rows: 50,
    playersCount: 2,
    data: twoLineMapData,
  }
]

async function handleCreateRoom() {
  if (isCreatingRoom.value) return
  isCreatingRoom.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value.trim() || 'Player', selectedColor.value)

    const chosenMap = availableMaps[selectedMapIndex.value] || availableMaps[0]
    const raw = chosenMap.data as any
    const project = raw.project || raw
    mapStore.project = JSON.parse(JSON.stringify(project))

    if (raw.waveData?.waveConfigs && raw.waveData.waveConfigs.length > 0) {
      characterStore.waveConfigs = raw.waveData.waveConfigs.map((w: any) => ({ ...w }))
    } else if (project.waveConfigs && project.waveConfigs.length > 0) {
      characterStore.waveConfigs = project.waveConfigs.map((w: any) => ({ ...w }))
    }

    if (raw.towerData?.towerBlueprints && raw.towerData.towerBlueprints.length > 0) {
      towerStore.blueprints = raw.towerData.towerBlueprints.map((b: any) => ({ ...b }))
    } else if (project.towerBlueprints && project.towerBlueprints.length > 0) {
      towerStore.blueprints = project.towerBlueprints.map((b: any) => ({ ...b }))
    }

    if (raw.characterData?.customRoutes) {
      characterStore.customRoutes = raw.characterData.customRoutes
    } else if (project.customRoutes) {
      characterStore.customRoutes = project.customRoutes
    }

    characterStore.detectDoors()

    await multiplayerStore.hostNewGame(
      roomName.value.trim() || `${playerName.value} TD O'yini`,
      mapStore.project,
      router
    )
  } catch (err: any) {
    console.error('Xona ochishda xatolik:', err)
    alert('Xona ochishda xatolik yuz berdi')
  } finally {
    isCreatingRoom.value = false
  }
}

async function handleJoinByCode() {
  const code = roomCodeInput.value.trim().toUpperCase()
  if (!code || isJoining.value) return
  await joinRoom(code)
}

async function joinRoom(targetRoomId: string) {
  if (isJoining.value) return
  isJoining.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value.trim() || 'Player', selectedColor.value)
    await multiplayerStore.joinGame(targetRoomId, router)
  } catch (err: any) {
    console.error('Ulanishda xatolik:', err)
    alert('Xonaga ulanib bo\'lmadi')
  } finally {
    isJoining.value = false
  }
}

function refreshRooms() {
  isRefreshing.value = true
  multiplayerStore.refreshDiscovery()
  setTimeout(() => {
    multiplayerStore.refreshDiscovery()
    isRefreshing.value = false
  }, 400)
}

let discoveryTimer: any = null
onMounted(() => {
  multiplayerStore.refreshDiscovery()
  discoveryTimer = setInterval(() => {
    multiplayerStore.refreshDiscovery()
  }, 1000)
})

onUnmounted(() => {
  if (discoveryTimer) clearInterval(discoveryTimer)
})
</script>
