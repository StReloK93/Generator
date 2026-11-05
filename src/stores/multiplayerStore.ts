import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { 
  PlayerInfo, 
  PlayerSlot, 
  ChatMessage, 
  NetMessage, 
  RoomState, 
  ActiveRoomSummary,
  TeammateHover,
  CompactUnitSnapshot,
  CompactCombatEvent,
  getSlotColor
} from '../types/multiplayer'
import { networkService } from '../services/networkService'
import { networkSyncBuffer } from '../services/networkSync'
import { HERO_MODELS } from './heroStore'
import { useMapStore } from './mapStore'
import { useCharacterStore } from './characterStore'
import { useRouteStore } from './routeStore'
import { useWaveStore } from './waveStore'
import { useGameStore } from './gameStore'
import { useTowerStore } from './towerStore'
// Used inside handlers only: the hide & seek store itself depends on this store
import { useHideSeekStore } from './hideSeekStore'
import { useNotificationStore } from './notificationStore'
import { useI18n } from './i18nStore'
import { MapProject } from '../types/map'
import { getMapMode } from '../domain/map'
import { normalizeHideSeekSettings, teamForSlot } from '../domain/hideseek'
import { gridToScreen } from '../utils/isometric'
import { readSession, writeSession, removeSession, clearMatch } from '../services/sessionResume'
import { getProjectMapId } from '../services/mapManager'
import { gamePath, lobbyPath } from '../router/paths'

/** Room codes are 6 digits (easy to read out and type on a phone's number pad) */
const ROOM_CODE_LENGTH = 6

/** sessionStorage keys: this tab's player identity and room, so a page refresh rejoins the same seat */
const PLAYER_ID_KEY = 'defensor_player_id'
const ROOM_SESSION_KEY = 'defensor_room'
const ROOM_PROJECT_KEY = 'defensor_room_project'

/** How long a dropped player keeps their seat (and gold) before the host frees it */
const REJOIN_GRACE_MS = 30_000
/** How long a client keeps trying to reach a host that dropped (e.g. the host refreshed) */
const HOST_RECONNECT_TIMEOUT_MS = 45_000
const HOST_RECONNECT_INTERVAL_MS = 3_000

interface SavedRoomSession {
  roomId: string
  isHost: boolean
  mySlotIndex: number
  roomName: string
  mapName: string
  maxPlayers: number
  slots: PlayerSlot[]
  players: PlayerInfo[]
  roomGameState: 'lobby' | 'countdown' | 'in_game' | 'ended'
  chatMessages: ChatMessage[]
  /** Clan picked for the running game, so a refresh does not ask again */
  selectedClanId: string
  /** Host: the room's password ('' = open to everyone) */
  roomPassword: string
}

