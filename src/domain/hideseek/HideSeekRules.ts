import { GridCoord, HideSeekSettings, MapProject } from '../../types/map'
import { CrowdSimulation } from '../simulation/CrowdSimulation'

export type HideSeekRole = 'seeker' | 'hider'
export type HideSeekPhase = 'hiding' | 'seeking' | 'ended'

/** caught: the seeker reached the hider; chests: the hider opened every chest; time: the hider ran out of time */
export type HideSeekEndReason = 'caught' | 'chests' | 'time' | 'left'

export interface HideSeekMatchClock {
  phase: HideSeekPhase
  timeLeft: number
  winner: HideSeekRole | null
  reason: HideSeekEndReason | null
}

/** The first lobby slot (the map's first route) seeks, every other slot hides. */
export function roleForSlot(slotIndex: number): HideSeekRole {
  return slotIndex === 0 ? 'seeker' : 'hider'
}

export function startMatchClock(settings: HideSeekSettings): HideSeekMatchClock {
  return { phase: 'hiding', timeLeft: settings.hideTime, winner: null, reason: null }
}

/** Hiding time runs out -> seeking starts; seeking time runs out -> the hider failed to open the chests. */
export function advanceMatchClock(clock: HideSeekMatchClock, deltaSec: number, settings: HideSeekSettings): HideSeekMatchClock {
  if (clock.phase === 'ended') return clock
  const timeLeft = clock.timeLeft - deltaSec
  if (timeLeft > 0) return { ...clock, timeLeft }
  if (clock.phase === 'hiding') return { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
  return endMatchClock('seeker', 'time')
}

export function endMatchClock(winner: HideSeekRole, reason: HideSeekEndReason): HideSeekMatchClock {
  return { phase: 'ended', timeLeft: 0, winner, reason }
}

// ==========================================
// Treasure chests (the hider's objective)
// ==========================================

export interface ChestState {
  col: number
  row: number
  opened: boolean
}

const CHEST_OPEN_RADIUS = 0.7
const CHEST_SPAWN_CLEARANCE = 5
const CHEST_SPACING = 4

/** Random free cells away from the spawns and from each other. */
/** Sub-cells a player can walk to from any of the given points (flood fill). 1 = reachable. */
export function reachableSubCells(grid: CollisionGrid, from: GridCoord[]): Uint8Array {
  const reached = new Uint8Array(grid.subCols * grid.subRows)
  const queue: number[] = []
  for (const p of from) {
    const sc = Math.round(p.col * 2)
    const sr = Math.round(p.row * 2)
    if (!isSubCellWalkable(grid, sc, sr) || reached[sr * grid.subCols + sc]) continue
    reached[sr * grid.subCols + sc] = 1
    queue.push(sc, sr)
  }
  for (let i = 0; i < queue.length; i += 2) {
    const sc = queue[i]
    const sr = queue[i + 1]
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = sc + dc
      const nr = sr + dr
      if (!isSubCellWalkable(grid, nc, nr) || reached[nr * grid.subCols + nc]) continue
      reached[nr * grid.subCols + nc] = 1
      queue.push(nc, nr)
    }
  }
  return reached
}

