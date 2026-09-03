import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
  PLAYER_COLORS 
} from '../types/multiplayer'
import { networkService } from '../services/networkService'
import { networkSyncBuffer } from '../services/networkSync'
import { useMapStore } from './mapStore'
import { useCharacterStore } from './characterStore'
import { useTowerStore } from './towerStore'
import { MapProject } from '../types/map'

export const useMultiplayerStore = defineStore('multiplayerStore', () => {
  const mapStore = useMapStore()
  const characterStore = useCharacterStore()
  const towerStore = useTowerStore()

  // Local Player Identity
  const savedName = localStorage.getItem('isocraft_player_name') || `Player_${Math.floor(Math.random() * 900 + 100)}`
  const savedColor = localStorage.getItem('isocraft_player_color') || PLAYER_COLORS[0]

  const myPlayerId = ref<string>(`p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const myPlayerName = ref<string>(savedName)
  const myPlayerColor = ref<string>(savedColor)
  const mySlotIndex = ref<number>(0)
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

  // Ready Check & Nudge Gestures
  const isNudgeModalOpen = ref<boolean>(false)
  const isReadyButtonGlowing = ref<boolean>(false)
  const nudgeHostName = ref<string>('')

  // Teammate Live Cursors / Hover tracking
  const teammateHovers = ref<Map<string, TeammateHover>>(new Map())

  // Connection & Chat
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const statusMessage = ref<string>('')
  const chatMessages = ref<ChatMessage[]>([])

  // Initialize discovery listener
  networkService.listenToDiscovery((rooms) => {
    // Filter out our own room if hosting
    availableRooms.value = rooms.filter(r => !roomId.value || r.roomId !== roomId.value)
  })

  async function refreshDiscovery() {
    const list = await networkService.syncAllDiscoverySources()
    availableRooms.value = list.filter(r => !roomId.value || r.roomId !== roomId.value)
    return availableRooms.value
  }

  // Computed
  const isAllReady = computed(() => {
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

  function setPlayerProfile(name: string, color: string) {
    myPlayerName.value = name.trim() || 'Player'
    myPlayerColor.value = color
    localStorage.setItem('isocraft_player_name', myPlayerName.value)
    localStorage.setItem('isocraft_player_color', myPlayerColor.value)

    if (myPlayer.value) {
      myPlayer.value.name = myPlayerName.value
      myPlayer.value.color = myPlayerColor.value
      syncLobbyState()
    }
  }

  /**
   * Initializes player slots based on map detectedDoors
   */
  function initializeSlotsFromMap(project: MapProject): PlayerSlot[] {
    const doors = (project as any).spawnPoints || characterStore.detectedDoors || []
    const count = Math.max(1, Math.min(8, doors.length > 0 ? doors.length : 4))
    maxPlayers.value = count

    const newSlots: PlayerSlot[] = []
    for (let i = 0; i < count; i++) {
      const door = doors[i]
      const defaultName = `Eshik #${i + 1}`
      const cornerNames = ['Shimoliy / Yuqori', 'Sharqiy / O\'ng', 'Janubiy / Pastki', 'G\'arbiy / Chap']
      const quadrant = door?.cornerName || cornerNames[i % cornerNames.length]

      newSlots.push({
        slotIndex: i,
        doorIndex: i,
        doorId: door?.id || `door-${i}`,
        doorName: door?.name || defaultName,
        spawnCol: door?.spawnCol ?? door?.col ?? 2,
        spawnRow: door?.spawnRow ?? door?.row ?? 2,
        quadrantName: quadrant,
        player: null,
      })
    }
    return newSlots
  }

  /**
   * 1. HOST: Creates a new Multiplayer Room
   */
  async function hostNewGame(customRoomName: string, mapProject: MapProject, router?: any): Promise<string> {
    if (router) setRouter(router)

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    roomId.value = code
    roomName.value = customRoomName || `${myPlayerName.value}'ning O'yini`
    mapName.value = mapProject.name || 'Izometrik TD Karta'
    isHost.value = true
    connectionStatus.value = 'connecting'
    chatMessages.value = []

    // Store map project in mapStore
    mapStore.project = JSON.parse(JSON.stringify(mapProject))
    characterStore.detectDoors()

    // Create slots based on map doors
    slots.value = initializeSlotsFromMap(mapProject)

    const startGold = mapProject.gameSettings?.startingGold || characterStore.startingGold || 150

    // Setup Host Player
    const hostPlayer: PlayerInfo = {
      id: myPlayerId.value,
      name: myPlayerName.value,
      color: myPlayerColor.value,
      slotIndex: 0,
      isHost: true,
      isReady: true,
      gold: startGold,
      score: 0,
      towersBuilt: 0,
      killsCount: 0,
    }
    mySlotIndex.value = 0
    slots.value[0].player = hostPlayer
    players.value = [hostPlayer]
    roomGameState.value = 'lobby'

    // Add System Chat
    addSystemMessage(`🏠 Xona yaratildi: ${code}. Do'stlaringizga kodni ulashing!`)

    // Start P2P Host Node
    await networkService.initHost(
      code,
      handleIncomingMessage,
      handlePeerConnected,
      handlePeerDisconnected
    )

    // Start advertising this room for discovery
    networkService.startDiscoveryBeacon(() => ({
      roomId: roomId.value,
      roomName: roomName.value,
      hostName: myPlayerName.value,
      hostColor: myPlayerColor.value,
      mapName: mapName.value,
      playersCount: players.value.length,
      maxPlayers: maxPlayers.value,
      createdAt: Date.now(),
      lastHeartbeat: Date.now(),
      gameState: roomGameState.value,
    }))

    connectionStatus.value = 'connected'
    statusMessage.value = 'Xona faol. O\'yinchilar kutilmoqda...'

    if (globalRouter) {
      globalRouter.push(`/lobby/${code}`)
    }
    return code
  }

  /**
   * 2. CLIENT: Joins an existing room with room code
   */
  async function joinGame(targetRoomId: string, router?: any): Promise<boolean> {
    if (router) setRouter(router)

    const cleanRoomId = targetRoomId.trim().toUpperCase()
    roomId.value = cleanRoomId
    isHost.value = false
    connectionStatus.value = 'connecting'
    chatMessages.value = []
    statusMessage.value = 'Xonaga ulanilmoqda...'

    const connected = await networkService.connectToHost(
      cleanRoomId,
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
          },
          senderId: myPlayerId.value,
          timestamp: Date.now(),
        })
      },
      () => {
        connectionStatus.value = 'disconnected'
        statusMessage.value = 'Xona egasi bilan aloqa uzildi.'
        if (roomId.value) {
          alert("⚠️ Xona egasi (Host) xonadan chiqdi. Xona yopildi.")
          leaveRoom(globalRouter)
        }
      }
    )

    if (globalRouter) {
      globalRouter.push(`/lobby/${cleanRoomId}`)
    }
    return connected
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
      slots: slots.value,
      players: players.value,
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

        // Locate my slot
        const myPl = state.players.find(p => p.id === myPlayerId.value)
        if (myPl) {
          mySlotIndex.value = myPl.slotIndex
        }

        // If game was started while we received lobby update
        if (state.gameState === 'in_game' && globalRouter) {
          characterStore.startPlayMode()
          globalRouter.push(`/game/${roomId.value}`)
        }
        break
      }

      case 'JOIN_REQUEST': {
        if (!isHost.value) return
        const applicant = msg.payload as { id: string; name: string; color: string }
        
        // Find first empty slot
        const emptySlot = slots.value.find(s => s.player === null)
        if (!emptySlot) {
          networkService.broadcast({
            type: 'JOIN_REJECTED',
            payload: { message: 'Xonada bo\'sh o\'rin qolmadi' },
            senderId: myPlayerId.value,
            timestamp: Date.now(),
          })
          return
        }

        // Color collision avoidance
        const usedColors = new Set(players.value.map(p => p.color))
        let assignedColor = applicant.color
        if (usedColors.has(assignedColor)) {
          assignedColor = PLAYER_COLORS.find(c => !usedColors.has(c)) || PLAYER_COLORS[emptySlot.slotIndex % PLAYER_COLORS.length]
        }

        const startGold = mapStore.project.gameSettings?.startingGold || characterStore.startingGold || 150

        const newPlayer: PlayerInfo = {
          id: applicant.id,
          name: applicant.name,
          color: assignedColor,
          slotIndex: emptySlot.slotIndex,
          isHost: false,
          isReady: false,
          gold: startGold,
          score: 0,
          towersBuilt: 0,
          killsCount: 0,
        }

        emptySlot.player = newPlayer
        players.value.push(newPlayer)

        addSystemMessage(`👋 ${newPlayer.name} xonaga qo'shildi (${emptySlot.doorName})`)

        // Send map data to client so client loads exact same map
        networkService.broadcast({
          type: 'MAP_DATA',
          payload: {
            project: mapStore.project,
            waveConfigs: characterStore.waveConfigs,
            towerBlueprints: (mapStore.project as any).towerBlueprints || [],
          },
          senderId: myPlayerId.value,
          timestamp: Date.now(),
        })

        syncLobbyState()
        break
      }

      case 'MAP_DATA': {
        if (msg.payload.project) {
          mapStore.project = JSON.parse(JSON.stringify(msg.payload.project))
          mapName.value = mapStore.project.name || 'Izometrik TD Karta'
        }
        if (msg.payload.waveConfigs && msg.payload.waveConfigs.length > 0) {
          characterStore.waveConfigs = msg.payload.waveConfigs.map((w: any) => ({ ...w }))
        }
        if (msg.payload.towerBlueprints && msg.payload.towerBlueprints.length > 0) {
          towerStore.blueprints = msg.payload.towerBlueprints.map((b: any) => ({ ...b }))
        }
        towerStore.restoreFromProject()
        characterStore.detectDoors()
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
          const host = msg.payload?.hostName || 'Xona egasi'
          nudgeHostName.value = host
          isNudgeModalOpen.value = true
          isReadyButtonGlowing.value = true
          addSystemMessage(`🔔 ${host} barchani tayyor bo'lishga chaqirdi!`)
        }
        break
      }

      case 'START_GAME': {
        if (msg.payload?.mapProject) {
          mapStore.project = JSON.parse(JSON.stringify(msg.payload.mapProject))
          mapName.value = mapStore.project.name || 'Izometrik TD Karta'
        }
        if (msg.payload?.waveConfigs && msg.payload.waveConfigs.length > 0) {
          characterStore.waveConfigs = msg.payload.waveConfigs.map((w: any) => ({ ...w }))
        }
        if (msg.payload?.towerBlueprints && msg.payload.towerBlueprints.length > 0) {
          towerStore.blueprints = msg.payload.towerBlueprints.map((b: any) => ({ ...b }))
        }
        towerStore.restoreFromProject()
        characterStore.restoreGameSettingsFromProject()
        characterStore.detectDoors()

        const startingGold = mapStore.project.gameSettings?.startingGold || characterStore.startingGold || 150
        players.value.forEach(p => {
          p.gold = startingGold
        })
        characterStore.gold = startingGold

        roomGameState.value = 'in_game'
        isNudgeModalOpen.value = false
        isReadyButtonGlowing.value = false
        characterStore.startPlayMode()

        if (globalRouter) {
          globalRouter.push(`/game/${roomId.value}`)
        }
        break
      }

      case 'RETURN_TO_LOBBY': {
        roomGameState.value = 'lobby'
        characterStore.exitPlayMode()
        towerStore.clearAllTowers()
        players.value.forEach(p => {
          if (!p.isHost) p.isReady = false
        })
        isNudgeModalOpen.value = false
        isReadyButtonGlowing.value = false
        addSystemMessage("🏠 Barcha o'yinchilar lobby kutish zaliga qaytdilar!")

        if (globalRouter) {
          globalRouter.push(`/lobby/${roomId.value}`)
        }
        break
      }

      case 'BUILD_TOWER': {
        const tower = msg.payload
        if (tower) {
          const existing = towerStore.placedTowers.find(t => t.id === tower.id || (t.col === tower.col && t.row === tower.row))
          if (!existing) {
            towerStore.placedTowers.push(tower)
            addSystemMessage(`🔨 ${tower.builderName || 'O\'yinchi'} (${tower.col}, ${tower.row}) katagiga minora qurdilar!`)

            // Authoritative Host Gold Deduction:
            if (isHost.value) {
              const builderId = tower.builderId || msg.senderId
              const builderPlayer = players.value.find(p => p.id === builderId)
              const bp = towerStore.blueprints.find(b => b.id === tower.blueprintId)
              const cost = bp ? bp.cost : (tower.damage ? Math.round(tower.damage * 0.8) : 50)
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
        const { towerId } = msg.payload
        const target = towerStore.placedTowers.find(t => t.id === towerId)
        if (target) {
          const bp = towerStore.blueprints.find(b => b.id === target.blueprintId)
          const baseCost = bp ? bp.cost : 100
          const cost = Math.round(baseCost * 0.6 * target.level)

          target.level++
          target.damage = Math.round(target.damage * 1.35)
          target.attackSpeed = Math.max(0.15, Number((target.attackSpeed * 0.9).toFixed(2)))
          target.range = Number((target.range + 0.3).toFixed(1))
          if (target.isSplash) {
            target.splashRadius = Number((target.splashRadius + 0.2).toFixed(1))
          }
          addSystemMessage(`⭐ ${target.name} ${target.level}-darajaga kuchaytirildi!`)

          // Authoritative Host Gold Deduction:
          if (isHost.value) {
            const builderId = target.builderId || msg.senderId
            const builderPlayer = players.value.find(p => p.id === builderId)
            if (builderPlayer) {
              builderPlayer.gold = Math.max(0, (builderPlayer.gold || 0) - cost)
            }
          }
        }
        if (isHost.value && msg.senderId !== myPlayerId.value) {
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
          const baseCost = bp ? bp.cost : 100
          const refund = Math.round(baseCost * 0.7 * (1 + (removed.level - 1) * 0.5))
          addSystemMessage(`💰 ${removed.name} sotildi (+${refund} oltin).`)

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
            characterStore.isGameMode = true
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
          characterStore.gameState = state.gameState
          characterStore.prepCountdown = state.prepCountdown
          characterStore.currentWaveIndex = state.currentWaveIndex
          characterStore.playerLives = state.playerLives
          characterStore.score = state.score
          characterStore.isGameMode = true
          characterStore.isEnabled = true
          characterStore.isPlaying = state.gameState === 'wave_running'

          if (state.playerStats && Array.isArray(state.playerStats)) {
            for (const stat of state.playerStats) {
              const p = players.value.find(x => x.id === stat.id)
              if (p) {
                p.killsCount = stat.killsCount || 0
                p.score = stat.score || 0
                if (stat.gold !== undefined) {
                  p.gold = stat.gold
                }
                if (p.id === myPlayerId.value) {
                  characterStore.gold = p.gold
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
          characterStore.gameState = tick.gameState
          characterStore.prepCountdown = tick.prepCountdown
          characterStore.currentWaveIndex = tick.currentWaveIndex
          characterStore.playerLives = tick.playerLives
          characterStore.score = tick.score
          characterStore.isGameMode = true
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
                if (p.id === myPlayerId.value) {
                  characterStore.gold = p.gold
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
        addSystemMessage(`📍 ${ping.playerName} (${ping.col}, ${ping.row}) katakni ko'rsatdi!`)
        if (isHost.value && msg.senderId !== myPlayerId.value) {
          networkService.broadcast(msg)
        }
        break
      }

      case 'PLAYER_LEAVE': {
        handlePeerDisconnected(msg.senderId)
        break
      }

      case 'ROOM_CLOSED': {
        alert(msg.payload?.message || "⚠️ Xona egasi (Host) xonadan chiqdi. Xona yopildi.")
        characterStore.exitPlayMode()
        towerStore.clearAllTowers()
        leaveRoom(globalRouter)
        break
      }
    }
  }

  function handlePeerConnected(peerId: string) {
    console.log(`[Lobby] Peer connected: ${peerId}`)
  }

  function handlePeerDisconnected(peerId: string) {
    const leftPlayer = players.value.find(p => p.id === peerId)
    if (leftPlayer) {
      addSystemMessage(`🚪 ${leftPlayer.name} xonani tark etdi.`)
      const slot = slots.value.find(s => s.player?.id === peerId)
      if (slot) {
        slot.player = null
      }
      players.value = players.value.filter(p => p.id !== peerId)
      teammateHovers.value.delete(peerId)
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
    addSystemMessage("🔔 Barcha o'yinchilarga tayyorgarlik bildirishnomasi yuborildi!")
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

      for (let i = 0; i < sourceUnits.length; i++) {
        const u = sourceUnits[i]
        if (!u.isSpawned && !u.isDead) continue

        let fl = 0
        if (u.isSpawned) fl |= 1
        if (u.hasReachedEnd) fl |= 2
        if (u.isDead) fl |= 4

        compactUnits.push({
          id: u.id,
          x: Math.round(u.screenX * 10) / 10,
          y: Math.round(u.screenY * 10) / 10,
          col: Math.round(u.currentCol * 100) / 100,
          row: Math.round(u.currentRow * 100) / 100,
          d: u.direction,
          a: u.action,
          f: u.frameIndex,
          hp: Math.round(u.currentHp),
          fl,
          df: u.deathFade,
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

    // 3. Low-frequency 1Hz Game State Sync
    if (now - lastGameStateBroadcastTime >= 800) {
      lastGameStateBroadcastTime = now
      const defaultGold = mapStore.project.gameSettings?.startingGold ?? characterStore.startingGold ?? 150
      networkService.broadcast({
        type: 'GAME_STATE_SYNC',
        payload: {
          gameState: characterStore.gameState,
          prepCountdown: Math.ceil(characterStore.prepCountdown),
          currentWaveIndex: characterStore.currentWaveIndex,
          playerLives: characterStore.playerLives,
          score: characterStore.score,
          playerStats: players.value.map(p => ({
            id: p.id,
            killsCount: p.killsCount || 0,
            score: p.score || 0,
            gold: p.gold !== undefined ? p.gold : defaultGold,
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
      const defaultGold = mapStore.project.gameSettings?.startingGold ?? characterStore.startingGold ?? 150
      p.killsCount = (p.killsCount || 0) + 1
      p.gold = (p.gold !== undefined ? p.gold : defaultGold) + killGold
      p.score = (p.score || 0) + killGold * 10
      if (p.id === myPlayerId.value) {
        characterStore.gold = p.gold
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
  function broadcastTowerUpgrade(towerId: string) {
    const msg: NetMessage = {
      type: 'UPGRADE_TOWER',
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
    networkService.broadcast({
      type: 'START_GAME',
      payload: {
        roomId: roomId.value,
        mapProject: mapStore.project,
        waveConfigs: characterStore.waveConfigs,
        towerBlueprints: towerStore.blueprints,
        timestamp: Date.now(),
      },
      senderId: myPlayerId.value,
      timestamp: Date.now(),
    })

    const startGold = mapStore.project.gameSettings?.startingGold || characterStore.startingGold || 150
    players.value.forEach(p => {
      p.gold = startGold
    })
    characterStore.gold = startGold

    characterStore.startPlayMode()

    if (globalRouter) {
      globalRouter.push(`/game/${roomId.value}`)
    }
  }

  function returnToLobby(router?: any) {
    if (router) setRouter(router)

    if (isHost.value) {
      roomGameState.value = 'lobby'
      characterStore.exitPlayMode()
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
        globalRouter.push(`/lobby/${roomId.value}`)
      }
    } else {
      networkService.sendToHost({
        type: 'RETURN_TO_LOBBY',
        payload: { roomId: roomId.value },
        senderId: myPlayerId.value,
        timestamp: Date.now(),
      })
      roomGameState.value = 'lobby'
      characterStore.exitPlayMode()
      towerStore.clearAllTowers()
      if (globalRouter) {
        globalRouter.push(`/lobby/${roomId.value}`)
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
          message: "⚠️ Xona egasi (Host) xonadan chiqdi. Xona yopildi."
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
    roomId.value = ''
    slots.value = []
    players.value = []
    roomGameState.value = 'lobby'
    chatMessages.value = []
    connectionStatus.value = 'disconnected'
    isNudgeModalOpen.value = false
    isReadyButtonGlowing.value = false
    teammateHovers.value.clear()
    characterStore.exitPlayMode()
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
    isNudgeModalOpen,
    isReadyButtonGlowing,
    nudgeHostName,
    teammateHovers,
    connectionStatus,
    statusMessage,
    chatMessages,
    isAllReady,
    unreadyCount,
    myPlayer,
    mySlot,
    setRouter,
    setPlayerProfile,
    hostNewGame,
    joinGame,
    selectSlot,
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
  }
})
