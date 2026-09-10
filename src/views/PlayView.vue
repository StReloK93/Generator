<template>
  <div class="h-dvh max-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans pt-safe pb-safe relative">
    <!-- Ambient Background Glows -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-brand-600/15 rounded-full blur-[140px]"></div>
      <div class="absolute bottom-1/4 right-1/4 w-100 h-75 bg-amber-500/10 rounded-full blur-[140px]"></div>
      <div class="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-size-[24px_24px]"></div>
    </div>

    <!-- Top Compact Header -->
    <header class="relative z-30 w-full px-3 sm:px-6 py-2 sm:py-2.5 max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md shrink-0">
      <div class="flex items-center gap-2">
        <UiButton
          variant="secondary"
          size="xs"
          :leading-icon="ArrowLeft"
          :title="$t('common.back')"
          @click="router.push('/')"
        />

        <h1 class="font-black text-xs sm:text-sm text-white tracking-wide flex items-center gap-1.5">
          <span>{{ $t('play.enterGame') }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </h1>
      </div>

      <!-- Right Header Actions: Language Switcher + Player Profile -->
      <div class="flex items-center gap-2">
        <UiLanguageSwitcher />

        <div class="px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5 text-xs bg-slate-900/90 shadow-sm">
          <User class="w-3 h-3 text-slate-400 shrink-0" />
          <span class="font-bold text-white text-[10px] sm:text-xs truncate max-w-24 sm:max-w-32">
            {{ playerName || $t('common.default') }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Mobile Content Area (Zero page scroll) -->
    <main class="relative z-10 flex-1 max-w-lg mx-auto w-full px-3 sm:px-4 py-2 flex flex-col justify-center gap-2.5 min-h-0">
      
      <!-- 1. Player Setup Strip (Name) -->
      <UiCard variant="subtle" padding="xs" custom-class="shrink-0 py-1.5 px-2.5">
        <div class="flex items-center gap-2">
          <div class="flex-1 min-w-0">
            <UiInput
              v-model="playerName"
              :placeholder="$t('home.playerName')"
              :leading-icon="User"
              :maxlength="16"
              size="sm"
            />
          </div>
        </div>
      </UiCard>

      <!-- 2. Segmented Mode Switcher (Host / Join) -->
      <div class="shrink-0">
        <UiTabs
          v-model="activeTab"
          :items="playModeTabs"
          variant="segmented"
          size="sm"
          fill
        />
      </div>

      <!-- TAB 1: HOST GAME -->
      <div v-if="activeTab === 'host'" class="flex flex-col gap-2.5 flex-1 min-h-0 justify-between">
        <!-- Room Name Input -->
        <UiInput
          v-model="roomName"
          :label="$t('play.roomName') + ':'"
          :placeholder="$t('play.roomNamePlaceholder')"
          :maxlength="32"
          size="sm"
        />

        <!-- Map Selection Grid -->
        <div class="space-y-1 min-h-0 flex-1 flex flex-col justify-center">
          <div class="flex items-center justify-between px-0.5">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('play.selectMap') }}:</label>
            <span class="text-[9px] text-amber-400 font-semibold">{{ availableMaps[selectedMapIndex]?.playersCount || 4 }} {{ $t('lobby.players').split(' ')[0] }}</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <UiCard 
              v-for="(m, idx) in availableMaps"
              :key="m.id"
              :variant="selectedMapIndex === idx ? 'amber' : 'subtle'"
              :selected="selectedMapIndex === idx"
              interactive
              padding="xs"
              custom-class="py-1.5 px-2"
              @click="selectedMapIndex = idx"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0 text-left">
                  <h4 class="font-extrabold text-xs text-white truncate">{{ m.name }}</h4>
                  <span class="text-[9px] text-slate-400 font-mono">{{ m.cols }}×{{ m.rows }}</span>
                </div>
                <div 
                  v-if="selectedMapIndex === idx" 
                  class="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0"
                >
                  <Check class="w-2.5 h-2.5 font-black" />
                </div>
              </div>

              <div class="flex items-center gap-1 text-[9px] text-amber-300 font-semibold pt-1 mt-1 border-t border-slate-800/80">
                <Users class="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>{{ $t('common.max') }}: {{ m.playersCount }}</span>
              </div>
            </UiCard>
          </div>
        </div>

        <!-- Create Room Primary Button -->
        <UiButton
          variant="game-amber"
          size="md"
          block
          :loading="isCreatingRoom"
          :leading-icon="Gamepad2"
          class="shrink-0"
          @click="handleCreateRoom"
        >
          {{ isCreatingRoom ? $t('play.hosting') : $t('play.hostGame') }}
        </UiButton>
      </div>

      <!-- TAB 2: JOIN GAME -->
      <div v-else class="flex flex-col gap-2 flex-1 min-h-0 justify-between">
        <!-- Direct 6-Digit Code Input Strip -->
        <UiCard variant="subtle" padding="xs" custom-class="py-1 px-2 shrink-0">
          <div class="flex items-center gap-1.5">
            <KeyRound class="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
            <input 
              v-model="roomCodeInput"
              type="text"
              maxlength="12"
              :placeholder="$t('home.enterCode')"
              class="w-full bg-transparent border-none text-xs text-white font-mono font-bold uppercase focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-slate-500"
              @keyup.enter="handleJoinByCode"
            />
            <UiButton
              variant="game-green"
              size="xs"
              :disabled="!roomCodeInput.trim() || isJoining"
              :leading-icon="ArrowRight"
              @click="handleJoinByCode"
            >
              {{ isJoining ? '...' : $t('play.connect') }}
            </UiButton>
          </div>
        </UiCard>

        <!-- Active Lobbies Header with Refresh -->
        <div class="flex items-center justify-between px-0.5 shrink-0">
          <div class="flex items-center gap-1.5">
            <Radio class="w-3 h-3 text-emerald-400 animate-pulse" />
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {{ $t('play.publicRooms') }} ({{ multiplayerStore.availableRooms.length }})
            </span>
          </div>

          <UiButton
            variant="ghost"
            size="xs"
            :leading-icon="RefreshCw"
            :loading="isRefreshing"
            @click="refreshRooms"
          >
            {{ $t('play.refresh') }}
          </UiButton>
        </div>

        <!-- Active Lobbies Scroll Area -->
        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
          <template v-if="multiplayerStore.availableRooms.length > 0">
            <UiCard 
              v-for="room in multiplayerStore.availableRooms"
              :key="room.roomId"
              variant="default"
              padding="xs"
              custom-class="hover:border-emerald-500/80 py-1.5 px-2"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div 
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-950 font-black text-[10px] shrink-0 shadow"
                    :style="{ backgroundColor: room.hostColor || '#10b981' }"
                  >
                    {{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}
                  </div>
                  <div class="min-w-0 text-left">
                    <h4 class="font-extrabold text-xs text-white truncate">{{ room.roomName }}</h4>
                    <div class="flex items-center gap-1 text-[9px] text-slate-400">
                      <span class="text-slate-300 truncate max-w-20">{{ room.mapName }}</span>
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
                  {{ $t('home.joinButton') }}
                </UiButton>
              </div>
            </UiCard>
          </template>

          <!-- Empty State -->
          <UiCard 
            v-else 
            variant="subtle"
            padding="md"
            custom-class="border-dashed text-center flex flex-col items-center justify-center gap-1.5 my-auto"
          >
            <Radio class="w-4 h-4 text-slate-500 animate-pulse" />
            <p class="text-xs text-slate-400">{{ $t('play.noRooms') }}</p>
            <UiButton
              variant="secondary"
              size="xs"
              @click="activeTab = 'host'"
            >
              {{ $t('play.hostNewRoom') }}
            </UiButton>
          </UiCard>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation / Status -->
    <footer class="relative z-10 w-full px-4 py-1.5 max-w-4xl mx-auto flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 shrink-0">
      <span>Defensor TD</span>
      <span class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>{{ $t('common.online') }}</span>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ArrowLeft, ArrowRight, Gamepad2, Globe, User, Check, Users, KeyRound, Radio, RefreshCw 
} from 'lucide-vue-next'
import { UiButton, UiCard, UiInput, UiTabs, UiLanguageSwitcher, TabItem } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const notify = useNotificationStore()
const { t } = useI18n()

