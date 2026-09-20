import { describe, it, expect } from 'vitest'
import { DoorDetector } from '@/domain/pathfinding/DoorDetector'

describe('DoorDetector Domain Logic', () => {
  const cols = 20
  const rows = 20

  it('calculateQuadrant should determine correct quadrant and corner name', () => {
    // North quadrant (top-left in isometric grid)
    const q0 = DoorDetector.calculateQuadrant(2, 2, cols, rows)
    expect(q0.quadrant).toBe(0)
    expect(q0.cornerName).toContain('Circle 1')

    // East quadrant (top-right)
    const q1 = DoorDetector.calculateQuadrant(18, 2, cols, rows)
    expect(q1.quadrant).toBe(1)
    expect(q1.cornerName).toContain('Circle 2')

    // South quadrant (bottom-right)
    const q2 = DoorDetector.calculateQuadrant(18, 18, cols, rows)
    expect(q2.quadrant).toBe(2)
    expect(q2.cornerName).toContain('Circle 3')

    // West quadrant (bottom-left)
    const q3 = DoorDetector.calculateQuadrant(2, 18, cols, rows)
    expect(q3.quadrant).toBe(3)
    expect(q3.cornerName).toContain('Circle 4')
  })

  it('createSpawnPoint should initialize a complete valid DoorInfo object', () => {
    const spawn = DoorDetector.createSpawnPoint(5, 5, cols, rows, 0, 'Alpha Gate')
    expect(spawn.id).toBeDefined()
    expect(spawn.col).toBe(5)
    expect(spawn.row).toBe(5)
    expect(spawn.spawnCol).toBe(5)
    expect(spawn.spawnRow).toBe(5)
    expect(spawn.name).toBe('Alpha Gate')
    expect(spawn.quadrant).toBe(0)
  })
})
