import fs from 'node:fs'
import path from 'node:path'
import { edgePlacement } from '../src/domain/hideseek'
import type { MazeEdge } from '../src/domain/hideseek'
import { PRESET_PROJECTILES } from '../src/domain/projectile/ProjectilePresets'
import type { GridCoord, Layer, TileItem, TowerBlueprint, TowerClan, WaveConfig } from '../src/types/map'

/**
 * Writes src/maps/Zumrad Vodiysi.json: a classic long-path tower defense map.
 * One road winds four times across a green valley from the portal (top left) to the castle (right),
 * past a lake whose stream runs under three bridges. Six clans, four simple towers each, thirty waves.
 *
 * Usage: npm run generate:valley [-- seed]
 */

const SIZE = 56
const seed = Number(process.argv[2]) || 2026

// ==========================================
// Seeded random (the same seed always gives the same map)
// ==========================================
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
const inside = (col: number, row: number) => col >= 0 && row >= 0 && col < SIZE && row < SIZE
let nextId = 0
const id = () => `zv-${(nextId++).toString(36)}`

// ==========================================
// The road
// ==========================================
/** Corners of the one route: in at the portal (top left), four long sweeps, out into the castle (right) */
const ROUTE: GridCoord[] = [
  { col: 3, row: 0 },
  { col: 3, row: 8 },
  { col: 50, row: 8 },
  { col: 50, row: 19 },
  { col: 6, row: 19 },
  { col: 6, row: 30 },
  { col: 50, row: 30 },
  { col: 50, row: 41 },
  { col: 10, row: 41 },
  { col: 10, row: 50 },
  { col: 47, row: 50 },
]

/** Every cell the walkers pass, in order */
function routeCells(points: GridCoord[]): GridCoord[] {
  const cells: GridCoord[] = [{ ...points[0] }]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dc = Math.sign(b.col - a.col)
    const dr = Math.sign(b.row - a.row)
    let c = a.col
    let r = a.row
    while (c !== b.col || r !== b.row) {
      c += dc
      r += dr
      cells.push({ col: c, row: r })
    }
  }
  return cells
}

const walk = routeCells(ROUTE)
/** The road is three cells wide: the walked line and one on each side (corners filled) */
const road = new Set<string>()
for (const p of walk) {
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (inside(p.col + dc, p.row + dr)) road.add(key(p.col + dc, p.row + dr))
}
/** How far (in cells, any direction) every cell is from the walked line */
const distToPath = new Map<string, number>()
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    let best = Infinity
    for (const p of walk) best = Math.min(best, Math.max(Math.abs(p.col - col), Math.abs(p.row - row)))
    distToPath.set(key(col, row), best)
  }
}

// ==========================================
// Water: a lake between the second and third sweep, its stream running south under three bridges, a pond up north
// ==========================================
const water = new Set<string>()
const bridges = new Set<string>()
function ellipse(cx: number, cy: number, rx: number, ry: number): void {
  for (let col = Math.floor(cx - rx); col <= Math.ceil(cx + rx); col++) {
    for (let row = Math.floor(cy - ry); row <= Math.ceil(cy + ry); row++) {
      const dx = (col - cx) / rx
      const dy = (row - cy) / ry
      // A slightly ragged shore
      if (dx * dx + dy * dy <= 1 + (random() - 0.5) * 0.25 && inside(col, row)) water.add(key(col, row))
    }
  }
}
ellipse(25, 24.5, 7.5, 2.6)
ellipse(44, 3, 4.5, 2.2)
for (let row = 26; row < SIZE; row++) {
  // The stream wanders a little
  const col = 22 + (row > 36 ? 1 : 0) + (row > 46 ? -1 : 0)
  for (const c of [col, col + 1]) {
    const k = key(c, row)
    if (road.has(k)) bridges.add(k)
    else water.add(k)
  }
}
for (const k of road) water.delete(k)

// ==========================================
// Special places
// ==========================================
/** Castle at the end of the road (its walls run on the cell edges around this rectangle) */
const CASTLE = { col: 46, row: 46, cols: 8, rows: 9 }
const inCastle = (col: number, row: number) =>
  col >= CASTLE.col && col < CASTLE.col + CASTLE.cols && row >= CASTLE.row && row < CASTLE.row + CASTLE.rows
