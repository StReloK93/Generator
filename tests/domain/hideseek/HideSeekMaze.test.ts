import { describe, it, expect } from 'vitest'
import {
  generateMaze,
  buildMazeGrid,
  buildMazeMap,
  edgeSubCells,
  reachableSubCells,
  isBlockedAt,
  insideRect,
  mazeSize,
  normalizeHideSeekSettings,
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
      const starts = [...maze.seekerSpawns, ...maze.hiderSpawns]
      expect(cellsReached(buildMazeGrid(maze, true, null), starts)).toBe(options.cols * options.rows)
    }
  })

  it('lets only crawlers through crawl holes; shut doors stop everyone', () => {
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

  it('places cabinets and barrels to hide in, candle stands and start points for 4 seekers and 6 hiders', () => {
    const maze = generateMaze(11, options)
    expect(maze.spots.length).toBe(options.hideSpotCount)
    expect(maze.spots.some(s => s.kind === 'cabinet')).toBe(true)
    expect(maze.torches.length).toBeGreaterThan(0)
    expect(maze.seekerSpawns).toHaveLength(4)
    expect(maze.hiderSpawns).toHaveLength(6)
  })

  it('starts the seekers in their big base on one side and the hiders spread over the far side', () => {
    const dist = (a: { col: number; row: number }, b: { col: number; row: number }) => Math.hypot(a.col - b.col, a.row - b.row)
    for (const seed of [1, 7, 11, 99, 2024]) {
      const maze = generateMaze(seed, options)
      // A big yard, larger than a corridor crossing, on the seekers' half
      expect(maze.seekerBase.cols).toBeGreaterThanOrEqual(6)
      expect(maze.seekerBase.rows).toBeGreaterThanOrEqual(6)
      for (const corner of [maze.seekerBase, { col: maze.seekerBase.col + maze.seekerBase.cols - 1, row: maze.seekerBase.row + maze.seekerBase.rows - 1 }]) {
        expect(insideRect(maze.seekerSide, corner)).toBe(true)
      }
      for (const seeker of maze.seekerSpawns) expect(insideRect(maze.seekerBase, seeker)).toBe(true)
      // The jail in the seekers' base, the hiders' home (same size) on the far half
      expect(insideRect(maze.seekerBase, maze.jail)).toBe(true)
      expect(maze.hiderBase.cols).toBe(maze.seekerBase.cols)
      expect(insideRect(maze.seekerSide, { col: maze.hiderBase.col, row: maze.hiderBase.row })).toBe(false)
      for (const hider of maze.hiderSpawns) {
        expect(insideRect(maze.seekerSide, hider)).toBe(false)
        for (const exit of maze.exits) expect(dist(hider, exit.at)).toBeGreaterThanOrEqual(10)
      }
      const hiders = maze.hiderSpawns
      for (let i = 0; i < hiders.length; i++) {
        for (let j = i + 1; j < hiders.length; j++) expect(dist(hiders[i], hiders[j])).toBeGreaterThan(4)
      }
    }
    expect(generateMaze(3, options).hiderSpawns).not.toEqual(generateMaze(4, options).hiderSpawns)
  })

  it('puts the exit gates on the two flanks between the bases, shut for walking', () => {
    for (const seed of [8, 21, 333]) {
      const maze = generateMaze(seed, options)
      expect(maze.exits).toHaveLength(2)
      const [a, b] = maze.exits.map(e => e.at)
      expect(Math.hypot(a.col - b.col, a.row - b.row)).toBeGreaterThan(options.cols * 0.8)
      // Neither gate on the seekers' own wall nor the hiders' one
      const base = maze.seekerBase
      const baseIsLeftOrRight = base.col < 4 || base.col + base.cols > options.cols - 4
      for (const exit of [a, b]) {
        if (baseIsLeftOrRight) expect(exit.row === 0 || exit.row === options.rows - 1).toBe(true)
        else expect(exit.col === 0 || exit.col === options.cols - 1).toBe(true)
      }
    }
    const maze = generateMaze(8, options)
    const grid = buildMazeGrid(maze, false, null)
    const [sc, sr] = edgeSubCells(maze.exits[1].edges[0])[1]
    if (sc < grid.subCols && sr < grid.subRows) expect(isBlockedAt(grid, sc / 2, sr / 2)).toBe(true)
  })

  it('grows the labyrinth with the number of seekers', () => {
    const rules = normalizeHideSeekSettings({ mazeCols: 36, mazeRows: 36, mazeGrowPerSeeker: 10 })
    expect(mazeSize(rules, 1)).toEqual({ cols: 36, rows: 36 })
    expect(mazeSize(rules, 2)).toEqual({ cols: 46, rows: 46 })
    const big = generateMaze(5, { ...options, ...mazeSize(rules, 2) })
    expect(big.cols).toBe(46)
  })

  it('turns into map layers with collision for walls and holes', () => {
    const maze = generateMaze(3, options)
    const map = buildMazeMap(maze)
    expect(map.cols).toBe(40)
    expect(Object.keys(map.layers[0].tiles)).toHaveLength(40 * 40)
    expect(map.collisionSubcells.length).toBeGreaterThan(0)
    expect(map.routes[0].routePoints[0]).toEqual(maze.seekerSpawns[0])
    expect(map.routes).toHaveLength(maze.seekerSpawns.length + maze.hiderSpawns.length)
  })
})
