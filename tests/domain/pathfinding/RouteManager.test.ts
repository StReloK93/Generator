import { describe, it, expect } from 'vitest'
import { RouteManager } from '@/domain/pathfinding/RouteManager'
import { DoorInfo } from '@/stores/characterStore'

describe('RouteManager Domain Logic', () => {
  const mockDoors: DoorInfo[] = [
    {
      id: 'door-1',
      name: 'North Gate',
      col: 2,
      row: 3,
      spawnCol: 2,
      spawnRow: 4,
      targetCol: 10,
      targetRow: 10,
    },
    {
      id: 'door-2',
      name: 'South Gate',
      col: 8,
      row: 8,
      targetCol: 10,
      targetRow: 10,
    },
  ]

  it('computeBlockedCells should include all door cells, spawn cells, and custom route waypoints', () => {
    const customRoutes = {
      'door-1': [
        { col: 2, row: 4 },
        { col: 5, row: 4 },
        { col: 5, row: 10 },
      ],
    }

    const blocked = RouteManager.computeBlockedCells(mockDoors, customRoutes)

    // Door 1 base & spawn
    expect(blocked.has('2,3')).toBe(true)
    expect(blocked.has('2,4')).toBe(true)

    // Door 2 base
    expect(blocked.has('8,8')).toBe(true)

    // Route points
    expect(blocked.has('5,4')).toBe(true)
    expect(blocked.has('5,10')).toBe(true)

    // Unrelated cell should not be blocked
    expect(blocked.has('0,0')).toBe(false)
  })

  it('getRouteForDoor should resolve route by exact door ID', () => {
    const customRoutes = {
      'door-1': [
        { col: 2, row: 4 },
        { col: 6, row: 4 },
      ],
    }

    const route = RouteManager.getRouteForDoor(mockDoors[0], 0, customRoutes)
    expect(route).toEqual([
      { col: 2, row: 4 },
      { col: 6, row: 4 },
    ])
  })

  it('getRouteForDoor should fallback to single spawn cell if no custom route is configured', () => {
    const route = RouteManager.getRouteForDoor(mockDoors[0], 0, {})
    expect(route).toEqual([{ col: 2, row: 4 }])
  })

  it('getRouteForDoor should return empty array if door is undefined', () => {
    const route = RouteManager.getRouteForDoor(undefined, 0, {})
    expect(route).toEqual([])
  })
})