/** The portal the creeps come out of */
const PORTAL = ROUTE[0]

// ==========================================
// Ground layer
// ==========================================
const ground: Record<string, TileItem[]> = {}
const decor: Record<string, TileItem[]> = {}
const blocked = new Set<string>() // cells with something standing on them (no building)

function put(layer: Record<string, TileItem[]>, col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): void {
  ;(layer[key(col, row)] ||= []).push({ id: id(), x: col, y: row, assetId, zIndex: layer === ground ? 0 : 1, ...extra })
}

for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const k = key(col, row)
    let asset: string
    if (bridges.has(k)) asset = 'sprite-planks_E'
    else if (inCastle(col, row)) asset = 'sprite-stone_E'
    else if (road.has(k)) asset = chance(0.14) ? 'sprite-dirtTiles_E' : 'sprite-dirt_E'
    // The water is drawn under the tiles: a water cell stays empty so it shows
    else if (water.has(k)) continue
    else {
      const roll = random()
      asset = roll < 0.07 ? 'sprite-grassflower' : roll < 0.1 ? 'sprite-grasscombo' : 'sprite-grass'
    }
    put(ground, col, row, asset)
  }
}

// ==========================================
// Decoration
// ==========================================
const free = (col: number, row: number) => {
  const k = key(col, row)
  return inside(col, row) && !road.has(k) && !water.has(k) && !bridges.has(k) && !blocked.has(k) && !inCastle(col, row)
}
function decorate(col: number, row: number, assetId: string, extra: Partial<TileItem> = {}): boolean {
  if (!free(col, row)) return false
  put(decor, col, row, assetId, extra)
  blocked.add(key(col, row))
  return true
}

const TREES = ['sprite-plants_2', 'sprite-plants_5', 'sprite-plants_7', 'sprite-plants_one', 'sprite-plants_6']
const BUSHES = ['sprite-plants_1', 'sprite-plants_3', 'sprite-plants_4']
const ROCKS = ['sprite-stone', 'sprite-stone_middle', 'sprite-stone_small']

// Forest everywhere the towers can not reach the road from (more than 5 cells away), thinner nearer
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const d = distToPath.get(key(col, row))!
    if (d >= 6 && chance(0.55)) decorate(col, row, pick(TREES))
    else if (d >= 5 && chance(0.18)) decorate(col, row, pick(BUSHES))
  }
}

// A thick tree line around the whole valley (it frames the map), wherever it does not crowd the road
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const edge = Math.min(col, row, SIZE - 1 - col, SIZE - 1 - row)
    const d = distToPath.get(key(col, row))!
    if (d < 2) continue
    if ((edge === 0 && chance(0.85)) || (edge === 1 && chance(0.45))) decorate(col, row, pick(TREES))
  }
}

// Reeds and stones along every shore
for (const k of water) {
  const [c, r] = k.split(',').map(Number)
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (chance(0.22)) decorate(c + dc, r + dr, chance(0.6) ? pick(BUSHES) : pick(ROCKS))
  }
}

// A few lone stones and bushes in the building fields (they stay rare so there is room to build)
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const d = distToPath.get(key(col, row))!
    if (d >= 2 && d <= 4 && chance(0.025)) decorate(col, row, chance(0.5) ? pick(ROCKS) : pick(BUSHES))
  }
}

// A farm in the north between the portal and the pond: corn rows behind a low fence, hay bales
for (let col = 10; col <= 30; col++) {
  for (let row = 1; row <= 4; row++) {
    if (col === 10 || col === 30 || row === 1 || row === 4) decorate(col, row, row === 1 || row === 4 ? 'sprite-fenceLow_N' : 'sprite-fenceLow_E')
    else decorate(col, row, (col + row) % 3 === 0 ? 'sprite-cornYoung_E' : pick(['sprite-corn_E', 'sprite-cornDouble_E']))
  }
}
decorate(32, 2, 'sprite-hayBalesStacked_S')
decorate(33, 4, 'sprite-hayBales_E')
decorate(8, 3, 'sprite-woodenCrates_E')
decorate(8, 4, 'sprite-barrels_E')

// A small camp beside the lake: barrels, crates, a chest
decorate(15, 23, 'sprite-woodenPile_E')
decorate(15, 25, 'sprite-barrelsStacked_S')
decorate(16, 26, 'sprite-sacksCrate_E')
decorate(35, 23, 'sprite-chestClosed_E')
decorate(35, 26, 'sprite-woodenCrate_E')

