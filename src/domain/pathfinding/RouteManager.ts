import { GridCoord, RouteInfo } from '../../types/map'

export class RouteManager {
  /**
   * Computes the set of cell coordinates blocked for building (all cells in all routes).
   */
  public static computeBlockedCells(
    customRoutes?: Record<string, GridCoord[]> | RouteInfo[] | null,
    projectRoutes?: Record<string, GridCoord[]> | RouteInfo[] | null
  ): Set<string> {
    const set = new Set<string>()

    const addRoutes = (routesInput?: Record<string, GridCoord[]> | RouteInfo[] | null) => {
      if (!routesInput) return
      if (Array.isArray(routesInput)) {
        for (const item of routesInput) {
          if (Array.isArray(item)) {
            for (const pt of item) {
              set.add(`${pt.col},${pt.row}`)
            }
          } else if (item && Array.isArray((item as any).routePoints)) {
            for (const pt of (item as any).routePoints) {
              set.add(`${pt.col},${pt.row}`)
            }
          }
        }
      } else {
        for (const route of Object.values(routesInput)) {
          if (Array.isArray(route)) {
            for (const pt of route) {
              set.add(`${pt.col},${pt.row}`)
            }
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

