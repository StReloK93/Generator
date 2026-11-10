import { MapGameMode } from '../../types/map'

/** Every genre a map can be made for, in the order the editor offers them. */
export const MAP_GAME_MODES: readonly MapGameMode[] = ['td', 'hideseek', 'hero']

/** Single owner of the "which game is this map" rule: maps without a known mode are tower defense. */
export function getMapMode(project: { gameMode?: MapGameMode } | null | undefined): MapGameMode {
  const mode = project?.gameMode
  return mode === 'hero' || mode === 'hideseek' ? mode : 'td'
}

/** What a genre's game reads from the map, so the editor only offers the tools and settings that genre uses. */
export interface MapModeEditorFeatures {
  /** Cells towers may be built on (only tower defense builds) */
  buildableZones: boolean
  /** 2x2 obstacle sub-cells the walkers bump into (hero pathfinding, hide & seek movement) */
  collision: boolean
  /** Routes: walked creep paths with a player base (TD), only their first cell as a spawn point (hide & seek), or none */
  routes: 'paths' | 'spawns' | 'none'
  /** Creeps walking the routes as a live preview in the editor */
  creepPreview: boolean
  /** Tower blueprints, clans and waves */
  towers: boolean
}

const EDITOR_FEATURES: Record<MapGameMode, MapModeEditorFeatures> = {
  td: { buildableZones: true, collision: false, routes: 'paths', creepPreview: true, towers: true },
  hideseek: { buildableZones: false, collision: true, routes: 'spawns', creepPreview: false, towers: false },
  hero: { buildableZones: false, collision: true, routes: 'none', creepPreview: false, towers: false },
}

export function getEditorFeatures(project: { gameMode?: MapGameMode } | null | undefined): MapModeEditorFeatures {
  return EDITOR_FEATURES[getMapMode(project)]
}

/** Starting size of a new map per genre (hide & seek matches the default labyrinth). */
export const DEFAULT_MAP_SIZE: Record<MapGameMode, number> = { td: 60, hideseek: 40, hero: 60 }
