import { MapProject, AssetItem, MapGameMode } from '../types/map'
import { getMapMode, isMazeMode } from '../domain/map'
import { normalizeHideSeekSettings } from '../domain/hideseek'
import { 
  buildFullProjectJsonPayload, 
  normalizeTileItem 
} from '../utils/exportHelpers'
import { 
  saveRecentProject, 
  getRecentProjects 
} from './projectStorage'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useRouteStore } from '../stores/routeStore'
import { useWaveStore } from '../stores/waveStore'
import { normalizeGameSettings } from '../domain/simulation/GameSettings'
import { useGameStore } from '../stores/gameStore'
import { useTowerStore } from '../stores/towerStore'
import { readSession, writeSession } from './sessionResume'

/** Map list entry (built-in or imported) for the single player and multiplayer map pickers. */
export interface MapSummary {
  id: string
  name: string
  mode: MapGameMode
  cols: number
  rows: number
  playersCount: number
  raw: any
}

export interface MapDetails {
  waves: number
  bossWaves: number
  towers: number
  startingGold: number
  startingLives: number
  clans: Array<{ id: string; name: string; color: string }>
  /** Hide & seek: seeker seats, rounds and the length of a round in seconds */
  seekers: number
  rounds: number
  roundTime: number
}

/** Player-facing summary of a raw map payload (shown in the map picker). */
export function getMapDetails(raw: any): MapDetails {
  const project = raw?.project || raw || {}
  const waves: Array<{ isBoss?: boolean }> = raw?.waveData?.waveConfigs || raw?.waveConfigs || project.waveConfigs || []
  const settings = normalizeGameSettings(project.gameSettings)
  const hideSeek = normalizeHideSeekSettings(project.hideSeekSettings)
  return {
    waves: waves.length,
    bossWaves: waves.filter(w => w.isBoss).length,
    towers: (project.towerBlueprints || []).length,
    startingGold: settings.startingGold,
    startingLives: settings.startingLives,
    clans: (project.clans || []).map((c: any) => ({ id: c.id, name: c.name, color: c.color || '#e9b63c' })),
    seekers: hideSeek.seekerSlots,
    rounds: hideSeek.roundCount,
    roundTime: hideSeek.roundTime,
  }
}

// Custom uploaded maps live for the tab session (kept in sessionStorage so a refresh can reopen them)
const sessionCustomMaps = new Map<string, any>()
const CUSTOM_MAP_KEY_PREFIX = 'defensor_custom_map_'

export function registerSessionCustomMap(id: string, rawPayload: any) {
  const cleanId = sanitizeMapId(id)
  sessionCustomMaps.set(cleanId, rawPayload)
  writeSession(CUSTOM_MAP_KEY_PREFIX + cleanId, rawPayload)
}

function getSessionCustomMap(cleanId: string): any | null {
  if (!sessionCustomMaps.has(cleanId)) {
    const stored = readSession<any>(CUSTOM_MAP_KEY_PREFIX + cleanId)
    if (!stored) return null
    sessionCustomMaps.set(cleanId, stored)
  }
  return sessionCustomMaps.get(cleanId)
}

// 1. Scan and index all built-in maps from src/maps/*.json
const mapModules = import.meta.glob<any>('../maps/*.json', { eager: true })

function summarizeMap(raw: any, id: string, fallbackName: string): MapSummary {
  const project = raw.project || raw
  const mode = getMapMode(project)
  // Hide & seek seats two teams (its settings); other maps one player per route unless they say otherwise
  const explicitPlayers = isMazeMode(mode)
    ? normalizeHideSeekSettings(project.hideSeekSettings).maxPlayers
    : project.playersCount || project.gameSettings?.maxPlayers || project.gameSettings?.playerCount
  const routesCount = project.routes?.length || 0
  return {
    id,
    name: project.name || fallbackName,
    mode,
    cols: project.cols || 60,
    rows: project.rows || 60,
    playersCount: typeof explicitPlayers === 'number' && explicitPlayers > 0
      ? explicitPlayers
      : routesCount > 0 ? routesCount : (project.cols >= 60 ? 4 : 2),
    raw,
  }
}

