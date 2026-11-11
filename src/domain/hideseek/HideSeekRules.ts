import { GridCoord, HideSeekSettings, MapProject } from '../../types/map'
import { CrowdSimulation } from '../simulation/CrowdSimulation'
import { AStarPathfinder } from '../pathfinding/AStarPathfinder'

export type HideSeekRole = 'seeker' | 'hider'
/** A round: hiding -> seeking -> roundOver (short break) -> next round ... -> ended after the last one */
export type HideSeekPhase = 'hiding' | 'seeking' | 'roundOver' | 'ended'

/** caught: every hider is in jail; altars: the hiders lit enough altars; time: the hiders ran out of time;
 * left: the other side left */
export type HideSeekEndReason = 'caught' | 'altars' | 'escaped' | 'time' | 'left' | 'survived'

// ==========================================
// Altars (the hiders' objective)
// ==========================================

export interface AltarState {
  col: number
  row: number
  /** 0..1 lit: hiders standing at it light it, a seeker standing at it while nobody lights it puts it out again */
  progress: number
  /** Fully lit: stays lit for the round */
  lit: boolean
}

/** Standing this close to an altar lights it (a hider) or puts it out (a seeker) */
export const ALTAR_REACH = 1.3
/** Objectives keep this far from the start points */
const OBJECTIVE_SPAWN_CLEARANCE = 6

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

