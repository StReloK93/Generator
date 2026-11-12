import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Router } from 'vue-router'
import { onlineService } from '../services/onlineService'
import { useMultiplayerStore } from './multiplayerStore'
import { useAdminStore } from './adminStore'
import { useNotificationStore } from './notificationStore'
import { useI18nStore } from './i18nStore'

/** Where a player is: the home screen, a room's lobby, a room's game, a game alone, the editors */
export type OnlinePlace = 'home' | 'lobby' | 'game' | 'solo' | 'editor'

export interface OnlinePlayer {
  id: string
  name: string
  color: string
  admin: boolean
  place: OnlinePlace
  roomId: string | null
  roomName: string
  mapName: string
  hasPassword: boolean
  isHost: boolean
  /** Their id inside the room (voice chat, room chat) */
  playerId: string
}

export interface OnlineMessage {
  id: string
  at: number
  from: string
  name: string
  color: string
  admin: boolean
  text: string
}

const KEY_STORAGE = 'defensor_online_key'
const FOLLOW_STORAGE = 'defensor_online_follow'

/** This browser's secret key (the server shows others only a public id made from it) */
function playerKey(): string {
  try {
    const known = localStorage.getItem(KEY_STORAGE)
    if (known) return known
    const key = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(KEY_STORAGE, key)
    return key
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }
}

function placeOf(routeName: string, inRoom: boolean): OnlinePlace {
  if (routeName === 'lobby') return 'lobby'
  if (routeName === 'room-game') return 'game'
  if (routeName === 'game' || routeName === 'editor-game') return inRoom ? 'game' : 'solo'
  if (routeName === 'editor' || routeName === 'asset-editor' || routeName === 'projectile-editor') return 'editor'
  return 'home'
}

/**
 * Everyone who has the game open and the one big chat for all of them (server/online.js). Players see where the
 * others are, can follow one (and go into every room they open or join), and talk. The admin deletes messages and bans
 * a player for a while: a banned player cannot write in any chat or talk in voice chat.
 */