// The portal: two stone columns and candles at the top of the road
for (const [dc, asset] of [[-2, 'sprite-stoneColumn_E'], [2, 'sprite-stoneColumn_E']] as const) {
  blocked.delete(key(PORTAL.col + dc, PORTAL.row))
  decor[key(PORTAL.col + dc, PORTAL.row)] = []
  put(decor, PORTAL.col + dc, PORTAL.row, asset)
  blocked.add(key(PORTAL.col + dc, PORTAL.row))
}
decorate(PORTAL.col - 2, PORTAL.row + 2, 'sprite-candleStandDouble_E')
decorate(PORTAL.col + 2, PORTAL.row + 2, 'sprite-candleStandDouble_E')

// ==========================================
// The castle: stone walls on its edges with a gate where the road comes in, a yard inside
// ==========================================
const walls: MazeEdge[] = []
const gateRow = ROUTE[ROUTE.length - 1].row
const { col: c0, row: r0, cols: cw, rows: ch } = CASTLE
for (let c = c0; c < c0 + cw; c++) {
  walls.push({ axis: 'h', col: c, row: r0 })
  walls.push({ axis: 'h', col: c, row: r0 + ch })
}
for (let r = r0; r < r0 + ch; r++) {
  if (Math.abs(r - gateRow) > 1) walls.push({ axis: 'v', col: c0, row: r })
  walls.push({ axis: 'v', col: c0 + cw, row: r })
}
for (const edge of walls) {
  const at = edgePlacement(edge, SIZE)
  const isFront = at.suffix === 'W' || at.suffix === 'S'
  const piece = edge.axis === 'v' && edge.col === c0 && Math.abs(edge.row - gateRow) === 2
    ? 'stoneWallColumn'
    : chance(0.2) && !isFront ? 'stoneWallWindow' : isFront ? 'stoneWall' : 'stoneWallAged'
  const item: Partial<TileItem> = { zIndex: 0 }
  if (at.depthOffset) item.depthOffset = at.depthOffset
  put(decor, at.col, at.row, `sprite-${piece}_${at.suffix}`, item)
  blocked.add(key(at.col, at.row))
}
// The castle yard: banners of candles, a well-stocked store, a carpet up to the keep
for (const [c, r, asset] of [
  [c0 + 6, r0 + 1, 'sprite-candleStandDouble_E'],
  [c0 + 6, r0 + ch - 2, 'sprite-candleStandDouble_E'],
  [c0 + 2, r0 + 1, 'sprite-barrelsStacked_S'],
  [c0 + 3, r0 + 1, 'sprite-woodenCrates_E'],
  [c0 + 2, r0 + ch - 2, 'sprite-chestOpen_E'],
  [c0 + 3, r0 + ch - 2, 'sprite-sacksCrate_E'],
  [c0 + 6, gateRow - 2, 'sprite-tableRoundChairs_E'],
] as const) {
  put(decor, c, r, asset)
  blocked.add(key(c, r))
}

// ==========================================
// Where towers may stand: open grass near the road (not on it, not in water, not under decoration)
// ==========================================
const buildableCells: string[] = []
for (let col = 0; col < SIZE; col++) {
  for (let row = 0; row < SIZE; row++) {
    const k = key(col, row)
    const d = distToPath.get(k)!
    if (d >= 2 && d <= 5 && free(col, row)) buildableCells.push(k)
  }
}

// ==========================================
// Clans and towers (simple stats, the looks get designed later: sprites here are placeholders)
// ==========================================
const CLANS: TowerClan[] = [
  { id: 'clan-zv-fire', name: 'Olov ritsarlari', description: "Yondiruvchi zarbalar va portlashlar: to'da uchun.", iconName: 'Flame', color: '#ef4444', isDefault: true },
  { id: 'clan-zv-frost', name: "Muz qo'riqchilari", description: 'Sekinlashtiradi: boshqa minoralarga vaqt beradi.', iconName: 'Snowflake', color: '#38bdf8' },
  { id: 'clan-zv-poison', name: "Zahar botqog'i", description: "Vaqt o'tib zarar beruvchi zahar: semiz unitlarga qarshi.", iconName: 'Skull', color: '#84cc16' },
  { id: 'clan-zv-storm', name: 'Momaqaldiroq', description: 'Chaqmoq bir nechta unitga sakraydi va ularni qotiradi.', iconName: 'Zap', color: '#facc15' },
  { id: 'clan-zv-blood', name: 'Qon ovchilari', description: "Qon oqizadi va har zarbada kuchayib boradi: bossga qarshi.", iconName: 'Droplet', color: '#be123c' },
  { id: 'clan-zv-void', name: "Bo'shliq sehrgarlari", description: "Nishonni zaiflashtiradi: hamma minoralar ko'proq uradi.", iconName: 'Ghost', color: '#a855f7' },
]