const activeTab = ref<string | number>('host')

const playModeTabs = computed<TabItem[]>(() => [
  { id: 'host', label: t('play.hostGame'), icon: Gamepad2 },
  { id: 'join', label: t('play.joinGame'), icon: Globe },
])

const playerName = ref(multiplayerStore.myPlayerName || 'Player')
const roomName = ref('Burbenog TD Co-op')
const roomCodeInput = ref('')
const selectedMapIndex = ref(0)
const isCreatingRoom = ref(false)
const isJoining = ref(false)
const isRefreshing = ref(false)

// Auto-load all maps in src/maps/
const mapModules = import.meta.glob<any>('../maps/*.json', { eager: true })

const availableMaps = Object.entries(mapModules).map(([path, mod]) => {
  const raw = (mod as any).default || mod
  const project = raw.project || raw
  const fileName = path.split('/').pop()?.replace(/\.json$/i, '') || 'Map'
  const id = fileName.toLowerCase().replace(/[^a-z0-9]/g, '-')

  return {
    id,
    name: project.name || fileName,
    cols: project.cols || 60,
    rows: project.rows || 60,
    playersCount: project.playersCount || project.gameSettings?.maxPlayers || (project.cols >= 60 ? 4 : 2),
    raw,
  }
})

let pollTimer: any = null

onMounted(() => {
  multiplayerStore.setPlayerProfile(playerName.value)
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
    multiplayerStore.setPlayerProfile(playerName.value)

    const mapData = availableMaps[selectedMapIndex.value]
    const rawData = mapData.raw as any

    if (rawData) {
      const proj = rawData.project || rawData
      mapStore.project = JSON.parse(JSON.stringify(proj))
      
      const waves = rawData.waveData?.waveConfigs || rawData.waveConfigs || proj.waveConfigs || []
      if (waves && waves.length > 0) {
        characterStore.waveConfigs = waves.map((w: any) => ({ ...w, characterModel: w.characterModel || 'male' }))
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
    notify.success(t('play.roomCreated', { name: roomName.value }))
  } catch (err: any) {
    console.error('Failed to create room:', err)
    notify.error(t('play.roomCreationError', { error: err?.message || '' }), t('common.error'))
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
    multiplayerStore.setPlayerProfile(playerName.value)
    await multiplayerStore.joinGame(code, router)
    notify.success(t('play.connectedToRoom', { code }))
  } catch (err: any) {
    console.error('Failed to join:', err)
    notify.error(t('play.roomConnectionError', { error: err?.message || '' }), t('common.error'))
  } finally {
    isJoining.value = false
  }
}
</script>
