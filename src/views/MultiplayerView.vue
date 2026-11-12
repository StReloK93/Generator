<template>
  <div class="h-dvh min-h-dvh max-h-dvh w-full citadel-backdrop text-slate-100 flex flex-col overflow-hidden select-none font-sans pb-safe">
    <!-- A full page: a bar across the top, the three parts side by side (tabs at the bottom on an upright phone) -->
    <header class="pt-safe shrink-0 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md page-rise">
      <div class="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 short:py-1 flex items-center gap-2">
      <UiIconButton :icon="ArrowLeft" size="md" variant="ghost" :title="$t('common.back')" custom-class="icon-gold" @click="goHome" />
      <h1 class="font-display text-base sm:text-lg font-bold uppercase tracking-[0.14em] text-brand-100 truncate">
        {{ $t('home.multiplayer') }}
      </h1>
      <UiInput
        v-model="playerName"
        :placeholder="$t('home.playerName')"
        :leading-icon="User"
        :maxlength="16"
        size="sm"
        custom-class="ml-auto w-36 sm:w-48 portrait:flex-1 portrait:w-auto portrait:min-w-0"
        @change="multiplayerStore.setPlayerProfile(playerName)"
      />
      </div>
    </header>

    <main class="page-rise [animation-delay:60ms] flex-1 min-h-0 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 short:py-1.5 grid grid-cols-[1fr_auto_1fr_auto_1fr] portrait:grid-cols-1 gap-2 sm:gap-4">
      <!-- HOST: pick a map (double click hosts right away), optional password -->
      <section :class="['flex flex-col min-h-0 min-w-0', tab === 'host' ? '' : 'portrait:hidden']">
        <h3 class="h-6 flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-300 portrait:hidden">
          <Map class="size-3.5" /> {{ $t('play.maps') }}
          <span class="ml-auto font-bold text-slate-500 tabular-nums">{{ builtinMaps.length }}</span>
        </h3>
        <MapBrowser
          v-model="selectedMapId"
          :maps="builtinMaps"
          class="flex-1 -mx-2"
          @pick="handleCreateRoom"
        />
        <div class="pt-1.5 flex items-center gap-1.5 shrink-0 border-t border-slate-800">
          <UiInput
            v-model="hostPassword"
            type="password"
            :placeholder="$t('play.passwordOptional')"
            :leading-icon="Lock"
            :maxlength="20"
            size="sm"
            custom-class="flex-1 min-w-0"
            @keyup.enter="selectedMap && handleCreateRoom(selectedMap)"
          />
          <UiButton
            variant="game-amber"
            size="sm"
            :loading="isCreatingRoom"
            :disabled="!selectedMap || isCreatingRoom"
            :leading-icon="Gamepad2"
            custom-class="uppercase tracking-wider shrink-0"
            @click="selectedMap && handleCreateRoom(selectedMap)"
          >
            {{ isCreatingRoom ? $t('play.hosting') : $t('play.hostGame') }}
          </UiButton>
        </div>
      </section>

      <div class="w-px my-1 bg-linear-to-b from-transparent via-slate-500/60 to-transparent portrait:hidden" />

      <!-- The open rooms -->
      <section :class="['flex flex-col min-h-0 min-w-0', tab === 'rooms' ? '' : 'portrait:hidden']">
        <h3 class="h-6 flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
          <Radio class="size-3.5 animate-pulse" /> {{ $t('play.publicRooms') }}
          <span class="ml-auto font-bold text-slate-500 tabular-nums">{{ multiplayerStore.availableRooms.length }}</span>
          <UiIconButton
            :icon="RefreshCw"
            size="xs"
            variant="ghost"
            :title="$t('common.refresh')"
            :custom-class="isRefreshing ? '[&_svg]:animate-spin' : ''"
            @click="refreshRooms"
          />
        </h3>

      <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pt-1">
        <div
          v-for="room in multiplayerStore.availableRooms"
          :key="room.roomId"
          class="shrink-0 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 px-2.5 py-2"
        >
          <div
            class="size-8 rounded-lg flex items-center justify-center text-slate-950 font-black text-[11px] shrink-0"
            :style="{ backgroundColor: room.hostColor || '#10b981' }"
          >
            {{ room.hostName ? room.hostName.slice(0, 2).toUpperCase() : 'TD' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <Lock v-if="room.hasPassword" class="size-3 shrink-0 text-amber-300" />
              <span class="font-extrabold text-xs text-slate-50 truncate">{{ room.roomName }}</span>
              <UiBadge v-if="room.gameMode === 'hero'" variant="rose" size="xs" class="shrink-0">{{ $t('game.modePvp') }}</UiBadge>
              <UiBadge v-else-if="room.gameMode === 'hideseek'" variant="purple" size="xs" class="shrink-0">{{ $t('game.modeHideSeek') }}</UiBadge>
              <UiBadge v-else-if="room.gameMode === 'curse'" variant="purple" size="xs" class="shrink-0">{{ $t('genre.curse') }}</UiBadge>
              <UiBadge :variant="room.gameState === 'lobby' ? 'emerald' : 'amber'" size="xs" class="shrink-0">
                {{ room.gameState === 'lobby' ? $t('play.statusWaiting') : $t('play.statusPlaying') }}
              </UiBadge>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
              <Map class="size-3 shrink-0 text-brand-300" />
              <span class="truncate">{{ room.mapName }}</span>
              <span class="shrink-0 flex items-center gap-0.5 text-slate-300 font-bold">
                <Users class="size-3" /> {{ room.playersCount }}/{{ room.maxPlayers }}
              </span>
            </div>
          </div>
          <UiButton
            variant="game-green"
            size="sm"
            :disabled="isJoining || room.gameState !== 'lobby' || room.playersCount >= room.maxPlayers"
            @click="askToJoin(room)"
          >
            {{ room.playersCount >= room.maxPlayers ? $t('play.roomFull') : $t('home.joinButton') }}
          </UiButton>
        </div>

        <div
          v-if="multiplayerStore.availableRooms.length === 0"
          class="flex-1 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center gap-1.5 text-center p-4"
        >
          <template v-if="multiplayerStore.isServerReachable">
            <Radio class="size-5 text-slate-600 animate-pulse" />
            <p class="text-xs text-slate-400">{{ $t('play.noRooms') }}</p>
          </template>
          <template v-else>
            <WifiOff class="size-5 text-slate-500" />
            <p class="text-xs text-slate-400">{{ $t('play.roomListUnavailable') }}</p>
          </template>
        </div>
      </div>
      </section>

      <div class="w-px my-1 bg-linear-to-b from-transparent via-slate-500/60 to-transparent portrait:hidden" />

      <!-- Everyone online and the big chat: "host one, I'll join", follow a friend into their room -->
      <OnlinePanel :class="tab === 'chat' ? '' : 'portrait:hidden'" />
    </main>

    <!-- Upright phone: the three parts are tabs at the bottom, under the thumb -->
    <nav class="hidden portrait:block shrink-0 px-2 pt-1.5 pb-2 border-t border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
      <UiTabs v-model="tab" :items="tabs" variant="segmented" size="md" fill />
    </nav>

    <!-- A room with a password: ask for it before joining -->
    <UiModal
      :is-open="!!lockedRoom"
      :title="lockedRoom?.roomName ?? ''"
      :subtitle="$t('play.enterPassword')"
      :icon="Lock"
      icon-color="amber"
      size="sm"
      @close="lockedRoom = null"
    >
      <div class="flex flex-col gap-2">
        <UiInput
          v-model="joinPassword"
          type="password"
          :placeholder="$t('play.password')"
          :leading-icon="Lock"
          :maxlength="20"
          @keyup.enter="joinLockedRoom"
        />
        <UiButton variant="game-green" size="lg" block :disabled="!joinPassword || isJoining" @click="joinLockedRoom">
          {{ $t('home.joinButton') }}
        </UiButton>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Gamepad2, User, Users, Lock, Radio, RefreshCw, Map, WifiOff, MessageSquare } from 'lucide-vue-next'
import { UiModal, UiButton, UiIconButton, UiInput, UiBadge, UiTabs } from '../components/ui'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useMapStore } from '../stores/mapStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import { applyMapPayloadToStores, getBuiltinMaps, type MapSummary } from '../services/mapManager'
import { setBackButton } from '../services/telegram'
import type { ActiveRoomSummary } from '../types/multiplayer'
import MapBrowser from '../components/home/MapBrowser.vue'
import OnlinePanel from '../components/home/OnlinePanel.vue'

