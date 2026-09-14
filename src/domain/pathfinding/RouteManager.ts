import { GridCoord } from '../../types/map'
import { DoorInfo } from '../../stores/characterStore'

export class RouteManager {
  /**
   * Builds the set of blocked cell coordinates that cannot be built on (doors + path cells).
   */
  public static computeBlockedCells(
    doors: DoorInfo[],
    customRoutes?: Record<string, GridCoord[]> | null,
    projectRoutes?: Record<string, GridCoord[]> | null
  ): Set<string> {
    const set = new Set<string>()

    // 1. Spawn points / doors
    for (const d of doors) {
      set.add(`${d.col},${d.row}`)
      if (d.spawnCol !== undefined && d.spawnRow !== undefined) {
        set.add(`${d.spawnCol},${d.spawnRow}`)
      }
    }

    // 2. Custom routes
    if (customRoutes) {
      for (const route of Object.values(customRoutes)) {
        if (Array.isArray(route)) {
          for (const pt of route) {
            set.add(`${pt.col},${pt.row}`)
          }
        }
      }
    }

    // 3. Project routes fallback
    if (projectRoutes) {
      for (const route of Object.values(projectRoutes)) {
        if (Array.isArray(route)) {
          for (const pt of route) {
            set.add(`${pt.col},${pt.row}`)
          }
        }
      }
    }

    return set
  }

  /**
   * Resolves the active route for a given door.
   */
  public static getRouteForDoor(
    door: DoorInfo | undefined,
    doorIdx: number,
    customRoutes: Record<string, GridCoord[]>
  ): GridCoord[] {
    if (!door) return []
    const doorKey = door.id || `door-${doorIdx}`

    if (customRoutes[doorKey] && customRoutes[doorKey].length > 0) {
      return customRoutes[doorKey]
    }

    return [{ col: door.spawnCol ?? door.col, row: door.spawnRow ?? door.row }]
  }
}
