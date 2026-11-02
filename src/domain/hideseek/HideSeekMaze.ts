import { GridCoord } from '../../types/map'
import { CollisionGrid } from './HideSeekRules'

/**
 * Random hide & seek labyrinth (pure, seeded: every client builds the same maze from the host's seed).
 * Maze cells are 2x2 map cells (corridors two tiles wide). Rooms are carved into the maze: their walls keep a
 * couple of entrances (some get doors), a short partition inside makes a corner you cannot see into from the
 * door, cabinets stand in room corners and barrels in corridor dead ends. Crawl holes are shortcuts only hiders
 * squeeze through; candle stands light up a few places.
 */

/** Sprite suffix of a prop = the way its front faces: E +col, W -col, S +row, N -row */
export type SpriteFacing = 'E' | 'N' | 'S' | 'W'
export type HideSpotKind = 'barrel' | 'cabinet'

/** A place a hider can hide in. */
export interface HideSpot extends GridCoord {
  kind: HideSpotKind
  facing: SpriteFacing
}

/** One wall piece on a cell edge: 'v' = the line col - 0.5 beside map row `row`; 'h' = the line row - 0.5 over map col `col`. */
export interface MazeEdge {
  col: number
  row: number
  axis: 'v' | 'h'
}

/** A (double) door across a room entrance: closed it blocks walking and sight. */
export interface MazeDoor {
  edges: MazeEdge[]
  center: GridCoord
}

/** An exit gate in the outer wall; `at` is the spot just inside it a hider has to reach. */
export interface MazeExit {
  edges: MazeEdge[]
  at: GridCoord
}

export interface HideSeekMaze {
  seed: number
  cols: number
  rows: number
  walls: MazeEdge[]
  /** Crawl holes: hiders get through, the seeker does not; nobody sees through */
  holes: MazeEdge[]
  doors: MazeDoor[]
  /** Exit gates (shut ones block like walls) */
  exits: MazeExit[]
  spots: HideSpot[]
  /** Candle stands (light sources) */
  torches: GridCoord[]
  /** Seeker first, then the hiders */
  spawns: GridCoord[]
}

export interface MazeOptions {
  cols: number
  rows: number
  roomCount: number
  doorCount: number
  holeCount: number
  torchCount: number
  hideSpotCount: number
  exitCount: number
}

const CELL = 2
/** Extra openings in the corridors so there are loops to run around */
const BRAID_CHANCE = 0.12
const ROOM_MIN = 2
const ROOM_MAX = 4
/** Entrances a room keeps (the rest of the maze passages into it are walled up) */
const ROOM_ENTRANCES = 2
/** A crawl hole only where it saves a long walk (maze steps between its two sides) */
const HOLE_MIN_DETOUR = 10
const HOLE_SPACING = 6
/** Share of the hiding spots that are cabinets in rooms (the rest are barrels in the corridors) */
const CABINET_SHARE = 0.6
const SPOT_SPACING = 4
const SPOT_SPAWN_CLEARANCE = 4
const TORCH_SPACING = 7
const TORCH_SPAWN_CLEARANCE = 5
/** Exit gates keep this many maze cells away from the corners */
const EXIT_CORNER_GAP = 2

