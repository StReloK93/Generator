import fs from 'node:fs'
import path from 'node:path'
import { buildMazeGrid, edgePlacement, edgeSubCells, normalizeHideSeekSettings, reachableSubCells, readMapLabyrinth, splitSpawns } from '../src/domain/hideseek'
import type { HideSeekMaze, HideSpot, MazeDoor, MazeEdge, SpriteFacing } from '../src/domain/hideseek'
import type { GridCoord, TileItem } from '../src/types/map'

/**
 * Writes "src/maps/La'natli Xarobalar.json": the curse map, a hand-made abandoned monastery that is the same every
 * round. It is laid out the way such places are built: a cloister in the middle (a garden behind an arcade, with a
 * covered walk around it) and the ranges around the walk: the church along the north side with the library at its
 * west end, the crypt and the cellar on the west, the sacristy and the dormitory on the east, the kitchen and the
 * refectory on the south. The south-east corner has fallen in and is a walled yard gone wild. Every room has at least
 * two ways out, so a chase never ends in a corner. Everything is plain map content the editor edits: the game reads the
 * barrels and cabinets, candles, doors, crawl holes and the crypt slab from their sprites (readMapLabyrinth) and the
 * walls from the collision. This script only builds the first version; after that the map lives in the editor.
 *
 * Usage: npm run generate:curse
 */

const COLS = 30
const ROWS = 30

/**
 * Which room a tile belongs to: L library, N church, K crypt, W cellar, A sacristy, B dormitory, D kitchen,
 * T refectory, H the fallen-in yard, c the cloister walk, G the cloister garden ('#' outside the map).
 */
function regionAt(col: number, row: number): string {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#'
  if (row < 8) return col < 8 ? 'L' : 'N'
  if (row >= 22) return col < 8 ? 'D' : col < 22 ? 'T' : 'H'
  if (col < 8) return row < 14 ? 'K' : 'W'
  if (col >= 22) return row < 13 ? 'A' : 'B'
  return col >= 10 && col <= 19 && row >= 10 && row <= 19 ? 'G' : 'c'
}

/** A stable number per place. */
function hash(a: number, b: number, salt = 0): number {
  return Math.imul((a * 73856093) ^ (b * 19349663) ^ (salt * 83492791), 0x9e3779b1) >>> 8
}

// ==========================================
// Walls: wherever two rooms meet, minus the openings
// ==========================================
type Opening = 'open' | 'arch' | 'door' | 'hole'
const edgeKey = (e: MazeEdge) => `${e.axis}${e.col},${e.row}`
const openings = new Map<string, Opening>()
const doors: MazeDoor[] = []

/** An opening in the wall line `line` ('v': the line left of column `line`, 'h': above row `line`) from tile `from` to `to`. */
function gap(axis: 'v' | 'h', line: number, from: number, to: number, kind: Opening): void {
  const edges: MazeEdge[] = []
  for (let i = from; i <= to; i++) edges.push(axis === 'v' ? { axis, col: line, row: i } : { axis, col: i, row: line })
  for (const e of edges) openings.set(edgeKey(e), kind)
  if (kind === 'door') {
    const mid = (from + to) / 2
    doors.push({ edges, center: axis === 'v' ? { col: line - 0.5, row: mid } : { col: mid, row: line - 0.5 } })
  }
}

// The arcade between the walk and the garden: three double arches on each side, piers between them
for (const line of [10, 20]) {
  for (const from of [11, 14, 17]) {
    gap('h', line, from, from + 1, 'arch')
    gap('v', line, from, from + 1, 'arch')
  }
}
// Library: a door into the church, an arch down to the crypt
gap('v', 8, 3, 4, 'door')
gap('h', 8, 3, 4, 'arch')
gap('v', 8, 6, 6, 'hole')
// Church: two portals onto the cloister walk, the sacristy door beside the altar
gap('h', 8, 10, 11, 'arch')
gap('h', 8, 18, 19, 'arch')
gap('h', 8, 25, 26, 'door')
// Crypt: onto the walk, down to the cellar
gap('v', 8, 10, 11, 'arch')
gap('h', 14, 2, 3, 'door')
gap('h', 14, 6, 6, 'hole')
// Cellar: onto the walk, down to the kitchen
gap('v', 8, 17, 18, 'arch')
gap('h', 22, 5, 6, 'arch')
// Kitchen: the serving door into the refectory
gap('v', 8, 25, 26, 'door')
gap('v', 8, 28, 28, 'hole')
// Refectory: two arches onto the walk, one out into the yard
gap('h', 22, 10, 11, 'arch')
gap('h', 22, 18, 19, 'arch')
gap('v', 22, 25, 26, 'arch')
// The yard: its wall to the dormitory has fallen
gap('h', 22, 24, 25, 'open')
// Dormitory: onto the walk, up to the sacristy
gap('v', 22, 16, 17, 'arch')
gap('h', 13, 27, 28, 'door')
gap('v', 22, 20, 20, 'hole')
// Sacristy: onto the walk
gap('v', 22, 10, 11, 'door')

