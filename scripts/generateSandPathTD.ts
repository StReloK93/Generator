import fs from 'node:fs'
import path from 'node:path'
import type { GridCoord, Layer, TileItem } from '../src/types/map'

/**
 * Writes src/maps/Qumli So'qmoq.json: a 30 x 30 one-player tower defense map on the IsoForge ground tiles.
 *
 * One sand trail winds from the gate on the top edge down to the bottom edge, with meadows to build on between
 * its passes. The trail's shape is worked out on the cell corners (a corner is sand when the trail passes close
 * by), so every cell gets the IsoForge piece that matches its four corners: plain grass, plain sand, or one of the
 * 14 grass-over-sand pieces. That is what lets the trail have soft, wandering edges and round bends.
 * The game itself (clans, towers, projectiles, waves, gold) is the Julion map's.
 *
 * Usage: npm run generate:sandpath [-- seed]
 */

const SIZE = 30
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

const key = (col: number, row: number) => `${col},${row}`
const edgeDistance = (col: number, row: number) => Math.min(col, row, SIZE - 1 - col, SIZE - 1 - row)
let nextId = 0
const id = () => `qs-${(nextId++).toString(36)}`

// ==========================================
// The trail
// ==========================================
const ROUTE: GridCoord[] = [
  { col: 4, row: 0 },
  { col: 4, row: 9 },
  { col: 14, row: 9 },
  { col: 14, row: 3 },
  { col: 25, row: 3 },
  { col: 25, row: 15 },
  { col: 7, row: 15 },
  { col: 7, row: 25 },
  { col: 18, row: 25 },
  { col: 18, row: 21 },
  { col: 26, row: 21 },
  { col: 26, row: 29 },
]

/** Distance from a point to the trail's centre line */
function distToTrail(x: number, y: number): number {
  let best = Infinity
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1]
    const b = ROUTE[i]
    const dx = b.col - a.col
    const dy = b.row - a.row
    const t = Math.max(0, Math.min(1, ((x - a.col) * dx + (y - a.row) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(x - (a.col + dx * t), y - (a.row + dy * t)))
  }
  return best
}

/** Smooth noise on the corner lattice: makes the trail's edge wander */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function wobble(x: number, y: number): number {
  const s = 0.35
  const x0 = Math.floor(x * s)
  const y0 = Math.floor(y * s)
  const fx = x * s - x0
  const fy = y * s - y0
  const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * fx
  const bottom = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * fx
  return top + (bottom - top) * fy
}

/**
 * Trail half width at the corners: about three cells of sand. The edge wanders only a little here (a big
 * wander turns straight edges into a saw); the IsoForge pieces give the edge its own soft, uneven line.
 */
const HALF_WIDTH = 1.3
/** Corner (i, j) sits between cells: at (i - 0.5, j - 0.5) in cell-centre coordinates */
const cornerIsGrass = (i: number, j: number) => distToTrail(i - 0.5, j - 0.5) > HALF_WIDTH + (wobble(i, j) - 0.5) * 0.4

// ==========================================
// Ground: the piece that matches each cell's four corners
// ==========================================
const ground: Record<string, TileItem[]> = {}
const decor: Record<string, TileItem[]> = {}
const blocked = new Set<string>()
/** Cells with any sand on them (no trees, no towers) */
const sandy = new Set<string>()

function put(layer: Record<string, TileItem[]>, col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): void {
  ;(layer[key(col, row)] ||= []).push({ id: id(), x: col, y: row, assetId, zIndex: layer === ground ? 0 : 1, ...extra })
}

for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    // IsoForge corner bits: 1 top, 2 right, 4 left, 8 bottom corner is the grass
    const mask = (cornerIsGrass(col, row) ? 1 : 0) | (cornerIsGrass(col + 1, row) ? 2 : 0) | (cornerIsGrass(col, row + 1) ? 4 : 0) | (cornerIsGrass(col + 1, row + 1) ? 8 : 0)
    let asset: string
    if (mask === 15) asset = `sprite-forge_grass_${1 + Math.floor(random() * 3)}`
    else if (mask === 0) asset = `sprite-forge_sand_${1 + Math.floor(random() * 3)}`
    else {
      // Three variants per piece (the same seams, a differently bent border): a long edge does not repeat
      const variant = Math.floor(random() * 3)
      asset = `sprite-forge_grass_sand_${mask.toString().padStart(2, '0')}${variant > 0 ? `_${variant + 1}` : ''}`
    }
    if (mask !== 15) sandy.add(key(col, row))
    put(ground, col, row, asset)
  }
}

// ==========================================
// Decoration
// ==========================================
const inside = (col: number, row: number) => col >= 0 && row >= 0 && col < SIZE && row < SIZE
const free = (col: number, row: number) => inside(col, row) && !sandy.has(key(col, row)) && !blocked.has(key(col, row))
function decorate(col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): boolean {
  if (!free(col, row)) return false
  put(decor, col, row, assetId, extra)
  blocked.add(key(col, row))
  return true
}
/** A little bigger or smaller and mirrored at random, so no two trees in a row look the same */
const natural = (): Partial<TileItem> => ({ scale: Math.round((0.86 + random() * 0.28) * 100) / 100, ...(chance(0.5) ? { flipX: true } : {}) })

