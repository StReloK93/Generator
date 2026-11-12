import { GridCoord, Layer, MapProject, TileItem } from '../../types/map'
import { HideSeekMaze, HideSpot, HideSpotKind, MazeDoor, MazeEdge, SpriteFacing, edgeSubCells } from './HideSeekMaze'

/**
 * A hand-made labyrinth read from what is drawn on the map, so the editor is all it takes to make one: a barrel or
 * crate sprite is a hiding spot, a bookcase full of books a cabinet to hide in, a candle stand a candle, a wall door a
 * door that opens and shuts, a wall with a hole a crawl hole only hiders get through, and the sunken stone slab
 * (stoneInset) the crypt where the caught or petrified wait. The walls are the map's collision (the editor's collision
 * tool). The game draws the hiding spots, candles and doors itself (they light up, wobble, open), so they leave the
 * map's layers; the crawl holes stay.
 */

/** Sprites a hider can hide in (without the "sprite-" prefix and the facing suffix) */
const HIDE_SPOTS: Record<string, HideSpotKind> = {
  barrels: 'barrel',
  barrelsStacked: 'barrel',
  woodenCrates: 'barrel',
  sacksCrate: 'barrel',
  bookcaseBooks: 'cabinet',
}
const CANDLES = new Set(['candleStand'])
const DOORS = new Set(['stoneWallDoor', 'stoneWallDoorClosed', 'stoneWallDoorOpen'])
const HOLES = new Set(['stoneWallHole'])
const CRYPT_FLOOR = 'stoneInset'

export interface MapLabyrinth {
  maze: HideSeekMaze
  /** The map's layers without the pieces the game draws itself */
  layers: Layer[]
  /** The map's collision without the doors and crawl holes (whether they block depends on who and when) */
  collisionSubcells: string[]
}

/** "sprite-stoneWallDoor_E" -> { base: "stoneWallDoor", suffix: "E" } */
function spriteParts(assetId: string): { base: string; suffix: SpriteFacing | null } {
  const match = /^(?:sprite-)?(.+?)(?:_([ENSW]))?$/.exec(assetId)
  return { base: match?.[1] ?? assetId, suffix: (match?.[2] as SpriteFacing | undefined) ?? null }
}

/** The cell edge a wall sprite stands on (the reverse of edgePlacement). */
export function wallEdgeOf(col: number, row: number, suffix: SpriteFacing): MazeEdge {
  if (suffix === 'E') return { axis: 'v', col, row }
  if (suffix === 'W') return { axis: 'v', col: col + 1, row }
  if (suffix === 'N') return { axis: 'h', col, row: row + 1 }
  return { axis: 'h', col, row }
}

const edgeKey = (e: MazeEdge) => `${e.axis}${e.col},${e.row}`

/** Door pieces side by side on one wall line open and shut together (a double door). */
function groupDoors(edges: MazeEdge[]): MazeDoor[] {
  const unique = [...new Map(edges.map(e => [edgeKey(e), e])).values()]
  const along = (e: MazeEdge) => (e.axis === 'v' ? e.row : e.col)
  const line = (e: MazeEdge) => `${e.axis}${e.axis === 'v' ? e.col : e.row}`
  unique.sort((a, b) => line(a).localeCompare(line(b)) || along(a) - along(b))
  const doors: MazeEdge[][] = []
  for (const edge of unique) {
    const last = doors[doors.length - 1]?.at(-1)
    if (last && line(last) === line(edge) && along(edge) === along(last) + 1) doors[doors.length - 1].push(edge)
    else doors.push([edge])
  }
  return doors.map(group => {
    const first = group[0]
    const mid = (along(first) + along(group[group.length - 1])) / 2
    return { edges: group, center: first.axis === 'v' ? { col: first.col - 0.5, row: mid } : { col: mid, row: first.row - 0.5 } }
  })
}

/**
 * The labyrinth drawn on `project`, or null when nothing on it makes one (no hiding spot, candle, door or crawl hole).
 * `spawns`: the start points (seekers first); the crypt falls back to the first one.
 */
export function readMapLabyrinth(project: Pick<MapProject, 'cols' | 'rows' | 'layers' | 'collisionSubcells'>, spawns: { seekers: GridCoord[]; hiders: GridCoord[] }): MapLabyrinth | null {
  const spots: HideSpot[] = []
  const torches: GridCoord[] = []
  const doorEdges: MazeEdge[] = []
  const holes: MazeEdge[] = []
  const crypt: GridCoord[] = []

  const layers = project.layers.map(layer => {
    const tiles: Record<string, TileItem[]> = {}
    for (const [key, items] of Object.entries(layer.tiles)) {
      const kept = items.filter(item => {
        const { base, suffix } = spriteParts(item.assetId)
        const at = { col: item.x, row: item.y }
        if (HIDE_SPOTS[base]) {
          spots.push({ ...at, kind: HIDE_SPOTS[base], facing: suffix ?? 'E', asset: item.assetId })
          return false
        }
        if (CANDLES.has(base)) {
          torches.push(at)
          return false
        }
        if (DOORS.has(base) && suffix) {
          doorEdges.push(wallEdgeOf(at.col, at.row, suffix))
          return false
        }
        if (HOLES.has(base) && suffix) holes.push(wallEdgeOf(at.col, at.row, suffix))
        if (base === CRYPT_FLOOR) crypt.push(at)
        return true
      })
      if (kept.length > 0) tiles[key] = kept
    }
    return { ...layer, tiles }
  })
  if (spots.length + torches.length + doorEdges.length + holes.length === 0) return null

  const doors = groupDoors(doorEdges)
  // Doors and crawl holes are not plain walls: the game blocks them for whom and while it has to
  const openings = new Set([...holes, ...doors.flatMap(d => d.edges)].flatMap(edge => edgeSubCells(edge).map(([sc, sr]) => `${sc},${sr}`)))
  const collisionSubcells = (project.collisionSubcells ?? []).filter(key => !openings.has(key))

  // The crypt: the slab tile nearest the middle of all slab tiles
  const middle = crypt.length > 0
    ? { col: crypt.reduce((s, c) => s + c.col, 0) / crypt.length, row: crypt.reduce((s, c) => s + c.row, 0) / crypt.length }
    : null
  const jail = middle
    ? crypt.reduce((best, c) => (Math.hypot(c.col - middle.col, c.row - middle.row) < Math.hypot(best.col - middle.col, best.row - middle.row) ? c : best))
    : (spawns.seekers[0] ?? spawns.hiders[0] ?? { col: Math.floor(project.cols / 2), row: Math.floor(project.rows / 2) })
  // No yards on a hand-made map: empty rectangles at the crypt
  const yard = { col: jail.col, row: jail.row, cols: 0, rows: 0 }

  return {
    maze: {
      seed: 0,
      cols: project.cols,
      rows: project.rows,
      // The walls are the map's collision
      walls: [],
      holes,
      doors,
      exits: [],
      spots,
      torches,
      seekerBase: yard,
      jail,
      hiderBase: yard,
      seekerSpawns: spawns.seekers,
      hiderSpawns: spawns.hiders,
    },
    layers,
    collisionSubcells,
  }
}