type Tier = 0 | 1 | 2 | 3
/** Four towers per clan: a cheap starter, a support / splash tower, a heavy one and the late-game finisher */
const TIER = [
  { cost: 10, damage: 9, attackSpeed: 0.8, range: 5 },
  { cost: 50, damage: 26, attackSpeed: 1.1, range: 5 },
  { cost: 150, damage: 95, attackSpeed: 1.0, range: 5.5 },
  { cost: 420, damage: 300, attackSpeed: 1.2, range: 6 },
] as const

interface TowerSpec {
  name: string
  sprite: string
  projectile: string
  /** Multiplies the tier's damage / attack speed / range */
  damage?: number
  speed?: number
  range?: number
  splash?: number
  strategy?: TowerBlueprint['targetStrategy']
  extra?: Record<string, unknown>
}

const asset = (sprite: string, scale = 1) => ({
  assetId: `sprite-${sprite}`,
  assetName: `${sprite}.webp`,
  assetPath: '',
  scale,
  spanX: 1,
  spanY: 1,
  anchorX: 0.5,
  anchorY: 0.88,
  muzzleOffsetX: 0,
  muzzleOffsetY: -24,
})

const TOWERS: Record<string, { trait: string; towers: [TowerSpec, TowerSpec, TowerSpec, TowerSpec] }> = {
  'clan-zv-fire': {
    trait: 'fire',
    towers: [
      { name: 'Mash\'al', sprite: 'tower_fire_one', projectile: 'fire-comet', extra: { burnDps: 3, burnDuration: 2 } },
      { name: 'Olov qozoni', sprite: 'tower_fire', projectile: 'fire-boulder', damage: 0.8, speed: 1.3, splash: 1.4, extra: { burnDps: 8, burnDuration: 2.5 } },
      { name: 'Vulqon', sprite: 'tower_fire_three', projectile: 'fire-strike-eruption', splash: 1.6, speed: 1.2, extra: { burnDps: 25, burnDuration: 3 } },
      { name: 'Meteor qal\'asi', sprite: 'tower_fire4', projectile: 'fire-strike-meteor', splash: 2, speed: 1.4, extra: { burnDps: 80, burnDuration: 3 } },
    ],
  },
  'clan-zv-frost': {
    trait: 'frost',
    towers: [
      { name: 'Muz nayza', sprite: 'tower_ice1', projectile: 'frost-shard', extra: { slowPercent: 20, slowDuration: 1.5 } },
      { name: 'Qor bo\'roni', sprite: 'tower_ice2', projectile: 'frost-strike-nova', damage: 0.6, splash: 1.6, extra: { slowPercent: 35, slowDuration: 2 } },
      { name: 'Muz o\'qchisi', sprite: 'tower_ice4', projectile: 'frost-spear', range: 1.2, extra: { slowPercent: 30, slowDuration: 2, frostBonusDamage: 20 } },
      { name: 'Abadiy qish', sprite: 'tower_ice5', projectile: 'frost-beam-laser', speed: 0.8, extra: { slowPercent: 50, slowDuration: 2.5, frostBonusDamage: 80 } },
    ],
  },
  'clan-zv-poison': {
    trait: 'poison',
    towers: [
      { name: 'Zahar tomchi', sprite: 'tower_ice3', projectile: 'poison-teardrop', damage: 0.7, extra: { poisonDps: 5, poisonDuration: 4 } },
      { name: 'Botqoq bulut', sprite: 'tower_fire', projectile: 'poison-strike-vortex', damage: 0.5, splash: 1.5, extra: { poisonDps: 14, poisonDuration: 4, poisonSlowPercent: 15 } },
      { name: 'Zaharli ari', sprite: 'tower_ice2', projectile: 'poison-swarm', damage: 0.8, speed: 0.8, extra: { poisonDps: 45, poisonDuration: 5 } },
      { name: 'O\'lim botqog\'i', sprite: 'custom_tower_piece', projectile: 'poison-strike-eruption', splash: 2, extra: { poisonDps: 140, poisonDuration: 5, poisonSlowPercent: 20 } },
    ],
  },
  'clan-zv-storm': {
    trait: 'electric',
    towers: [
      { name: 'Uchqun', sprite: 'tower_ice1', projectile: 'electro-bolt', speed: 0.8, extra: { chainTargets: 2, electricBonusDamage: 3 } },
      { name: 'Chaqmoq ustuni', sprite: 'tower_ice3', projectile: 'electro-beam-lightning', extra: { chainTargets: 3, stunDuration: 0.2 } },
      { name: 'Bo\'ron minorasi', sprite: 'tower_ice4', projectile: 'electro-orbitals', speed: 0.9, extra: { chainTargets: 4, stunDuration: 0.3, electricBonusDamage: 25 } },
      { name: 'Osmon g\'azabi', sprite: 'tower_ice5', projectile: 'electro-strike-bolt', splash: 1.4, extra: { chainTargets: 5, stunDuration: 0.4, electricBonusDamage: 90 } },
    ],
  },
  'clan-zv-blood': {
    trait: 'blood',
    towers: [
      { name: 'Qon o\'qi', sprite: 'tower blood1', projectile: 'physical-arrow', speed: 0.7, range: 1.1, extra: { bleedDps: 3, bleedDuration: 3 } },
      { name: 'Pichoq raqsi', sprite: 'tower blood3', projectile: 'physical-strike-blades', splash: 1.2, extra: { bleedDps: 10, bleedDuration: 3 } },
      { name: 'Qon nayzasi', sprite: 'tower blood2', projectile: 'physical-spear', strategy: 'strongest', extra: { bleedDps: 30, bleedDuration: 4, stackBonusDamage: 8, maxStacks: 10 } },
      { name: 'Qon xudosi', sprite: 'custom_tower_piece', projectile: 'physical-barrage', strategy: 'strongest', speed: 0.9, extra: { bleedDps: 90, bleedDuration: 4, stackBonusDamage: 30, maxStacks: 12 } },
    ],
  },
  'clan-zv-void': {
    trait: 'void',
    towers: [
      { name: 'Soya shar', sprite: 'tower blood1', projectile: 'void-orb', extra: { voidVulnPercent: 8, voidDuration: 2 } },
      { name: 'Portal', sprite: 'tower blood3', projectile: 'void-strike-portal', damage: 0.7, splash: 1.5, extra: { voidVulnPercent: 15, voidDuration: 3 } },
      { name: 'Bosh suyagi', sprite: 'tower blood2', projectile: 'void-skull', range: 1.15, extra: { voidVulnPercent: 20, voidDuration: 3 } },
      { name: 'Qora tuynuk', sprite: 'tower_fire4', projectile: 'void-strike-vortex', splash: 2, speed: 1.1, extra: { voidVulnPercent: 30, voidDuration: 4 } },
    ],
  },
}

