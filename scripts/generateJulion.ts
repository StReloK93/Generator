import fs from 'node:fs'
import path from 'node:path'
import type { GridCoord, Layer, TileItem } from '../src/types/map'

/**
 * Re-dresses src/maps/Julion.json on the IsoForge ground tiles (the Qumli So'qmoq look). The game stays exactly as it
 * is: the same routes, build cells, camera points, waves and towers. The ground and the scenery are laid out again,
 * kept quiet so the eye stays on the lanes:
 *  - sand trails along the two routes, and no other paths;
 *  - two corn fields on ploughed earth, one of them right along the duel corridor;
 *  - trees only towards the map's edge, where it fades into the dark; open meadow everywhere else;
 *  - of the old buildings only the farm in the south west stays: no outer wall, no walled yard, no ruin.
 * Every cell's ground is the IsoForge piece that matches its four corners (grass, sand or earth), so the edges are soft.
 * Items this script places carry the `jl-` id prefix, so it can be run again over its own result.
 *
 * Usage: npm run generate:julion [-- seed]
 */

const FILE = path.resolve('src/maps/Julion.json')
const seed = Number(process.argv[2]) || 388

let state = seed >>> 0
function random(): number {
  state = (state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
const chance = (p: number) => random() < p

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
/** Smooth value noise, about one bump every 1 / scale cells */
function noise(x: number, y: number, scale: number): number {
  const x0 = Math.floor(x * scale)
  const y0 = Math.floor(y * scale)
  const fx = x * scale - x0
  const fy = y * scale - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx
  const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx
  return top + (bottom - top) * sy
}

const file = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const project = file.project
const SIZE: number = project.cols
const key = (col: number, row: number) => `${col},${row}`
const inside = (col: number, row: number) => col >= 0 && row >= 0 && col < SIZE && row < SIZE
const edgeDistance = (col: number, row: number) => Math.min(col, row, SIZE - 1 - col, SIZE - 1 - row)
let nextId = 0
const id = () => `jl-${(nextId++).toString(36)}`

const oldGround: Record<string, TileItem[]> = project.layers[0].tiles
const oldDecor: Record<string, TileItem[]> = project.layers.find((l: Layer) => l.id === 'layer-deco').tiles

// ==========================================
// Places
// ==========================================
interface Box { c0: number; c1: number; r0: number; r1: number }
const inBox = (b: Box, col: number, row: number) => col >= b.c0 && col <= b.c1 && row >= b.r0 && row <= b.r1
const grow = (b: Box, by: number): Box => ({ c0: b.c0 - by, c1: b.c1 + by, r0: b.r0 - by, r1: b.r1 + by })

/** Where the walled yard (north) and the ruin (west) stood: taken down, meadow now */
const TAKEN_DOWN: Box[] = [
  { c0: 11, c1: 23, r0: 3, r1: 11 },
  { c0: 2, c1: 12, r0: 16, r1: 24 },
]
/** The farm in the south west keeps its garden, house and fences; its paved ground turns to earth */
const FARM: Box = { c0: 0, c1: 13, r0: 46, r1: 53 }

/** Two corn fields on ploughed earth (more than that makes the map busy): ripe by the corridor, young in the north */
const FIELDS: (Box & { crop: readonly string[] })[] = [
  { c0: 21, c1: 37, r0: 22, r1: 25, crop: ['sprite-corn_E', 'sprite-corn_E', 'sprite-cornDouble_E'] },
  { c0: 34, c1: 46, r0: 8, r1: 14, crop: ['sprite-cornYoung_E', 'sprite-cornYoung_E', 'sprite-cornYoungDouble_S'] },
]

// ==========================================
// Trails: the routes only
// ==========================================
const trails: GridCoord[][] = project.routes.map((r: { routePoints: GridCoord[] }) => r.routePoints)
const routeCells = new Set<string>()
for (const points of trails) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    for (let col = a.col, row = a.row; ; col += Math.sign(b.col - a.col), row += Math.sign(b.row - a.row)) {
      routeCells.add(key(col, row))
      if (col === b.col && row === b.row) break
    }
  }
}

