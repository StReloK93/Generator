import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates src/maps/Labyrinth.json: a braided maze for the hide & seek PvP mode.
 * Each maze cell is 2x2 map cells (corridors two tiles wide). Walls sit on cell edges and are drawn
 * on the far edge of the cell in front of them (stoneWall*_E / _S), so they depth-sort correctly.
 * Barrels and crates in dead ends / corners are solid: they block movement and sight (hiding spots).
 * Collision uses the 2x2 sub-grid: an edge at col + 0.5 is sub-column 2 * col + 1.
 *
 * Usage: node scripts/generateLabyrinth.js [seed]
 */

const MAZE_W = 10
const MAZE_H = 10
const CELL = 2
const BRAID_CHANCE = 0.14
const PROP_CHANCE = 0.12
const seed = Number(process.argv[2]) || 1337

const cols = MAZE_W * CELL + 1 // +1: the right / bottom outer walls are drawn in an extra row and column
const rows = MAZE_H * CELL + 1

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(seed)

// Walls between maze cells: east[x][y] = wall between (x,y) and (x+1,y); south[x][y] = between (x,y) and (x,y+1)
const east = Array.from({ length: MAZE_W }, () => Array(MAZE_H).fill(true))
const south = Array.from({ length: MAZE_W }, () => Array(MAZE_H).fill(true))

// Recursive backtracker (iterative)
const visited = Array.from({ length: MAZE_W }, () => Array(MAZE_H).fill(false))
const stack = [[0, 0]]
visited[0][0] = true
while (stack.length) {
  const [x, y] = stack[stack.length - 1]
  const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < MAZE_W && ny < MAZE_H && !visited[nx][ny])
  if (!options.length) {
    stack.pop()
    continue
  }
  const [nx, ny, dx, dy] = options[Math.floor(rand() * options.length)]
  if (dx === 1) east[x][y] = false
  if (dx === -1) east[nx][ny] = false
  if (dy === 1) south[x][y] = false
  if (dy === -1) south[nx][ny] = false
  visited[nx][ny] = true
  stack.push([nx, ny])
}

// Braid: open some extra walls so the maze has loops to run around
for (let x = 0; x < MAZE_W; x++) {
  for (let y = 0; y < MAZE_H; y++) {
    if (x < MAZE_W - 1 && east[x][y] && rand() < BRAID_CHANCE) east[x][y] = false
    if (y < MAZE_H - 1 && south[x][y] && rand() < BRAID_CHANCE) south[x][y] = false
  }
}

// Open the central maze cell's walls so both players start in a small plaza
const mid = Math.floor(MAZE_W / 2)
for (const [x, y] of [[mid - 1, mid - 1], [mid, mid - 1], [mid - 1, mid], [mid, mid]]) {
  if (x < mid) east[x][y] = false
  if (y < mid) south[x][y] = false
}

let idCounter = 0
const nextId = () => `item-lab-${(idCounter++).toString(36)}`

const groundTiles = {}
const wallTiles = {}
const collision = new Set()

const pushItem = (tiles, col, row, item) => {
  const key = `${col},${row}`
  ;(tiles[key] ||= []).push({ id: nextId(), ...item })
}

const pick = list => list[Math.floor(rand() * list.length)]
const hasVertical = (mx, my) => mx === 0 || mx === MAZE_W || east[mx - 1][my]
const hasHorizontal = (mx, my) => my === 0 || my === MAZE_H || south[mx][my - 1]
const isPlaza = (mx, my) => (mx === mid - 1 || mx === mid) && (my === mid - 1 || my === mid)
/** Open sides of a maze cell as [dx, dy] */
const openSides = (mx, my) =>
  [[-1, 0, !hasVertical(mx, my)], [1, 0, !hasVertical(mx + 1, my)], [0, -1, !hasHorizontal(mx, my)], [0, 1, !hasHorizontal(mx, my + 1)]]
    .filter(([, , open]) => open)
    .map(([dx, dy]) => [dx, dy])

// Floor: tiled plaza, packed dirt in dead ends, worn stone in the corridors
const corridorFloor = ['sprite-stone_E', 'sprite-stone_E', 'sprite-stone_E', 'sprite-stoneUneven_E', 'sprite-stoneUneven_E', 'sprite-stoneMissingTiles_E']
for (let mx = 0; mx < MAZE_W; mx++) {
  for (let my = 0; my < MAZE_H; my++) {
    const deadEnd = openSides(mx, my).length === 1
    for (let i = 0; i < CELL; i++) {
      for (let j = 0; j < CELL; j++) {
        const assetId = isPlaza(mx, my) ? 'sprite-stoneTile_E' : deadEnd ? 'sprite-dirtTiles_E' : pick(corridorFloor)
        pushItem(groundTiles, mx * CELL + i, my * CELL + j, { assetId })
      }
    }
  }
}

// Full height walls (taller than the characters), mostly plain with a few aged pieces
const wallsE = [...Array(8).fill('sprite-stoneWallAged_E'), 'sprite-stoneWallAgedLeft_E', 'sprite-stoneWallAgedRight_E']
const wallsS = [...Array(8).fill('sprite-stoneWall_S'), 'sprite-stoneWallAgedLeft_S', 'sprite-stoneWallAgedRight_S']

/** Wall on the vertical line col = edgeCol - 0.5, covering map row `row`. */
function addVerticalWall(edgeCol, row) {
  pushItem(wallTiles, edgeCol, row, { assetId: pick(wallsE), zIndex: 1 })
  for (const sr of [2 * row - 1, 2 * row, 2 * row + 1]) {
    if (sr >= 0) collision.add(`${2 * edgeCol - 1},${sr}`)
  }
}

