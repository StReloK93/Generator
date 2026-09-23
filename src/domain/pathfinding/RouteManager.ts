import { GridCoord } from '../../types/map'

export class RouteManager {
  /**
   * Computes the set of cell coordinates blocked for building (all cells in all routes).
   */
  public static computeBlockedCells(
    customRoutes?: Record<string, GridCoord[]> | null,
    projectRoutes?: Record<string, GridCoord[]> | null
  ): Set<string> {
    const set = new Set<string>()

    const addRoutes = (routesMap?: Record<string, GridCoord[]> | null) => {
      if (!routesMap) return
      for (const route of Object.values(routesMap)) {
        if (Array.isArray(route)) {
          for (const pt of route) {
            set.add(`${pt.col},${pt.row}`)
          }
        }
      }
    }

    addRoutes(customRoutes)
    addRoutes(projectRoutes)

    return set
  }

  /**
   * Resolves the route by route ID or index.
   * If not found, returns a default 1-cell route at fallback [2,2].
   */
  public static getRouteByKey(
    routeKey: string,
    customRoutes: Record<string, GridCoord[]>
  ): GridCoord[] {
    if (customRoutes && customRoutes[routeKey] && customRoutes[routeKey].length > 0) {
      return customRoutes[routeKey]
    }
    return [{ col: 2, row: 2 }]
  }
}