export function getBuiltinMaps(): MapSummary[] {
  return Object.entries(mapModules).map(([path, mod]) => {
    const raw = (mod as any).default || mod
    const fileName = path.split('/').pop()?.replace(/\.json$/i, '') || 'Map'
    return summarizeMap(raw, fileName.toLowerCase().replace(/[^a-z0-9]/g, '-'), fileName)
  })
}

/** Reads a user-picked map JSON, registers it for this session and returns its list entry. Throws on invalid JSON. */
export async function importMapFile(file: File): Promise<MapSummary> {
  const raw = JSON.parse(await file.text())
  const project = raw.project || raw
  const fallbackName = file.name.replace(/\.json$/i, '')
  const id = sanitizeMapId(`custom-${(project.name || fallbackName).toLowerCase()}-${Date.now().toString(36)}`)
  registerSessionCustomMap(id, raw)
  return summarizeMap(raw, id, fallbackName)
}

export function sanitizeMapId(nameOrId: string): string {
  if (!nameOrId) return 'default-map'
  return nameOrId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
}

/** Readable URL id of a loaded map project (resolved back by getGameMapDataById, which also matches names). */
export function getProjectMapId(project: Pick<MapProject, 'id' | 'name'>): string {
  return sanitizeMapId(project.name || project.id)
}

/**
 * Loads map for GAME PLAY (Single Player / Multiplayer).
 * If the user has edited and saved changes in the editor, load their latest draft from LocalStorage!
 * Otherwise fallback to the official pristine map from src/maps/*.json.
 */
export function getGameMapDataById(mapId: string): { payload: any; source: 'builtin' | 'custom' | 'editor_draft' } | null {
  if (!mapId) return null
  const cleanId = sanitizeMapId(mapId)

  // 1. Check session custom uploaded maps
  const customMap = getSessionCustomMap(cleanId)
  if (customMap) {
    return { payload: customMap, source: 'custom' }
  }

  // 2. Check in-progress edited draft in LocalStorage (so editor changes are immediately active in game)
  try {
    const raw = localStorage.getItem(`defensor_editor_draft_${cleanId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed) {
        return { payload: parsed, source: 'editor_draft' }
      }
    }
  } catch (e) {
    console.warn(`[mapManager] Error reading editor draft for game ${mapId}:`, e)
  }

  // 3. Fallback to official built-in maps from src/maps/*.json
  const builtins = getBuiltinMaps()
  const builtinMatch = builtins.find(m => 
    m.id === cleanId || 
    sanitizeMapId(m.name) === cleanId ||
    sanitizeMapId(m.raw?.project?.id) === cleanId
  )
  if (builtinMatch && builtinMatch.raw) {
    return { payload: builtinMatch.raw, source: 'builtin' }
  }

  return null
}

/**
 * Loads map for REDACTOR / EDITOR.
 * STRICT RULE: If the user was editing this map and refreshed the browser,
 * restore their in-progress work from LocalStorage draft!
 * If no draft exists, load the pristine map from src/maps/*.json.
 */
export function getEditorMapDataById(mapId: string): { payload: any; source: 'editor_draft' | 'builtin' | 'custom' } | null {
  if (!mapId) return null
  const cleanId = sanitizeMapId(mapId)

  // 1. Check LocalStorage for in-progress editor draft
  try {
    const raw = localStorage.getItem(`defensor_editor_draft_${cleanId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed) {
        return { payload: parsed, source: 'editor_draft' }
      }
    }

    // Check recent projects list
    const recents = getRecentProjects()
    const match = recents.find(r => 
      sanitizeMapId(r.id) === cleanId || 
      sanitizeMapId(r.name) === cleanId || 
      r.id === mapId
    )
    if (match && (match.payload || match.project)) {
      return { payload: match.payload || match, source: 'editor_draft' }
    }
  } catch (e) {
    console.warn(`[mapManager] Error reading editor draft ${mapId}:`, e)
  }

  // 2. Check session custom maps
  const customMap = getSessionCustomMap(cleanId)
  if (customMap) {
    return { payload: customMap, source: 'custom' }
  }

  // 3. Fallback to clean built-in maps
  const builtins = getBuiltinMaps()
  const builtinMatch = builtins.find(m => 
    m.id === cleanId || 
    sanitizeMapId(m.name) === cleanId ||
    sanitizeMapId(m.raw?.project?.id) === cleanId
  )
  if (builtinMatch && builtinMatch.raw) {
    return { payload: builtinMatch.raw, source: 'builtin' }
  }

  return null
}