/** Wall on the horizontal line row = edgeRow - 0.5, covering map column `col`. */
function addHorizontalWall(col, edgeRow) {
  pushItem(wallTiles, col, edgeRow, { assetId: pick(wallsS), zIndex: 1 })
  for (const sc of [2 * col - 1, 2 * col, 2 * col + 1]) {
    if (sc >= 0) collision.add(`${sc},${2 * edgeRow - 1}`)
  }
}

/** Solid prop on a map cell: blocks movement and sight at the cell center (a hiding spot). */
function addProp(col, row, assetId) {
  pushItem(wallTiles, col, row, { assetId, zIndex: 1 })
  collision.add(`${2 * col},${2 * row}`)
}

// Dead ends and some corridor corners get barrels / crates to hide behind
const props = ['sprite-barrels_E', 'sprite-woodenCrates_E', 'sprite-barrelsStacked_S', 'sprite-sacksCrate_E', 'sprite-barrel', 'sprite-woodenCrate_E']
for (let mx = 0; mx < MAZE_W; mx++) {
  for (let my = 0; my < MAZE_H; my++) {
    if (isPlaza(mx, my)) continue
    const open = openSides(mx, my)
    if (open.length !== 1 && rand() > PROP_CHANCE) continue
    // Back corner of the cell: away from an open side, against a wall
    const [dx, dy] = open.length === 1 ? open[0] : pick(open)
    const i = dx === 1 ? 0 : dx === -1 ? 1 : Math.floor(rand() * CELL)
    const j = dy === 1 ? 0 : dy === -1 ? 1 : Math.floor(rand() * CELL)
    addProp(mx * CELL + i, my * CELL + j, pick(props))
  }
}

// Candle stands light the corners of the starting plaza
for (const [col, row] of [[(mid - 1) * CELL, (mid - 1) * CELL], [mid * CELL + 1, (mid - 1) * CELL], [(mid - 1) * CELL, mid * CELL + 1], [mid * CELL + 1, mid * CELL + 1]]) {
  addProp(col, row, 'sprite-candleStandDouble_E')
}

// Vertical walls: maze line x = mx (between maze cells mx-1 and mx)
for (let mx = 0; mx <= MAZE_W; mx++) {
  for (let my = 0; my < MAZE_H; my++) {
    if (!hasVertical(mx, my)) continue
    for (let k = 0; k < CELL; k++) addVerticalWall(mx * CELL, my * CELL + k)
  }
}

// Horizontal walls: maze line y = my
for (let my = 0; my <= MAZE_H; my++) {
  for (let mx = 0; mx < MAZE_W; mx++) {
    if (!hasHorizontal(mx, my)) continue
    for (let k = 0; k < CELL; k++) addHorizontalWall(mx * CELL + k, my * CELL)
  }
}

// Posts on wall junctions hide the seams between wall pieces (column sits on the cell's top corner)
for (let mx = 0; mx <= MAZE_W; mx++) {
  for (let my = 0; my <= MAZE_H; my++) {
    const touches =
      (my < MAZE_H && hasVertical(mx, my)) ||
      (my > 0 && hasVertical(mx, my - 1)) ||
      (mx < MAZE_W && hasHorizontal(mx, my)) ||
      (mx > 0 && hasHorizontal(mx - 1, my))
    if (touches) pushItem(wallTiles, mx * CELL, my * CELL, { assetId: 'sprite-stoneWallColumn_S', zIndex: 2 })
  }
}

const center = mid * CELL
const now = Date.now()
const payload = {
  version: '2.1.0',
  type: 'isocraft-map-project',
  project: {
    id: 'labyrinth',
    name: 'Labirint',
    gameMode: 'hideseek',
    cols,
    rows,
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#07090f',
    showGrid: false,
    gridColor: '#38bdf8',
    layers: [
      { id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles: groundTiles },
      { id: 'layer-walls', name: 'Walls', visible: true, locked: false, opacity: 1, tiles: wallTiles },
    ],
    gameSettings: { startingGold: 0, startingLives: 1, wavePrepTime: 0, maxPlayers: 2 },
    hideSeekSettings: {
      roundTime: 180,
      hideTime: 5,
      runSpeed: 3.2,
      sneakSpeed: 0.8,
      visionRange: 10,
      visionAngle: 90,
      hearingRange: 9,
      catchDistance: 0.9,
      chestCount: 5,
    },
    clans: [],
    routes: [
      { id: 'route-seeker', name: 'Seeker', routePoints: [{ col: center - 1, row: center - 1 }], playerCameraPoint: { col: center - 1, row: center - 1 } },
      { id: 'route-hider', name: 'Hider', routePoints: [{ col: center, row: center }], playerCameraPoint: { col: center, row: center } },
    ],
    placedTowers: [],
    towerBlueprints: [],
    waveConfigs: [],
    buildableCells: [],
    waterCells: [],
    collisionSubcells: [...collision],
    buildMode: 'all',
    customProjectiles: [],
    createdAt: now,
    updatedAt: now,
  },
  assets: [],
  savedAt: new Date(now).toISOString(),
}

const outFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/maps/Labyrinth.json')
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(`Labyrinth ${cols}x${rows} (seed ${seed}): ${collision.size} blocked sub-cells -> ${outFile}`)