/** Random free cells inside the playable maze, away from the spawns and from each other. */
export function pickChestSpots(grid: CollisionGrid, spawns: GridCoord[], count: number, random: () => number): GridCoord[] {
  // Only where players can actually walk (never outside the outer walls)
  const reachable = reachableSubCells(grid, spawns)
  const candidates: GridCoord[] = []
  for (let col = 0; col < grid.subCols / 2; col++) {
    for (let row = 0; row < grid.subRows / 2; row++) {
      if (!reachable[row * 2 * grid.subCols + col * 2] || !bodyFits(grid, col, row)) continue
      if (spawns.some(s => Math.hypot(s.col - col, s.row - row) < CHEST_SPAWN_CLEARANCE)) continue
      candidates.push({ col, row })
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const picked: GridCoord[] = []
  for (const spacing of [CHEST_SPACING, 2, 0]) {
    for (const c of candidates) {
      if (picked.length >= count) return picked
      if (picked.includes(c)) continue
      if (picked.every(p => Math.hypot(p.col - c.col, p.row - c.row) >= spacing)) picked.push(c)
    }
  }
  return picked
}

/** Index of a closed chest within reach, or -1. */
export function findReachableChest(pos: GridCoord, chests: ChestState[]): number {
  return chests.findIndex(c => !c.opened && Math.hypot(c.col - pos.col, c.row - pos.row) <= CHEST_OPEN_RADIUS)
}

/** Opening a chest rings across the whole maze: loud nearby, never fully silent. */
export function chestChimeLoudness(distance: number, settings: HideSeekSettings): number {
  return Math.max(0.2, 1 - distance / (settings.hearingRange * 2.5))
}

/** The seeker is frozen with closed eyes while the hider looks for a spot. */
export function canAct(role: HideSeekRole, phase: HideSeekPhase): boolean {
  if (phase === 'ended') return false
  return !(role === 'seeker' && phase === 'hiding')
}

// ==========================================
// Collision grid (map 2x2 sub-cells)
// ==========================================

export interface CollisionGrid {
  subCols: number
  subRows: number
  blocked: Uint8Array
}

export function buildCollisionGrid(project: Pick<MapProject, 'cols' | 'rows' | 'collisionSubcells'>): CollisionGrid {
  const subCols = project.cols * 2
  const subRows = project.rows * 2
  const blocked = new Uint8Array(subCols * subRows)
  for (const key of project.collisionSubcells || []) {
    const [sc, sr] = key.split(',').map(Number)
    if (sc >= 0 && sr >= 0 && sc < subCols && sr < subRows) blocked[sr * subCols + sc] = 1
  }
  return { subCols, subRows, blocked }
}

/** Sub-cell (sc, sr) is centered on grid point (sc / 2, sr / 2); outside the map is solid. */
export function isBlockedAt(grid: CollisionGrid, col: number, row: number): boolean {
  const sc = Math.round(col * 2)
  const sr = Math.round(row * 2)
  if (sc < 0 || sr < 0 || sc >= grid.subCols || sr >= grid.subRows) return true
  return grid.blocked[sr * grid.subCols + sc] === 1
}

const BODY_RADIUS = 0.18

/** Clearance kept from walls when walking a click-to-move path, so it never scrapes corners */
const PATH_CLEARANCE = 0.24

function fitsWithRadius(grid: CollisionGrid, col: number, row: number, radius: number): boolean {
  return (
    !isBlockedAt(grid, col - radius, row - radius) &&
    !isBlockedAt(grid, col + radius, row - radius) &&
    !isBlockedAt(grid, col - radius, row + radius) &&
    !isBlockedAt(grid, col + radius, row + radius)
  )
}

function bodyFits(grid: CollisionGrid, col: number, row: number): boolean {
  return fitsWithRadius(grid, col, row, BODY_RADIUS)
}

function segmentClear(grid: CollisionGrid, a: GridCoord, b: GridCoord): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.col - a.col, b.row - a.row) / 0.1))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    if (!fitsWithRadius(grid, a.col + (b.col - a.col) * t, a.row + (b.row - a.row) * t, PATH_CLEARANCE)) return false
  }
  return true
}

/**
 * Straightens a grid path (string pulling): from each point jump to the farthest waypoint that can be
 * reached in a straight line with wall clearance. Removes the zig-zag and corner scraping of sub-cell paths.
 */
export function smoothPath(grid: CollisionGrid, start: GridCoord, path: GridCoord[]): GridCoord[] {
  const result: GridCoord[] = []
  let from = start
  let i = 0
  while (i < path.length) {
    let next = i
    for (let j = path.length - 1; j > i; j--) {
      if (segmentClear(grid, from, path[j])) {
        next = j
        break
      }
    }
    result.push(path[next])
    from = path[next]
    i = next + 1
  }
  return result
}

/** A blocked axis hands its speed to the free one only when the free axis is a real part of the move */
const SLIDE_MIN_SHARE = 0.3

/**
 * Moves by (dCol, dRow) in small steps, sliding along walls at full speed: when one axis is blocked,
 * the whole step goes along the other axis. (Screen-relative input is diagonal on the grid while the
 * corridors are grid-aligned, so plain axis clipping would make running along a wall ~30% slower.)
 */