function distToTrails(x: number, y: number): number {
  let best = Infinity
  for (const points of trails) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      const dx = b.col - a.col
      const dy = b.row - a.row
      const len = dx * dx + dy * dy
      const t = len ? Math.max(0, Math.min(1, ((x - a.col) * dx + (y - a.row) * dy) / len)) : 0
      best = Math.min(best, Math.hypot(x - (a.col + dx * t), y - (a.row + dy * t)))
    }
  }
  return best
}

// ==========================================
// Ground: the terrain on a half-cell lattice of corners, then the piece matching each piece's four corners
// ==========================================
type Terrain = 'grass' | 'sand' | 'dirt'
/**
 * The trail fills its own cells and its soft edge laps only a quarter cell into the cells beside it, so a tower in the
 * middle of a build cell always stands on grass. That takes corners at half-cell steps: a cell the sand reaches is laid
 * from four half-size pieces, every other cell from one whole piece (its corners are the lattice's even ones).
 * Corner (I, J) sits at (I / 2 - 0.5, J / 2 - 0.5) in cell-centre coordinates.
 */
function cornerTerrain(I: number, J: number): Terrain {
  const x = I / 2 - 0.5
  const y = J / 2 - 0.5
  const toTrail = distToTrails(x, y)
  // The trail fills its cells up to their sides; the IsoForge pieces give the edge its soft, uneven line
  if (toTrail < 0.55) return 'sand'
  // Between two lanes side by side (the duel corridor) the sand runs across: one road, not two strips
  if (toTrail <= 0.5) {
    const touching = [[Math.floor(x), Math.floor(y)], [Math.ceil(x), Math.floor(y)], [Math.floor(x), Math.ceil(y)], [Math.ceil(x), Math.ceil(y)]]
    if (touching.every(([c, r]) => routeCells.has(key(c, r)))) return 'sand'
  }
  if (I % 2 || J % 2) return 'grass'
  const i = I / 2
  const j = J / 2
  for (const f of FIELDS) {
    if (i < f.c0 || i > f.c1 + 1 || j < f.r0 || j > f.r1 + 1) continue
    // Rounded field corners, and a ragged edge here and there
    const atCorner = (i === f.c0 || i === f.c1 + 1) && (j === f.r0 || j === f.r1 + 1)
    const onEdge = i === f.c0 || i === f.c1 + 1 || j === f.r0 || j === f.r1 + 1
    if (atCorner || (onEdge && noise(i, j, 0.7) < 0.22)) continue
    return 'dirt'
  }
  return 'grass'
}

const corners: Terrain[][] = []
for (let I = 0; I <= SIZE * 2; I++) {
  corners[I] = []
  for (let J = 0; J <= SIZE * 2; J++) corners[I][J] = cornerTerrain(I, J)
}

const ground: Record<string, TileItem[]> = {}
const decor: Record<string, TileItem[]> = {}
const blocked = new Set<string>()
/** Cells with sand or earth on them: no trees */
const bare = new Set<string>()

function put(layer: Record<string, TileItem[]>, col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): void {
  ;(layer[key(col, row)] ||= []).push({ id: id(), x: col, y: row, assetId, zIndex: layer === ground ? 0 : 1, ...extra })
}
const plain = (name: string) => `sprite-forge_${name}_${1 + Math.floor(random() * 3)}`
const wasPaved = (col: number, row: number) => (oldGround[key(col, row)] ?? []).some(item => /stone|dirt|planks/.test(item.assetId))

/** The IsoForge piece for four corners (top, right, left, bottom) */
function pieceFor(four: Terrain[]): string {
  const other = four.find(t => t !== 'grass')
  if (!other) return plain('grass')
  if (four.every(t => t === other)) return plain(other)
  // Corner bits: 1 top, 2 right, 4 left, 8 bottom corner is the grass (earth next to sand counts as grass)
  const mask = four.reduce((m, t, n) => (t !== other ? m | (1 << n) : m), 0)
  const piece = mask.toString().padStart(2, '0')
  if (other === 'dirt') return `sprite-forge_grass_dirt_${piece}`
  const variant = Math.floor(random() * 3)
  return `sprite-forge_grass_sand_${piece}${variant > 0 ? `_${variant + 1}` : ''}`
}
const fourAt = (I: number, J: number, step: number): Terrain[] => [corners[I][J], corners[I + step][J], corners[I][J + step], corners[I + step][J + step]]