/** Small fast seeded random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A wall between two maze cells: 'e' = between (x, y) and (x + 1, y); 's' = between (x, y) and (x, y + 1) */
interface CellWall {
  type: 'e' | 's'
  x: number
  y: number
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

const edgeKey = (e: MazeEdge) => `${e.axis}${e.col},${e.row}`
const near = (a: GridCoord, b: GridCoord, distance: number) => Math.hypot(a.col - b.col, a.row - b.row) < distance

export function generateMaze(seed: number, options: MazeOptions): HideSeekMaze {
  const random = seededRandom(seed)
  const W = Math.max(4, Math.floor(options.cols / CELL))
  const H = Math.max(4, Math.floor(options.rows / CELL))
  const east = Array.from({ length: W }, () => Array<boolean>(H).fill(true))
  const south = Array.from({ length: W }, () => Array<boolean>(H).fill(true))
  const isOpen = (w: CellWall) => !(w.type === 'e' ? east : south)[w.x][w.y]
  const setOpen = (w: CellWall, open: boolean) => {
    ;(w.type === 'e' ? east : south)[w.x][w.y] = !open
  }
  const across = (w: CellWall): [number, number] => (w.type === 'e' ? [w.x + 1, w.y] : [w.x, w.y + 1])

  // Rooms (never on the outer ring or next to the central plaza where everyone starts)
  const mid = Math.floor(W / 2)
  const plaza: Rect = { x: mid - 1, y: Math.floor(H / 2) - 1, w: 2, h: 2 }
  const rooms: Rect[] = []
  const touches = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
  for (let tries = 0; rooms.length < options.roomCount && tries < options.roomCount * 60; tries++) {
    const w = ROOM_MIN + Math.floor(random() * (ROOM_MAX - ROOM_MIN + 1))
    const h = ROOM_MIN + Math.floor(random() * (ROOM_MAX - ROOM_MIN + 1))
    if (w + 2 > W || h + 2 > H) continue
    const room = { x: 1 + Math.floor(random() * (W - w - 1)), y: 1 + Math.floor(random() * (H - h - 1)), w, h }
    if ([...rooms, plaza].some(other => touches(room, other))) continue
    rooms.push(room)
  }
  const roomAt = Array.from({ length: W }, () => Array<number>(H).fill(-1))
  rooms.forEach((r, i) => {
    for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) roomAt[x][y] = i
  })