const walls: MazeEdge[] = []
const holes: MazeEdge[] = []
const arches: MazeEdge[] = []
function sortEdge(edge: MazeEdge): void {
  const kind = openings.get(edgeKey(edge))
  if (!kind) walls.push(edge)
  else if (kind === 'hole') holes.push(edge)
  else if (kind === 'arch') arches.push(edge)
}
const onWall = new Set<string>()
for (let col = 0; col <= COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    if (regionAt(col - 1, row) === regionAt(col, row)) continue
    onWall.add(edgeKey({ axis: 'v', col, row }))
    sortEdge({ axis: 'v', col, row })
  }
}
for (let row = 0; row <= ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    if (regionAt(col, row - 1) === regionAt(col, row)) continue
    onWall.add(edgeKey({ axis: 'h', col, row }))
    sortEdge({ axis: 'h', col, row })
  }
}
for (const key of openings.keys()) if (!onWall.has(key)) throw new Error(`Opening ${key} is not on a wall`)

// ==========================================
// Floors: one kind per room, as it was laid
// ==========================================
function floorAt(col: number, row: number): string {
  switch (regionAt(col, row)) {
    case 'L':
    case 'T':
      return 'planks_E'
    case 'B':
      return 'planksOld_E'
    case 'W':
      return 'dirt_E'
    case 'K':
      // A sunken slab where the statues stand
      return col >= 3 && col <= 5 && row >= 10 && row <= 12 ? 'stoneInset_E' : 'stone_E'
    case 'G': {
      // A paved middle and a cross of paths out to the middle arches; flowers along the paths, lawn beyond
      if (col >= 13 && col <= 16 && row >= 13 && row <= 16) return 'stone_E'
      const pathGap = Math.min(Math.abs(col - 14.5), Math.abs(row - 14.5))
      if (pathGap < 1) return 'stone_E'
      if (pathGap < 2) return 'grassflower'
      return hash(col, row) % 4 === 0 ? 'grasscombo' : 'grass'
    }
    case 'H': {
      // A trodden path from the refectory arch to the fallen wall, wild grass around it
      const onPath = (row >= 25 && row <= 26 && col <= 25) || (col >= 24 && col <= 25 && row <= 26)
      if (onPath) return 'dirt_E'
      return ['grass', 'grasscombo', 'grass', 'grassflower'][hash(col, row) % 4]
    }
    case 'c':
      // The corner by the fallen-in yard is worn and cracked
      return col >= 20 && row >= 20 ? 'stoneUneven_E' : 'stone_E'
    default:
      return 'stone_E'
  }
}

/** Carpets lie on the floor: [col, row, sprite] */
const CARPETS: [number, number, string][] = []
// The church aisle, from the west end up to the altar
for (let col = 9; col <= 25; col++) CARPETS.push([col, 3, 'floorCarpet_N'])
// The sacristy
for (const col of [24, 25, 26, 27]) CARPETS.push([col, 10, 'floorCarpet_N'])

// ==========================================
// Furniture (it blocks the way unless marked `flat`)
// ==========================================
interface Prop {
  col: number
  row: number
  asset: string
  flat?: boolean
}
const p = (col: number, row: number, asset: string, flat = false): Prop => ({ col, row, asset, flat })

