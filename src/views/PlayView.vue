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
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ArrowLeft"
          title="Return to Home"
          @click="router.push('/')"
        >
          <span class="hidden xs:inline">Back</span>
        </UiButton>

        <h1 class="font-black text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
          <span>ENTER GAME</span>
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
            {{ playerName || 'Player' }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Mobile Content Area -->
    <main class="relative z-10 flex-1 max-w-2xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-5 flex flex-col gap-3.5 sm:gap-4 overflow-y-auto custom-scrollbar">
      
      <!-- 1. Player Setup Strip (Name & Color) -->
      <UiCard variant="subtle" padding="sm">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <UiInput
              v-model="playerName"
              placeholder="Player Nickname"
              :leading-icon="User"
              :maxlength="16"
              size="sm"
            />
          </div>

          <!-- Quick Colors Palette -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              v-for="color in PLAYER_COLORS"
              :key="color"
              type="button"
              class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center touch-target"
              :style="{ backgroundColor: color }"
              :class="selectedColor === color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-60 hover:opacity-100'"
              @click="selectedColor = color"
            >
              <Check v-if="selectedColor === color" class="w-3 h-3 text-slate-950 font-black" />
            </button>
          </div>
        </div>
      </UiCard>

      <!-- 2. Segmented Mode Switcher (Host / Join) -->
      <UiTabs
        v-model="activeTab"
        :items="playModeTabs"
        variant="segmented"
        size="md"
        fill
      />

      <!-- TAB 1: HOST GAME -->
      <div v-if="activeTab === 'host'" class="flex flex-col gap-3 animate-in fade-in duration-150">
        <!-- Room Name Input -->
        <UiInput
          v-model="roomName"
          label="Room Name:"
          placeholder="e.g. Burbenog TD Co-op"
          :maxlength="32"
        />

        <!-- Map Selection Grid -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between pl-1">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Map:</label>
            <span class="text-[10px] text-amber-400 font-semibold">{{ availableMaps[selectedMapIndex]?.playersCount || 4 }} players</span>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
            <UiCard 
              v-for="(m, idx) in availableMaps"
              :key="m.id"
              :variant="selectedMapIndex === idx ? 'amber' : 'subtle'"
              :selected="selectedMapIndex === idx"
              interactive
              padding="sm"
              @click="selectedMapIndex = idx"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0">
                  <h4 class="font-bold text-xs sm:text-sm text-white truncate">{{ m.name }}</h4>
                  <span class="text-[10px] text-slate-400 font-mono">{{ m.cols }}x{{ m.rows }} cells</span>
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
                <span>Max: {{ m.playersCount }} players</span>
              </div>
            </UiCard>
          </div>
        </div>

        <!-- Create Room Primary Button -->
        <UiButton
          variant="game-amber"
          size="lg"
          block
          :loading="isCreatingRoom"
          :leading-icon="Gamepad2"
          custom-class="mt-2"
          @click="handleCreateRoom"
        >
          {{ isCreatingRoom ? 'HOSTING GAME...' : 'HOST GAME' }}
        </UiButton>
      </div>

      <!-- TAB 2: JOIN GAME -->
      <div v-else class="flex flex-col gap-3 animate-in fade-in duration-150">
        <!-- Direct 6-Digit Code Input Strip -->
        <UiCard variant="subtle" padding="sm">
          <div class="flex items-center gap-2">
            <KeyRound class="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
            <input 
              v-model="roomCodeInput"
              type="text"
              maxlength="12"
              placeholder="Room code (e.g. 6-digit PIN)"
              class="w-full bg-transparent border-none text-xs sm:text-sm text-white font-mono font-bold uppercase focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-slate-500"
              @keyup.enter="handleJoinByCode"
            />
            <UiButton
              variant="game-green"
              size="xs"
              :disabled="!roomCodeInput.trim() || isJoining"
              :leading-icon="ArrowRight"
              @click="handleJoinByCode"
            >
              {{ isJoining ? '...' : 'Connect' }}
            </UiButton>
          </div>
        </UiCard>

        <!-- Active Lobbies Header with Refresh -->
        <div class="flex items-center justify-between pl-1 pt-1">
          <div class="flex items-center gap-2">
            <Radio class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Public Rooms ({{ multiplayerStore.availableRooms.length }})
            </span>
          </div>

          <button 
            type="button"
            class="p-1 text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px] touch-target"
            title="Refresh"
            @click="refreshRooms"
          >
            <RefreshCw class="w-3 h-3" :class="isRefreshing ? 'animate-spin text-emerald-400' : ''" />
            <span>Refresh</span>
          </button>
        </div>

        <!-- Active Lobbies List -->
        <div v-if="multiplayerStore.availableRooms.length > 0" class="flex flex-col gap-2">
          <UiCard 
            v-for="room in multiplayerStore.availableRooms"
            :key="room.roomId"
            variant="default"
            padding="sm"
            custom-class="hover:border-emerald-500/80"
          >
            <div class="flex items-center justify-between gap-2.5">
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

              <UiButton
                variant="game-green"
                size="xs"
                :disabled="isJoining"
                @click="joinRoom(room.roomId)"
              >
                Join
              </UiButton>
            </div>
          </UiCard>
        </div>

        <!-- Empty State -->
        <UiCard 
          v-else 
          variant="subtle"
          padding="lg"
          custom-class="border-dashed text-center flex flex-col items-center gap-2"
        >
          <Radio class="w-5 h-5 text-slate-500 animate-pulse" />
          <p class="text-xs text-slate-400">No public rooms found</p>
          <UiButton
            variant="secondary"
            size="xs"
            @click="activeTab = 'host'"
          >
            Host new room
          </UiButton>
        </UiCard>
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
import { UiButton, UiCard, UiInput, UiTabs, TabItem } from '../components/ui'
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

const activeTab = ref<string | number>('host')
const PLAYER_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#ec4899']

const playModeTabs: TabItem[] = [
  { id: 'host', label: 'HOST GAME', icon: Gamepad2 },
  { id: 'join', label: 'JOIN GAME', icon: Globe },
]

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
    raw: burbenogMapData,
  },
  {
    id: 'two-line-td',
    name: '2-Line Duo Map',
    cols: 60,
    rows: 60,
    playersCount: 2,
    raw: twoLineMapData,
  },
]