const router = useRouter()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const notify = useNotificationStore()
const { t } = useI18n()

const playerName = ref(multiplayerStore.myPlayerName || 'Player')
/** Optional: friends who know it can join, nobody else */
const hostPassword = ref('')
const isCreatingRoom = ref(false)
const isJoining = ref(false)
const isRefreshing = ref(false)
/** The room asking for a password, and what was typed for it */
const lockedRoom = ref<ActiveRoomSummary | null>(null)
const joinPassword = ref('')

/** Upright phone: which part is shown (joining is what most players come for) */
const tab = ref<'rooms' | 'chat' | 'host'>('rooms')
const tabs = computed(() => [
  { id: 'rooms', label: t('play.roomsTab'), icon: Radio },
  { id: 'chat', label: t('online.tab'), icon: MessageSquare },
  { id: 'host', label: t('play.hostTab'), icon: Gamepad2 },
])

const builtinMaps = getBuiltinMaps()
const selectedMapId = ref(builtinMaps[0]?.id || '')
const selectedMap = computed(() => builtinMaps.find(m => m.id === selectedMapId.value) || null)

function goHome() {
  router.push('/')
}

// The room list refreshes while this page is open; Telegram's back button leads home
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  multiplayerStore.setPlayerProfile(playerName.value)
  multiplayerStore.refreshDiscovery()
  pollTimer = setInterval(() => multiplayerStore.refreshDiscovery(), 1000)
  setBackButton(goHome)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  setBackButton(null)
})

