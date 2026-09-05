<template>
  <UiModal
    :is-open="isOpen"
    title="Online Games"
    subtitle="Select an active room or enter a room code"
    :icon="Radio"
    icon-color="brand"
    size="2xl"
    @close="close"
  >
    <!-- Player Nickname & Color Bar -->
    <UiCard variant="subtle" padding="md">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
        <UiInput
          v-model="playerName"
          label="Your Nickname:"
          placeholder="Enter your commander name"
          :maxlength="16"
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Your Color:</label>
          <div class="flex items-center gap-1.5 pt-0.5">
            <button 
              v-for="color in PLAYER_COLORS"
              :key="color"
              type="button"
              class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm touch-target"
              :style="{ backgroundColor: color }"
              :class="selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'"
              @click="selectedColor = color"
            >
              <Check v-if="selectedColor === color" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 font-bold" />
            </button>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Section: Active Lobbies (Server Browser) -->
    <div class="space-y-2.5 sm:space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Radio class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">
            Available Public Rooms ({{ activeLobbies.length }})
          </h3>
        </div>
        
        <button 
          type="button"
          class="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800 touch-target"
          @click="handleManualRefresh"
        >
          <RefreshCw class="w-3 h-3" :class="isRefreshing ? 'animate-spin text-brand-400' : ''" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Active Lobbies Grid / List -->
      <div v-if="activeLobbies.length > 0" class="space-y-2 sm:space-y-2.5">
        <UiCard
          v-for="room in activeLobbies"
          :key="room.roomId"
          variant="default"
          padding="sm"
          custom-class="hover:border-emerald-500/80 hover:shadow-xl hover:shadow-emerald-500/10"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
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
                  <UiBadge variant="emerald" size="xs">
                    LOBBY
                  </UiBadge>
                </div>

                <div class="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  <span class="text-slate-200 font-medium truncate max-w-25">🗺️ {{ room.mapName }}</span>
                  <span>•</span>
                  <span class="text-amber-300 font-semibold font-mono">
                    👥 {{ room.playersCount }}/{{ room.maxPlayers }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 1-Click Join Button -->
            <UiButton
              variant="game-green"
              size="sm"
              :disabled="isJoining"
              :leading-icon="LogIn"
              @click="joinSpecificRoom(room.roomId)"
            >
              {{ isJoining ? 'Connecting...' : 'Join' }}
            </UiButton>
          </div>
        </UiCard>
      </div>

      <!-- Empty State: No active rooms found -->
      <UiCard
        v-else 
        variant="subtle"
        padding="lg"
        custom-class="border-dashed text-center space-y-2.5 sm:space-y-3"
      >
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400 shadow-inner">
          <Radio class="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 animate-pulse" />
        </div>

        <div>
          <p class="text-xs sm:text-sm font-bold text-white">No active rooms discovered</p>
          <p class="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Wait for a host to open a room or create your own!
          </p>
        </div>

        <div class="pt-1 sm:pt-2">
          <UiButton
            variant="game-amber"
            size="sm"
            @click="handleCreateGameInstead"
          >
            ➕ Host New Room
          </UiButton>
        </div>
      </UiCard>
    </div>

    <!-- Optional: Private Room Code Accordion -->
    <div class="pt-2 border-t border-slate-800/80">
      <button 
        type="button"
        class="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors touch-target"
        @click="showCodeInput = !showCodeInput"
      >
        <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="showCodeInput ? 'rotate-180' : ''" />
        <span>Enter private room code manually</span>
      </button>

      <div v-if="showCodeInput" class="mt-2.5 flex items-center gap-2 animate-in fade-in duration-150">
        <input 
          v-model="roomCode"
          type="text"
          maxlength="8"
          placeholder="e.g. 7X9K2A"
          class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-center text-xs sm:text-sm font-mono font-bold text-amber-300 tracking-widest uppercase focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
          @keyup.enter="handleJoinGame"
        />
        <UiButton
          variant="primary"
          size="sm"
          :disabled="!roomCode.trim() || isJoining"
          @click="handleJoinGame"
        >
          Connect
        </UiButton>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UiButton
          variant="secondary"
          size="xs"
          @click="close"
        >
          Close
        </UiButton>

        <span class="font-mono text-[10px] sm:text-[11px] text-slate-500">
          P2P Multi-Player
        </span>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Check, LogIn, Radio, RefreshCw, ChevronDown } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiButton, UiBadge } from './ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useNotificationStore } from '../stores/notificationStore'
import { PLAYER_COLORS } from '../types/multiplayer'

const emit = defineEmits<{
  (e: 'open-create-game'): void
}>()

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()

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
    notify.success(`Xonaga ulanildi: ${roomCode.value}`)
    isOpen.value = false
  } catch (err: any) {
    console.error('Failed to join room:', err)
    notify.error(err?.message || 'Xonaga ulanishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.', 'Ulanish xatosi')
  } finally {
    isJoining.value = false
  }
}

defineExpose({
  open,
  close,
})
</script>
