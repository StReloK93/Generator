<template>
  <UiModal
    :is-open="isOpen"
    size="4xl"
    hide-header
    custom-class="h-120 portrait:h-full"
    body-class="p-0! space-y-0! overflow-hidden! flex flex-col"
    @close="emit('update:isOpen', false)"
  >
    <!-- Same look as the room: one card, a compact header, two columns with a soft line between them -->
    <header class="px-2.5 pt-2 pb-1 flex flex-wrap items-center gap-2 shrink-0">
      <h2 class="text-sm sm:text-base font-extrabold text-slate-50 truncate flex items-center gap-1.5 portrait:flex-1">
        <Users class="size-4 text-emerald-400 shrink-0" /> {{ $t('home.multiplayer') }}
      </h2>
      <UiInput
        v-model="playerName"
        :placeholder="$t('home.playerName')"
        :leading-icon="User"
        :maxlength="16"
        size="sm"
        custom-class="ml-auto w-36 sm:w-44 portrait:order-last portrait:basis-full portrait:ml-0"
        @change="multiplayerStore.setPlayerProfile(playerName)"
      />
      <UiIconButton :icon="X" size="sm" variant="ghost" :title="$t('common.close')" @click="emit('update:isOpen', false)" />
    </header>

    <!-- Upright phone: the open rooms and hosting a room are two tabs -->
    <div class="hidden portrait:block shrink-0 px-2.5 pb-1.5">
      <UiTabs v-model="tab" :items="tabs" variant="segmented" size="sm" fill />
    </div>

    <main class="flex-1 min-h-0 px-1.5 sm:px-2.5 pb-1.5 grid grid-cols-[1fr_auto_1fr] portrait:grid-cols-1 gap-1.5 sm:gap-2.5">
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
    </main>

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
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Gamepad2, User, Users, Lock, Radio, RefreshCw, Map, WifiOff, X } from 'lucide-vue-next'
import { UiModal, UiButton, UiIconButton, UiInput, UiBadge, UiTabs } from '../ui'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useMapStore } from '../../stores/mapStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { applyMapPayloadToStores, getBuiltinMaps, type MapSummary } from '../../services/mapManager'
import type { ActiveRoomSummary } from '../../types/multiplayer'
import MapBrowser from './MapBrowser.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

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

/** Upright phone: which half is shown (joining is what most players come for) */
const tab = ref<'rooms' | 'host'>('rooms')
const tabs = computed(() => [
  { id: 'rooms', label: t('play.publicRooms') },
  { id: 'host', label: t('play.hostTab') },
])

const builtinMaps = getBuiltinMaps()
const selectedMapId = ref(builtinMaps[0]?.id || '')
const selectedMap = computed(() => builtinMaps.find(m => m.id === selectedMapId.value) || null)

// Room discovery polling runs only while the window is open
let pollTimer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

watch(() => props.isOpen, (open) => {
  stopPolling()
  if (!open) return
  multiplayerStore.setPlayerProfile(playerName.value)
  multiplayerStore.refreshDiscovery()
  pollTimer = setInterval(() => multiplayerStore.refreshDiscovery(), 1000)
}, { immediate: true })

onUnmounted(stopPolling)

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