/**
 * Saves current in-progress map edits in REDACTOR / EDITOR to LocalStorage.
 */
export function saveEditorDraft(
  mapId: string,
  project: MapProject,
  assets: AssetItem[],
  characterData?: any,
  towerData?: any,
  waveData?: any,
  gameSettings?: any
): void {
  if (!project || !project.cols || !project.layers || project.layers.length === 0) return

  const cleanId = sanitizeMapId(mapId || project.id || project.name || 'map')
  project.id = cleanId

  try {
    const fullPayload = buildFullProjectJsonPayload(
      project,
      assets,
      characterData,
      towerData,
      waveData,
      gameSettings
    )

    // Save editor draft to LocalStorage
    localStorage.setItem(`defensor_editor_draft_${cleanId}`, JSON.stringify(fullPayload))

    // Also update recents list
    saveRecentProject(
      project,
      assets,
      characterData,
      waveData,
      towerData,
      gameSettings
    )
  } catch (e) {
    console.warn(`[mapManager] Error saving editor draft ${mapId}:`, e)
  }
}

/**
 * Applies a full map JSON payload to all active Pinia stores.
 */
export function applyMapPayloadToStores(rawPayload: any): void {
  if (!rawPayload) return

  const mapStore = useMapStore()
  const assetStore = useAssetStore()
  const routeStore = useRouteStore()
  const waveStore = useWaveStore()
  const gameStore = useGameStore()
  const towerStore = useTowerStore()

  const data = rawPayload.payload || rawPayload
  const project = data.project || data
  if (!project || !project.cols || !project.rows) return

  // 1. Normalize all layers and tiles
  const clonedProject = JSON.parse(JSON.stringify(project))
  if (clonedProject.layers) {
    for (const layer of clonedProject.layers) {
      if (layer.tiles) {
        for (const [key, items] of Object.entries(layer.tiles)) {
          const [col, row] = key.split(',').map(Number)
          const itemArr = Array.isArray(items) ? items : [items]
          layer.tiles[key] = itemArr.map(item => normalizeTileItem(item, col, row))
        }
      }
    }
  }
  mapStore.project = clonedProject

  // 2. Hydrate Waves
  const rawWaves = data.waveData?.waveConfigs || data.waveConfigs || project.waveConfigs || []
  if (rawWaves && rawWaves.length > 0) {
    waveStore.waveConfigs = rawWaves.map((w: any) => ({
      ...w,
      characterModel: w.characterModel || 'male',
      unitSpeed: Number(w.unitSpeed) || 2.5,
      unitHp: Number(w.unitHp) || 100,
      unitCount: Number(w.unitCount) || 10,
      goldReward: Number(w.goldReward) || (Number(w.unitBonus) || 1),
    }))
  } else {
    waveStore.waveConfigs = []
  }

  // 3. Hydrate Towers & Clans
  const rawClans = data.towerData?.clans || project.clans || data.clans || []
  if (rawClans && rawClans.length > 0) {
    towerStore.clans = rawClans.map((c: any) => ({ ...c }))
  } else {
    towerStore.clans = []
  }

  const rawBlueprints = data.towerData?.towerBlueprints || data.towerBlueprints || project.towerBlueprints || []
  if (rawBlueprints && rawBlueprints.length > 0) {
    towerStore.blueprints = rawBlueprints.map((b: any) => ({ ...b }))
  } else {
    towerStore.blueprints = []
  }

  const rawPlacedTowers = data.towerData?.placedTowers || data.placedTowers || project.placedTowers || []
  if (rawPlacedTowers && rawPlacedTowers.length > 0) {
    towerStore.placedTowers = rawPlacedTowers.map((pt: any) => ({ ...pt }))
  } else {
    towerStore.placedTowers = []
  }

  // 4. Hydrate Routes
  routeStore.syncRoutesFromProject()

  // 5. Hydrate Game Settings
  gameStore.restoreGameSettingsFromProject()

  // 6. Assets Reconciliation
  if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
    assetStore.reconcileImportedAssets(data.assets)
  }

  // 7. Store internal restore hooks
  towerStore.restoreFromProject()
  waveStore.restoreWavesFromProject()
  routeStore.syncRoutesFromProject()
  mapStore.resetHistory(`Map loaded: ${project.name || 'Project'}`)
}
