import { describe, it, expect } from 'vitest'
import { readMapLabyrinth, wallEdgeOf } from '@/domain/hideseek/HideSeekMapLayout'
import { edgePlacement } from '@/domain/hideseek/HideSeekMazeMap'
import type { Layer, TileItem } from '@/types/map'

const tile = (x: number, y: number, asset: string): TileItem => ({ id: `${asset}-${x}-${y}`, x, y, assetId: `sprite-${asset}`, zIndex: 0 })
const layer = (id: string, items: TileItem[]): Layer => ({
  id,
  name: id,
  visible: true,
  locked: false,
  opacity: 1,
  tiles: items.reduce<Record<string, TileItem[]>>((tiles, item) => ((tiles[`${item.x},${item.y}`] ||= []).push(item), tiles), {}),
})
const spawns = { seekers: [{ col: 1, row: 1 }], hiders: [{ col: 8, row: 8 }] }

describe('readMapLabyrinth', () => {
  it('is nothing on a map without labyrinth pieces', () => {
    const project = { cols: 10, rows: 10, layers: [layer('ground', [tile(0, 0, 'grass')])], collisionSubcells: [] }
    expect(readMapLabyrinth(project, spawns)).toBeNull()
  })

  it('reads hiding spots, candles, doors, crawl holes and the crypt from the sprites', () => {
    const project = {
      cols: 10,
      rows: 10,
      layers: [
        layer('ground', [tile(4, 4, 'stoneInset_E'), tile(5, 4, 'stoneInset_E'), tile(4, 5, 'stoneInset_E'), tile(2, 2, 'stone_E')]),
        layer('walls', [tile(3, 6, 'stoneWallDoorClosed_E'), tile(3, 7, 'stoneWallDoorClosed_E'), tile(6, 2, 'stoneWallHole_N'), tile(0, 0, 'stoneWall_E')]),
        layer('props', [tile(1, 3, 'barrels_E'), tile(7, 7, 'bookcaseBooks_S'), tile(5, 5, 'candleStand_E'), tile(2, 2, 'chair_E')]),
      ],
      // Wall pieces under the door and the hole are in the collision too
      collisionSubcells: ['5,12', '5,13', '12,5', '0,0'],
    }
    const read = readMapLabyrinth(project, spawns)!
    expect(read.maze.spots).toEqual([
      { col: 1, row: 3, kind: 'barrel', facing: 'E', asset: 'sprite-barrels_E' },
      { col: 7, row: 7, kind: 'cabinet', facing: 'S', asset: 'sprite-bookcaseBooks_S' },
    ])
    expect(read.maze.torches).toEqual([{ col: 5, row: 5 }])
    // Two door pieces side by side on one line: one double door
    expect(read.maze.doors).toEqual([{ edges: [{ axis: 'v', col: 3, row: 6 }, { axis: 'v', col: 3, row: 7 }], center: { col: 2.5, row: 6.5 } }])
    expect(read.maze.holes).toEqual([{ axis: 'h', col: 6, row: 3 }])
    expect(read.maze.jail).toEqual({ col: 4, row: 4 })
    // The game draws spots, candles and doors itself: they leave the layers; holes and the rest stay
    const left = read.layers.flatMap(l => Object.values(l.tiles).flat().map(t => t.assetId))
    expect(left.sort()).toEqual(['sprite-chair_E', 'sprite-stoneInset_E', 'sprite-stoneInset_E', 'sprite-stoneInset_E', 'sprite-stoneWallHole_N', 'sprite-stoneWall_E', 'sprite-stone_E'])
    // Doors and holes are not plain walls
    expect(read.collisionSubcells).toEqual(['0,0'])
  })

  it('puts a wall sprite back on the edge it was placed for', () => {
    for (const edge of [{ axis: 'v' as const, col: 3, row: 2 }, { axis: 'v' as const, col: 10, row: 2 }, { axis: 'h' as const, col: 3, row: 4 }, { axis: 'h' as const, col: 3, row: 0 }]) {
      const at = edgePlacement(edge, 10)
      expect(wallEdgeOf(at.col, at.row, at.suffix)).toEqual(edge)
    }
  })
})