  // Maze: recursive backtracker over every cell
  const visited = Array.from({ length: W }, () => Array<boolean>(H).fill(false))
  const stack: [number, number][] = [[0, 0]]
  visited[0][0] = true
  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const options4 = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy] as const)
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < H && !visited[nx][ny])
    if (!options4.length) {
      stack.pop()
      continue
    }
    const [nx, ny, dx, dy] = options4[Math.floor(random() * options4.length)]
    if (dx === 1) east[x][y] = false
    if (dx === -1) east[nx][ny] = false
    if (dy === 1) south[x][y] = false
    if (dy === -1) south[nx][ny] = false
    visited[nx][ny] = true
    stack.push([nx, ny])
  }

  const allWalls: CellWall[] = []
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (x < W - 1) allWalls.push({ type: 'e', x, y })
      if (y < H - 1) allWalls.push({ type: 's', x, y })
    }
  }
  const roomOfWall = (w: CellWall) => {
    const [ax, ay] = across(w)
    return { a: roomAt[w.x][w.y], b: roomAt[ax][ay] }
  }

  // Rooms: open inside, keep only a couple of the maze passages into them
  const entrances: CellWall[][] = rooms.map(() => [])
  const walledUp: CellWall[] = []
  for (const w of allWalls) {
    const { a, b } = roomOfWall(w)
    if (a !== -1 && a === b) setOpen(w, true)
  }
  rooms.forEach((_, i) => {
    const ways = shuffle(allWalls.filter(w => isOpen(w) && ((roomOfWall(w).a === i) !== (roomOfWall(w).b === i))), random)
    entrances[i] = ways.slice(0, ROOM_ENTRANCES)
    for (const w of ways.slice(ROOM_ENTRANCES)) {
      setOpen(w, false)
      walledUp.push(w)
    }
  })

  // Walling up may cut the maze apart: reopen walled-up passages until every cell is reachable again
  const reachable = () => {
    const seen = Array.from({ length: W }, () => Array<boolean>(H).fill(false))
    const queue: [number, number][] = [[0, 0]]
    seen[0][0] = true
    while (queue.length) {
      const [x, y] = queue.pop()!
      const next: [number, number, boolean][] = [
        [x + 1, y, x < W - 1 && !east[x][y]],
        [x - 1, y, x > 0 && !east[x - 1][y]],
        [x, y + 1, y < H - 1 && !south[x][y]],
        [x, y - 1, y > 0 && !south[x][y - 1]],
      ]
      for (const [nx, ny, open] of next) {
        if (!open || seen[nx][ny]) continue
        seen[nx][ny] = true
        queue.push([nx, ny])
      }
    }
    return seen
  }
  for (;;) {
    const seen = reachable()
    const bridge = walledUp.find(w => isOpen(w) === false && seen[w.x][w.y] !== seen[across(w)[0]][across(w)[1]])
    if (!bridge) break
    setOpen(bridge, true)
    const { a, b } = roomOfWall(bridge)
    entrances[a !== -1 ? a : b].push(bridge)
  }

  // Loops in the corridors (rooms keep their few entrances)
  for (const w of allWalls) {
    const { a, b } = roomOfWall(w)
    if (a === -1 && b === -1 && !isOpen(w) && random() < BRAID_CHANCE) setOpen(w, true)
  }

  // Central plaza: everyone starts together
  for (let x = plaza.x; x < plaza.x + plaza.w; x++) {
    for (let y = plaza.y; y < plaza.y + plaza.h; y++) {
      if (x < plaza.x + plaza.w - 1) east[x][y] = false
      if (y < plaza.y + plaza.h - 1) south[x][y] = false
    }
  }

  // Crawl holes: walls between corridor cells that are a long walk apart
  const distanceFrom = (sx: number, sy: number) => {
    const dist = Array.from({ length: W }, () => Array<number>(H).fill(Infinity))
    dist[sx][sy] = 0
    const queue: [number, number][] = [[sx, sy]]
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i]
      const next: [number, number, boolean][] = [
        [x + 1, y, x < W - 1 && !east[x][y]],
        [x - 1, y, x > 0 && !east[x - 1][y]],
        [x, y + 1, y < H - 1 && !south[x][y]],
        [x, y - 1, y > 0 && !south[x][y - 1]],
      ]
      for (const [nx, ny, open] of next) {
        if (!open || dist[nx][ny] !== Infinity) continue
        dist[nx][ny] = dist[x][y] + 1
        queue.push([nx, ny])
      }
    }
    return dist
  }
  const holeWalls: CellWall[] = []
  for (const w of shuffle(allWalls.filter(w => !isOpen(w) && roomOfWall(w).a === -1 && roomOfWall(w).b === -1), random)) {
    if (holeWalls.length >= options.holeCount) break
    const [ax, ay] = across(w)
    if (distanceFrom(w.x, w.y)[ax][ay] < HOLE_MIN_DETOUR) continue
    if (holeWalls.some(h => Math.hypot(h.x - w.x, h.y - w.y) < HOLE_SPACING / CELL)) continue
    holeWalls.push(w)
  }

  // Map edges (two map edges per maze wall)
  const kind = new Map<string, 'wall' | 'hole' | 'door' | 'exit'>()
  const mapEdges = (w: CellWall): MazeEdge[] =>
    w.type === 'e'
      ? [0, 1].map(k => ({ axis: 'v' as const, col: (w.x + 1) * CELL, row: w.y * CELL + k }))
      : [0, 1].map(k => ({ axis: 'h' as const, col: w.x * CELL + k, row: (w.y + 1) * CELL }))
  for (let x = 0; x <= W; x++) {
    for (let y = 0; y < H; y++) {
      if (x === 0 || x === W || east[x - 1][y]) for (let k = 0; k < CELL; k++) kind.set(edgeKey({ axis: 'v', col: x * CELL, row: y * CELL + k }), 'wall')
    }
  }
  for (let y = 0; y <= H; y++) {
    for (let x = 0; x < W; x++) {
      if (y === 0 || y === H || south[x][y - 1]) for (let k = 0; k < CELL; k++) kind.set(edgeKey({ axis: 'h', col: x * CELL + k, row: y * CELL }), 'wall')
    }
  }
  for (const w of holeWalls) for (const e of mapEdges(w)) kind.set(edgeKey(e), 'hole')

  const doorWalls = shuffle(entrances.flat(), random).slice(0, options.doorCount)
  const doors: MazeDoor[] = doorWalls.map(w => {
    const edges = mapEdges(w)
    for (const e of edges) kind.set(edgeKey(e), 'door')
    const [ax, ay] = across(w)
    return { edges, center: { col: ((w.x + ax) * CELL) / 2 + 0.5, row: ((w.y + ay) * CELL) / 2 + 0.5 } }
  })

  // Exit gates: the first on a random side, the next on the opposite one (the seeker cannot guard both)
  const sideOrder = shuffle(['left', 'right', 'top', 'bottom'] as const, random).slice(0, 1)
  const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const
  sideOrder.push(opposite[sideOrder[0]])
  for (const side of ['left', 'right', 'top', 'bottom'] as const) if (!sideOrder.includes(side)) sideOrder.push(side)
  const exits: MazeExit[] = sideOrder.slice(0, Math.min(4, options.exitCount)).map(side => {
    const along = side === 'left' || side === 'right' ? H : W
    const p = EXIT_CORNER_GAP + Math.floor(random() * Math.max(1, along - 2 * EXIT_CORNER_GAP))
    const edges: MazeEdge[] = [0, 1].map(k =>
      side === 'left' ? { axis: 'v', col: 0, row: p * CELL + k }
        : side === 'right' ? { axis: 'v', col: W * CELL, row: p * CELL + k }
          : side === 'top' ? { axis: 'h', col: p * CELL + k, row: 0 }
            : { axis: 'h', col: p * CELL + k, row: H * CELL }
    )
    for (const e of edges) kind.set(edgeKey(e), 'exit')
    const mid = p * CELL + 0.5
    const at = side === 'left' ? { col: 0, row: mid } : side === 'right' ? { col: W * CELL - 1, row: mid } : side === 'top' ? { col: mid, row: 0 } : { col: mid, row: H * CELL - 1 }
    return { edges, at }
  })

  const wallAt = (e: MazeEdge) => kind.get(edgeKey(e)) === 'wall'

  // A partition in every room: a short wall from one side inwards, making a corner hidden from the doors
  rooms.forEach(r => {
    const c0 = r.x * CELL
    const r0 = r.y * CELL
    const cw = r.w * CELL
    const rh = r.h * CELL
    const vertical = cw >= rh
    const span = vertical ? cw : rh
    const depth = Math.max(1, Math.floor((vertical ? rh : cw) / 2))
    for (const at of shuffle(Array.from({ length: span - 3 }, (_, i) => i + 2), random)) {
      const fromTop = random() < 0.5
      // The partition stands on the line between two cells, touching the room wall it grows from
      const pieces: MazeEdge[] = Array.from({ length: depth }, (_, k) =>
        vertical
          ? { axis: 'v', col: c0 + at, row: fromTop ? r0 + k : r0 + rh - 1 - k }
          : { axis: 'h', col: fromTop ? c0 + k : c0 + cw - 1 - k, row: r0 + at }
      )
      const base: MazeEdge[] = vertical
        ? [-1, 0].map(k => ({ axis: 'h' as const, col: c0 + at + k, row: fromTop ? r0 : r0 + rh }))
        : [-1, 0].map(k => ({ axis: 'v' as const, col: fromTop ? c0 : c0 + cw, row: r0 + at + k }))
      if (!base.every(wallAt)) continue
      for (const p of pieces) kind.set(edgeKey(p), 'wall')
      break
    }
  })

  const walls: MazeEdge[] = []
  const holes: MazeEdge[] = []
  for (const [key, k] of kind) {
    const axis = key[0] as 'v' | 'h'
    const [col, row] = key.slice(1).split(',').map(Number)
    if (k === 'wall') walls.push({ axis, col, row })
    else if (k === 'hole') holes.push({ axis, col, row })
  }

  // Spawns: the plaza
  const pc = plaza.x * CELL + CELL
  const pr = plaza.y * CELL + CELL
  const spawns = [
    { col: pc - 1, row: pr - 1 },
    { col: pc, row: pr },
    { col: pc - 1, row: pr },
    { col: pc, row: pr - 1 },
  ]

  // Map cells: which sides have a wall, and is it inside a room
  const cols = W * CELL
  const rows = H * CELL
  const sides = (col: number, row: number) => ({
    left: wallAt({ axis: 'v', col, row }),
    right: wallAt({ axis: 'v', col: col + 1, row }),
    top: wallAt({ axis: 'h', col, row }),
    bottom: wallAt({ axis: 'h', col, row: row + 1 }),
  })
  const nextToOpening = (col: number, row: number) =>
    [
      { axis: 'v' as const, col, row },
      { axis: 'v' as const, col: col + 1, row },
      { axis: 'h' as const, col, row },
      { axis: 'h' as const, col, row: row + 1 },
    ].some(e => kind.get(edgeKey(e)) === 'door' || kind.get(edgeKey(e)) === 'hole' || kind.get(edgeKey(e)) === 'exit')
  const inRoom = (col: number, row: number) => roomAt[Math.floor(col / CELL)][Math.floor(row / CELL)] !== -1
  const cells: { col: number; row: number; walls: number; facing: SpriteFacing; room: boolean; frontSeen: boolean }[] = []
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const s = sides(col, row)
      const count = [s.left, s.right, s.top, s.bottom].filter(Boolean).length
      if (count < 2 || nextToOpening(col, row) || spawns.some(p => near(p, { col, row }, SPOT_SPAWN_CLEARANCE))) continue
      // Back to a wall: the one the camera sees past (top / left) when there is a choice
      const facing: SpriteFacing = s.top ? 'S' : s.left ? 'E' : s.bottom ? 'N' : 'W'
      // Against the top / left wall a cabinet shows the camera its shelves, not its back
      cells.push({ col, row, walls: count, facing, room: inRoom(col, row), frontSeen: s.top || s.left })
    }
  }
  const pick = <T extends GridCoord>(candidates: T[], count: number, taken: GridCoord[], spacing: number) => {
    const picked: T[] = []
    for (const c of candidates) {
      if (picked.length >= count) break
      if ([...taken, ...picked].some(p => near(p, c, spacing))) continue
      picked.push(c)
    }
    return picked
  }
  const cabinetCount = Math.round(options.hideSpotCount * CABINET_SHARE)
  const roomCorners = shuffle(cells.filter(c => c.room && c.frontSeen), random)
  const deadEnds = shuffle(cells.filter(c => !c.room), random).sort((a, b) => b.walls - a.walls)
  const cabinets = pick(roomCorners, cabinetCount, [], SPOT_SPACING)
  const barrels = pick(deadEnds, options.hideSpotCount - cabinets.length, cabinets, SPOT_SPACING)
  const spots: HideSpot[] = [
    ...cabinets.map(c => ({ col: c.col, row: c.row, kind: 'cabinet' as const, facing: c.facing })),
    ...barrels.map(c => ({ col: c.col, row: c.row, kind: 'barrel' as const, facing: c.facing })),
  ]

  // Candle stands: the middle of each room first, then corridor crossings
  const roomCenters = rooms.map(r => ({ col: r.x * CELL + Math.floor((r.w * CELL) / 2), row: r.y * CELL + Math.floor((r.h * CELL) / 2) }))
  const crossings: GridCoord[] = []
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (roomAt[x][y] !== -1) continue
      const open = [x < W - 1 && !east[x][y], x > 0 && !east[x - 1][y], y < H - 1 && !south[x][y], y > 0 && !south[x][y - 1]].filter(Boolean).length
      if (open >= 3) crossings.push({ col: x * CELL + 1, row: y * CELL + 1 })
    }
  }
  const torchCandidates = [...shuffle(roomCenters, random), ...shuffle(crossings, random)].filter(
    t => !spawns.some(p => near(p, t, TORCH_SPAWN_CLEARANCE)) && !spots.some(s => near(s, t, 1.5)) && !exits.some(e => near(e.at, t, 2))
  )
  const torches = pick(torchCandidates, options.torchCount, [], TORCH_SPACING)

  return { seed, cols, rows, walls, holes, doors, exits, spots, torches, spawns }
}

