<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full citadel-backdrop text-slate-100 flex flex-col overflow-hidden select-none font-sans pt-safe">
    <!-- Header: leave, room + map, room code -->
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
        <UiButton
          variant="outline"
          size="sm"
          :trailing-icon="isCopied ? Check : Copy"
          :title="isCopied ? $t('common.copied') : $t('common.copy')"
          custom-class="border-brand-400/50! text-brand-200!"
          @click="copyRoomCode"
        >
          <span class="text-[10px] font-semibold text-slate-400 mr-1 hidden md:inline">{{ $t('lobby.roomPin') }}</span>
          <span class="font-black tracking-widest">{{ multiplayerStore.roomId || route.params.roomId }}</span>
        </UiButton>
        <UiLanguageSwitcher />
        <UiIconButton :icon="X" size="md" :title="$t('lobby.leave')" @click="handleLeave" />
      </div>
    </header>

    <!-- Narrow portrait screens only: switch between players and chat -->
    <div class="sm:hidden px-3 pb-2 shrink-0">
      <UiTabs v-model="mobileActiveTab" :items="mobileTabs" variant="segmented" size="sm" fill />
    </div>

    <main class="flex-1 min-h-0 w-full max-w-5xl mx-auto px-3 sm:px-6 pb-2 grid grid-cols-1 sm:grid-cols-5 gap-3">
      <!-- Players -->
      <UiCard
        padding="none"
        :custom-class="['sm:col-span-3 flex-col min-h-0', mobileActiveTab === 'slots' ? 'flex' : 'hidden sm:flex']"
      >
        <div class="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
          <Users class="size-4 text-brand-300" />
          <h2 class="text-sm font-extrabold text-slate-50">{{ $t('lobby.playersList') }}</h2>
          <span class="ml-auto text-xs font-bold text-slate-400">{{ filledSlotsCount }}/{{ multiplayerStore.slots.length }}</span>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2.5 flex flex-col gap-1.5">
          <LobbyPlayerSlot
            v-for="slot in multiplayerStore.slots"
            :key="slot.slotIndex"
            :slot="slot"
          />
        </div>
      </UiCard>

      <!-- Chat -->
      <LobbyChat :class="['sm:col-span-2 min-h-0', mobileActiveTab === 'chat' ? 'flex' : 'hidden sm:flex']" />
    </main>

    <!-- Action bar -->
    <footer class="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-1 pb-safe flex items-center gap-3 shrink-0">
      <div class="flex items-center gap-2 text-xs text-slate-400 min-w-0">
        <template v-if="multiplayerStore.connectionStatus === 'error'">
          <span class="size-2 rounded-full shrink-0 bg-rose-400"></span>
          <span class="truncate text-rose-300">{{ $t('play.serverUnreachable') }}</span>
        </template>
        <template v-else>
          <span class="size-2 rounded-full shrink-0" :class="multiplayerStore.connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
          <span class="truncate">{{ multiplayerStore.isHost ? $t('lobby.youAreHost') : $t('lobby.connected') }}</span>
        </template>
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
import { X, Users, Copy, Check, Play, BellRing, Map, Clock } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiCard, UiModal, UiTabs, UiLanguageSwitcher, TabItem } from '../components/ui'
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

const isCopied = ref(false)
const mobileActiveTab = ref<string | number>('slots')

const mobileTabs = computed<TabItem[]>(() => [
  { id: 'slots', label: t('lobby.players', { current: filledSlotsCount.value, max: multiplayerStore.slots.length }), icon: Users },
  { id: 'chat', label: t('lobby.chatTitle') },
])

/** Hide & seek: a player gets ready only after picking a character. */

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

function copyRoomCode() {
  const code = multiplayerStore.roomId || (route.params.roomId as string)
  if (code) {
    navigator.clipboard.writeText(code)
    isCopied.value = true
    notify.info(`${t('lobby.roomCode', { code })} - ${t('common.copied')}`)
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

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