const PROPS: Prop[] = [
  // Church: two rows of columns down the nave, benches between them, the relic at the east end
  ...[11, 14, 17, 20, 23].flatMap(col => [p(col, 1, 'stoneColumn_E'), p(col, 6, 'stoneColumn_E')]),
  ...[12, 13, 15, 16, 18, 19, 21, 22].flatMap(col => [p(col, 1, 'longTable_S'), p(col, 6, 'longTable_S')]),
  p(28, 3, 'displayCaseSword_W'), p(28, 4, 'displayCase_W'), p(27, 1, 'bookStand_W'), p(29, 1, 'chestClosed_N'),
  // Library: shelves along the two far walls, reading tables in the middle
  p(0, 0, 'bookcaseGlass_S'), p(1, 0, 'wallBooks_S'), p(2, 0, 'wallBooks_S'), p(4, 0, 'wallBooks_S'), p(5, 0, 'wallBooks_S'), p(6, 0, 'bookcaseGlass_S'),
  p(0, 2, 'wallBooks_E'), p(0, 3, 'wallBooks_E'), p(0, 6, 'bookcaseHalfBooks_E'),
  p(3, 3, 'tableRoundItemsChairs_E'), p(5, 5, 'tableShortChairs_E'), p(6, 2, 'bookStand_S'), p(2, 6, 'libraryChair_N', true), p(7, 0, 'bookcaseHalfBooks_S'), p(5, 2, 'tableShortChairs_N'),
  // Crypt: columns in the corners, stone cases along the far wall
  p(0, 8, 'stoneColumn_E'), p(7, 8, 'stoneColumn_E'), p(0, 13, 'stoneColumn_E'), p(7, 13, 'stoneColumn_E'),
  p(0, 10, 'displayCase_E'), p(0, 11, 'displayCase_E'), p(1, 8, 'chestClosed_E'), p(6, 8, 'chestOpen_S'),
  // Cellar: casks, crates and sacks stacked along the walls
  p(0, 14, 'barrel'), p(1, 14, 'barrel'), p(0, 15, 'barrel'), p(0, 18, 'woodenCrate_E'), p(0, 19, 'woodenCrate_E'), p(1, 19, 'sack_E'),
  p(0, 21, 'woodenPile_E'), p(7, 14, 'sack_S'), p(7, 15, 'woodenCrate_E'), p(4, 21, 'ladderStand_N'),
  // Kitchen: the hearth, a work table, supplies
  p(0, 25, 'chimneyBase_E'), p(0, 22, 'sack_E'), p(1, 22, 'sack_S'), p(0, 29, 'woodenCrate_E'), p(1, 29, 'barrel'),
  p(3, 25, 'longTableLarge_E'), p(3, 26, 'longTableLarge_E'), p(4, 29, 'woodenPile_N'), p(7, 22, 'barrel'),
  // Refectory: two long rows of tables with a way through in the middle
  ...[10, 11, 12, 13, 16, 17, 18, 19].flatMap(col => [p(col, 24, 'longTableDecoratedChairs_W'), p(col, 27, 'longTableDecoratedChairs_W')]),
  p(14, 29, 'chestClosed_N'), p(15, 29, 'displayCaseOpen_N'),
  // Dormitory: straw beds and shelves along the outer wall, a table by the entrance
  p(28, 15, 'hay_W', true), p(28, 16, 'hay_W', true), p(28, 18, 'hay_W', true), p(28, 19, 'hay_W', true),
  p(29, 14, 'bookcaseHalfBooks_W'), p(29, 17, 'bookcaseHalfBooks_W'), p(29, 20, 'bookcaseHalfBooks_W'),
  p(22, 14, 'chestClosed_E'), p(22, 19, 'chestClosed_E'), p(25, 18, 'tableRoundItemsChairs_E'), p(25, 14, 'tableShortChairs_E'),
  // Sacristy: the church's treasures
  p(23, 8, 'displayCaseSword_S'), p(24, 8, 'displayCase_S'), p(29, 10, 'chestOpen_W'), p(23, 12, 'displayCaseOpen_N'), p(24, 12, 'chestClosed_N'),
  // The cloister garden: a tree in each lawn, columns around the paved middle
  p(11, 11, 'plants_1'), p(18, 11, 'plants_2'), p(11, 18, 'plants_3'), p(18, 18, 'plants_4'),
  p(13, 13, 'stoneColumn_E'), p(16, 13, 'stoneColumn_E'), p(13, 16, 'stoneColumn_E'), p(16, 16, 'stoneColumn_E'),
  // The yard: trees grown through the fallen roof, stones where the wall came down
  p(23, 23, 'plants_7'), p(27, 24, 'plants_5'), p(24, 28, 'plants_3'), p(28, 28, 'plants_6'),
  p(26, 22, 'stone_middle', true), p(23, 22, 'stone_small', true), p(27, 22, 'stone_small', true), p(28, 26, 'plants_one', true), p(22, 28, 'plants_one', true),
]