/** Sub-cells a wall piece blocks (the 2x2 collision sub-grid: an edge at col - 0.5 is sub-column 2 * col - 1). */
export function edgeSubCells(edge: MazeEdge): [number, number][] {
  return edge.axis === 'v'
    ? [-1, 0, 1].map(k => [2 * edge.col - 1, 2 * edge.row + k] as [number, number]).filter(([, sr]) => sr >= 0)
    : [-1, 0, 1].map(k => [2 * edge.col + k, 2 * edge.row - 1] as [number, number]).filter(([sc]) => sc >= 0)
}

/** Collision for one role: walls always; crawl holes only for the seeker (and for sight); closed doors for everyone. */
export function buildMazeGrid(maze: HideSeekMaze, blockHoles: boolean, doorsOpen: readonly boolean[] | null): CollisionGrid {
  const subCols = maze.cols * 2
  const subRows = maze.rows * 2
  const blocked = new Uint8Array(subCols * subRows)
  const block = (edges: MazeEdge[]) => {
    for (const e of edges) {
      for (const [sc, sr] of edgeSubCells(e)) if (sc < subCols && sr < subRows) blocked[sr * subCols + sc] = 1
    }
  }
  block(maze.walls)
  // The gates only open for the escape itself (reaching the spot inside one): walking never leaves the map
  for (const exit of maze.exits) block(exit.edges)
  if (blockHoles) block(maze.holes)
  maze.doors.forEach((door, i) => {
    if (doorsOpen && !doorsOpen[i]) block(door.edges)
  })
  return { subCols, subRows, blocked }
}