const towerBlueprints: TowerBlueprint[] = []
for (const clan of CLANS) {
  const { trait, towers } = TOWERS[clan.id]
  towers.forEach((spec, i) => {
    const tier = TIER[i as Tier]
    const traits = [trait] as TowerBlueprint['levels'][number]['traits']
    // The blood clan's bigger towers also grow stronger with every hit
    if (trait === 'blood' && i >= 2) traits!.push('stacking')
    towerBlueprints.push({
      id: `tower-zv-${clan.id.slice(8)}-${i + 1}`,
      name: spec.name,
      description: clan.name,
      clanId: clan.id,
      asset: asset(spec.sprite),
      projectileId: spec.projectile,
      targetStrategy: spec.strategy ?? 'first',
      levels: [{
        level: 1,
        name: spec.name,
        cost: tier.cost,
        damage: Math.round(tier.damage * (spec.damage ?? 1)),
        attackSpeed: Math.round(tier.attackSpeed * (spec.speed ?? 1) * 100) / 100,
        range: Math.round(tier.range * (spec.range ?? 1) * 10) / 10,
        isSplash: Boolean(spec.splash),
        ...(spec.splash ? { splashRadius: spec.splash, splashType: 'falloff' as const } : {}),
        traits,
        ...(spec.extra ?? {}),
      }],
    })
  })
}