export const useMultiplayerStore = defineStore('multiplayerStore', () => {
  const mapStore = useMapStore()
  const characterStore = useCharacterStore()
  const routeStore = useRouteStore()
  const waveStore = useWaveStore()
  const gameStore = useGameStore()
  const towerStore = useTowerStore()
  const notify = useNotificationStore()
  const { t } = useI18n()

  // Local Player Identity
  const savedName = localStorage.getItem('isocraft_player_name') || `Player_${Math.floor(Math.random() * 900 + 100)}`

  // Kept for the tab's lifetime: after a refresh the host recognizes the same player and gives the seat back
  const myPlayerId = ref<string>(
    readSession<string>(PLAYER_ID_KEY) || `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )
  writeSession(PLAYER_ID_KEY, myPlayerId.value)
  const myPlayerName = ref<string>(savedName)
  const mySlotIndex = ref<number>(0)
  const myPlayerColor = computed(() => getSlotColor(mySlotIndex.value))
  const isHost = ref<boolean>(false)

  // Global Router Reference for automatic screen transitions
  let globalRouter: any = null
  function setRouter(router: any) {
    globalRouter = router
  }

  // Room State
  const roomId = ref<string>('')
  const roomName = ref<string>('')
  const mapName = ref<string>('Burbenog TD')
  const maxPlayers = ref<number>(4)
  const slots = ref<PlayerSlot[]>([])
  const players = ref<PlayerInfo[]>([])
  const roomGameState = ref<'lobby' | 'countdown' | 'in_game' | 'ended'>('lobby')
  const countdownTimer = ref<number>(0)

  // Available Rooms (Live Discovery)
  const availableRooms = ref<ActiveRoomSummary[]>([])
  /** Host: only players who type this may join ('' = anyone may). Never leaves the host: the list only says a room has one */
  const roomPassword = ref('')

  // Ready Check & Nudge Gestures
  const isNudgeModalOpen = ref<boolean>(false)
  const isReadyButtonGlowing = ref<boolean>(false)
  const nudgeHostName = ref<string>('')

  // Teammate Live Cursors / Hover tracking
  const teammateHovers = ref<Map<string, TeammateHover>>(new Map())

  // Connection & Chat
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const chatMessages = ref<ChatMessage[]>([])

  /** False when the multiplayer server could not be reached on the last room list refresh. */
  const isServerReachable = ref(true)

  async function refreshDiscovery() {
    const list = await networkService.fetchRooms()
    isServerReachable.value = list !== null
    availableRooms.value = (list || []).filter(r => !roomId.value || r.roomId !== roomId.value)
    return availableRooms.value
  }

  // Computed
  const isHideSeekRoom = computed(() => getMapMode(mapStore.project) === 'hideseek')

  /** Hide & seek: the first lobby slots seek, the rest hide (the map's settings) */
  const hideSeekSeekerSlots = computed(() => normalizeHideSeekSettings(mapStore.project.hideSeekSettings).seekerSlots)

  /** Hide & seek needs a player on each side before it can start (heroes are picked in the game). */
  const hideSeekLobbyIssue = computed<'needTeams' | null>(() => {
    if (!isHideSeekRoom.value) return null
    const teams = new Set(players.value.map(p => teamForSlot(p.slotIndex, hideSeekSeekerSlots.value)))
    return teams.size < 2 ? 'needTeams' : null
  })

  const isAllReady = computed(() => {
    if (hideSeekLobbyIssue.value) return false
    const activePlayers = players.value.filter(p => !p.isHost)
    if (activePlayers.length === 0) return true
    return activePlayers.every(p => p.isReady)
  })

  const unreadyCount = computed(() => {
    return players.value.filter(p => !p.isHost && !p.isReady).length
  })

  const myPlayer = computed(() => {
    return players.value.find(p => p.id === myPlayerId.value) || null
  })

  const mySlot = computed(() => {
    return slots.value.find(s => s.slotIndex === mySlotIndex.value) || null
  })

  function setPlayerProfile(name: string, _color?: string) {
    myPlayerName.value = name.trim() || 'Player'
    localStorage.setItem('isocraft_player_name', myPlayerName.value)

    if (myPlayer.value) {
      myPlayer.value.name = myPlayerName.value
      myPlayer.value.color = getSlotColor(myPlayer.value.slotIndex)
      syncLobbyState()
    }
  }

  /**
   * Initializes player slots based on map routes
   */
  function initializeSlotsFromMap(project: MapProject): PlayerSlot[] {
    const routesList = project.routes || routeStore.routes || []
    // Hide & seek seats two teams (from its settings); other maps one player per route
    const count = getMapMode(project) === 'hideseek'
      ? normalizeHideSeekSettings(project.hideSeekSettings).maxPlayers
      : Math.max(1, Math.min(8, routesList.length > 0 ? routesList.length : 4))
    maxPlayers.value = count

    const newSlots: PlayerSlot[] = []
    for (let i = 0; i < count; i++) {
      const routeData = routesList[i]
      const key = routeData?.id || `route-${i}`
      const spawnPt = routeData?.routePoints?.[0] || { col: 2, row: 2 }
      const routeName = routeData?.name || `Route ${i + 1}`
      const playerCameraPt = routeData?.playerCameraPoint

      newSlots.push({
        slotIndex: i,
        routeIndex: i,
        routeId: key,
        routeName,
        spawnCol: spawnPt.col,
        spawnRow: spawnPt.row,
        playerCol: playerCameraPt?.col,
        playerRow: playerCameraPt?.row,
        quadrantName: `Slot ${i + 1}`,
        player: null,
      })
    }
    return newSlots
  }

  /** Registers this tab as the room's host node and advertises the room on the public list. */
  async function startHosting(code: string): Promise<void> {
    connectionStatus.value = 'connecting'

    // Start P2P Host Node (retries transient signaling failures internally)
    const isReachable = await networkService.initHost(
      code,
      handleIncomingMessage,
      handlePeerConnected,
      handlePeerDropped
    )

    // Start advertising this room for discovery
    networkService.startDiscoveryBeacon(() => ({
      roomId: roomId.value,
      roomName: roomName.value,
      hostName: myPlayerName.value,
      hostColor: myPlayerColor.value,
      mapName: mapName.value,
      gameMode: getMapMode(mapStore.project),
      playersCount: players.value.length,
      maxPlayers: maxPlayers.value,
      createdAt: Date.now(),
      lastHeartbeat: Date.now(),
      gameState: roomGameState.value,
      hasPassword: roomPassword.value !== '',
    }))

    connectionStatus.value = isReachable ? 'connected' : 'error'
    if (!isReachable) {
      notify.warning(t('play.serverUnreachableDesc'), t('play.serverUnreachable'))
    }
  }

  /**
   * 1. HOST: Creates a new Multiplayer Room
   */
  async function hostNewGame(customRoomName: string, mapProject: MapProject, router?: any, password = ''): Promise<string> {
    if (router) setRouter(router)
    roomPassword.value = password.trim()

    const smallest = 10 ** (ROOM_CODE_LENGTH - 1)
    const code = String(smallest + Math.floor(Math.random() * 9 * smallest))
    roomId.value = code
    roomName.value = customRoomName || `${myPlayerName.value}'s Game`
    mapName.value = mapProject.name || 'Isometric TD Map'
    isHost.value = true
    chatMessages.value = []

    // Store map project in mapStore
    mapStore.project = JSON.parse(JSON.stringify(mapProject))
    writeSession(ROOM_PROJECT_KEY, mapStore.project)

    // Create slots based on map routes
    slots.value = initializeSlotsFromMap(mapProject)

    const startGold = gameStore.startingGold

    // Setup Host Player (Slot 0 is Slot 1 = Red)
    const hostPlayer: PlayerInfo = {
      id: myPlayerId.value,
      name: myPlayerName.value,
      color: getSlotColor(0),
      slotIndex: 0,
      isHost: true,
      isReady: true,
      gold: startGold,
      totalGoldEarned: startGold,
      score: 0,
      towersBuilt: 0,
      killsCount: 0,
    }
    mySlotIndex.value = 0
    slots.value[0].player = hostPlayer
    players.value = [hostPlayer]
    roomGameState.value = 'lobby'

    // Add System Chat
    addSystemMessage(`Room created: ${roomName.value}`)

    await startHosting(code)

    if (globalRouter) {
      globalRouter.push(lobbyPath(code, getProjectMapId(mapStore.project)))
    }
    return code
  }

  /** Connects to the room's host and asks for a seat (a returning player gets their old seat back). */
  function connectAsClient(code: string, password = ''): Promise<boolean> {
    connectionStatus.value = 'connecting'
    return networkService.connectToHost(
      code,
      myPlayerId.value,
      handleIncomingMessage,
      () => {
        connectionStatus.value = 'connected'
        // Send join request to host
        networkService.sendToHost({
          type: 'JOIN_REQUEST',
          payload: {
            id: myPlayerId.value,
            name: myPlayerName.value,
            color: myPlayerColor.value,
            password,
          },
          senderId: myPlayerId.value,
          timestamp: Date.now(),
        })
      },
      handleHostLost
    )
  }

  /**
   * 2. CLIENT: Joins a room from the list (with its password when it has one)
   */
  async function joinGame(targetRoomId: string, router?: any, password = ''): Promise<boolean> {
    if (router) setRouter(router)

    const cleanRoomId = targetRoomId.replace(/\D/g, '')
    roomId.value = cleanRoomId
    isHost.value = false
    chatMessages.value = []

    const connected = await connectAsClient(cleanRoomId, password)

    if (globalRouter) {
      globalRouter.push(lobbyPath(cleanRoomId))
    }
    return connected
  }

  /**
   * After a page refresh: puts this tab back into the room it was in. The host reopens the room with its saved
   * state (seats, gold, chat); a client reconnects and the host hands its seat back.
   * Returns false when this tab has no saved session for that room.
   */
  async function resumeRoom(code: string, router?: any): Promise<boolean> {
    if (router) setRouter(router)

    const saved = readSession<SavedRoomSession>(ROOM_SESSION_KEY)
    if (!saved || saved.roomId !== code) return false
    const project = readSession<MapProject>(ROOM_PROJECT_KEY)
    if (!project) return false

    roomId.value = saved.roomId
    isHost.value = saved.isHost
    mySlotIndex.value = saved.mySlotIndex
    roomName.value = saved.roomName
    mapName.value = saved.mapName
    maxPlayers.value = saved.maxPlayers
    slots.value = saved.slots
    players.value = saved.players
    roomGameState.value = saved.roomGameState
    chatMessages.value = saved.chatMessages
    resumedClanId.value = saved.selectedClanId
    roomPassword.value = saved.roomPassword
    mapStore.project = project
    restoreSessionFromProject()

    if (isHost.value) {
      // Every other player has to reconnect: seats of those who don't come back are freed after the grace period
      for (const p of players.value) {
        if (!p.isHost) schedulePlayerRemoval(p.id)
      }
      await startHosting(code)
      syncLobbyState()
    } else {
      await connectAsClient(code)
    }
    return true
  }

  // --- Session persistence (page refresh) ---
  /** Clan this tab had picked before the refresh (re-applied when the game screen starts) */
  const resumedClanId = ref('')

  function saveRoomSession() {
    if (!roomId.value) return
    const session: SavedRoomSession = {
      roomId: roomId.value,
      isHost: isHost.value,
      mySlotIndex: mySlotIndex.value,
      roomName: roomName.value,
      mapName: mapName.value,
      maxPlayers: maxPlayers.value,
      slots: slots.value,
      players: players.value,
      roomGameState: roomGameState.value,
      chatMessages: chatMessages.value.slice(-50),
      selectedClanId: towerStore.selectedClanId,
      roomPassword: roomPassword.value,
    }
    writeSession(ROOM_SESSION_KEY, session)
  }

  function clearRoomSession() {
    removeSession(ROOM_SESSION_KEY)
    removeSession(ROOM_PROJECT_KEY)
    clearMatch()
  }

  let roomSaveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    [roomId, isHost, mySlotIndex, roomName, mapName, maxPlayers, slots, players, roomGameState, chatMessages, () => towerStore.selectedClanId],
    () => {
      if (roomSaveTimer) return
      roomSaveTimer = setTimeout(() => {
        roomSaveTimer = null
        saveRoomSession()
      }, 500)
    },
    { deep: true }
  )
  window.addEventListener('pagehide', saveRoomSession)

  // --- Dropped connections ---
  const playerRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function cancelPlayerRemoval(playerId: string) {
    const timer = playerRemovalTimers.get(playerId)
    if (timer) clearTimeout(timer)
    playerRemovalTimers.delete(playerId)
  }

  function schedulePlayerRemoval(playerId: string) {
    cancelPlayerRemoval(playerId)
    playerRemovalTimers.set(playerId, setTimeout(() => {
      playerRemovalTimers.delete(playerId)
      removePlayer(playerId)
    }, REJOIN_GRACE_MS))
  }

  /** Host: a client's connection dropped (closed tab or page refresh). Its seat waits a while for it to come back. */
  function handlePeerDropped(playerId: string) {
    if (players.value.some(p => p.id === playerId && !p.isHost)) {
      schedulePlayerRemoval(playerId)
    }
  }

  let hostReconnectTimer: ReturnType<typeof setTimeout> | null = null
  /** Last time the host answered with the room state (proof that a reconnect worked) */
  let lastHostReplyAt = 0

  /** Client: the host dropped without closing the room (e.g. its page refreshed). Keep trying to get back in. */
  function handleHostLost() {
    if (!roomId.value || isHost.value || hostReconnectTimer) return
    connectionStatus.value = 'connecting'
    const lostAt = Date.now()

    const retry = () => {
      hostReconnectTimer = null
      if (!roomId.value || isHost.value || lastHostReplyAt > lostAt) return
      if (Date.now() - lostAt > HOST_RECONNECT_TIMEOUT_MS) {
        notify.warning("Host xonani tark etdi. Xona yopildi.", "Xona yopildi")
        leaveRoom(globalRouter)
        return
      }
      hostReconnectTimer = setTimeout(retry, HOST_RECONNECT_INTERVAL_MS)
      connectAsClient(roomId.value)
    }
    hostReconnectTimer = setTimeout(retry, 1000)
  }

  /**
   * Synchronizes current lobby state from Host to all connected clients
   */
  function syncLobbyState() {
    if (!isHost.value) return

    const roomState: RoomState = {
      roomId: roomId.value,
      roomName: roomName.value,
      hostId: myPlayerId.value,
      mapName: mapName.value,
      maxPlayers: maxPlayers.value,
      slots: JSON.parse(JSON.stringify(slots.value)),
      players: JSON.parse(JSON.stringify(players.value)),
      gameState: roomGameState.value,
      countdownTimer: countdownTimer.value,
      createdAt: Date.now(),
    }

    networkService.broadcast({
      type: 'LOBBY_STATE',
      payload: roomState,
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })
  }

  /**
   * Incoming Network Message Router
   */
  function handleIncomingMessage(msg: NetMessage) {
    switch (msg.type) {
      case 'LOBBY_STATE': {
        const state = msg.payload as RoomState
        roomName.value = state.roomName
        mapName.value = state.mapName
        maxPlayers.value = state.maxPlayers
        slots.value = state.slots
        players.value = state.players
        roomGameState.value = state.gameState
        countdownTimer.value = state.countdownTimer

        lastHostReplyAt = Date.now()
        connectionStatus.value = 'connected'

        // Locate my slot
        const myPl = state.players.find(p => p.id === myPlayerId.value)
        if (myPl) {
          mySlotIndex.value = myPl.slotIndex
        }

        // Follow the room to the screen it is on (joined / reconnected while a game runs, or it ended meanwhile)
        if (globalRouter) {
          const isOnGameScreen = globalRouter.currentRoute.value.name === 'room-game'
          if (state.gameState === 'in_game' && !isOnGameScreen) {
            globalRouter.push(gamePath(getProjectMapId(mapStore.project), roomId.value))
          } else if (state.gameState === 'lobby' && isOnGameScreen) {
            gameStore.exitPlayMode()
            globalRouter.push(lobbyPath(roomId.value, getProjectMapId(mapStore.project)))
          }
        }
        break
      }

      case 'JOIN_REQUEST': {
        if (!isHost.value) return
        const applicant = msg.payload as { id: string; name: string; color: string; password?: string }

        // Kicked players stay out of this room
        if (kickedPlayerIds.has(applicant.id)) {
          sendKick(applicant.id)
          return
        }

        // A player coming back (page refresh / reconnect) gets their own seat, gold and stats back
        const returning = players.value.find(p => p.id === applicant.id)
        if (returning) {
          cancelPlayerRemoval(returning.id)
          addSystemMessage(`${returning.name} reconnected`)
          networkService.broadcast({
            type: 'MAP_DATA',
            payload: { project: buildSyncedProjectSnapshot() },
            senderId: myPlayerId.value,
            timestamp: Date.now(),
          })
          syncLobbyState()
          // Send the running game state right away instead of waiting for the next periodic sync
          lastGameStateBroadcastTime = 0
          return
        }

        // A room with a password lets in only those who typed it
        if (roomPassword.value && applicant.password !== roomPassword.value) {
          rejectJoin(applicant.id, 'password')
          return
        }

        // Find first empty slot
        const emptySlot = pickJoinSlot()
        if (!emptySlot) {
          rejectJoin(applicant.id, 'full')
          return
        }

        // Slot-based authoritative color
        const assignedColor = getSlotColor(emptySlot.slotIndex)

        const startGold = gameStore.startingGold

        const newPlayer: PlayerInfo = {
          id: applicant.id,
          name: applicant.name,
          color: assignedColor,
          slotIndex: emptySlot.slotIndex,
          isHost: false,
          isReady: false,
          gold: startGold,
          totalGoldEarned: startGold,
          score: 0,
          towersBuilt: 0,
          killsCount: 0,
        }

        emptySlot.player = newPlayer
        players.value.push(newPlayer)

        addSystemMessage(`${newPlayer.name} joined the room (${emptySlot.routeName})`)

        // Send map data to client so client loads exact same map
        networkService.broadcast({
          type: 'MAP_DATA',
          payload: { project: buildSyncedProjectSnapshot() },
          senderId: myPlayerId.value,
          timestamp: Date.now(),
        })

        syncLobbyState()
        break
      }

      case 'MAP_DATA': {
        // A running game already has the map (this is a resend for a player who reconnected)
        if (msg.payload.project && !gameStore.isGameMode) {
          mapStore.project = JSON.parse(JSON.stringify(msg.payload.project))
          writeSession(ROOM_PROJECT_KEY, msg.payload.project)
          mapName.value = mapStore.project.name || 'Isometric TD Map'
          restoreSessionFromProject()
        }
        break
      }

      case 'SLOT_CHANGE': {
        if (!isHost.value) return
        const { playerId, targetSlotIndex } = msg.payload
        const targetSlot = slots.value[targetSlotIndex]
        if (!targetSlot || targetSlot.player !== null) return

        const currentSlot = slots.value.find(s => s.player?.id === playerId)
        const player = players.value.find(p => p.id === playerId)
        if (currentSlot && player) {
          currentSlot.player = null
          targetSlot.player = player
          player.slotIndex = targetSlotIndex
          player.color = getSlotColor(targetSlotIndex)
          syncLobbyState()
        }
        break
      }

      case 'TOGGLE_READY': {
        if (!isHost.value) return
        const player = players.value.find(p => p.id === msg.senderId)
        if (player && !player.isHost) {
          player.isReady = !player.isReady
          syncLobbyState()
        }
        break
      }

      case 'READY_CHECK': {
        if (!isHost.value) {
          const host = msg.payload?.hostName || 'Host'
          nudgeHostName.value = host
          isNudgeModalOpen.value = true
          isReadyButtonGlowing.value = true
          addSystemMessage(`${host} requested everyone to ready up!`)
        }
        break
      }

      case 'START_GAME': {
        clearHeroModels()
        if (msg.payload?.mapProject) {
          mapStore.project = JSON.parse(JSON.stringify(msg.payload.mapProject))
          writeSession(ROOM_PROJECT_KEY, msg.payload.mapProject)
          mapName.value = mapStore.project.name || 'Isometric TD Map'
        }
        restoreSessionFromProject()

        resetGameMatchStats()
        roomGameState.value = 'in_game'
        isNudgeModalOpen.value = false
        isReadyButtonGlowing.value = false
        gameStore.startPlayMode()
        characterStore.spawnAtRoute(0)
        characterStore.startTour()

        if (globalRouter) {
          globalRouter.push(gamePath(getProjectMapId(mapStore.project), roomId.value))
        }
        break
      }

      case 'RETURN_TO_LOBBY': {
        resetGameMatchStats()
        useHideSeekStore().reset()
        roomGameState.value = 'lobby'
        gameStore.exitPlayMode()
        characterStore.resetTour()
        towerStore.clearAllTowers()
        players.value.forEach(p => {
          if (!p.isHost) p.isReady = false
        })
        isNudgeModalOpen.value = false
        isReadyButtonGlowing.value = false
        addSystemMessage("All players returned to the lobby!")

        if (globalRouter) {
          globalRouter.push(lobbyPath(roomId.value, getProjectMapId(mapStore.project)))
        }
        break
      }

      case 'BUILD_TOWER': {
        const tower = msg.payload
        if (tower) {
          const existing = towerStore.placedTowers.find(t => t.id === tower.id || (t.col === tower.col && t.row === tower.row))
          if (!existing) {
            towerStore.placedTowers.push(tower)
            addSystemMessage(`${tower.builderName || 'Player'} built a tower at (${tower.col}, ${tower.row})!`)

            // Authoritative Host Gold Deduction:
            if (isHost.value) {
              const builderId = tower.builderId || msg.senderId
              const builderPlayer = players.value.find(p => p.id === builderId)
              const bp = towerStore.blueprints.find(b => b.id === tower.blueprintId)
              const cost = bp ? (bp.levels[0].cost ?? 100) : (tower.damage ? Math.round(tower.damage * 0.8) : 50)
              if (builderPlayer) {
                builderPlayer.gold = Math.max(0, (builderPlayer.gold || 0) - cost)
                builderPlayer.towersBuilt = (builderPlayer.towersBuilt || 0) + 1
              }
            }
          }
          if (isHost.value && msg.senderId !== myPlayerId.value) {
            networkService.broadcast(msg)
          }
        }
        break
      }

      case 'UPGRADE_TOWER': {
        // Prevent duplicate upgrade execution on sender's client
        if (msg.senderId === myPlayerId.value) break

        const { towerId, newLevel, newDamage, newAttackSpeed, newRange, newSplashRadius, cost } = msg.payload
        const target = towerStore.placedTowers.find(t => t.id === towerId)
        if (target) {
          target.level = newLevel ?? (target.level + 1)
          target.damage = newDamage ?? Math.round(target.damage * 1.35)
          target.attackSpeed = newAttackSpeed ?? Math.max(0.15, Number((target.attackSpeed * 0.9).toFixed(2)))
          target.range = newRange ?? Number((target.range + 0.3).toFixed(1))
          if (newSplashRadius !== undefined) {
            target.splashRadius = newSplashRadius
          }
          addSystemMessage(`⭐ ${target.name} was upgraded to Level ${target.level}!`)

          // Authoritative Host Gold Deduction:
          if (isHost.value) {
            const builderId = target.builderId || msg.senderId
            const builderPlayer = players.value.find(p => p.id === builderId)
            if (builderPlayer) {
              builderPlayer.gold = Math.max(0, (builderPlayer.gold || 0) - (cost || 0))
            }
          }
        }
        if (isHost.value) {
          networkService.broadcast(msg)
        }
        break
      }

      case 'SELL_TOWER': {
        const { towerId } = msg.payload
        const idx = towerStore.placedTowers.findIndex(t => t.id === towerId)
        if (idx !== -1) {
          const removed = towerStore.placedTowers.splice(idx, 1)[0]
          const bp = towerStore.blueprints.find(b => b.id === removed.blueprintId)
          const baseCost = bp ? (bp.levels[0].cost ?? 100) : 100
          const refund = Math.round(baseCost * 0.7 * (1 + (removed.level - 1) * 0.5))
          addSystemMessage(`${removed.name} was sold (+${refund} Gold).`)

          // Authoritative Host Gold Refund:
          if (isHost.value) {
            const builderId = removed.builderId || msg.senderId
            const builderPlayer = players.value.find(p => p.id === builderId)
            if (builderPlayer) {
              builderPlayer.gold = (builderPlayer.gold || 0) + refund
            }
          }
        }
        if (isHost.value && msg.senderId !== myPlayerId.value) {
          networkService.broadcast(msg)
        }
        break
      }

      case 'SET_HERO_MODEL': {
        if (!isHost.value) return
        const player = players.value.find(p => p.id === msg.senderId)
        if (player && typeof msg.payload?.model === 'string') {
          player.heroModel = msg.payload.model
          syncLobbyState()
        }
        break
      }

      case 'HS_PLAYER_STATE': {
        useHideSeekStore().applyPlayerState(msg.payload)
        break
      }

      case 'HS_MATCH_STATE': {
        useHideSeekStore().applyMatchState(msg.payload)
        break
      }

      case 'HS_ACTION': {
        useHideSeekStore().applyRemoteAction(msg.payload, msg.senderId)
        break
      }

      case 'HS_EVENT': {
        useHideSeekStore().applyRemoteEvent(msg.payload)
        break
      }

      case 'PLAYER_HOVER': {
        const hover = msg.payload as TeammateHover
        if (hover && hover.playerId !== myPlayerId.value) {
          hover.lastUpdated = Date.now()
          teammateHovers.value.set(hover.playerId, hover)
        }
        break
      }

      case 'WORLD_SNAPSHOT': {
        if (!isHost.value) {
          const snapshot = msg.payload
          if (snapshot) {
            networkSyncBuffer.pushSnapshot(snapshot)
            gameStore.isGameMode = true
            characterStore.isEnabled = true
          }
        }
        break
      }

      case 'COMBAT_EVENT': {
        if (!isHost.value) {
          const event = msg.payload
          if (event) {
            networkSyncBuffer.pushCombatEvent(event)
          }
        }
        break
      }

      case 'GAME_STATE_SYNC': {
        if (!isHost.value) {
          const state = msg.payload
          if (!state) return
          gameStore.gameState = state.gameState
          gameStore.prepCountdown = state.prepCountdown
          waveStore.currentWaveIndex = state.currentWaveIndex
          gameStore.playerLives = state.playerLives
          gameStore.isGameMode = true
          characterStore.isEnabled = true
          characterStore.isPlaying = state.gameState === 'wave_running'

          // Reconcile placed towers with host state in case of missed build/upgrade/sell packets during lag
          if (state.placedTowers && Array.isArray(state.placedTowers)) {
            const hostTowerIds = new Set(state.placedTowers.map((t: any) => t.id))
            
            // Remove towers sold/removed on host
            towerStore.placedTowers = towerStore.placedTowers.filter(t => hostTowerIds.has(t.id))

            // Add or update towers from host
            for (const hostTower of state.placedTowers) {
              const existingIdx = towerStore.placedTowers.findIndex(t => t.id === hostTower.id)
              if (existingIdx === -1) {
                towerStore.placedTowers.push({ ...hostTower })
              } else {
                towerStore.placedTowers[existingIdx] = { ...towerStore.placedTowers[existingIdx], ...hostTower }
              }
            }
          }

          if (state.playerStats && Array.isArray(state.playerStats)) {
            for (const stat of state.playerStats) {
              const p = players.value.find(x => x.id === stat.id)
              if (p) {
                p.killsCount = stat.killsCount || 0
                p.score = stat.score || 0
                p.towersBuilt = stat.towersBuilt || 0
                if (stat.gold !== undefined) {
                  p.gold = stat.gold
                }
                if (stat.totalGoldEarned !== undefined) {
                  p.totalGoldEarned = stat.totalGoldEarned
                }
                if (p.id === myPlayerId.value) {
                  gameStore.gold = p.gold
                  gameStore.totalKills = p.killsCount
                  gameStore.totalGoldEarned = p.totalGoldEarned ?? p.gold
                }
              }
            }
          }
        }
        break
      }

      case 'WAVE_TICK': {
        if (!isHost.value) {
          const tick = msg.payload
          if (!tick) return
          gameStore.gameState = tick.gameState
          gameStore.prepCountdown = tick.prepCountdown
          waveStore.currentWaveIndex = tick.currentWaveIndex
          gameStore.playerLives = tick.playerLives
          gameStore.isGameMode = true
          characterStore.isEnabled = true
          characterStore.isPlaying = tick.gameState === 'wave_running'

          if (tick.playerStats && Array.isArray(tick.playerStats)) {
            for (const stat of tick.playerStats) {
              const p = players.value.find(x => x.id === stat.id)
              if (p) {
                p.killsCount = stat.killsCount || 0
                p.score = stat.score || 0
                if (stat.gold !== undefined) {
                  p.gold = stat.gold
                }
                if (stat.totalGoldEarned !== undefined) {
                  p.totalGoldEarned = stat.totalGoldEarned
                }
                if (p.id === myPlayerId.value) {
                  gameStore.gold = p.gold
                  gameStore.totalKills = p.killsCount
                  gameStore.totalGoldEarned = p.totalGoldEarned ?? p.gold
                }
              }
            }
          }
        }
        break
      }

      case 'CHAT': {
        chatMessages.value.push(msg.payload)
        if (isHost.value && msg.senderId !== myPlayerId.value) {
          networkService.broadcast(msg)
        }
        break
      }

      case 'PING_CELL': {
        const ping = msg.payload
        addSystemMessage(`${ping.playerName} pinged cell (${ping.col}, ${ping.row})!`)
        if (isHost.value && msg.senderId !== myPlayerId.value) {
          networkService.broadcast(msg)
        }
        break
      }

      case 'PLAYER_LEAVE': {
        cancelPlayerRemoval(msg.senderId)
        removePlayer(msg.senderId)
        break
      }

      case 'JOIN_REJECTED': {
        if (isHost.value || msg.payload?.id !== myPlayerId.value || !roomId.value) break
        notify.error(t(msg.payload.reason === 'password' ? 'play.wrongPassword' : 'play.roomFull'), t('common.error'))
        leaveRoom(globalRouter)
        break
      }

      case 'KICK': {
        if (isHost.value || msg.payload?.id !== myPlayerId.value || !roomId.value) break
        notify.warning(t('lobby.kickedDesc'), t('lobby.kickedTitle'))
        leaveRoom(globalRouter)
        break
      }

      case 'ROOM_CLOSED': {
        notify.warning(msg.payload?.message || "Host left the room. Room closed.", "Room Closed")
        gameStore.exitPlayMode()
        characterStore.resetTour()
        towerStore.clearAllTowers()
        leaveRoom(globalRouter)
        break
      }
    }
  }

  function handlePeerConnected(peerId: string) {
    console.log(`[Lobby] Peer connected: ${peerId}`)
  }

  /**
   * The seat a new player gets: the first free one; in hide & seek a hiders' seat once there is a seeker
   * (players can still move to another free seat in the lobby).
   */
  function pickJoinSlot(): PlayerSlot | undefined {
    const free = slots.value.filter(s => s.player === null)
    if (!isHideSeekRoom.value) return free[0]
    const hasSeeker = slots.value.some(s => s.player && teamForSlot(s.slotIndex, hideSeekSeekerSlots.value) === 0)
    return (hasSeeker ? free.find(s => teamForSlot(s.slotIndex, hideSeekSeekerSlots.value) === 1) : undefined) ?? free[0]
  }

  // --- Kicking (host) ---
  /** Players the host sent away: their join requests are refused while this room lives */
  const kickedPlayerIds = new Set<string>()

  /** Host: tells an applicant why they were not let in (wrong password, no free seat). */
  function rejectJoin(playerId: string, reason: 'password' | 'full') {
    networkService.broadcast({
      type: 'JOIN_REJECTED',
      payload: { id: playerId, reason },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })
  }

  function sendKick(playerId: string) {
    networkService.broadcast({
      type: 'KICK',
      payload: { id: playerId },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })
  }

  /** Host: sends a player out of the room and frees their seat (also a seat left stuck by a broken connection). */
  function kickPlayer(playerId: string) {
    if (!isHost.value || playerId === myPlayerId.value) return
    kickedPlayerIds.add(playerId)
    cancelPlayerRemoval(playerId)
    sendKick(playerId)
    removePlayer(playerId)
  }

  function removePlayer(playerId: string) {
    const leftPlayer = players.value.find(p => p.id === playerId)
    if (leftPlayer) {
      addSystemMessage(`${leftPlayer.name} left the room.`)
      const slot = slots.value.find(s => s.player?.id === playerId)
      if (slot) {
        slot.player = null
      }
      players.value = players.value.filter(p => p.id !== playerId)
      teammateHovers.value.delete(playerId)
      syncLobbyState()
    }
  }

  /**
   * Selects / swaps player slot
   */
  function selectSlot(targetSlotIndex: number) {
    if (targetSlotIndex === mySlotIndex.value) return
    const target = slots.value[targetSlotIndex]
    if (!target || target.player !== null) return

    if (isHost.value) {
      const currentSlot = slots.value[mySlotIndex.value]
      if (currentSlot && myPlayer.value) {
        currentSlot.player = null
        target.player = myPlayer.value
        myPlayer.value.slotIndex = targetSlotIndex
        myPlayer.value.color = getSlotColor(targetSlotIndex)
        mySlotIndex.value = targetSlotIndex
        syncLobbyState()
      }
    } else {
      networkService.sendToHost({
        type: 'SLOT_CHANGE',
        payload: {
          playerId: myPlayerId.value,
          targetSlotIndex,
        },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
    }
  }

  /** Hide & seek: everyone picks a hero anew in each game. */
  function clearHeroModels() {
    if (!isHideSeekRoom.value) return
    for (const p of players.value) p.heroModel = undefined
  }

  /** Host: whoever has not picked a hero in time gets a random one. */
  function assignMissingHeroes() {
    if (!isHost.value) return
    const missing = players.value.filter(p => !p.heroModel)
    if (missing.length === 0) return
    for (const p of missing) p.heroModel = HERO_MODELS[Math.floor(Math.random() * HERO_MODELS.length)].id
    syncLobbyState()
  }

  /** Picks my hero (hide & seek, at the start of a game). The host owns the room state and syncs it to everyone. */
  function selectHeroModel(model: string) {
    if (!myPlayer.value) return
    myPlayer.value.heroModel = model
    if (isHost.value) {
      syncLobbyState()
    } else {
      networkService.sendToHost({
        type: 'SET_HERO_MODEL',
        payload: { model },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
    }
  }

  function toggleReady() {
    if (isHost.value) return
    if (myPlayer.value) {
      myPlayer.value.isReady = !myPlayer.value.isReady
      if (myPlayer.value.isReady) {
        isNudgeModalOpen.value = false
        isReadyButtonGlowing.value = false
      }
    }
    networkService.sendToHost({
      type: 'TOGGLE_READY',
      payload: {},
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })
  }

  /**
   * Host sends Ready Check to nudge all unready players
   */
  function sendReadyCheck() {
    if (!isHost.value) return
    addSystemMessage("Ready check notification sent to all players!")
    networkService.broadcast({
      type: 'READY_CHECK',
      payload: {
        hostName: myPlayerName.value,
      },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcasts cursor/hover position to teammates
   */
  let lastHoverBroadcast = 0
  function broadcastTeammateHover(col: number, row: number) {
    if (!roomId.value) return
    const now = Date.now()
    if (now - lastHoverBroadcast < 40) return
    lastHoverBroadcast = now

    const payload: TeammateHover = {
      playerId: myPlayerId.value,
      playerName: myPlayerName.value,
      playerColor: myPlayerColor.value,
      col,
      row,
      lastUpdated: now,
    }

    const msg: NetMessage = {
      type: 'PLAYER_HOVER',
      payload,
      senderId: myPlayerId.value,
      timestamp: now,
    }

    if (isHost.value) {
      networkService.broadcast(msg)
    } else {
      networkService.sendToHost(msg)
    }
  }

  const combatEventsQueue: CompactCombatEvent[] = []
  let lastTickBroadcastTime = 0
  let lastGameStateBroadcastTime = 0
  let worldSnapshotSeq = 0

  function queueCombatEvent(event: CompactCombatEvent) {
    combatEventsQueue.push(event)
  }

  /**
   * Host broadcasts real-time wave simulation state:
   * 1. 25Hz Compact WORLD_SNAPSHOT (x, y, col, row, dir, hp, flags)
   * 2. Authoritative COMBAT_EVENTs (shoot, hit, die)
   * 3. 1Hz Low-frequency GAME_STATE_SYNC (countdown, lives, score, gold)
   */
  function broadcastGameTick() {
    if (!isHost.value || !roomId.value) return
    const now = Date.now()

    // 1. High-frequency 25Hz WORLD_SNAPSHOT
    if (now - lastTickBroadcastTime >= 40) {
      lastTickBroadcastTime = now

      const compactUnits: CompactUnitSnapshot[] = []
      const sourceUnits = characterStore.units
      const tileWidth = mapStore.project.tileWidth || 128
      const tileHeight = mapStore.project.tileHeight || 64

      for (let i = 0; i < sourceUnits.length; i++) {
        const u = sourceUnits[i]
        if (!u.lifecycle.isSpawned && !u.lifecycle.isDead) continue

        let fl = 0
        if (u.lifecycle.isSpawned) fl |= 1
        if (u.lifecycle.hasReachedEnd) fl |= 2
        if (u.lifecycle.isDead) fl |= 4

        const screenPos = gridToScreen(
          u.movement.currentCol,
          u.movement.currentRow,
          tileWidth,
          tileHeight
        )
        const screenX = screenPos.x + u.identity.sideOffset
        const screenY = screenPos.y

        compactUnits.push({
          id: u.id,
          x: Math.round(screenX * 10) / 10,
          y: Math.round(screenY * 10) / 10,
          col: Math.round(u.movement.currentCol * 100) / 100,
          row: Math.round(u.movement.currentRow * 100) / 100,
          d: u.movement.direction,
          a: u.animation.action,
          f: u.animation.frameIndex,
          hp: Math.round(u.combat.currentHp),
          mhp: Math.round(u.combat.maxHp || 100),
          m: u.identity.model || 'male',
          oy: u.identity.offsetY || 0,
          as: u.animation.animSpeed || 1.0,
          us: u.identity.scale || 1.0,
          fl,
          df: u.lifecycle.deathFade,
          uv: (u.identity.variant as any) || 'normal',
          vt: u.identity.variantTint,
        })
      }

      networkService.broadcast({
        type: 'WORLD_SNAPSHOT',
        payload: {
          seq: ++worldSnapshotSeq,
          time: now,
          units: compactUnits,
        },
        senderId: myPlayerId.value,
        timestamp: now,
      })
    }

    // 2. Authoritative Combat Events
    if (combatEventsQueue.length > 0) {
      for (let i = 0; i < combatEventsQueue.length; i++) {
        networkService.broadcast({
          type: 'COMBAT_EVENT',
          payload: combatEventsQueue[i],
          senderId: myPlayerId.value,
          timestamp: now,
        })
      }
      combatEventsQueue.length = 0
    }

    // 3. Low-frequency 1Hz Game State Sync (with Placed Towers state check)
    if (now - lastGameStateBroadcastTime >= 800) {
      lastGameStateBroadcastTime = now
      const defaultGold = gameStore.startingGold
      networkService.broadcast({
        type: 'GAME_STATE_SYNC',
        payload: {
          gameState: gameStore.gameState,
          prepCountdown: Math.ceil(gameStore.prepCountdown),
          currentWaveIndex: waveStore.currentWaveIndex,
          playerLives: gameStore.playerLives,
          score: 0,
          placedTowers: towerStore.placedTowers.map(t => ({ ...t })),
          playerStats: players.value.map(p => ({
            id: p.id,
            killsCount: p.killsCount || 0,
            score: p.score || 0,
            gold: p.gold !== undefined ? p.gold : defaultGold,
            totalGoldEarned: p.totalGoldEarned !== undefined ? p.totalGoldEarned : (p.gold !== undefined ? p.gold : defaultGold),
            towersBuilt: p.towersBuilt || 0,
          })),
        },
        senderId: myPlayerId.value,
        timestamp: now,
      })
    }
  }

  /**
   * Records a kill and awards gold to the player who built the attacking tower
   */
  function recordPlayerKill(playerId: string, killGold: number) {
    const p = players.value.find(x => x.id === playerId)
    if (p) {
      const defaultGold = gameStore.startingGold
      p.killsCount = (p.killsCount || 0) + 1
      p.gold = (p.gold !== undefined ? p.gold : defaultGold) + killGold
      p.totalGoldEarned = (p.totalGoldEarned !== undefined ? p.totalGoldEarned : defaultGold) + killGold
      p.score = (p.score || 0) + killGold * 10
      if (p.id === myPlayerId.value) {
        gameStore.gold = p.gold
        gameStore.totalKills = p.killsCount
        gameStore.totalGoldEarned = p.totalGoldEarned
      }
    }
  }

  function sendChat(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    const chatMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: myPlayerId.value,
      senderName: myPlayerName.value,
      senderColor: myPlayerColor.value,
      text: trimmed,
      timestamp: Date.now(),
    }

    chatMessages.value.push(chatMsg)

    if (isHost.value) {
      networkService.broadcast({
        type: 'CHAT',
        payload: chatMsg,
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
    } else {
      networkService.sendToHost({
        type: 'CHAT',
        payload: chatMsg,
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
    }
  }

  function addSystemMessage(text: string) {
    chatMessages.value.push({
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'Tizim',
      senderColor: '#38bdf8',
      text,
      timestamp: Date.now(),
      isSystem: true,
    })
  }

  /**
   * Broadcasts building a new tower in multiplayer
   */
  function broadcastTowerBuild(tower: any) {
    const enrichedTower = {
      ...tower,
      builderId: myPlayerId.value,
      builderName: myPlayerName.value,
      builderColor: myPlayerColor.value,
    }

    const msg: NetMessage = {
      type: 'BUILD_TOWER',
      payload: enrichedTower,
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    }

    if (isHost.value) {
      networkService.broadcast(msg)
    } else {
      networkService.sendToHost(msg)
    }
  }

  /**
   * Broadcasts upgrading a tower in multiplayer
   */
  function broadcastTowerUpgrade(tower: any, cost?: number) {
    const msg: NetMessage = {
      type: 'UPGRADE_TOWER',
      payload: { 
        towerId: tower.id,
        newLevel: tower.level,
        newDamage: tower.damage,
        newAttackSpeed: tower.attackSpeed,
        newRange: tower.range,
        newSplashRadius: tower.splashRadius,
        cost: cost ?? 0
      },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    }

    if (isHost.value) {
      networkService.broadcast(msg)
    } else {
      networkService.sendToHost(msg)
    }
  }

  /**
   * Broadcasts selling a tower in multiplayer
   */
  function broadcastTowerSell(towerId: string) {
    const msg: NetMessage = {
      type: 'SELL_TOWER',
      payload: { towerId },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    }

    if (isHost.value) {
      networkService.broadcast(msg)
    } else {
      networkService.sendToHost(msg)
    }
  }

  /** Writes all TD state (settings, waves, routes, towers) into the project and returns a serializable copy. */
  function buildSyncedProjectSnapshot(): MapProject {
    gameStore.syncGameSettingsToProject()
    waveStore.syncWavesToProject()
    routeStore.syncRoutesToProject()
    towerStore.syncToProject()
    return JSON.parse(JSON.stringify(mapStore.project))
  }

  /** Hydrates every TD store from the received project — same path as a local map load. */
  function restoreSessionFromProject() {
    routeStore.syncRoutesFromProject()
    towerStore.restoreFromProject()
    gameStore.restoreGameSettingsFromProject()
    waveStore.restoreWavesFromProject()
  }

  function resetGameMatchStats() {
    const startGold = gameStore.startingGold
    players.value.forEach(p => {
      p.gold = startGold
      p.totalGoldEarned = startGold
      p.killsCount = 0
      p.score = 0
      p.towersBuilt = 0
    })
    gameStore.gold = startGold
    gameStore.totalGoldEarned = startGold
    gameStore.totalKills = 0
    waveStore.currentWaveIndex = 0
    gameStore.playerLives = gameStore.startingLives
    gameStore.prepCountdown = gameStore.wavePrepDuration
    towerStore.placedTowers = []
    towerStore.clearCombatEffects()
  }

  /**
   * Starts Game (Host only)
   */
  function startGame(router?: any) {
    if (!isHost.value) return
    if (!isAllReady.value) {
      sendReadyCheck()
      return
    }

    if (router) setRouter(router)

    roomGameState.value = 'in_game'
    // Every client clears the picks itself (guests on START_GAME): heroes are picked in the game
    clearHeroModels()
    const mapProject = buildSyncedProjectSnapshot()
    writeSession(ROOM_PROJECT_KEY, mapProject)
    networkService.broadcast({
      type: 'START_GAME',
      payload: {
        roomId: roomId.value,
        mapProject,
        timestamp: Date.now(),
      },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })

    resetGameMatchStats()
    gameStore.startPlayMode()
    characterStore.spawnAtRoute(0)
    characterStore.startTour()

    if (globalRouter) {
      globalRouter.push(gamePath(getProjectMapId(mapStore.project), roomId.value))
    }
  }

  function returnToLobby(router?: any) {
    if (router) setRouter(router)

    resetGameMatchStats()
    useHideSeekStore().reset()

    if (isHost.value) {
      roomGameState.value = 'lobby'
      gameStore.exitPlayMode()
      characterStore.resetTour()
      towerStore.clearAllTowers()
      players.value.forEach(p => {
        if (!p.isHost) p.isReady = false
      })
      isNudgeModalOpen.value = false
      isReadyButtonGlowing.value = false

      networkService.broadcast({
        type: 'RETURN_TO_LOBBY',
        payload: { roomId: roomId.value },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })

      syncLobbyState()

      if (globalRouter) {
        globalRouter.push(lobbyPath(roomId.value, getProjectMapId(mapStore.project)))
      }
    } else {
      networkService.sendToHost({
        type: 'RETURN_TO_LOBBY',
        payload: { roomId: roomId.value },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
      roomGameState.value = 'lobby'
      gameStore.exitPlayMode()
      characterStore.resetTour()
      towerStore.clearAllTowers()
      if (globalRouter) {
        globalRouter.push(lobbyPath(roomId.value, getProjectMapId(mapStore.project)))
      }
    }
  }

  function leaveRoom(router?: any) {
    if (router) setRouter(router)

    if (isHost.value && roomId.value) {
      networkService.broadcast({
        type: 'ROOM_CLOSED',
        payload: {
          roomId: roomId.value,
          message: "Host left the room. Room closed."
        },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
      networkService.stopDiscoveryBeacon()
    } else if (!isHost.value && roomId.value) {
      networkService.sendToHost({
        type: 'PLAYER_LEAVE',
        payload: { id: myPlayerId.value },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
    }

    networkService.disconnect()
    clearRoomSession()
    if (hostReconnectTimer) clearTimeout(hostReconnectTimer)
    hostReconnectTimer = null
    playerRemovalTimers.forEach(timer => clearTimeout(timer))
    playerRemovalTimers.clear()
    kickedPlayerIds.clear()
    roomId.value = ''
    roomPassword.value = ''
    slots.value = []
    players.value = []
    roomGameState.value = 'lobby'
    chatMessages.value = []
    connectionStatus.value = 'disconnected'
    isNudgeModalOpen.value = false
    isReadyButtonGlowing.value = false
    teammateHovers.value.clear()
    useHideSeekStore().reset()
    gameStore.exitPlayMode()
    characterStore.resetTour()
    towerStore.clearAllTowers()

    refreshDiscovery()

    if (globalRouter) {
      globalRouter.push('/')
    }
  }

  return {
    myPlayerId,
    myPlayerName,
    myPlayerColor,
    mySlotIndex,
    isHost,
    roomId,
    roomName,
    mapName,
    maxPlayers,
    slots,
    players,
    roomGameState,
    countdownTimer,
    availableRooms,
    isServerReachable,
    isNudgeModalOpen,
    isReadyButtonGlowing,
    nudgeHostName,
    teammateHovers,
    connectionStatus,
    chatMessages,
    isAllReady,
    isHideSeekRoom,
    hideSeekLobbyIssue,
    unreadyCount,
    myPlayer,
    mySlot,
    setRouter,
    setPlayerProfile,
    hostNewGame,
    joinGame,
    resumeRoom,
    resumedClanId,
    selectSlot,
    selectHeroModel,
    assignMissingHeroes,
    toggleReady,
    sendReadyCheck,
    broadcastTeammateHover,
    broadcastGameTick,
    queueCombatEvent,
    sendChat,
    broadcastTowerBuild,
    broadcastTowerUpgrade,
    broadcastTowerSell,
    recordPlayerKill,
    startGame,
    returnToLobby,
    leaveRoom,
    refreshDiscovery,
    kickPlayer,
  }
})