export function moveWithCollision(grid: CollisionGrid, pos: GridCoord, dCol: number, dRow: number): GridCoord {
  const length = Math.hypot(dCol, dRow)
  const steps = Math.max(1, Math.ceil(length / 0.1))
  const stepLen = length / steps
  const sc = dCol / steps
  const sr = dRow / steps
  let { col, row } = pos

  for (let i = 0; i < steps; i++) {
    if (bodyFits(grid, col + sc, row + sr)) {
      col += sc
      row += sr
      continue
    }
    const colFree = bodyFits(grid, col + sc, row)
    const rowFree = bodyFits(grid, col, row + sr)
    if (rowFree && Math.abs(sr) >= stepLen * SLIDE_MIN_SHARE) {
      const slide = Math.sign(sr) * stepLen
      row += bodyFits(grid, col, row + slide) ? slide : sr
    } else if (colFree && Math.abs(sc) >= stepLen * SLIDE_MIN_SHARE) {
      const slide = Math.sign(sc) * stepLen
      col += bodyFits(grid, col + slide, row) ? slide : sc
    } else if (rowFree) {
      row += sr
    } else if (colFree) {
      col += sc
    }
  }
  return { col, row }
}

export function isSubCellWalkable(grid: CollisionGrid, subCol: number, subRow: number): boolean {
  if (subCol < 0 || subRow < 0 || subCol >= grid.subCols || subRow >= grid.subRows) return false
  return grid.blocked[subRow * grid.subCols + subCol] === 0
}

/**
 * Walks up to `distance` tiles along a waypoint path (click / tap to move).
 * Returns the new position, the remaining waypoints and the heading (null when nothing moved).
 */
export function stepAlongPath(
  grid: CollisionGrid,
  pos: GridCoord,
  path: GridCoord[],
  distance: number
): { pos: GridCoord; path: GridCoord[]; facing: number | null } {
  let current = pos
  let remaining = distance
  let facing: number | null = null
  const rest = [...path]

  while (remaining > 1e-4 && rest.length > 0) {
    const target = rest[0]
    const dx = target.col - current.col
    const dy = target.row - current.row
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-3) {
      rest.shift()
      continue
    }
    facing = Math.atan2(dy, dx)
    const step = Math.min(remaining, dist)
    const next = moveWithCollision(grid, current, (dx / dist) * step, (dy / dist) * step)
    const moved = Math.hypot(next.col - current.col, next.row - current.row)
    current = next
    remaining -= step
    if (step >= dist - 1e-4 && moved >= dist - 0.05) rest.shift()
    // Blocked by a wall corner: give up the path instead of pushing forever
    if (moved < step * 0.1) return { pos: current, path: [], facing }
  }
  return { pos: current, path: rest, facing }
}

/**
 * Converts a screen-space input (x right, y down, length <= 1) into a grid-space direction:
 * on the 2:1 isometric grid "screen up" is (-1, -1) and "screen right" is (+1, -1).
 */
export function screenInputToGrid(x: number, y: number): GridCoord {
  const col = x + y
  const row = y - x
  const len = Math.hypot(col, row)
  if (len < 1e-6) return { col: 0, row: 0 }
  const strength = Math.min(1, Math.hypot(x, y))
  return { col: (col / len) * strength, row: (row / len) * strength }
}

/** Sprite direction (0-7) for a grid-space facing angle. */
export function directionForFacing(facing: number, tileWidth: number, tileHeight: number): number {
  return CrowdSimulation.calculateDirection(0, 0, Math.cos(facing), Math.sin(facing), tileWidth, tileHeight)
}

// ==========================================
// Vision & hearing
// ==========================================

/** Rays continue a little into the wall they hit so its face is revealed, not cut by the fog. */
const WALL_REVEAL = 0.3

/**
 * Exact distance to the first solid sub-cell along a ray (grid traversal, no stepping), so the
 * sight edges move smoothly with the player instead of jumping between samples.
 */
