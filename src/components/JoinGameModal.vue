<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('multiplayer.joinTitle')"
    :subtitle="$t('multiplayer.joinSubtitle')"
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
          :label="$t('multiplayer.yourNickname')"
          :placeholder="$t('multiplayer.nicknamePlaceholder')"
          :maxlength="16"
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">{{ $t('multiplayer.yourColor') }}</label>
          <UiColorPicker
            v-model="selectedColor"
            :colors="PLAYER_COLORS"
            size="md"
          />
        </div>
      </div>
    </UiCard>

    <!-- Section: Active Lobbies (Server Browser) -->
    <div class="space-y-2.5 sm:space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Radio class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
          <h3 class="text-xs font-bold text-white uppercase tracking-wider">
            {{ $t('multiplayer.availablePublicRooms', { count: activeLobbies.length }) }}
          </h3>
        </div>
        
        <UiButton
          variant="ghost"
          size="xs"
          :leading-icon="RefreshCw"
          :loading="isRefreshing"
          @click="handleManualRefresh"
        >
          {{ $t('common.refresh') }}
        </UiButton>
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
                <span class="absolute -top-1 -right-1 p-0.5 bg-amber-500 rounded-full text-slate-950">
                  <Crown class="w-2.5 h-2.5" />
                </span>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-1.5 sm:gap-2">
                  <h4 class="font-black text-xs sm:text-sm text-white truncate">{{ room.roomName }}</h4>
                  <UiBadge variant="emerald" size="xs">
                    LOBBY
                  </UiBadge>
                </div>

                <div class="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  <span class="text-slate-200 font-medium truncate max-w-25 flex items-center gap-1">
                    <Map class="w-3 h-3 text-slate-400" />
                    <span>{{ room.mapName }}</span>
                  </span>
                  <span>•</span>
                  <span class="text-amber-300 font-semibold font-mono flex items-center gap-1">
                    <Users class="w-3 h-3 text-amber-400" />
                    <span>{{ room.playersCount }}/{{ room.maxPlayers }}</span>
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
              {{ isJoining ? $t('multiplayer.connecting') : $t('multiplayer.join') }}
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
          <p class="text-xs sm:text-sm font-bold text-white">{{ $t('multiplayer.noActiveRooms') }}</p>
          <p class="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {{ $t('multiplayer.noActiveRoomsDesc') }}
          </p>
        </div>

        <div class="pt-1 sm:pt-2">
          <UiButton
            variant="game-amber"
            size="sm"
            :leading-icon="Plus"
            @click="handleCreateGameInstead"
          >
            {{ $t('multiplayer.hostNewRoom') }}
          </UiButton>
        </div>
      </UiCard>
    </div>

    <!-- Optional: Private Room Code Accordion -->
    <div class="pt-2 border-t border-slate-800/80">
      <UiButton 
        variant="ghost"
        size="xs"
        :leading-icon="ChevronDown"
        :custom-class="showCodeInput ? 'text-amber-300!' : 'text-slate-400!'"
        @click="showCodeInput = !showCodeInput"
      >
        <span>{{ $t('multiplayer.enterPrivateCode') }}</span>
      </UiButton>

      <div v-if="showCodeInput" class="mt-2.5 flex items-center gap-2 animate-in fade-in duration-150">
        <UiInput 
          v-model="roomCode"
          :placeholder="$t('multiplayer.roomCodePlaceholder')"
          :maxlength="8"
          size="sm"
          class="flex-1 font-mono uppercase text-amber-300 font-bold"
          @keyup.enter="handleJoinGame"
        />
        <UiButton
          variant="primary"
          size="sm"
          :disabled="!roomCode.trim() || isJoining"
          @click="handleJoinGame"
        >
          {{ $t('multiplayer.connect') }}
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
          {{ $t('common.close') }}
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
import { Check, LogIn, Radio, RefreshCw, ChevronDown, Crown, Map, Users, Plus } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiButton, UiBadge, UiColorPicker } from './ui'
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
    notify.success(`Joined room: ${roomCode.value}`)
    isOpen.value = false
  } catch (err: any) {
    console.error('Failed to join room:', err)
    notify.error(err?.message || 'Failed to connect to room. Please try again.', 'Connection Error')
  } finally {
    isJoining.value = false
  }
}

defineExpose({
  open,
  close,
})
</script>