// ==========================================
// Thirty waves: every one a different crowd (model, colour, speed, size), a boss every fifth
// ==========================================
interface WaveKind { model: string; variant: string; scale: number; speed: number; count: number; hp: number; anim: number }
const KIND = {
  peasant: { model: 'male', variant: 'normal', scale: 0.95, speed: 2.2, count: 18, hp: 1, anim: 0.9 },
  maiden: { model: 'female', variant: 'normal', scale: 0.95, speed: 2.4, count: 18, hp: 0.9, anim: 1 },
  zombie: { model: 'zombi', variant: 'poison', scale: 0.95, speed: 1.7, count: 28, hp: 0.55, anim: 0.8 },
  bird: { model: 'bird', variant: 'normal', scale: 0.85, speed: 3.4, count: 16, hp: 0.6, anim: 1.3 },
  barry: { model: 'barry', variant: 'golden', scale: 0.95, speed: 2.6, count: 16, hp: 1, anim: 1 },
  orc: { model: 'orc', variant: 'normal', scale: 1, speed: 1.6, count: 12, hp: 2.2, anim: 0.9 },
  warrior: { model: 'warrior', variant: 'normal', scale: 0.75, speed: 1.8, count: 12, hp: 2, anim: 1.6 },
  demon: { model: 'demon', variant: 'demon', scale: 1, speed: 2, count: 14, hp: 1.6, anim: 1 },
} satisfies Record<string, WaveKind>

/** [kind, variant override, name, immunities] for each wave; bosses on 5, 10, 15, 20, 25 and 30 */
const PLAN: [keyof typeof KIND, string | null, string, string[]?][] = [
  ['peasant', null, 'Qishloq qochoqlari'],
  ['maiden', null, 'Daydi sayyohlar'],
  ['zombie', null, "O'liklar uyg'ondi"],
  ['bird', null, 'Qora qarg\'alar'],
  ['orc', 'blood', 'BOSS: Qonli Ork', []],
  ['barry', null, 'Oltin o\'g\'rilar'],
  ['peasant', 'frost', 'Muz qishlog\'i'],
  ['warrior', null, 'Temir askarlar'],
  ['zombie', 'void', 'Soya o\'liklari'],
  ['demon', null, 'BOSS: Do\'zax darvozaboni', []],
  ['bird', 'electric', 'Chaqmoq qushlari'],
  ['maiden', 'poison', 'Botqoq jodugarlari'],
  ['orc', 'fire', 'Olovli orklar', ['fire']],
  ['barry', 'electric', 'Uchqun bandasi'],
  ['warrior', 'golden', 'BOSS: Oltin general', []],
  ['zombie', 'frost', 'Muzlagan o\'liklar', ['frost']],
  ['demon', 'void', 'Bo\'shliq jinlari'],
  ['bird', 'fire', 'Feniks to\'dasi'],
  ['orc', 'poison', 'Zaharli to\'da', ['poison']],
  ['demon', 'fire', 'BOSS: Olov lordi', ['fire']],
  ['peasant', 'blood', 'Qon qasamyodi'],
  ['warrior', 'frost', 'Shimol qo\'shini'],
  ['zombie', 'electric', 'Elektr o\'liklar', ['electric']],
  ['barry', 'void', 'Soya qaroqchilari', ['void']],
  ['orc', 'demon', 'BOSS: Jin qiroli', []],
  ['bird', 'void', 'Tun qanotlari'],
  ['maiden', 'golden', 'Oltin malikalar'],
  ['warrior', 'blood', 'Qon legioni', ['blood']],
  ['demon', 'electric', 'Bo\'ron jinlari', ['electric', 'frost']],
  ['demon', 'golden', 'FINAL BOSS: Vodiy yutuvchisi', []],
]