// ==========================================
// Hiding spots, candles, start points
// ==========================================
const spot = (col: number, row: number, kind: HideSpot['kind'], facing: SpriteFacing): HideSpot => ({ col, row, kind, facing })
const SPOTS: HideSpot[] = [
  // Cupboards against the far walls
  spot(3, 0, 'cabinet', 'S'), spot(0, 5, 'cabinet', 'E'), spot(9, 0, 'cabinet', 'S'), spot(2, 22, 'cabinet', 'S'),
  spot(15, 22, 'cabinet', 'S'), spot(24, 13, 'cabinet', 'S'), spot(28, 8, 'cabinet', 'S'),
  // Casks and crates in the corners
  spot(29, 7, 'barrel', 'W'), spot(7, 21, 'barrel', 'W'), spot(0, 17, 'barrel', 'E'), spot(7, 29, 'barrel', 'W'), spot(21, 29, 'barrel', 'W'),
  spot(8, 22, 'barrel', 'E'), spot(29, 21, 'barrel', 'W'), spot(29, 29, 'barrel', 'W'), spot(29, 22, 'barrel', 'W'),
  spot(21, 8, 'barrel', 'W'), spot(8, 21, 'barrel', 'E'), spot(7, 9, 'barrel', 'W'),
]
const at = (col: number, row: number): GridCoord => ({ col, row })
const TORCHES: GridCoord[] = [
  // Church: beside the altar and down the nave
  at(27, 2), at(27, 5), at(16, 2), at(16, 5), at(9, 5),
  // The rooms
  at(5, 3), at(6, 10), at(4, 18), at(5, 27), at(14, 26), at(15, 23), at(26, 15), at(26, 20), at(27, 10), at(26, 26),
  // The four corners of the cloister walk and the middle of the garden
  at(9, 9), at(20, 9), at(9, 20), at(20, 20), at(14, 14), at(15, 15),
]
const JAIL = at(4, 11)
const SEEKER_SPAWNS = [at(3, 10), at(5, 10), at(3, 12), at(5, 12), at(4, 9)]
const HIDER_SPAWNS = [at(9, 14), at(20, 15), at(14, 9), at(15, 20), at(5, 6), at(20, 4), at(15, 25), at(26, 17)]

const maze: HideSeekMaze = {
  // 0: not built from a seed
  seed: 0,
  cols: COLS,
  rows: ROWS,
  walls,
  holes,
  doors,
  exits: [],
  spots: SPOTS,
  torches: TORCHES,
  seekerBase: { col: 0, row: 8, cols: 8, rows: 6 },
  jail: JAIL,
  hiderBase: { col: 13, row: 13, cols: 4, rows: 4 },
  seekerSpawns: SEEKER_SPAWNS,
  hiderSpawns: HIDER_SPAWNS,
}

// ==========================================
// Layers
// ==========================================
const spriteDir = path.resolve('src/assets/sprites')
function sprite(asset: string): string {
  if (!fs.existsSync(path.join(spriteDir, `${asset}.png`))) throw new Error(`No sprite "${asset}"`)
  return `sprite-${asset}`
}
let nextId = 0
const id = () => `ruin-${(nextId++).toString(36)}`

const ground: Record<string, TileItem[]> = {}
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) ground[`${col},${row}`] = [{ id: id(), x: col, y: row, assetId: sprite(floorAt(col, row)), zIndex: 0 }]
}
// A runner lies down the middle of a two-tile aisle (half a tile towards the next row), its pieces enlarged to join up.
// It has its own layer: on the ground layer the next row's floor would cover it
const carpetTiles: Record<string, TileItem[]> = {}
for (const [col, row, asset] of CARPETS) {
  carpetTiles[`${col},${row}`] = [{ id: id(), x: col, y: row, assetId: sprite(asset), zIndex: 0, scale: 1.35, offsetX: -32, offsetY: 16 }]
}

/** The wall piece one step along the same line. */
function along(edge: MazeEdge, step: number): MazeEdge {
  return edge.axis === 'v' ? { ...edge, row: edge.row + step } : { ...edge, col: edge.col + step }
}

/**
 * How a wall piece looks: sound masonry everywhere, windows at a steady rhythm in the walls of the walk and the
 * outer walls, and crumbling pieces only around the fallen-in yard.
 */
