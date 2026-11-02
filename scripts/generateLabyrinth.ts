import fs from 'node:fs'
import path from 'node:path'
import { generateMaze, buildMazeMap, normalizeHideSeekSettings } from '../src/domain/hideseek'

/**
 * Writes src/maps/Labyrinth.json: the hide & seek PvP map. Its rules ask for a new random labyrinth every round
 * (built in the game by the same generator), so the layout stored here is only the preview / first look.
 *
 * Usage: npm run generate:labyrinth [-- seed]
 */

const seed = Number(process.argv[2]) || 1337
const settings = normalizeHideSeekSettings({
  roundTime: 180,
  hideTime: 5,
  lanternRadius: 0,
  randomMaze: true,
  mazeCols: 40,
  mazeRows: 40,
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
    id: 'labyrinth',
    name: 'Labirint',
    gameMode: 'hideseek',
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#07090f',
    showGrid: false,
    gridColor: '#38bdf8',
    ...buildMazeMap(maze),
    gameSettings: { startingGold: 0, startingLives: 1, wavePrepTime: 0, maxPlayers: 4 },
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

const outFile = path.resolve('src/maps/Labyrinth.json')
fs.writeFileSync(outFile, JSON.stringify(payload))
console.log(`Labyrinth ${maze.cols}x${maze.rows} (seed ${seed}): ${maze.walls.length} walls, ${maze.doors.length} doors, ${maze.holes.length} holes -> ${outFile}`)
