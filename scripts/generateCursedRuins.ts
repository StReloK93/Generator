import fs from 'node:fs'
import path from 'node:path'
import { generateMaze, buildMazeMap, normalizeHideSeekSettings } from '../src/domain/hideseek'

/**
 * Writes "src/maps/La'natli Xarobalar.json": the curse map. An overgrown ruin labyrinth with many barrels to hide in,
 * crawl holes, doors and candles, and no exit gates. Its rules ask for a new random labyrinth every round (built in
 * the game by the same generator, in the same ruins look), so the layout stored here is only the preview / first look.
 *
 * Usage: npm run generate:curse [-- seed]
 */

const seed = Number(process.argv[2]) || 4242
const settings = normalizeHideSeekSettings({
  // The fuse: whoever holds the curse after this many seconds turns to stone
  roundTime: 35,
  // The scatter before each fuse: the carrier waits blind while the others run
  hideTime: 4,
  roundCount: 3,
  maxPlayers: 8,
  seekerSlots: 1,
  randomMaze: true,
  mazeCols: 30,
  mazeRows: 30,
  mazeGrowPerSeeker: 0,
  roomCount: 6,
  doorCount: 4,
  holeCount: 6,
  torchCount: 12,
  torchRadius: 5,
  hideSpotCount: 14,
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
const maze = generateMaze(seed, {
  cols: settings.mazeCols,
  rows: settings.mazeRows,
  roomCount: settings.roomCount,
  doorCount: settings.doorCount,
  holeCount: settings.holeCount,
  torchCount: settings.torchCount,
  hideSpotCount: settings.hideSpotCount,
  exitCount: settings.exitCount,
})
const now = Date.now()
const payload = {
  version: '2.1.0',
  type: 'isocraft-map-project',
  project: {
    id: 'cursed-ruins',
    name: "La'natli Xarobalar",
    gameMode: 'curse',
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#0b0714',
    showGrid: false,
    gridColor: '#d946ef',
    ...buildMazeMap(maze, 'ruins'),
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
    createdAt: now,
    updatedAt: now,
  },
  assets: [],
  savedAt: new Date(now).toISOString(),
}

const outFile = path.resolve("src/maps/La'natli Xarobalar.json")
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(`Cursed ruins ${maze.cols}x${maze.rows} (seed ${seed}): ${maze.walls.length} walls, ${maze.spots.length} barrels -> ${outFile}`)