/** Cell centers inside the playable maze (never outside the outer walls), at least `clearance` from `avoid`, shuffled. */
function freeCells(grid: CollisionGrid, spawns: GridCoord[], avoid: GridCoord[], clearance: number, random: () => number): GridCoord[] {
  const reachable = reachableSubCells(grid, spawns)
  const cells: GridCoord[] = []
  for (let col = 0; col < grid.subCols / 2; col++) {
    for (let row = 0; row < grid.subRows / 2; row++) {
      if (!reachable[row * 2 * grid.subCols + col * 2] || !bodyFits(grid, col, row)) continue
      if (avoid.some(a => Math.hypot(a.col - col, a.row - row) < clearance)) continue
      cells.push({ col, row })
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells
}

/** Takes `count` candidates in order, as far apart as possible (relaxing the spacing when the map is crowded). */
function spreadOut(candidates: GridCoord[], count: number, spacing: number): GridCoord[] {
  const picked: GridCoord[] = []
  for (const minGap of [spacing, 2, 0]) {
    for (const c of candidates) {
      if (picked.length >= count) return picked
      if (picked.includes(c)) continue
      if (picked.every(p => Math.hypot(p.col - c.col, p.row - c.row) >= minGap)) picked.push(c)
    }
  }
  return picked
}

/** Objectives keep this far from furniture, doors and candle stands */
const OBJECTIVE_PROP_CLEARANCE = 1.5

/**
 * Random free cells inside the playable maze (and inside `zone`), away from the spawns, from `props` and from each
 * other (`spacing`, relaxed when the map is crowded).
 */
export function pickObjectiveSpots(
  grid: CollisionGrid,
  spawns: GridCoord[],
  count: number,
  random: () => number,
  props: GridCoord[] = [],
  zone: (p: GridCoord) => boolean = () => true,
  spacing = 6
): GridCoord[] {
  const cells = freeCells(grid, spawns, spawns, OBJECTIVE_SPAWN_CLEARANCE, random).filter(
    c => zone(c) && !props.some(p => Math.hypot(p.col - c.col, p.row - c.row) < OBJECTIVE_PROP_CLEARANCE)
  )
  return spreadOut(cells, count, spacing)
}

const HIDE_SPOT_CLEARANCE = 3
const HIDE_SPOT_SPACING = 4

/** Walls touching a cell's four sides: 2+ = a corner, 3 = a dead end (where a barrel looks natural). */
function wallSides(grid: CollisionGrid, cell: GridCoord): number {
  return [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].filter(([dc, dr]) => isBlockedAt(grid, cell.col + dc, cell.row + dr)).length
}

/** Hiding spots (barrels, crates): corners and dead ends, away from the spawns, the chests and each other. */
export function pickHideSpots(grid: CollisionGrid, spawns: GridCoord[], avoid: GridCoord[], count: number, random: () => number): GridCoord[] {
  const corners = freeCells(grid, spawns, [...spawns, ...avoid], HIDE_SPOT_CLEARANCE, random)
    .filter(c => wallSides(grid, c) >= 2)
    .sort((a, b) => wallSides(grid, b) - wallSides(grid, a))
  return spreadOut(corners, count, HIDE_SPOT_SPACING)
}

/** An altar flaring up (fully lit) is heard across the whole maze: loud nearby, never fully silent. */
export function altarLoudness(distance: number, settings: HideSeekSettings): number {
  return Math.max(0.2, 1 - distance / (settings.hearingRange * 2.5))
}

/** An altar being lit only hums: heard within hearing range, silent beyond. */
export function altarHumLoudness(distance: number, settings: HideSeekSettings): number {
  return distance >= settings.hearingRange ? 0 : 1 - distance / settings.hearingRange
}

/** Players move while seeking; while hiding only the hiders do (the seeker waits with closed eyes). */
export function canAct(role: HideSeekRole, phase: HideSeekPhase): boolean {
  return phase === 'seeking' || (phase === 'hiding' && role === 'hider')
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

/** Pushing along a wall this much (share of the step) already slides at full speed; less slides slower, down to
 * the plain sideways part of the push (so a push straight into a wall barely moves along it) */
const SLIDE_FULL_SHARE = 0.7
const SLIDE_MIN_SHARE = 0.3

/** Corner help: walking into a wall this close beside an opening slips sideways into the opening */
const CORNER_REACH = 0.45
const CORNER_PROBE = 0.05

/**
 * Moves by (dCol, dRow) in small steps. When a step hits a wall:
 * - right beside an opening (a side corridor, a doorway) it slips sideways into it, so a turn does not need a
 *   pixel-exact line-up (corner help);
 * - otherwise it slides along the wall: fast when the push clearly goes along it, barely when it goes into it
 *   (a thumb pushing into a wall must not shoot the character off sideways, e.g. backwards).
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
    const corner = cornerSlip(grid, col, row, sc, sr, stepLen)
    if (corner) {
      col += corner.col
      row += corner.row
      continue
    }
    // Slide along the free axis (the one pushed harder first, when a corner leaves both free)
    const rowFree = sr !== 0 && bodyFits(grid, col, row + sr)
    const colFree = sc !== 0 && bodyFits(grid, col + sc, row)
    if (rowFree && (!colFree || Math.abs(sr) >= Math.abs(sc))) {
      row += Math.sign(sr) * slideLength(grid, col, row, 0, Math.sign(sr), Math.abs(sr), stepLen)
    } else if (colFree) {
      col += Math.sign(sc) * slideLength(grid, col, row, Math.sign(sc), 0, Math.abs(sc), stepLen)
    }
  }
  return { col, row }
}

/** How far one step slides along a wall: the push's own sideways part, up to the whole step when it clearly goes along */
function slideLength(grid: CollisionGrid, col: number, row: number, uc: number, ur: number, part: number, stepLen: number): number {
  const share = part / stepLen
  const boost = Math.min(1, Math.max(0, (share - SLIDE_MIN_SHARE) / (SLIDE_FULL_SHARE - SLIDE_MIN_SHARE)))
  const slide = Math.max(part, stepLen * boost)
  return bodyFits(grid, col + uc * slide, row + ur * slide) ? slide : part
}

/**
 * A step mostly into a wall, with an opening within CORNER_REACH to one side: the sideways move toward that
 * opening (the side the push leans to is tried first). Null when there is no opening close by.
 */
function cornerSlip(grid: CollisionGrid, col: number, row: number, sc: number, sr: number, stepLen: number): GridCoord | null {
  const alongCol = Math.abs(sc) >= Math.abs(sr)
  // Only a push mostly along one axis gets help (a diagonal push slides instead)
  if ((alongCol ? Math.abs(sr) : Math.abs(sc)) > stepLen * SLIDE_MIN_SHARE) return null
  const fwd = alongCol ? { col: Math.sign(sc) * stepLen, row: 0 } : { col: 0, row: Math.sign(sr) * stepLen }
  const lean = Math.sign(alongCol ? sr : sc) || 1
  for (let d = CORNER_PROBE; d <= CORNER_REACH + 1e-9; d += CORNER_PROBE) {
    for (const side of [lean, -lean]) {
      const oc = alongCol ? 0 : side * d
      const or = alongCol ? side * d : 0
      if (!bodyFits(grid, col + oc, row + or) || !bodyFits(grid, col + oc + fwd.col, row + or + fwd.row)) continue
      // The way sideways must be open too (no slipping through a wall corner)
      if (!sidewaysClear(grid, col, row, oc, or)) continue
      const slip = Math.min(stepLen, d)
      return { col: Math.sign(oc) * slip, row: Math.sign(or) * slip }
    }
  }
  return null
}

function sidewaysClear(grid: CollisionGrid, col: number, row: number, oc: number, or: number): boolean {
  const n = Math.ceil(Math.hypot(oc, or) / CORNER_PROBE)
  for (let i = 1; i < n; i++) if (!bodyFits(grid, col + (oc * i) / n, row + (or * i) / n)) return false
  return true
}

/** The nearest spot a body fits at (itself when it already does): someone who came up inside a wall steps out. */
export function nearestFreeSpot(grid: CollisionGrid, p: GridCoord): GridCoord {
  if (bodyFits(grid, p.col, p.row)) return { col: p.col, row: p.row }
  for (let r = 0.25; r <= 6; r += 0.25) {
    const steps = Math.max(8, Math.round(r * 16))
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const at = { col: p.col + Math.cos(a) * r, row: p.row + Math.sin(a) * r }
      if (bodyFits(grid, at.col, at.row)) return at
    }
  }
  return { col: p.col, row: p.row }
}

function isSubCellWalkable(grid: CollisionGrid, subCol: number, subRow: number): boolean {
  if (subCol < 0 || subRow < 0 || subCol >= grid.subCols || subRow >= grid.subRows) return false
  return grid.blocked[subRow * grid.subCols + subCol] === 0
}

/** Path around the walls from `from` to `to`, straightened into a few clear segments (empty when unreachable). */
export function findWalkPath(grid: CollisionGrid, from: GridCoord, to: GridCoord): GridCoord[] {
  const path = AStarPathfinder.findPath(from, to, grid.subCols / 2, grid.subRows / 2, (sc, sr) => isSubCellWalkable(grid, sc, sr))
  // The first waypoint is the sub-cell we are standing on
  return smoothPath(grid, from, path.slice(1))
}

/**
 * Walks up to `distance` tiles along a waypoint path at a steady pace, like the Hero mode: the path is already
 * clear of walls, so there is no collision pushing (no stalls or squeezing at corners).
 * Returns the new position, the remaining waypoints and the heading (null when nothing moved).
 */
export function stepAlongPath(
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
    if (dist <= remaining) {
      current = target
      remaining -= dist
      rest.shift()
    } else {
      current = { col: current.col + (dx / dist) * remaining, row: current.row + (dy / dist) * remaining }
      remaining = 0
    }
  }
  return { pos: current, path: rest, facing }
}

/** Steering this close (in angle) to a grid axis runs straight along it: the maze's corridors follow the axes */
const AXIS_SNAP = (22 * Math.PI) / 180

/**
 * Converts a screen-space input (x right, y down, length <= 1) into a grid-space direction that moves the
 * character the same way on screen (2:1 isometric: a grid axis is drawn ~27° from horizontal). Within AXIS_SNAP
 * of a grid axis it snaps onto the axis, so both a thumb following a corridor as drawn and a 45° push (W+D) run
 * straight down it.
 */
export function screenInputToGrid(x: number, y: number): GridCoord {
  const strength = Math.min(1, Math.hypot(x, y))
  if (strength < 1e-6) return { col: 0, row: 0 }
  // Inverse of the 2:1 projection: screen x = (col - row), screen y = (col + row) / 2
  const angle = Math.atan2(2 * y - x, x + 2 * y)
  const axis = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
  const heading = Math.abs(angle - axis) <= AXIS_SNAP ? axis : angle
  return { col: Math.cos(heading) * strength, row: Math.sin(heading) * strength }
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

/** Rays of a light around `origin` (a candle stand): a polygon stopped by the walls, origin first. */
export function castGlow(grid: CollisionGrid, origin: GridCoord, radius: number, steps = 96): GridCoord[] {
  const glow: GridCoord[] = [origin]
  for (let i = 0; i <= steps; i++) glow.push(castRay(grid, origin, (2 * Math.PI * i) / steps, radius))
  return glow
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
 * What a player sees: the cone in front of them (no eyes in the back), plus a small circle all around
 * (`aroundRadius`: the lantern's glow), stopped by walls.
 * One grid-space polygon starting at the player: cone and circle share that point, so each direction keeps its longer ray.
 */
export function castVision(grid: CollisionGrid, origin: GridCoord, facing: number, settings: HideSeekSettings, aroundRadius = 0): GridCoord[] {
  const half = (settings.visionAngle * Math.PI) / 360
  const sight: GridCoord[] = [origin]
  if (aroundRadius <= 0) {
    const steps = Math.max(8, Math.ceil(settings.visionAngle))
    for (let i = 0; i <= steps; i++) sight.push(castRay(grid, origin, facing - half + (2 * half * i) / steps, settings.visionRange))
    return sight
  }
  const steps = 360
  for (let i = 0; i <= steps; i++) {
    const angle = facing - Math.PI + (2 * Math.PI * i) / steps
    const reach = Math.max(aroundRadius, angleDiff(angle, facing) <= half ? settings.visionRange : 0)
    sight.push(castRay(grid, origin, angle, reach))
  }
  return sight
}

/** How far a player sees in the direction of `target`: the cone's range inside the cone, the glow all around elsewhere. */
export function sightReach(observer: GridCoord, facing: number, target: GridCoord, settings: HideSeekSettings, aroundRadius = 0): number {
  const angle = Math.atan2(target.row - observer.row, target.col - observer.col)
  const inCone = angleDiff(angle, facing) <= (settings.visionAngle * Math.PI) / 360
  return Math.max(aroundRadius, inCone ? settings.visionRange : 0)
}

/** Inside the sight cone, or within `aroundRadius` all around, and not behind a wall. */
export function canSee(
  grid: CollisionGrid,
  observer: GridCoord,
  facing: number,
  target: GridCoord,
  settings: HideSeekSettings,
  aroundRadius = 0
): boolean {
  const dist = Math.hypot(target.col - observer.col, target.row - observer.row)
  return dist <= sightReach(observer, facing, target, settings, aroundRadius) && hasLineOfSight(grid, observer, target)
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
