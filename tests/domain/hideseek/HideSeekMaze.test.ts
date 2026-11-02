import { describe, it, expect } from 'vitest'
import {
  generateMaze,
  buildMazeGrid,
  buildMazeMap,
  edgeSubCells,
  reachableSubCells,
  isBlockedAt,
  MazeOptions,
} from '@/domain/hideseek'

const options: MazeOptions = { cols: 40, rows: 40, roomCount: 7, doorCount: 6, holeCount: 4, torchCount: 8, hideSpotCount: 6, exitCount: 2 }

/** Every cell center the maze has (all of them should be walkable from the spawns). */
function cellsReached(grid: ReturnType<typeof buildMazeGrid>, from: { col: number; row: number }[]): number {
  const reached = reachableSubCells(grid, from)
  let count = 0
  for (let col = 0; col < options.cols; col++) {
    for (let row = 0; row < options.rows; row++) if (reached[row * 2 * grid.subCols + col * 2]) count++
  }
  return count
}

describe('HideSeekMaze', () => {
  it('builds the same labyrinth from the same seed (every client gets the host maze)', () => {
    expect(generateMaze(42, options)).toEqual(generateMaze(42, options))
    expect(generateMaze(42, options).walls).not.toEqual(generateMaze(43, options).walls)
  })

  it('reaches every cell with the doors open, without needing the crawl holes', () => {
    for (const seed of [1, 7, 99, 2024]) {
      const maze = generateMaze(seed, options)
      expect(cellsReached(buildMazeGrid(maze, true, null), maze.spawns)).toBe(options.cols * options.rows)
    }
  })

  it('lets hiders through crawl holes but not the seeker; shut doors stop everyone', () => {
    const maze = generateMaze(5, options)
    expect(maze.holes.length).toBeGreaterThan(0)
    expect(maze.doors.length).toBe(options.doorCount)
    const hole = maze.holes[0]
    const [sc, sr] = edgeSubCells(hole)[1]
    const at = { col: sc / 2, row: sr / 2 }
    expect(isBlockedAt(buildMazeGrid(maze, true, null), at.col, at.row)).toBe(true)
    expect(isBlockedAt(buildMazeGrid(maze, false, null), at.col, at.row)).toBe(false)

    const door = maze.doors[0]
    const shut = buildMazeGrid(maze, false, maze.doors.map(() => false))
    const open = buildMazeGrid(maze, false, maze.doors.map(() => true))
    expect(isBlockedAt(shut, door.center.col, door.center.row)).toBe(true)
    expect(isBlockedAt(open, door.center.col, door.center.row)).toBe(false)
  })

  it('places cabinets and barrels to hide in, candle stands and four spawns', () => {
    const maze = generateMaze(11, options)
    expect(maze.spots.length).toBe(options.hideSpotCount)
    expect(maze.spots.some(s => s.kind === 'cabinet')).toBe(true)
    expect(maze.torches.length).toBeGreaterThan(0)
    expect(maze.spawns).toHaveLength(4)
  })

  it('puts the exit gates on opposite sides of the outer wall, shut for walking', () => {
    const maze = generateMaze(8, options)
    expect(maze.exits).toHaveLength(2)
    const [a, b] = maze.exits.map(e => e.at)
    expect(Math.hypot(a.col - b.col, a.row - b.row)).toBeGreaterThan(options.cols * 0.8)
    const grid = buildMazeGrid(maze, false, null)
    const [sc, sr] = edgeSubCells(maze.exits[1].edges[0])[1]
    if (sc < grid.subCols && sr < grid.subRows) expect(isBlockedAt(grid, sc / 2, sr / 2)).toBe(true)
  })

  it('turns into map layers with collision for walls and holes', () => {
    const maze = generateMaze(3, options)
    const map = buildMazeMap(maze)
    expect(map.cols).toBe(40)
    expect(Object.keys(map.layers[0].tiles)).toHaveLength(40 * 40)
    expect(map.collisionSubcells.length).toBeGreaterThan(0)
    expect(map.routes[0].routePoints[0]).toEqual(maze.spawns[0])
  })
})