/**
 * A half-size piece's place in its cell: scaled about the centre of its top face (IsoForge: y 437 of 512), moved a
 * quarter cell along each axis. Back pieces first, so a front piece's grass laps over the one behind.
 */
const FACE_ANCHOR_Y = 437 / 512
/** How far a whole piece's face centre sits above the cell centre: (0.88 - 437 / 512) of a 512 px sprite drawn at half size */
const FACE_RISE = (0.88 - FACE_ANCHOR_Y) * 512 * 0.5
const QUARTERS = [
  { a: 0, b: 0, offsetX: 0, offsetY: -16, zIndex: 0 },
  { a: 1, b: 0, offsetX: 32, offsetY: 0, zIndex: 1 },
  { a: 0, b: 1, offsetX: -32, offsetY: 0, zIndex: 1 },
  { a: 1, b: 1, offsetX: 0, offsetY: 16, zIndex: 2 },
] as const

for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const k = key(col, row)
    // The farm's paved ground turns to earth
    if (inBox(FARM, col, row) && wasPaved(col, row)) {
      put(ground, col, row, plain('dirt'))
      bare.add(k)
      continue
    }
    const I = col * 2
    const J = row * 2
    const nine = [0, 1, 2].flatMap(a => [0, 1, 2].map(b => corners[I + a][J + b]))
    if (nine.includes('sand')) {
      for (const q of QUARTERS) {
        put(ground, col, row, pieceFor(fourAt(I + q.a, J + q.b, 1)), {
          scale: 0.5, anchorX: 0.5, anchorY: FACE_ANCHOR_Y, offsetX: q.offsetX, offsetY: q.offsetY - FACE_RISE, zIndex: q.zIndex,
        })
      }
      bare.add(k)
      continue
    }
    const four = fourAt(I, J, 2)
    if (four.some(t => t !== 'grass')) bare.add(k)
    put(ground, col, row, pieceFor(four))
  }
}

// ==========================================
// Decoration: the farm stays; the rest is laid out again
// ==========================================
// A tower stands on grass: the sand never reaches the middle of a build cell (its centre corner on the lattice)
const buildable = new Set<string>(project.buildableCells)
const sandyMiddle = [...buildable].filter(k => {
  const [col, row] = k.split(',').map(Number)
  return corners[col * 2 + 1][row * 2 + 1] === 'sand'
})
if (sandyMiddle.length) {
  console.error('Build cells with sand in the middle:', sandyMiddle)
  process.exit(1)
}
for (const [k, items] of Object.entries(oldDecor)) {
  const [col, row] = k.split(',').map(Number)
  const kept = items.filter(item => {
    if (item.id.startsWith('jl-')) return false
    if (/plants/.test(item.assetId)) return false
    // No outer wall and gates (the map opens onto the world around it), no yard, no ruin
    if (edgeDistance(col, row) === 0 && /stoneWall/.test(item.assetId)) return false
    if (TAKEN_DOWN.some(b => inBox(b, col, row))) return false
    // Corn: the farm's garden keeps its own, the rest of the old corn gives way to the new fields
    return !/corn/.test(item.assetId) || inBox(FARM, col, row)
  })
  if (!kept.length) continue
  decor[k] = kept
  blocked.add(k)
}

const free = (col: number, row: number) =>
  inside(col, row) && !blocked.has(key(col, row)) && !buildable.has(key(col, row)) && !inBox(FARM, col, row)
function decorate(col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): boolean {
  if (!free(col, row)) return false
  put(decor, col, row, assetId, extra)
  blocked.add(key(col, row))
  return true
}
/** A little bigger or smaller and mirrored at random, so no two trees in a row look the same */
const natural = (): Partial<TileItem> => ({ scale: Math.round((0.86 + random() * 0.28) * 100) / 100, ...(chance(0.5) ? { flipX: true } : {}) })

