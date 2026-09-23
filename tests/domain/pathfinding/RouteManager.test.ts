import { describe, it, expect } from 'vitest'
import { RouteManager } from '@/domain/pathfinding/RouteManager'

describe('RouteManager Domain Logic', () => {
  it('computeBlockedCells should include all route cells', () => {
    const customRoutes = {
      'route-1': [
        { col: 2, row: 4 }, // Spawn point (route[0])
        { col: 5, row: 4 },
        { col: 5, row: 10 },
      ],
      'route-2': [
        { col: 8, row: 8 }, // Spawn point (route[0])
        { col: 12, row: 8 },
      ],
    }

    const blocked = RouteManager.computeBlockedCells(customRoutes)

    // Route 1 spawn and cells
    expect(blocked.has('2,4')).toBe(true)
    expect(blocked.has('5,4')).toBe(true)
    expect(blocked.has('5,10')).toBe(true)

    // Route 2 spawn and cells
    expect(blocked.has('8,8')).toBe(true)
    expect(blocked.has('12,8')).toBe(true)

    // Unrelated cell should not be blocked
    expect(blocked.has('0,0')).toBe(false)
  })

  it('getRouteByKey should resolve route by exact route key and route[0] is spawn point', () => {
    const customRoutes = {
      'route-alpha': [
        { col: 3, row: 5 }, // Spawn
        { col: 10, row: 5 },
      ],
    }

    const route = RouteManager.getRouteByKey('route-alpha', customRoutes)
    expect(route).toHaveLength(2)
    expect(route[0]).toEqual({ col: 3, row: 5 }) // route[0] is the spawn point
  })

  it('getRouteByKey should return fallback single-cell route if key not found', () => {
    const route = RouteManager.getRouteByKey('non-existent', {})
    expect(route).toHaveLength(1)
    expect(route[0]).toEqual({ col: 2, row: 2 })
  })
})
