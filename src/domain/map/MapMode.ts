import { MapGameMode } from '../../types/map'

/** Single owner of the "which game is this map" rule: maps without a mode are tower defense. */
export function getMapMode(project: { gameMode?: MapGameMode } | null | undefined): MapGameMode {
  return project?.gameMode === 'hero' ? 'hero' : 'td'
}
