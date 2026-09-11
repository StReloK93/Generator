import { MapProject, AssetItem } from '../types/map'
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
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'

export interface BuiltinMapSummary {
  id: string
  name: string
  cols: number
  rows: number
  playersCount: number
  wavesCount: number
  raw: any
}

// Session cache for custom uploaded maps
const sessionCustomMaps = new Map<string, any>()

export function registerSessionCustomMap(id: string, rawPayload: any) {
  const cleanId = sanitizeMapId(id)
  sessionCustomMaps.set(cleanId, rawPayload)
}

// 1. Scan and index all built-in maps from src/maps/*.json
const mapModules = import.meta.glob<any>('../maps/*.json', { eager: true })

export function getBuiltinMaps(): BuiltinMapSummary[] {
  return Object.entries(mapModules).map(([path, mod]) => {
    const raw = (mod as any).default || mod
    const project = raw.project || raw
    const fileName = path.split('/').pop()?.replace(/\.json$/i, '') || 'Map'
    const id = fileName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const waves = raw.waveData?.waveConfigs || raw.waveConfigs || project.waveConfigs || []

    return {
      id,
      name: project.name || fileName,
      cols: project.cols || 60,
      rows: project.rows || 60,
      playersCount: project.playersCount || project.gameSettings?.maxPlayers || (project.cols >= 60 ? 4 : 2),
      wavesCount: waves.length || 24,
      raw,
    }
  })
}

export function sanitizeMapId(nameOrId: string): string {
  if (!nameOrId) return 'default-map'
  return nameOrId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
}

/**
 * Loads clean, official map for GAME PLAY (Single Player / Multiplayer).
 * STRICT RULE: Games NEVER load from editor's auto-saved localStorage drafts!
 */
export function getGameMapDataById(mapId: string): { payload: any; source: 'builtin' | 'custom' } | null {
  if (!mapId) return null
  const cleanId = sanitizeMapId(mapId)

  // 1. Check session custom uploaded maps
  if (sessionCustomMaps.has(cleanId)) {
    return { payload: sessionCustomMaps.get(cleanId), source: 'custom' }
  }

  // 2. Check official built-in maps from src/maps/*.json
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
  if (sessionCustomMaps.has(cleanId)) {
    return { payload: sessionCustomMaps.get(cleanId), source: 'custom' }
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
  const characterStore = useCharacterStore()
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
    characterStore.waveConfigs = rawWaves.map((w: any) => ({
      ...w,
      characterModel: w.characterModel || 'male',
      unitSpeed: Number(w.unitSpeed) || 2.5,
      unitHp: Number(w.unitHp) || 100,
      unitCount: Number(w.unitCount) || 10,
      goldReward: Number(w.goldReward) || (Number(w.unitBonus) || 1),
    }))
  }

  // 3. Hydrate Towers & Clans
  const rawClans = data.towerData?.clans || project.clans || data.clans || []
  if (rawClans && rawClans.length > 0) {
    towerStore.clans = rawClans.map((c: any) => ({ ...c }))
  }

  const rawBlueprints = data.towerData?.towerBlueprints || data.towerBlueprints || project.towerBlueprints || []
  if (rawBlueprints && rawBlueprints.length > 0) {
    towerStore.blueprints = rawBlueprints.map((b: any) => ({ ...b }))
  }

  const rawPlacedTowers = data.towerData?.placedTowers || data.placedTowers || project.placedTowers || []
  if (rawPlacedTowers && rawPlacedTowers.length > 0) {
    towerStore.placedTowers = rawPlacedTowers.map((pt: any) => ({ ...pt }))
  }

  // 4. Hydrate Custom Routes & Waypoints
  const rawRoutes = data.characterData?.customRoutes || project.customRoutes || {}
  characterStore.customRoutes = JSON.parse(JSON.stringify(rawRoutes))

  const rawWaypoints = data.characterData?.customWaypoints || project.customWaypoints || {}
  characterStore.customWaypoints = JSON.parse(JSON.stringify(rawWaypoints))

  // 5. Hydrate Game Settings
  const settings = project.gameSettings || data.gameSettings
  if (settings) {
    if (settings.startingGold !== undefined) characterStore.startingGold = settings.startingGold
    if (settings.startingLives !== undefined) characterStore.startingLives = settings.startingLives
    if (settings.wavePrepTime !== undefined) characterStore.wavePrepDuration = settings.wavePrepTime
  }

  // 6. Assets
  if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
    assetStore.assets = data.assets.map((a: any) => ({ ...a }))
  }

  // 7. Store internal restore hooks
  towerStore.restoreFromProject()
  characterStore.restoreWavesFromProject()
  characterStore.detectDoors()
}
