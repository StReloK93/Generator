import { Layer, RouteInfo, TileItem } from '../../types/map'
import { HideSeekMaze, MazeEdge, edgeSubCells } from './HideSeekMaze'

/**
 * A labyrinth as map content: one plain sand floor and single stone wall lines (like the Hero test map), crawl
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

/** Where a wall piece on `edge` is placed and which sprite suffix / depth it takes. */
export function edgePlacement(edge: MazeEdge, cols: number): { col: number; row: number; suffix: 'E' | 'W' | 'N' | 'S'; depthOffset: number } {
  if (edge.axis === 'v') return edge.col < cols ? { col: edge.col, row: edge.row, suffix: 'E', depthOffset: 0 } : { col: edge.col - 1, row: edge.row, suffix: 'W', depthOffset: 1 }
  return edge.row > 0 ? { col: edge.col, row: edge.row - 1, suffix: 'N', depthOffset: 1 } : { col: edge.col, row: edge.row, suffix: 'S', depthOffset: 0 }
}

export function buildMazeMap(maze: HideSeekMaze): MazeMapContent {
  let next = 0
  const id = () => `maze-${maze.seed.toString(36)}-${(next++).toString(36)}`
  const ground: Record<string, TileItem[]> = {}
  const walls: Record<string, TileItem[]> = {}
  for (let col = 0; col < maze.cols; col++) {
    for (let row = 0; row < maze.rows; row++) ground[`${col},${row}`] = [{ id: id(), x: col, y: row, assetId: FLOOR, zIndex: 0 }]
  }
  const put = (edge: MazeEdge, base: string) => {
    const at = edgePlacement(edge, maze.cols)
    // The outer walls use the plain stone pieces (the aged ones only come facing E / N)
    const asset = base === 'stoneWallAged' && (at.suffix === 'W' || at.suffix === 'S') ? 'stoneWall' : base
    const item: TileItem = { id: id(), x: at.col, y: at.row, assetId: `sprite-${asset}_${at.suffix}`, zIndex: 0 }
    if (at.depthOffset) item.depthOffset = at.depthOffset
    ;(walls[`${at.col},${at.row}`] ||= []).push(item)
  }
  for (const edge of maze.walls) put(edge, 'stoneWallAged')
  for (const edge of maze.holes) put(edge, 'stoneWallHole')

  const collision = new Set<string>()
  const gates = maze.exits.flatMap(exit => exit.edges)
  for (const edge of [...maze.walls, ...maze.holes, ...gates]) for (const [sc, sr] of edgeSubCells(edge)) collision.add(`${sc},${sr}`)

  const names = ['Seeker', 'Hider', 'Hider 2', 'Hider 3']
  return {
    cols: maze.cols,
    rows: maze.rows,
    layers: [
      { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: ground },
      { id: 'layer-walls', name: 'Walls', visible: true, locked: false, opacity: 1, tiles: walls },
    ],
    collisionSubcells: [...collision],
    routes: maze.spawns.map((p, i) => ({ id: `route-${i}`, name: names[i] ?? `Hider ${i}`, routePoints: [p], playerCameraPoint: p })),
  }
}