/** Woods of one kind of tree each: green oaks, cypress, cherry, and one autumn corner for colour */
const GROVES = [
  ['sprite-plants_3', 'sprite-plants_7', 'sprite-plants_3'],
  ['sprite-plants_6', 'sprite-plants_6', 'sprite-plants_3'],
  ['sprite-plants_1', 'sprite-plants_1', 'sprite-plants_7'],
  ['sprite-plants_2', 'sprite-plants_2', 'sprite-plants_7'],
] as const
const groveAt = (col: number, row: number) => GROVES[Math.min(GROVES.length - 1, Math.floor(wobble(col * 0.6 + 50, row * 0.6 + 50) * GROVES.length))]

// The gate on the top edge and the way out on the bottom edge: stone columns and candles either side of the trail
const start = ROUTE[0]
const end = ROUTE[ROUTE.length - 1]
for (const [c, r, asset] of [
  [start.col - 3, start.row, 'sprite-stoneColumn_E'],
  [start.col + 3, start.row, 'sprite-stoneColumn_E'],
  [start.col - 3, start.row + 2, 'sprite-candleStandDouble_E'],
  [start.col + 3, start.row + 2, 'sprite-candleStandDouble_E'],
  [end.col - 3, end.row, 'sprite-stoneColumn_E'],
  [end.col + 3, end.row, 'sprite-stoneColumn_E'],
  [end.col - 3, end.row - 2, 'sprite-candleStandDouble_E'],
  [end.col + 3, end.row - 2, 'sprite-candleStandDouble_E'],
] as const) decorate(c, r, asset)

// Woods: thick at the rim and wherever a tower could not reach the trail
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const d = distToTrail(col, row)
    const edge = edgeDistance(col, row)
    const density = edge === 0 ? 0.85 : edge === 1 ? 0.55 : d > 5.5 ? 0.6 : d > 4.5 ? 0.25 : 0
    if (chance(density)) decorate(col, row, pick(groveAt(col, row)), natural())
  }
}

// Rocks on the outside of a few bends, and a rare lone one in the meadows
for (const bend of [ROUTE[2], ROUTE[4], ROUTE[6], ROUTE[9]]) {
  for (let k = 0; k < 4; k++) decorate(bend.col + Math.round((random() - 0.5) * 6), bend.row + Math.round((random() - 0.5) * 6), pick(['sprite-stone_middle', 'sprite-stone_small', 'sprite-stone_small']), natural())
}

// ==========================================
// Where towers may stand: grass within reach of the trail
// ==========================================
const buildableCells: string[] = []
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    if (free(col, row) && edgeDistance(col, row) >= 1 && distToTrail(col, row) <= 4.5) buildableCells.push(key(col, row))
  }
}

// ==========================================
// The game: Julion's clans, towers, projectiles, waves and gold
// ==========================================
const julion = JSON.parse(fs.readFileSync(path.resolve('src/maps/Julion.json'), 'utf8')).project

const layers: Layer[] = [
  { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: ground },
  { id: 'layer-objects', name: 'Objects', visible: true, locked: false, opacity: 1, tiles: {} },
  { id: 'layer-decoration', name: 'Decoration', visible: true, locked: false, opacity: 1, tiles: decor },
]

// Every sprite used has to exist (a typo would show as an empty cell in the game)
const manifest: { id: string }[] = JSON.parse(fs.readFileSync(path.resolve('src/assets/generated/spriteManifest.json'), 'utf8'))
const known = new Set(manifest.map(s => s.id))
const missing = new Set<string>()
for (const layer of layers) for (const items of Object.values(layer.tiles)) for (const item of items) if (!known.has(item.assetId)) missing.add(item.assetId)
if (missing.size) {
  console.error('Unknown sprites (export them from IsoForge and run npm run generate:assets):', [...missing])
  process.exit(1)
}

const now = Date.now()
const payload = {
  version: '2.1.0',
  type: 'isocraft-map-project',
  project: {
    id: 'qumli-soqmoq',
    name: "Qumli So'qmoq",
    gameMode: 'td',
    cols: SIZE,
    rows: SIZE,
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#0b1a12',
    showGrid: false,
    gridColor: '#38bdf8',
    layers,
    gameSettings: { ...julion.gameSettings, spawnMode: 'all_routes' },
    clans: julion.clans,
    routes: [{ id: 'route-1', name: "Qumli so'qmoq", routePoints: ROUTE, playerCameraPoint: { col: 8, row: 7 } }],
    placedTowers: [],
    towerBlueprints: julion.towerBlueprints,
    waveConfigs: julion.waveConfigs,
    buildableCells,
    waterCells: [],
    buildMode: 'custom',
    customProjectiles: julion.customProjectiles ?? [],
    createdAt: now,
    updatedAt: now,
  },
  assets: [],
  savedAt: new Date(now).toISOString(),
}

const outFile = path.resolve("src/maps/Qumli So'qmoq.json")
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(`Qumli So'qmoq ${SIZE}x${SIZE} (seed ${seed}): ${sandy.size} sandy cells, ${buildableCells.length} buildable, ${Object.keys(decor).length} decorated cells -> ${outFile}`)