let pollTimer: any = null

onMounted(() => {
  multiplayerStore.setPlayerProfile(playerName.value, selectedColor.value)
  multiplayerStore.refreshDiscovery()
  pollTimer = setInterval(() => {
    multiplayerStore.refreshDiscovery()
  }, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function refreshRooms() {
  isRefreshing.value = true
  multiplayerStore.refreshDiscovery()
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}

async function handleCreateRoom() {
  if (isCreatingRoom.value) return
  isCreatingRoom.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value, selectedColor.value)

    const mapData = availableMaps[selectedMapIndex.value]
    const rawData = mapData.raw as any

    if (rawData) {
      const proj = rawData.project || rawData
      mapStore.project = JSON.parse(JSON.stringify(proj))
      
      const waves = rawData.waveData?.waveConfigs || rawData.waveConfigs || proj.waveConfigs || []
      if (waves && waves.length > 0) {
        characterStore.waveConfigs = waves.map((w: any) => ({ ...w }))
      }
      
      const towers = rawData.towerData?.towerBlueprints || rawData.towerBlueprints || proj.towerBlueprints || []
      if (towers && towers.length > 0) {
        towerStore.blueprints = towers.map((b: any) => ({ ...b }))
      }
      towerStore.restoreFromProject()
      characterStore.restoreWavesFromProject()
      characterStore.detectDoors()
    }

    await multiplayerStore.hostNewGame(
      roomName.value || `${playerName.value}'s TD Game`,
      mapStore.project,
      router
    )
  } catch (err: any) {
    console.error('Failed to create room:', err)
    alert('Failed to create room: ' + (err?.message || ''))
  } finally {
    isCreatingRoom.value = false
  }
}

async function handleJoinByCode() {
  const code = roomCodeInput.value.trim()
  if (!code || isJoining.value) return
  await joinRoom(code)
}

async function joinRoom(code: string) {
  isJoining.value = true
  try {
    multiplayerStore.setPlayerProfile(playerName.value, selectedColor.value)
    await multiplayerStore.joinGame(code, router)
  } catch (err: any) {
    console.error('Failed to join:', err)
    alert('Failed to connect to room: ' + (err?.message || ''))
  } finally {
    isJoining.value = false
  }
}
</script>