function rayHitDistance(grid: CollisionGrid, origin: GridCoord, dx: number, dy: number, maxLen: number): number {
  // Sub-cell space: sub-cell s covers [s, s + 1) where u = col * 2 + 0.5
  const ux = origin.col * 2 + 0.5
  const uy = origin.row * 2 + 0.5
  let sc = Math.floor(ux)
  let sr = Math.floor(uy)
  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1
  // Ray length in grid units per sub-cell crossed (one sub-cell = 0.5 grid units)
  const tDeltaX = dx !== 0 ? Math.abs(0.5 / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(0.5 / dy) : Infinity
  let tMaxX = dx !== 0 ? ((dx > 0 ? sc + 1 - ux : ux - sc) * 0.5) / Math.abs(dx) : Infinity
  let tMaxY = dy !== 0 ? ((dy > 0 ? sr + 1 - uy : uy - sr) * 0.5) / Math.abs(dy) : Infinity

  for (;;) {
    let t: number
    if (tMaxX < tMaxY) {
      t = tMaxX
      tMaxX += tDeltaX
      sc += stepX
    } else {
      t = tMaxY
      tMaxY += tDeltaY
      sr += stepY
    }
    if (t >= maxLen) return maxLen
    if (!isSubCellWalkable(grid, sc, sr)) return t
  }
}

function castRay(grid: CollisionGrid, origin: GridCoord, angle: number, maxLen: number): GridCoord {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const hit = rayHitDistance(grid, origin, dx, dy, maxLen)
  const reach = hit < maxLen ? Math.min(maxLen, hit + WALL_REVEAL) : maxLen
  return { col: origin.col + dx * reach, row: origin.row + dy * reach }
}

export function hasLineOfSight(grid: CollisionGrid, a: GridCoord, b: GridCoord): boolean {
  const dist = Math.hypot(b.col - a.col, b.row - a.row)
  if (dist < 1e-6) return true
  return rayHitDistance(grid, a, (b.col - a.col) / dist, (b.row - a.row) / dist, dist) >= dist
}

/** Turns an angle towards a target by at most `maxStep` radians (shortest way round). */
export function turnTowards(current: number, target: number, maxStep: number): number {
  let d = (target - current) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep
}

function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d)
}

/**
 * What a player sees: only the cone in front of them (no eyes in the back), stopped by walls.
 * Grid-space polygon starting at the player.
 */
export function castVision(grid: CollisionGrid, origin: GridCoord, facing: number, settings: HideSeekSettings): GridCoord[] {
  const half = (settings.visionAngle * Math.PI) / 360
  const steps = Math.max(8, Math.ceil(settings.visionAngle))
  const cone: GridCoord[] = [origin]
  for (let i = 0; i <= steps; i++) {
    cone.push(castRay(grid, origin, facing - half + (2 * half * i) / steps, settings.visionRange))
  }
  return cone
}

export function canSee(
  grid: CollisionGrid,
  observer: GridCoord,
  facing: number,
  target: GridCoord,
  settings: HideSeekSettings
): boolean {
  const dist = Math.hypot(target.col - observer.col, target.row - observer.row)
  if (dist > settings.visionRange) return false
  const angle = Math.atan2(target.row - observer.row, target.col - observer.col)
  if (angleDiff(angle, facing) > (settings.visionAngle * Math.PI) / 360) return false
  return hasLineOfSight(grid, observer, target)
}

/** The seeker catches the hider by reaching them (not through a wall). */
export function isCaught(grid: CollisionGrid, seeker: GridCoord, hider: GridCoord, settings: HideSeekSettings): boolean {
  const dist = Math.hypot(hider.col - seeker.col, hider.row - seeker.row)
  return dist <= settings.catchDistance && hasLineOfSight(grid, seeker, hider)
}

/** 0..1 loudness of footsteps heard from `distance` tiles away (0 beyond hearing range). */
export function footstepLoudness(distance: number, settings: HideSeekSettings): number {
  if (distance >= settings.hearingRange) return 0
  return Math.pow(1 - distance / settings.hearingRange, 1.5)
}

/** Seconds between two footsteps at the given speed (slower walk, slower steps). */
export function footstepInterval(speed: number): number {
  return Math.max(0.22, 1.1 / Math.max(0.5, speed))
}