export const useOnlineStore = defineStore('online', () => {
  const multiplayerStore = useMultiplayerStore()
  const admin = useAdminStore()
  const notify = useNotificationStore()
  const { t } = useI18nStore()

  const connected = ref(false)
  const myId = ref('')
  const players = ref<OnlinePlayer[]>([])
  const messages = ref<OnlineMessage[]>([])
  /** Public id -> banned until (ms) */
  const bans = ref<Record<string, number>>({})
  /** The server accepted this browser as the admin */
  const isAdmin = ref(false)
  /** The player this one follows into rooms */
  const followingId = ref(readFollow())
  /** Ticks while bans run, so they end on time */
  const now = ref(Date.now())

  let router: Router | null = null
  let place: OnlinePlace = 'home'

  const isBanned = (id: string) => (bans.value[id] ?? 0) > now.value
  const myBanUntil = computed(() => (isBanned(myId.value) ? bans.value[myId.value] : 0))
  const following = computed(() => players.value.find(p => p.id === followingId.value) ?? null)
  /** Everyone online but this player */
  const others = computed(() => players.value.filter(p => p.id !== myId.value))
  /** Room players (their room ids) whose voice and chat are cut by a ban */
  const bannedRoomPlayerIds = computed(() =>
    players.value.filter(p => p.playerId && p.roomId === multiplayerStore.roomId && isBanned(p.id)).map(p => p.playerId)
  )

  function readFollow(): string {
    try {
      return sessionStorage.getItem(FOLLOW_STORAGE) || ''
    } catch {
      return ''
    }
  }

  function status() {
    return {
      t: 'status',
      place,
      name: multiplayerStore.myPlayerName,
      roomId: multiplayerStore.roomId || null,
      roomName: multiplayerStore.roomName,
      mapName: multiplayerStore.mapName,
      hasPassword: multiplayerStore.roomHasPassword,
      isHost: multiplayerStore.isHost,
      playerId: multiplayerStore.myPlayerId,
    }
  }

  function onMessage(data: any): void {
    if (data.t === 'welcome') {
      myId.value = data.you
      players.value = data.players
      messages.value = data.messages
      bans.value = data.bans
      onlineService.send(status())
      if (admin.isAdmin) sendAdminToken()
    } else if (data.t === 'players') players.value = data.players
    else if (data.t === 'message') messages.value = [...messages.value.slice(-99), data.message]
    else if (data.t === 'deleted') messages.value = messages.value.filter(m => m.id !== data.id)
    else if (data.t === 'bans') bans.value = data.bans
    else if (data.t === 'admin') isAdmin.value = !!data.admin
    else if (data.t === 'error' && data.code === 'too-fast') notify.warning(t('online.tooFast'))
  }

  function sendAdminToken(): void {
    onlineService.send({ t: 'admin', token: admin.sessionToken() })
  }

  /** Goes online (once, when the app starts). */
  function start(appRouter: Router): void {
    router = appRouter
    onlineService.start({
      hello: () => ({ t: 'hello', key: playerKey(), name: multiplayerStore.myPlayerName }),
      onMessage,
      onConnection: on => (connected.value = on),
    })

    // Where this player is, sent on every change
    watch(
      () => [
        router?.currentRoute.value.name,
        multiplayerStore.roomId,
        multiplayerStore.isHost,
        multiplayerStore.roomName,
        multiplayerStore.mapName,
        multiplayerStore.roomHasPassword,
        multiplayerStore.myPlayerName,
      ],
      () => {
        place = placeOf(String(router?.currentRoute.value.name ?? ''), !!multiplayerStore.roomId)
        onlineService.send(status())
        // Back on the home screen or in a lobby: catch up with the leader
        followLeader(following.value)
      },
      { immediate: true }
    )
    watch(() => admin.isAdmin, on => (on ? sendAdminToken() : (isAdmin.value = false)))
    watch(following, followLeader)
    watch(() => Object.keys(bans.value).length, () => (now.value = Date.now()))
    window.setInterval(() => (now.value = Date.now()), 10_000)
  }

  /** Following: when the leader is in a room's lobby, this player goes in after them. */
  let lastPasswordRoom = ''
  async function followLeader(leader: OnlinePlayer | null): Promise<void> {
    if (!leader || leader.place !== 'lobby' || !leader.roomId || !router) return
    if (leader.roomId === multiplayerStore.roomId || (place !== 'home' && place !== 'lobby')) return
    if (leader.hasPassword) {
      if (lastPasswordRoom !== leader.roomId) notify.info(t('online.followPassword', { name: leader.name }))
      lastPasswordRoom = leader.roomId
      return
    }
    if (multiplayerStore.roomId) multiplayerStore.leaveRoom(router)
    notify.info(t('online.followJoining', { name: leader.name }))
    try {
      await multiplayerStore.joinGame(leader.roomId, router)
    } catch {
      notify.error(t('online.followFailed', { name: leader.name }))
    }
  }

  function follow(id: string): void {
    followingId.value = id
    try {
      sessionStorage.setItem(FOLLOW_STORAGE, id)
    } catch {
      // Storage blocked: followed for this page only
    }
  }

  function unfollow(): void {
    follow('')
  }

  function sendMessage(text: string): boolean {
    const message = text.trim()
    if (!message || !connected.value) return false
    if (myBanUntil.value) {
      notify.error(t('online.bannedUntil', { time: new Date(myBanUntil.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
      return false
    }
    onlineService.send({ t: 'chat', text: message })
    return true
  }

  const deleteMessage = (id: string) => onlineService.send({ t: 'delete', id })
  const ban = (id: string, minutes: number) => onlineService.send({ t: 'ban', id, minutes })
  const unban = (id: string) => onlineService.send({ t: 'unban', id })

  return {
    connected,
    myId,
    players,
    others,
    messages,
    bans,
    isAdmin,
    followingId,
    following,
    myBanUntil,
    bannedRoomPlayerIds,
    isBanned,
    start,
    follow,
    unfollow,
    sendMessage,
    deleteMessage,
    ban,
    unban,
  }
})