function wallLook(edge: MazeEdge): string {
  const sides = edge.axis === 'v' ? [regionAt(edge.col - 1, edge.row), regionAt(edge.col, edge.row)] : [regionAt(edge.col, edge.row - 1), regionAt(edge.col, edge.row)]
  if (sides.includes('H')) {
    const roll = hash(edge.col, edge.row, edge.axis === 'v' ? 1 : 2) % 10
    return roll < 4 ? 'stoneWallBroken' : roll < 6 ? 'stoneWallAgedLeft' : roll < 7 ? 'stoneWallAgedRight' : 'stoneWallAged'
  }
  if (sides.includes('G')) return 'stoneWallAged'
  const index = edge.axis === 'v' ? edge.row : edge.col
  const besideOpening = openings.has(edgeKey(along(edge, 1))) || openings.has(edgeKey(along(edge, -1)))
  const windowed = sides.includes('c') || sides.includes('#')
  return windowed && !besideOpening && index % 3 === 1 ? 'stoneWallWindow' : 'stoneWallAged'
}

const wallTiles: Record<string, TileItem[]> = {}
function putWall(edge: MazeEdge, look: string): void {
  const place = edgePlacement(edge, COLS)
  // The outer pieces facing W / S only come as the plain wall
  const asset = place.suffix === 'W' || place.suffix === 'S' ? 'stoneWall' : look
  const item: TileItem = { id: id(), x: place.col, y: place.row, assetId: sprite(`${asset}_${place.suffix}`), zIndex: 0 }
  if (place.depthOffset) item.depthOffset = place.depthOffset
  ;(wallTiles[`${place.col},${place.row}`] ||= []).push(item)
}
for (const edge of walls) putWall(edge, wallLook(edge))
for (const edge of holes) putWall(edge, 'stoneWallHole')
for (const edge of arches) putWall(edge, 'stoneWallArchway')
for (const door of doors) for (const edge of door.edges) putWall(edge, 'stoneWallDoorClosed')

const propTiles: Record<string, TileItem[]> = {}
const place = (col: number, row: number, asset: string) =>
  (propTiles[`${col},${row}`] ||= []).push({ id: id(), x: col, y: row, assetId: sprite(asset), zIndex: 0 })
for (const prop of PROPS) place(prop.col, prop.row, prop.asset)
// What the game reads as the labyrinth: hiding spots (barrels and crates in turn, bookcases full of books) and candles
const BARRELS = ['barrels_E', 'woodenCrates_E', 'sacksCrate_E', 'barrelsStacked_S']
SPOTS.forEach((s, i) => place(s.col, s.row, s.kind === 'cabinet' ? `bookcaseBooks_${s.facing}` : BARRELS[i % BARRELS.length]))
for (const t of TORCHES) place(t.col, t.row, 'candleStand_E')

// ==========================================
// Collision: walls (the game adds crawl holes and shut doors itself) and furniture
// ==========================================
const solid = new Set<string>()
for (const edge of walls) for (const [sc, sr] of edgeSubCells(edge)) solid.add(`${sc},${sr}`)
const blocking = PROPS.filter(prop => !prop.flat)
for (const prop of blocking) solid.add(`${prop.col * 2},${prop.row * 2}`)
// Two pieces side by side leave no gap to slip through
for (const a of blocking) {
  for (const b of blocking) {
    if (Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1) solid.add(`${a.col + b.col},${a.row + b.row}`)
  }
}
const collisionSubcells = [...solid].filter(key => {
  const [sc, sr] = key.split(',').map(Number)
  return sc >= 0 && sr >= 0 && sc < COLS * 2 && sr < ROWS * 2
})

// ==========================================
// Checks: everything can be walked to, nothing stands in an entrance or on top of something else
// ==========================================
const grid = buildMazeGrid(maze, true, null)
for (const key of collisionSubcells) {
  const [sc, sr] = key.split(',').map(Number)
  grid.blocked[sr * grid.subCols + sc] = 1
}
const reached = reachableSubCells(grid, [HIDER_SPAWNS[0]])
const problems: string[] = []
const taken = new Set(blocking.map(prop => `${prop.col},${prop.row}`))
if (taken.size !== blocking.length) problems.push('two pieces of furniture stand on one tile')
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    if (!taken.has(`${col},${row}`) && !reached[row * 2 * grid.subCols + col * 2]) problems.push(`tile ${col},${row} cannot be reached`)
  }
}
const placed = new Set<string>()
for (const [what, list] of [['spot', SPOTS], ['candle', TORCHES], ['start', [...SEEKER_SPAWNS, ...HIDER_SPAWNS, JAIL]]] as [string, GridCoord[]][]) {
  for (const c of list) {
    if (taken.has(`${c.col},${c.row}`)) problems.push(`${what} ${c.col},${c.row} stands on furniture`)
    if (placed.has(`${c.col},${c.row}`)) problems.push(`${what} ${c.col},${c.row} stands on another spot / candle / start`)
    placed.add(`${c.col},${c.row}`)
  }
}
for (const key of openings.keys()) {
  const [col, row] = key.slice(1).split(',').map(Number)
  const cells = key[0] === 'v' ? [[col - 1, row], [col, row]] : [[col, row - 1], [col, row]]
  for (const [c, r] of cells) {
    if (taken.has(`${c},${r}`) || SPOTS.some(s => s.col === c && s.row === r)) problems.push(`something at ${c},${r} blocks the opening ${key}`)
  }
}
if (problems.length > 0) throw new Error(`The map has problems:\n${problems.join('\n')}`)

