<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full citadel-backdrop text-slate-100 flex flex-col overflow-hidden select-none font-sans pt-safe">
    <!-- Header: room + map, leave -->
    <header class="w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 shrink-0">
      <div class="min-w-0">
        <h1 class="text-sm sm:text-base font-extrabold text-slate-50 truncate">
          {{ multiplayerStore.roomName || $t('lobby.title') }}
        </h1>
        <p class="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
          <Map class="size-3 text-brand-300 shrink-0" />
          <span class="truncate">{{ multiplayerStore.mapName || mapStore.project.name }}</span>
          <span v-if="multiplayerStore.isHideSeekRoom" class="shrink-0">· {{ $t('game.modeHideSeek') }}</span>
          <span v-else class="shrink-0">· {{ waveStore.waveConfigs.length }} {{ $t('home.info.waves') }}</span>
        </p>
      </div>

      <div class="ml-auto flex items-center gap-2 shrink-0">
        <UiLanguageSwitcher />
        <UiIconButton :icon="X" size="md" :title="$t('lobby.leave')" @click="handleLeave" />
      </div>
    </header>

    <main class="flex-1 min-h-0 w-full max-w-5xl mx-auto px-3 sm:px-6 pb-2 flex flex-col">
      <!-- Players -->
      <UiCard padding="none" custom-class="flex flex-col flex-1 min-h-0">
        <div class="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
          <Users class="size-4 text-brand-300" />
          <h2 class="text-sm font-extrabold text-slate-50">{{ $t('lobby.playersList') }}</h2>
          <span class="ml-auto text-xs font-bold text-slate-400">{{ filledSlotsCount }}/{{ multiplayerStore.slots.length }}</span>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2.5 grid grid-cols-1 sm:grid-cols-2 content-start gap-1.5">
          <LobbyPlayerSlot
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>
      </UiCard>
    </main>

    <!-- Action bar -->
    <footer class="relative w-full max-w-5xl mx-auto px-3 sm:px-6 pt-1 pb-safe flex items-center gap-3 shrink-0">
      <!-- Chat: a small button; the panel opens above it -->
      <div class="relative shrink-0">
        <UiButton
          :variant="isChatOpen ? 'primary' : 'secondary'"
          size="md"
          :leading-icon="MessageSquare"
          :title="$t('lobby.chatTitle')"
          @click="toggleChat"
        >
          <span class="hidden sm:inline">{{ $t('lobby.chatTitle') }}</span>
          <span
            v-if="unreadCount > 0 && !isChatOpen"
            class="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-5 text-center tabular-nums"
          >{{ unreadCount }}</span>
        </UiButton>
        <div v-if="isChatOpen" class="absolute bottom-full left-0 mb-2 w-80 max-w-[calc(100vw-1.5rem)] h-72 z-40 shadow-2xl">
          <LobbyChat />
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs min-w-0">
        <template v-if="multiplayerStore.connectionStatus === 'error'">
          <span class="size-2 rounded-full shrink-0 bg-rose-400"></span>
          <span class="truncate text-rose-300">{{ $t('play.serverUnreachable') }}</span>
        </template>
        <span v-else-if="multiplayerStore.connectionStatus !== 'connected'" class="size-2 rounded-full shrink-0 bg-amber-400 animate-pulse"></span>
      </div>

      <div class="ml-auto shrink-0">
        <UiButton
          v-if="!multiplayerStore.isHost"
          :variant="multiplayerStore.myPlayer?.isReady ? 'game-green' : 'game-amber'"
          size="lg"
          :leading-icon="multiplayerStore.myPlayer?.isReady ? Check : Clock"
          :custom-class="['min-w-44 short:py-2', multiplayerStore.isReadyButtonGlowing && !multiplayerStore.myPlayer?.isReady ? 'ring-4 ring-amber-400 animate-bounce' : '']"
          @click="multiplayerStore.toggleReady()"
        >
          {{ multiplayerStore.myPlayer?.isReady ? $t('common.ready') : $t('lobby.readyUp') }}
        </UiButton>

        <template v-else>
          <UiButton
            v-if="multiplayerStore.hideSeekLobbyIssue"
            variant="secondary"
            size="lg"
            :leading-icon="Clock"
            disabled
            custom-class="min-w-44 short:py-2"
          >
            {{ $t('hideseek.needTeams') }}
          </UiButton>
          <UiButton
            v-else-if="!multiplayerStore.isAllReady"
            variant="game-amber"
            size="lg"
            :leading-icon="BellRing"
            custom-class="min-w-44 short:py-2"
            @click="multiplayerStore.sendReadyCheck()"
          >
            {{ $t('lobby.nudge', { count: multiplayerStore.unreadyCount }) }}
          </UiButton>
          <UiButton
            v-else
            variant="game-green"
            size="lg"
            :leading-icon="Play"
            custom-class="min-w-44 uppercase tracking-wider short:py-2"
            @click="handleStartGame"
          >
            {{ $t('lobby.startGame') }}
          </UiButton>
        </template>
      </div>
    </footer>

    <!-- Ready check from host -->
    <UiModal
      :is-open="multiplayerStore.isNudgeModalOpen && !multiplayerStore.isHost"
      :title="$t('lobby.nudgeAlertTitle')"
      :subtitle="$t('lobby.nudgeAlertDesc', { name: multiplayerStore.nudgeHostName || 'Host' })"
      :icon="BellRing"
      icon-color="amber"
      size="sm"
      :show-close="false"
      :close-on-backdrop="false"
    >
      <UiButton variant="game-green" size="lg" block :leading-icon="Check" @click="multiplayerStore.toggleReady()">
        {{ $t('lobby.imReady') }}
      </UiButton>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X, Users, Check, Play, BellRing, Map, Clock, MessageSquare } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiCard, UiModal, UiLanguageSwitcher } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useWaveStore } from '../stores/waveStore'
