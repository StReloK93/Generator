import { MapGameMode } from '../../types/map'

/** Single owner of the "which game is this map" rule: maps without a known mode are tower defense. */
export function getMapMode(project: { gameMode?: MapGameMode } | null | undefined): MapGameMode {
  const mode = project?.gameMode
  return mode === 'hero' || mode === 'hideseek' ? mode : 'td'
}
