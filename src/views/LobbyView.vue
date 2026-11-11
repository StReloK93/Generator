<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full citadel-backdrop text-slate-100 flex flex-col overflow-hidden select-none font-sans p-1.5 sm:p-4 pt-safe pb-safe">
    <!-- Everything in one card: header, seats, action -->
    <UiCard padding="none" custom-class="flex flex-col flex-1 min-h-0 w-full max-w-5xl mx-auto">
    <!-- Header: room, map and player count; chat and leave as small icons -->
    <header class="relative px-2.5 pt-1.5 pb-1 flex items-center gap-2 shrink-0">
      <div class="min-w-0">
        <h1 class="text-sm sm:text-base font-extrabold text-slate-50 truncate">
          {{ multiplayerStore.roomName || $t('lobby.title') }}
        </h1>
        <p class="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
          <Map class="size-3 text-brand-300 shrink-0" />
          <span class="truncate">{{ multiplayerStore.mapName || mapStore.project.name }}</span>
          <span v-if="multiplayerStore.isHideSeekRoom" class="shrink-0">· {{ $t('game.modeHideSeek') }}</span>
          <span v-else class="shrink-0">· {{ waveStore.waveConfigs.length }} {{ $t('home.info.waves') }}</span>
          <span class="shrink-0 flex items-center gap-0.5 font-bold text-slate-300">
            · <Users class="size-3" /> {{ filledSlotsCount }}/{{ multiplayerStore.slots.length }}
          </span>
        </p>
      </div>

      <div class="ml-auto flex items-center gap-1.5 shrink-0">
        <span v-if="multiplayerStore.connectionStatus === 'error'" class="text-[11px] text-rose-300 truncate max-w-40">{{ $t('play.serverUnreachable') }}</span>
        <span v-else-if="multiplayerStore.connectionStatus !== 'connected'" class="size-2 rounded-full bg-amber-400 animate-pulse"></span>
        <UiIconButton :icon="UserPlus" size="sm" variant="ghost" :title="$t('lobby.invite')" @click="inviteFriends" />
        <VoiceChatControl />
        <!-- Chat: the panel opens below the icon -->
        <div class="relative">
          <UiIconButton
            :icon="MessageSquare"
            size="sm"
            :variant="isChatOpen ? 'amber' : 'ghost'"
            :title="$t('lobby.chatTitle')"
            @click="toggleChat"
          />
          <span
            v-if="unreadCount > 0 && !isChatOpen"
            class="pointer-events-none absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-4 text-center tabular-nums"
          >{{ unreadCount }}</span>
          <div v-if="isChatOpen" class="absolute top-full right-0 mt-1.5 w-80 max-w-[calc(100vw-1.5rem)] h-72 short:h-60 z-40 shadow-2xl rounded-2xl bg-slate-950">
            <LobbyChat />
          </div>
        </div>
        <UiIconButton :icon="X" size="sm" variant="ghost" :title="$t('lobby.leave')" @click="handleLeave" />
      </div>
    </header>

    <!-- Players -->
    <!-- Hide & seek: the two teams side by side, seekers left, hiders right, a soft line between them -->
    <main
      v-if="multiplayerStore.isHideSeekRoom"
      class="flex-1 min-h-0 overflow-y-auto px-1.5 sm:px-2.5 py-1 grid grid-cols-[1fr_auto_1fr] gap-1.5 sm:gap-2.5"
    >
      <section v-for="team in teams" :key="team.id" :class="['flex flex-col gap-1.5 short:gap-1 min-w-0', team.id === 'hiders' ? 'col-start-3 row-start-1' : '']">
        <h2 :class="['flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider', team.textClass]">
          <component :is="team.icon" class="size-3.5" />
          {{ $t(team.label) }}
          <span class="ml-auto font-bold text-slate-500 tabular-nums">{{ team.slots.filter(s => s.player).length }}/{{ team.slots.length }}</span>
        </h2>
        <LobbyPlayerSlot v-for="slot in team.slots" :key="slot.slotIndex" :slot="slot" />
      </section>
      <div class="col-start-2 row-start-1 w-px my-1 bg-linear-to-b from-transparent via-slate-500/60 to-transparent" />
      <!-- Upright phone: the map and how it is played fill the room while it waits -->
      <section class="hidden portrait:flex flex-col gap-2 mt-2 col-span-3 row-start-2">
        <MapPreviewImage v-if="roomMap" :map="roomMap" class="w-full aspect-2/1 rounded-2xl border border-slate-800" />
        <h2 class="px-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{{ $t('maps.howToPlay') }}</h2>
        <HowToPlay :mode="roomMode" />
      </section>
    </main>
    <main v-else class="flex-1 min-h-0 overflow-y-auto px-1.5 sm:px-2.5 py-1 grid grid-cols-1 sm:grid-cols-2 content-start gap-1.5">
      <LobbyPlayerSlot
        v-for="slot in multiplayerStore.slots"
        :key="slot.slotIndex"
        :slot="slot"
      />
      <!-- Upright phone: the map and how it is played fill the room while it waits -->
      <section class="hidden portrait:flex flex-col gap-2 mt-2 col-span-full">
        <MapPreviewImage v-if="roomMap" :map="roomMap" class="w-full aspect-2/1 rounded-2xl border border-slate-800" />
        <h2 class="px-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{{ $t('maps.howToPlay') }}</h2>
        <HowToPlay :mode="roomMode" />
      </section>
    </main>

    <!-- Action bar -->
    <footer class="px-1.5 sm:px-2.5 pt-1 pb-1.5 flex items-center shrink-0">
      <div class="ml-auto shrink-0 portrait:ml-0 portrait:w-full portrait:[&>button]:w-full">
        <UiButton
          v-if="!multiplayerStore.isHost"
          :variant="multiplayerStore.myPlayer?.isReady ? 'game-green' : 'game-amber'"
          size="md"
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
            size="md"
            :leading-icon="Clock"
            disabled
            custom-class="min-w-44 short:py-2"
          >
            {{ $t('hideseek.needTeams') }}
          </UiButton>
          <UiButton
            v-else-if="!multiplayerStore.isAllReady"
            variant="game-amber"
            size="md"
            :leading-icon="BellRing"
            custom-class="min-w-44 short:py-2"
            @click="multiplayerStore.sendReadyCheck()"
          >
            {{ $t('lobby.nudge', { count: multiplayerStore.unreadyCount }) }}
          </UiButton>
          <UiButton
            v-else
            variant="game-green"
            size="md"
            :leading-icon="Play"
            custom-class="min-w-44 uppercase tracking-wider short:py-2"
            @click="handleStartGame"
          >
            {{ $t('lobby.startGame') }}
          </UiButton>
        </template>
      </div>
    </footer>
    </UiCard>

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
      <UiButton variant="game-green" size="md" block :leading-icon="Check" @click="multiplayerStore.toggleReady()">
        {{ $t('lobby.imReady') }}
      </UiButton>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X, Users, Check, Play, BellRing, Map, Clock, MessageSquare, Search, EyeOff, UserPlus } from 'lucide-vue-next'