import { useGameStore } from '../stores/gameStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import { lockLandscape } from '../utils/pwaOrientation'
import { getProjectMapId } from '../services/mapManager'
import { gamePath, lobbyPath } from '../router/paths'
import LobbyPlayerSlot from '../components/LobbyPlayerSlot.vue'
import LobbyChat from '../components/LobbyChat.vue'

const route = useRoute()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const waveStore = useWaveStore()
const gameStore = useGameStore()
const notify = useNotificationStore()
const { t } = useI18n()

/** Chat panel open, and the messages seen when it was last open (the rest count as unread) */
const isChatOpen = ref(false)
const seenMessages = ref(0)
const unreadCount = computed(() => Math.max(0, multiplayerStore.chatMessages.length - seenMessages.value))

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
  seenMessages.value = multiplayerStore.chatMessages.length
}

// While it is open everything is read
watch(
  () => multiplayerStore.chatMessages.length,
  count => {
    if (isChatOpen.value) seenMessages.value = count
  }
)

const filledSlotsCount = computed(() => {
  return multiplayerStore.slots.filter(s => s.player !== null).length
})

onMounted(async () => {
  multiplayerStore.setRouter(router)
  const code = (route.params.roomId as string) || ''
  // Opened by URL (page refresh or shared link): get back into this tab's room, otherwise join it
  if (code && !multiplayerStore.roomId && !(await multiplayerStore.resumeRoom(code, router))) {
    multiplayerStore.joinGame(code, router)
  }
})

// Keep the map in the address bar once the host has sent it
watch(
  () => mapStore.project,
  (project) => {
    const code = multiplayerStore.roomId || (route.params.roomId as string)
    const mapId = getProjectMapId(project)
    if (code && route.name === 'lobby' && route.params.mapId !== mapId) {
      router.replace(lobbyPath(code, mapId))
    }
  }
)

// Auto-navigate to game whenever room game state becomes 'in_game'
watch(
  () => multiplayerStore.roomGameState,
  (state) => {
    if (state === 'in_game') {
      lockLandscape()
      gameStore.entrySource = 'lobby'
      const code = multiplayerStore.roomId || (route.params.roomId as string)
      router.push(gamePath(getProjectMapId(mapStore.project), code))
    }
  },
  { immediate: true }
)


function handleStartGame() {
  lockLandscape()
  multiplayerStore.startGame(router)
}

async function handleLeave() {
  const confirmed = await notify.confirm({
    title: t('lobby.confirmLeaveTitle'),
    message: t('lobby.confirmLeaveDesc'),
    confirmText: t('lobby.leave'),
    cancelText: t('common.cancel'),
    variant: 'danger'
  })
  if (confirmed) {
    multiplayerStore.leaveRoom(router)
  }
}
</script>
