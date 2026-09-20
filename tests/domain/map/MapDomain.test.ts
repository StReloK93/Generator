import { describe, it, expect } from 'vitest'
import { MapQueries } from '@/domain/map/MapQueries'
import { TileMutations } from '@/domain/map/TileMutations'
import { Layer, TileItem } from '@/types/map'

describe('Map Domain Logic (Queries & Mutations)', () => {
  const mockLayers: Layer[] = [
    {
      id: 'layer-ground',
      name: 'Ground',
      visible: true,
      locked: false,
      tiles: {
        '0,0': [
          {
            id: 't-1',
            x: 0,
            y: 0,
            assetId: 'sprite-grass.png',
            zIndex: 0,
            scale: 1,
            anchorX: 0.5,
            anchorY: 0.5,
          },
        ],
        '1,0': [
          {
            id: 't-2',
            x: 1,
            y: 0,
            assetId: 'sprite-stone.png',
            zIndex: 0,
            scale: 1,
            anchorX: 0.5,
            anchorY: 0.5,
          },
        ],
      },
    },
    {
      id: 'layer-objects',
      name: 'Objects',
      visible: true,
      locked: false,
      tiles: {
        '0,0': [
          {
            id: 't-3',
            x: 0,
            y: 0,
            assetId: 'sprite-tree.png',
            zIndex: 1,
            scale: 1,
            anchorX: 0.5,
            anchorY: 0.5,
          },
        ],
      },
    },
  ]

  it('getUsedAssetIds should collect all unique asset identifiers and clean names', () => {
    const usedIds = MapQueries.getUsedAssetIds(mockLayers)
    expect(usedIds.has('sprite-grass.png')).toBe(true)
    expect(usedIds.has('grass')).toBe(true)
    expect(usedIds.has('sprite-tree.png')).toBe(true)
    expect(usedIds.has('tree')).toBe(true)
    expect(usedIds.has('non-existent')).toBe(false)
  })

  it('countTotalTiles should accurately sum placed items across all layers', () => {
    const total = MapQueries.countTotalTiles(mockLayers)
    expect(total).toBe(3)
  })

  it('createTileItem should create valid TileItem with stack z-index increment', () => {
    const existing: TileItem[] = [
      { id: '1', x: 2, y: 2, assetId: 'base', zIndex: 2, scale: 1, anchorX: 0.5, anchorY: 0.5 },
    ]

    const stackedItem = TileMutations.createTileItem(
      2,
      2,
      'new-asset',
      { id: 'new-asset', name: 'New Asset', spanX: 2, spanY: 2, anchorX: 0.5, anchorY: 0.8 },
      'stack',
      existing
    )

    expect(stackedItem.zIndex).toBe(3) // 2 + 1
    expect(stackedItem.spanX).toBe(2)
    expect(stackedItem.spanY).toBe(2)
    expect(stackedItem.anchorY).toBe(0.8)
    expect(stackedItem.cellZIndex).toHaveProperty('2,2')
    expect(stackedItem.cellZIndex).toHaveProperty('3,3')
  })

  it('isCoveringCell should accurately detect if multi-cell footprint covers a coordinate', () => {
    const item: TileItem = {
      id: 'big-building',
      x: 5,
      y: 5,
      spanX: 3,
      spanY: 2,
      assetId: 'castle',
      zIndex: 0,
      scale: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }

    expect(TileMutations.isCoveringCell(item, 5, 5)).toBe(true)
    expect(TileMutations.isCoveringCell(item, 7, 6)).toBe(true) // col=7 (5+3-1), row=6 (5+2-1)
    expect(TileMutations.isCoveringCell(item, 8, 5)).toBe(false) // col 8 is out of span
    expect(TileMutations.isCoveringCell(item, 5, 7)).toBe(false) // row 7 is out of span
  })
})