// ==========================================
// The map file
// ==========================================
const settings = normalizeHideSeekSettings({
  // The fuse: whoever holds the curse after this many seconds turns to stone
  roundTime: 35,
  // The scatter before each fuse: the carrier waits blind while the others run
  hideTime: 4,
  roundCount: 3,
  maxPlayers: 8,
  seekerSlots: 1,
  randomMaze: false,
  mazeCols: COLS,
  mazeRows: ROWS,
  mazeGrowPerSeeker: 0,
  doorCount: doors.length,
  holeCount: holes.length,
  torchCount: TORCHES.length,
  torchRadius: 4,
  hideSpotCount: SPOTS.length,
  exitCount: 0,
  trapCount: 0,
  seekerCandleCount: 0,
  huntTime: 0,
  // Passing the curse on, outliving a fuse, and being the last one standing
  scoreCatch: 10,
  scoreRescue: 25,
  scoreWin: 60,
  scorePerSecond: 1,
})
const starts = [...SEEKER_SPAWNS.map((c, i) => ({ c, name: `Seeker ${i + 1}` })), ...HIDER_SPAWNS.map((c, i) => ({ c, name: `Hider ${i + 1}` }))]
// A fixed date: the file only changes when the map does
const madeAt = Date.UTC(2026, 10, 12)
const payload = {
  version: '2.1.0',
  type: 'isocraft-map-project',
  project: {
    id: 'cursed-ruins',
    name: "La'natli Xarobalar",
    gameMode: 'curse',
    cols: COLS,
    rows: ROWS,
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#0b0714',
    showGrid: false,
    gridColor: '#d946ef',
    layers: [
      { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: ground },
      { id: 'layer-carpets', name: 'Carpets', visible: true, locked: false, opacity: 1, tiles: carpetTiles },
      { id: 'layer-walls', name: 'Walls', visible: true, locked: false, opacity: 1, tiles: wallTiles },
      { id: 'layer-furniture', name: 'Furniture', visible: true, locked: false, opacity: 1, tiles: propTiles },
    ],
    collisionSubcells,
    routes: starts.map(({ c, name }, i) => ({ id: `route-${i}`, name, routePoints: [c], playerCameraPoint: c })),
    gameSettings: { startingGold: 0, startingLives: 1, wavePrepTime: 0, maxPlayers: settings.maxPlayers },
    hideSeekSettings: settings,
    clans: [],
    placedTowers: [],
    towerBlueprints: [],
    waveConfigs: [],
    buildableCells: [],
    waterCells: [],
    buildMode: 'all',
    customProjectiles: [],
    createdAt: madeAt,
    updatedAt: madeAt,
  },
  assets: [],
  savedAt: new Date(madeAt).toISOString(),
}

// The game must read back exactly this labyrinth from the sprites
const readBack = readMapLabyrinth(payload.project, splitSpawns(starts.map(s => s.c)))
const counts = (m: HideSeekMaze | undefined) => [m?.spots.length, m?.torches.length, m?.doors.length, m?.holes.length, m?.jail.col, m?.jail.row].join(',')
if (counts(readBack?.maze) !== counts(maze)) throw new Error(`The game reads a different labyrinth: ${counts(readBack?.maze)} instead of ${counts(maze)}`)

const outFile = path.resolve("src/maps/La'natli Xarobalar.json")
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(`Cursed ruins ${COLS}x${ROWS}: ${walls.length} walls, ${doors.length} doors, ${holes.length} crawl holes, ${SPOTS.length} hiding spots, ${TORCHES.length} candles -> ${outFile}`)