const waveConfigs: WaveConfig[] = PLAN.map(([kindName, variant, name, immunities], i) => {
  const n = i + 1
  const kind = KIND[kindName]
  const isBoss = n % 5 === 0
  // Health grows 16% a wave: 20 on the first, ~1500 by the last (the gold a player earns keeps up with that);
  // a boss is worth ten of its wave, the final one alone twenty-five
  const baseHp = 20 * Math.pow(1.16, n - 1)
  const count = isBoss ? (n === 30 ? 1 : n >= 20 ? 3 : 2) : kind.count
  const hp = isBoss ? baseHp * (n === 30 ? 25 : 10) : baseHp * kind.hp
  const gold = Math.max(1, Math.round(1 + n / 3.5))
  return {
    waveNumber: n,
    name,
    unitHp: Math.round(hp / 5) * 5 || 5,
    unitSpeed: Math.round((isBoss ? Math.min(kind.speed, 1.5) : kind.speed + n * 0.012) * 100) / 100,
    unitCount: count,
    isBoss,
    goldReward: isBoss ? gold * 8 : gold,
    unitBonus: isBoss ? gold * 8 : gold,
    endWaveBonus: n === 30 ? 0 : 12 + n * 3,
    characterModel: kind.model,
    animSpeed: kind.anim,
    offsetY: -3,
    unitScale: isBoss ? Math.min(1.5, kind.scale * 1.45) : kind.scale,
    unitVariant: (variant ?? kind.variant) as WaveConfig['unitVariant'],
    immunities: (immunities ?? []) as WaveConfig['immunities'],
  }
})

// ==========================================
// Write the map
// ==========================================
const layers: Layer[] = [
  { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: ground },
  { id: 'layer-objects', name: 'Objects', visible: true, locked: false, opacity: 1, tiles: {} },
  { id: 'layer-decoration', name: 'Decoration', visible: true, locked: false, opacity: 1, tiles: decor },
]
const now = Date.now()
const payload = {
  version: '2.1.0',
  type: 'isocraft-map-project',
  project: {
    id: 'zumrad-vodiysi',
    name: 'Zumrad Vodiysi',
    gameMode: 'td',
    cols: SIZE,
    rows: SIZE,
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#0b1a12',
    showGrid: false,
    gridColor: '#38bdf8',
    layers,
    gameSettings: {
      startingGold: 40,
      startingLives: 30,
      wavePrepTime: 15,
      spawnMode: 'all_routes',
      formation: 'pairs',
      pairDistance: 0.35,
      unitElevation: 0,
      unitScaleMultiplier: 1,
      scoreMultiplier: 1,
    },
    clans: CLANS,
    routes: [{ id: 'route-1', name: 'Vodiy yo\'li', routePoints: ROUTE, playerCameraPoint: { col: 12, row: 12 } }],
    placedTowers: [],
    towerBlueprints,
    waveConfigs,
    buildableCells,
    waterCells: [...water],
    buildMode: 'custom',
    customProjectiles: [],
    createdAt: now,
    updatedAt: now,
  },
  assets: [],
  savedAt: new Date(now).toISOString(),
}

// Every sprite and projectile used has to exist (a typo would show as an empty cell / a default shot in the game)
const manifest = JSON.parse(fs.readFileSync(path.resolve('src/assets/generated/spriteManifest.json'), 'utf8'))
const known = new Set<string>((Array.isArray(manifest) ? manifest : manifest.sprites ?? Object.values(manifest)).map((s: { id: string }) => s.id))
const used = new Set<string>()
for (const layer of layers) for (const items of Object.values(layer.tiles)) for (const item of items) used.add(item.assetId)
for (const bp of towerBlueprints) used.add(bp.asset.assetId)
const missing = [...used].filter(a => !known.has(a))
const presetIds = new Set(PRESET_PROJECTILES.map(p => p.id))
const badShots = towerBlueprints.filter(bp => !presetIds.has(bp.projectileId)).map(bp => `${bp.name}: ${bp.projectileId}`)
if (missing.length || badShots.length) {
  console.error('Unknown sprites:', missing, '\nUnknown projectiles:', badShots)
  process.exit(1)
}

const outFile = path.resolve('src/maps/Zumrad Vodiysi.json')
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(
  `Zumrad Vodiysi ${SIZE}x${SIZE} (seed ${seed}): road ${walk.length} cells, ${water.size} water, ${bridges.size} bridge cells, ` +
  `${buildableCells.length} buildable, ${Object.keys(decor).length} decorated cells, ${towerBlueprints.length} towers, ${waveConfigs.length} waves -> ${outFile}`
)
