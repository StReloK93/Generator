import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  isBlockedAt,
  moveWithCollision,
  stepAlongPath,
  screenInputToGrid,
  canSee,
  isCaught,
  castVision,
  footstepLoudness,
  startMatchClock,
  advanceMatchClock,
  canAct,
  roleForSlot,
  pickChestSpots,
  findReachableChest,
  smoothPath,
  normalizeHideSeekSettings,
} from '@/domain/hideseek'
import labyrinth from '@/maps/Labyrinth.json'

const settings = normalizeHideSeekSettings({ visionRange: 7, visionAngle: 70, catchDistance: 0.9, hearingRange: 9 })

/** 6x6 map with one wall on the vertical line col = 2.5 (sub-column 5) */
function wallGrid() {
  const collisionSubcells: string[] = []
  for (let sr = 0; sr < 12; sr++) collisionSubcells.push(`5,${sr}`)
  return buildCollisionGrid({ cols: 6, rows: 6, collisionSubcells })
}

describe('HideSeekRules', () => {
  it('maps sub-cells to grid points and treats outside the map as solid', () => {
    const grid = wallGrid()
    expect(isBlockedAt(grid, 2.5, 1)).toBe(true)
    expect(isBlockedAt(grid, 2, 1)).toBe(false)
    expect(isBlockedAt(grid, -1, 1)).toBe(true)
  })

  it('stops movement at walls but slides along them', () => {
    const grid = wallGrid()
    const next = moveWithCollision(grid, { col: 1.5, row: 1 }, 2, 1)
    expect(next.col).toBeLessThan(2.25)
    expect(next.row).toBeGreaterThan(2.5)
  })

  it('keeps full running speed when sliding along a wall (diagonal screen input)', () => {
    const grid = wallGrid()
    const start = { col: 2, row: 4 }
    // Grid-diagonal step into the wall line at col 2.5: the whole step goes along the wall
    const next = moveWithCollision(grid, start, Math.SQRT1_2, -Math.SQRT1_2)
    expect(next.col).toBeLessThan(2.25)
    expect(Math.hypot(next.col - start.col, next.row - start.row)).toBeGreaterThan(0.95)
  })

  it('does not slide sideways when walking straight into a wall', () => {
    const grid = wallGrid()
    const next = moveWithCollision(grid, { col: 2, row: 4 }, 1, 0.1)
    expect(next.row).toBeLessThan(4.15)
  })

  it('walks a click-to-move path and drops reached waypoints', () => {
    const grid = buildCollisionGrid({ cols: 6, rows: 6, collisionSubcells: [] })
    const step = stepAlongPath(grid, { col: 1, row: 1 }, [{ col: 2, row: 1 }, { col: 2, row: 3 }], 1.5)
    expect(step.pos.col).toBeCloseTo(2)
    expect(step.pos.row).toBeCloseTo(1.5)
    expect(step.path).toEqual([{ col: 2, row: 3 }])
  })

  it('turns screen input into isometric grid directions', () => {
    const up = screenInputToGrid(0, -1)
    expect(up.col).toBeCloseTo(-Math.SQRT1_2)
    expect(up.row).toBeCloseTo(-Math.SQRT1_2)
    const right = screenInputToGrid(1, 0)
    expect(right.col).toBeCloseTo(Math.SQRT1_2)
    expect(right.row).toBeCloseTo(-Math.SQRT1_2)
  })

  it('sees only inside the forward cone (no eyes in the back) and never through walls', () => {
    const grid = buildCollisionGrid({ cols: 20, rows: 20, collisionSubcells: [] })
    const eye = { col: 5, row: 5 }
    expect(canSee(grid, eye, 0, { col: 10, row: 5 }, settings)).toBe(true) // straight ahead
    expect(canSee(grid, eye, 0, { col: 0, row: 5 }, settings)).toBe(false) // behind
    expect(canSee(grid, eye, 0, { col: 4.5, row: 5 }, settings)).toBe(false) // right behind
    expect(canSee(grid, eye, 0, { col: 15, row: 5 }, settings)).toBe(false) // too far

    const walled = wallGrid()
    expect(canSee(walled, { col: 1, row: 1 }, 0, { col: 4, row: 1 }, settings)).toBe(false)
  })

  it('casts a vision cone from the player whose rays stop at walls', () => {
    const grid = wallGrid()
    const cone = castVision(grid, { col: 1, row: 1 }, 0, settings)
    expect(cone[0]).toEqual({ col: 1, row: 1 })
    // Rays reveal at most a wall's thickness past the wall line (col 2.5), never the far side
    for (const p of cone.slice(1)) expect(p.col).toBeLessThan(2.75)
  })

  it('catches only at touching distance and with a clear line', () => {
    const grid = wallGrid()
    expect(isCaught(grid, { col: 1, row: 1 }, { col: 1.5, row: 1 }, settings)).toBe(true)
    expect(isCaught(grid, { col: 1, row: 1 }, { col: 3, row: 1 }, settings)).toBe(false)
  })

  it('makes footsteps louder up close and silent beyond hearing range', () => {
    expect(footstepLoudness(0, settings)).toBe(1)
    expect(footstepLoudness(3, settings)).toBeGreaterThan(footstepLoudness(6, settings))
    expect(footstepLoudness(9, settings)).toBe(0)
  })

  it('runs hiding -> seeking -> seeker wins when time runs out', () => {
    let clock = startMatchClock(settings)
    expect(clock.phase).toBe('hiding')
    expect(canAct('seeker', clock.phase)).toBe(false)
    expect(canAct('hider', clock.phase)).toBe(true)
    clock = advanceMatchClock(clock, settings.hideTime + 0.1, settings)
    expect(clock.phase).toBe('seeking')
    expect(clock.timeLeft).toBe(settings.roundTime)
    clock = advanceMatchClock(clock, settings.roundTime + 0.1, settings)
    expect(clock).toEqual({ phase: 'ended', timeLeft: 0, winner: 'seeker', reason: 'time' })
  })

  it('places spaced chests on free cells away from the spawns', () => {
    const grid = buildCollisionGrid({ cols: 20, rows: 20, collisionSubcells: [] })
    const spawn = { col: 10, row: 10 }
    const chests = pickChestSpots(grid, [spawn], 5, Math.random)
    expect(chests).toHaveLength(5)
    for (const c of chests) expect(Math.hypot(c.col - spawn.col, c.row - spawn.row)).toBeGreaterThanOrEqual(5)

    const states = chests.map(c => ({ ...c, opened: false }))
    expect(findReachableChest(chests[2], states)).toBe(2)
    states[2].opened = true
    expect(findReachableChest(chests[2], states)).toBe(-1)
  })

  it('places labyrinth chests only inside the walls, where players can walk', () => {
    const project = labyrinth.project
    const grid = buildCollisionGrid(project)
    const spawns = project.routes.map(r => r.routePoints[0])
    for (let run = 0; run < 20; run++) {
      for (const chest of pickChestSpots(grid, spawns, 5, Math.random)) {
        // The last row / column lies outside the outer wall
        expect(chest.col).toBeLessThan(project.cols - 1)
        expect(chest.row).toBeLessThan(project.rows - 1)
      }
    }
  })

  it('straightens zig-zag sub-cell paths into a few clear segments', () => {
    const grid = buildCollisionGrid({ cols: 10, rows: 10, collisionSubcells: [] })
    const zigzag = [
      { col: 1.5, row: 1 }, { col: 2, row: 1.5 }, { col: 2.5, row: 1.5 }, { col: 3, row: 2 },
      { col: 3.5, row: 2 }, { col: 4, row: 2.5 }, { col: 5, row: 3 },
    ]
    expect(smoothPath(grid, { col: 1, row: 1 }, zigzag)).toEqual([{ col: 5, row: 3 }])

    // A wall between start and goal keeps the detour waypoint
    const walled = wallGrid()
    const detour = smoothPath(walled, { col: 1, row: 1 }, [{ col: 2, row: 6.5 }, { col: 3.5, row: 6.5 }, { col: 4, row: 1 }])
    expect(detour.length).toBeGreaterThan(1)
  })

  it('gives the first slot the seeker role', () => {
    expect(roleForSlot(0)).toBe('seeker')
    expect(roleForSlot(1)).toBe('hider')
  })

  it('ships a labyrinth map whose spawns are free and every open cell is connected', () => {
    const project = labyrinth.project
    expect(project.gameMode).toBe('hideseek')
    const grid = buildCollisionGrid(project)
    const [seeker, hider] = project.routes.map(r => r.routePoints[0])
    expect(isBlockedAt(grid, seeker.col, seeker.row)).toBe(false)
    expect(isBlockedAt(grid, hider.col, hider.row)).toBe(false)

    // Flood fill over sub-cells from the seeker spawn
    const seen = new Set([`${seeker.col * 2},${seeker.row * 2}`])
    const queue = [[seeker.col * 2, seeker.row * 2]]
    while (queue.length) {
      const [sc, sr] = queue.shift()!
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${sc + dc},${sr + dr}`
        if (seen.has(key) || isBlockedAt(grid, (sc + dc) / 2, (sr + dr) / 2)) continue
        seen.add(key)
        queue.push([sc + dc, sr + dr])
      }
    }
    // Every maze cell center that is not a prop is reachable
    for (let col = 0; col < project.cols - 1; col++) {
      for (let row = 0; row < project.rows - 1; row++) {
        if (!isBlockedAt(grid, col, row)) expect(seen.has(`${col * 2},${row * 2}`)).toBe(true)
      }
    }
    expect(seen.has(`${hider.col * 2},${hider.row * 2}`)).toBe(true)
  })
})