// Corn in rows across each field, a gap now and then; hay at a corner
for (const f of FIELDS) {
  for (let col = f.c0 + 1; col < f.c1; col++) {
    for (let row = f.r0; row <= f.r1; row++) {
      if ((col - f.c0) % 2 === 1 && bare.has(key(col, row)) && !chance(0.08)) decorate(col, row, pick(f.crop))
    }
  }
  decorate(f.c1 + 1, f.r0 - 1, 'sprite-hayBalesStacked_W')
}

/** Patches of one kind of tree each, all greens: a calm palette */
const GROVES = [
  ['sprite-plants_3', 'sprite-plants_7', 'sprite-plants_3'],
  ['sprite-plants_6', 'sprite-plants_6', 'sprite-plants_3'],
  ['sprite-plants_3', 'sprite-plants_7', 'sprite-plants_7'],
] as const
const groveAt = (col: number, row: number) => GROVES[Math.min(GROVES.length - 1, Math.floor(noise(col + 50, row + 50, 0.09) * GROVES.length))]
const nearField = (col: number, row: number) => FIELDS.some(f => inBox(grow(f, 2), col, row))

for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    if (bare.has(key(col, row)) || nearField(col, row)) continue
    const toTrail = distToTrails(col, row)
    if (toTrail < 2.2) continue
    // Trees only towards the edge, where the map fades into the dark: a ragged band, thinning inwards
    const depth = edgeDistance(col, row) + (noise(col, row, 0.2) - 0.5) * 3
    const density = depth < 1 ? 0.55 : depth < 2 ? 0.32 : depth < 3.2 ? 0.12 : 0
    if (chance(toTrail < 3.2 ? density * 0.3 : density)) decorate(col, row, pick(groveAt(col, row)), natural())
  }
}

// Rocks: a few among the trees at the edge
for (let n = 0; n < 40; n++) {
  const col = Math.floor(random() * SIZE)
  const row = Math.floor(random() * SIZE)
  if (edgeDistance(col, row) > 4 || bare.has(key(col, row)) || distToTrails(col, row) < 1.6 || nearField(col, row)) continue
  decorate(col, row, pick(['sprite-stone_middle', 'sprite-stone_small', 'sprite-stone_small']), natural())
}

// ==========================================
// Write: only the ground and decoration layers change
// ==========================================
const layers: Layer[] = project.layers.map((layer: Layer) =>
  layer.id === 'layer-ground' ? { ...layer, tiles: ground } : layer.id === 'layer-deco' ? { ...layer, tiles: decor } : layer,
)

// Every sprite used has to exist (a typo would show as an empty cell in the game)
const manifest: { id: string }[] = JSON.parse(fs.readFileSync(path.resolve('src/assets/generated/spriteManifest.json'), 'utf8'))
const known = new Set(manifest.map(s => s.id))
const missing = new Set<string>()
for (const layer of layers) for (const items of Object.values(layer.tiles)) for (const item of items) if (!known.has(item.assetId)) missing.add(item.assetId)
if (missing.size) {
  console.error('Unknown sprites:', [...missing])
  process.exit(1)
}

// Nothing may sit on a build cell or on a lane
const newOnly = Object.entries(decor).filter(([k, items]) => items.some(i => i.id.startsWith('jl-')) && (buildable.has(k) || routeCells.has(k)))
if (newOnly.length) {
  console.error('Decoration on build or route cells:', newOnly.map(([k]) => k))
  process.exit(1)
}

file.project = { ...project, bgColor: '#0b1a12', layers, updatedAt: Date.now() }
file.savedAt = new Date().toISOString()
fs.writeFileSync(FILE, `${JSON.stringify(file, null, 2)}\n`)
const count = (tiles: Record<string, TileItem[]>) => Object.values(tiles).reduce((n, items) => n + items.length, 0)
console.log(`Julion ${SIZE}x${SIZE} (seed ${seed}): ${bare.size} bare cells, ${count(ground)} ground items, ${count(decor)} decorations, ${buildable.size} build cells, grass in the middle of each -> ${FILE}`)
