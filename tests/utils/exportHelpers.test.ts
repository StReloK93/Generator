import { describe, it, expect } from 'vitest'
import {
  compactTileItem,
  normalizeTileItem,
  buildFullProjectJsonPayload,
} from '@/utils/exportHelpers'
import { MapProject } from '@/types/map'

describe('ExportHelpers (JSON serialization & backward compatibility)', () => {
  it('compactTileItem should strip redundant default properties', () => {
    const rawTile = {
      id: 'tile-123',
      x: 5,
      y: 10,
      assetId: 'sprite-grass.png',
      spanX: 1, // default
      spanY: 1, // default
      scale: 1, // default
      offsetX: 0, // default
      offsetY: 0, // default
      rotation: 0, // default
      zIndex: 0, // default
      depthOffset: 0, // default
      opacity: 1.0, // default
      anchorX: 0.5, // default
      anchorY: 0.88, // default
    }

    const compacted = compactTileItem(rawTile, 5, 10)
    expect(compacted).toEqual({
      id: 'tile-123',
      assetId: 'sprite-grass.png',
    })
  })

  it('compactTileItem should preserve non-default properties', () => {
    const customTile = {
      id: 'tile-custom',
      x: 5,
      y: 10,
      assetId: 'sprite-tower.png',
      spanX: 2,
      spanY: 2,
      scale: 1.5,
      zIndex: 4,
      rotation: 90,
      flipX: true,
      opacity: 0.8,
    }

    const compacted = compactTileItem(customTile, 5, 10)
    expect(compacted.spanX).toBe(2)
    expect(compacted.spanY).toBe(2)
    expect(compacted.scale).toBe(1.5)
    expect(compacted.zIndex).toBe(4)
    expect(compacted.rotation).toBe(90)
    expect(compacted.flipX).toBe(true)
    expect(compacted.opacity).toBe(0.8)
  })

  it('normalizeTileItem should restore all default values from compact representation', () => {
    const compacted = {
      id: 'tile-456',
      assetId: 'sprite-wall.png',
    }

    const restored = normalizeTileItem(compacted, 3, 7)
    expect(restored.x).toBe(3)
    expect(restored.y).toBe(7)
    expect(restored.assetId).toBe('sprite-wall.png')
    expect(restored.spanX).toBe(1)
    expect(restored.spanY).toBe(1)
    expect(restored.scale).toBe(1.0)
    expect(restored.zIndex).toBe(0)
    expect(restored.opacity).toBe(1.0)
    expect(restored.flipX).toBe(false)
  })

  it('buildFullProjectJsonPayload should serialize project with TD settings, waves, and layers intact', () => {
    const project: MapProject = {
      id: 'proj-test',
      name: 'Siege Arena',
      cols: 25,
      rows: 25,
      tileWidth: 128,
      tileHeight: 64,
      bgColor: '#111827',
      showGrid: true,
      gridColor: '#ffffff',
      layers: [
        {
          id: 'layer-ground',
          name: 'Ground',
          visible: true,
          locked: false,
          tiles: {
            '0,0': [{ id: 't1', x: 0, y: 0, assetId: 'sprite-grass.png', zIndex: 0, scale: 1 }],
          },
        },
      ],
      gameSettings: {
        startingGold: 200,
        startingLives: 25,
        wavePrepTime: 12,
      },
      waveConfigs: [
        {
          waveNumber: 1,
          name: 'Wave 1',
          unitHp: 100,
          unitCount: 15,
          unitSpeed: 3.5,
          goldReward: 2,
        },
      ],
    }

    const payload = buildFullProjectJsonPayload(project, [])

    expect(payload.version).toBe('2.1.0')
    expect(payload.project.name).toBe('Siege Arena')
    expect(payload.project.cols).toBe(25)
    expect(payload.project.gameSettings.startingGold).toBe(200)
    expect(payload.project.gameSettings.startingLives).toBe(25)
    expect(payload.project.waveConfigs).toHaveLength(1)
    expect(payload.project.layers).toHaveLength(1)
  })
})