import { UiButton, UiIconButton, UiCard, UiModal } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useWaveStore } from '../stores/waveStore'
import { useGameStore } from '../stores/gameStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import { getBuiltinMaps, getProjectMapId } from '../services/mapManager'
import { getMapMode } from '../domain/map'
import { gamePath, lobbyPath } from '../router/paths'
import { fetchTelegramAppUrl } from '../services/networkService'
import { setBackButton, shareInTelegram, telegramRoomLink } from '../services/telegram'
import LobbyPlayerSlot from '../components/LobbyPlayerSlot.vue'
import LobbyChat from '../components/LobbyChat.vue'
import VoiceChatControl from '../components/VoiceChatControl.vue'
import HowToPlay from '../components/HowToPlay.vue'
import MapPreviewImage from '../components/home/MapPreviewImage.vue'

const route = useRoute()
const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()

/** The room's map among the built-in ones (its picture), and its genre */
const roomMap = computed(() => getBuiltinMaps().find(m => m.name === mapStore.project.name) ?? null)
const roomMode = computed(() => getMapMode(mapStore.project))
const waveStore = useWaveStore()
const gameStore = useGameStore()
const notify = useNotificationStore()
const { t } = useI18n()

/** Hide & seek: the seats of each team (the first seekerSlots seats seek) */
const teams = computed(() => [
  {
    id: 'seekers',
    label: 'hideseek.teamSeekers',
    icon: Search,
    textClass: 'text-rose-300',
    slots: multiplayerStore.slots.filter(s => s.slotIndex < multiplayerStore.hideSeekSeekerSlots),
  },
  {
    id: 'hiders',
    label: 'hideseek.teamHiders',
    icon: EyeOff,
    textClass: 'text-emerald-300',
    slots: multiplayerStore.slots.filter(s => s.slotIndex >= multiplayerStore.hideSeekSeekerSlots),
  },
])

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
  setBackButton(handleLeave)
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
      gameStore.entrySource = 'lobby'
      const code = multiplayerStore.roomId || (route.params.roomId as string)
      router.push(gamePath(getProjectMapId(mapStore.project), code))
    }
  },
  { immediate: true }
)


onUnmounted(() => setBackButton(null))

/**
 * Invites friends to this room: in Telegram through its "share to chat" screen, elsewhere the phone's share sheet
 * or the clipboard. With the server's Telegram app link the invite opens the Mini App straight into the room.
 */
async function inviteFriends() {
  const code = multiplayerStore.roomId
  if (!code) return
  const text = t('lobby.inviteText', { name: multiplayerStore.roomName || mapStore.project.name })
  const appUrl = await fetchTelegramAppUrl()
  const link = appUrl
    ? telegramRoomLink(appUrl, code)
    : new URL(lobbyPath(code).slice(1), `${location.origin}${import.meta.env.BASE_URL}`).href
  if (shareInTelegram(link, text)) return
  if (navigator.share) {
    // Closing the share sheet rejects: nothing to do then
    await navigator.share({ title: t('app.name'), text, url: link }).catch(() => {})
    return
  }
  try {
    await navigator.clipboard.writeText(link)
    notify.success(t('lobby.inviteCopied'))
  } catch {
    notify.info(link)
  }
}

function handleStartGame() {
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