function refreshRooms() {
  isRefreshing.value = true
  multiplayerStore.refreshDiscovery()
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}

async function handleCreateRoom(mapItem: MapSummary) {
  if (isCreatingRoom.value) return
  isCreatingRoom.value = true

  try {
    multiplayerStore.setPlayerProfile(playerName.value)
    applyMapPayloadToStores(mapItem.raw)
    const roomName = t('play.roomOf', { name: playerName.value })
    await multiplayerStore.hostNewGame(roomName, mapStore.project, router, hostPassword.value)
    notify.success(t('play.roomCreated', { name: roomName }))
  } catch (err: any) {
    console.error('Failed to create room:', err)
    notify.error(t('play.roomCreationError', { error: err?.message || '' }), t('common.error'))
  } finally {
    isCreatingRoom.value = false
  }
}

/** An open room is joined right away; one with a password asks for it first. */
function askToJoin(room: ActiveRoomSummary) {
  if (!room.hasPassword) return joinRoom(room, '')
  joinPassword.value = ''
  lockedRoom.value = room
}

function joinLockedRoom() {
  const room = lockedRoom.value
  if (!room || !joinPassword.value) return
  lockedRoom.value = null
  joinRoom(room, joinPassword.value)
}

async function joinRoom(room: ActiveRoomSummary, password: string) {
  isJoining.value = true
  try {
    multiplayerStore.setPlayerProfile(playerName.value)
    await multiplayerStore.joinGame(room.roomId, router, password)
    notify.success(t('play.connectedToRoom', { name: room.roomName }))
  } catch (err: any) {
    console.error('Failed to join:', err)
    notify.error(t('play.roomConnectionError', { error: err?.message || '' }), t('common.error'))
  } finally {
    isJoining.value = false
  }
}
</script>
