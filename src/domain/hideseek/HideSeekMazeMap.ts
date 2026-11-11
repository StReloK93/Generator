import { Layer, RouteInfo, TileItem } from '../../types/map'
import { HideSeekMaze, MazeEdge, edgeSubCells, insideRect, seededRandom } from './HideSeekMaze'

/**
 * How a labyrinth is dressed: 'classic' (hide & seek) is plain sand and aged stone; 'ruins' (the curse) is a
 * cracked flagstone floor overgrown with grass and flowers, with crumbling wall pieces. Only the look differs.
 */
export type MazeTheme = 'classic' | 'ruins'

/**
 * A labyrinth as map content: one plain sand floor and single stone wall lines, crawl
 * holes as broken wall pieces. Doors, exit gates, furniture and candles are drawn by the hide & seek renderer (they change).
 * Walls sit on cell edges: a 'v' edge on the cell right of the line (the last column's on the cell left of it,
 * drawn in front), an 'h' edge on the cell above the line, drawn in front (the first row's on the cell below it).
 */

export interface MazeMapContent {
  cols: number
  rows: number
  layers: Layer[]
  collisionSubcells: string[]
  routes: RouteInfo[]
}

const FLOOR = 'sprite-dirt_E'
/** The bases are told apart by their floor: stone paving for the seekers (a sunken slab where the jail is),
 * wooden planks for the hiders' home */
const SEEKER_FLOOR = 'sprite-stone_E'
const JAIL_FLOOR = 'sprite-stoneInset_E'
const HOME_FLOOR = 'sprite-planks_E'

/** Where a wall piece on `edge` is placed and which sprite suffix / depth it takes. */
export function edgePlacement(edge: MazeEdge, cols: number): { col: number; row: number; suffix: 'E' | 'W' | 'N' | 'S'; depthOffset: number } {
  if (edge.axis === 'v') return edge.col < cols ? { col: edge.col, row: edge.row, suffix: 'E', depthOffset: 0 } : { col: edge.col - 1, row: edge.row, suffix: 'W', depthOffset: 1 }
  return edge.row > 0 ? { col: edge.col, row: edge.row - 1, suffix: 'N', depthOffset: 1 } : { col: edge.col, row: edge.row, suffix: 'S', depthOffset: 0 }
}

/** Ruins: cracked flagstones, worn paths and grass taking the old halls back */
const RUIN_STONES = ['sprite-stoneUneven_E', 'sprite-stoneMissingTiles_E', 'sprite-stoneTile_E', 'sprite-stoneUneven_E']
const RUIN_GRASS = ['sprite-grass', 'sprite-grass', 'sprite-grasscombo', 'sprite-grassflower']
const RUIN_EDGE = ['sprite-dirtTiles_E', 'sprite-dirt_E']
/** Share of inner wall pieces that have crumbled (still walls: only their look) */
const RUIN_BROKEN_WALLS = 0.18

/** Where the grass grows: a few round patches; a cell inside one is overgrown, at its rim worn dirt. */
function overgrowth(maze: HideSeekMaze): (col: number, row: number) => 'grass' | 'edge' | null {
  const random = seededRandom(maze.seed ^ 0x5eed)
  const patches = Array.from({ length: Math.max(4, Math.round((maze.cols * maze.rows) / 110)) }, () => ({
    col: random() * maze.cols,
    row: random() * maze.rows,
    radius: 1.5 + random() * 3.5,
  }))
  return (col, row) => {
    let best = Infinity
    for (const p of patches) best = Math.min(best, Math.hypot(col - p.col, row - p.row) / p.radius)
    return best <= 1 ? 'grass' : best <= 1.35 ? 'edge' : null
  }
}

/** A stable pick per cell (the same cell looks the same for every player). */
function pick<T>(list: T[], seed: number, col: number, row: number): T {
  const h = Math.imul((col * 73856093) ^ (row * 19349663) ^ seed, 0x9e3779b1) >>> 0
  return list[h % list.length]
}

function floorAt(maze: HideSeekMaze, col: number, row: number, grown: ReturnType<typeof overgrowth> | null): string {
  if (col === maze.jail.col && row === maze.jail.row) return JAIL_FLOOR
  if (insideRect(maze.seekerBase, { col, row })) return SEEKER_FLOOR
  if (insideRect(maze.hiderBase, { col, row })) return HOME_FLOOR
  if (!grown) return FLOOR
  const cover = grown(col, row)
  if (cover === 'grass') return pick(RUIN_GRASS, maze.seed, col, row)
  if (cover === 'edge') return pick(RUIN_EDGE, maze.seed, col, row)
  return pick(RUIN_STONES, maze.seed, col, row)
}

export function buildMazeMap(maze: HideSeekMaze, theme: MazeTheme = 'classic'): MazeMapContent {
  let next = 0
  const id = () => `maze-${maze.seed.toString(36)}-${(next++).toString(36)}`
  const grown = theme === 'ruins' ? overgrowth(maze) : null
  const crumble = seededRandom(maze.seed ^ 0xb0b)
  const ground: Record<string, TileItem[]> = {}
  const walls: Record<string, TileItem[]> = {}
  for (let col = 0; col < maze.cols; col++) {
    for (let row = 0; row < maze.rows; row++) ground[`${col},${row}`] = [{ id: id(), x: col, y: row, assetId: floorAt(maze, col, row, grown), zIndex: 0 }]
  }
  const put = (edge: MazeEdge, base: string) => {
    const at = edgePlacement(edge, maze.cols)
    // The outer walls use the plain stone pieces (the aged ones only come facing E / N)
    const asset = base === 'stoneWallAged' && (at.suffix === 'W' || at.suffix === 'S') ? 'stoneWall' : base
    const item: TileItem = { id: id(), x: at.col, y: at.row, assetId: `sprite-${asset}_${at.suffix}`, zIndex: 0 }
    if (at.depthOffset) item.depthOffset = at.depthOffset
    ;(walls[`${at.col},${at.row}`] ||= []).push(item)
  }
  // Ruins: some inner wall pieces have crumbled (the outer ring stays whole)
  const inner = (edge: MazeEdge) => (edge.axis === 'v' ? edge.col > 0 && edge.col < maze.cols : edge.row > 0 && edge.row < maze.rows)
  for (const edge of maze.walls) put(edge, theme === 'ruins' && inner(edge) && crumble() < RUIN_BROKEN_WALLS ? 'stoneWallBroken' : 'stoneWallAged')
  for (const edge of maze.holes) put(edge, 'stoneWallHole')

  const collision = new Set<string>()
  const gates = maze.exits.flatMap(exit => exit.edges)
  for (const edge of [...maze.walls, ...maze.holes, ...gates]) for (const [sc, sr] of edgeSubCells(edge)) collision.add(`${sc},${sr}`)

  // Seekers first, then the hiders (the lobby seats come from the settings, these are only start points)
  const starts = [
    ...maze.seekerSpawns.map((p, i) => ({ p, name: `Seeker ${i + 1}` })),
    ...maze.hiderSpawns.map((p, i) => ({ p, name: `Hider ${i + 1}` })),
  ]
  return {
    cols: maze.cols,
    rows: maze.rows,
    layers: [
      { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: ground },
      { id: 'layer-walls', name: 'Walls', visible: true, locked: false, opacity: 1, tiles: walls },
    ],
    collisionSubcells: [...collision],
    routes: starts.map(({ p, name }, i) => ({ id: `route-${i}`, name, routePoints: [p], playerCameraPoint: p })),
  }
}
