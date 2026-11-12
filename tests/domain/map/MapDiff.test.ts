import { describe, it, expect } from 'vitest'
import { diffMaps, stableJson } from '@/domain/map/MapDiff'

const map = (project: Record<string, unknown>, assets: unknown[] = []) => ({ project: { id: 'm', cols: 4, rows: 4, ...project }, assets })
const ground = (tiles: Record<string, unknown[]>) => [{ id: 'layer-ground', name: 'Ground', visible: true, locked: false, opacity: 1, tiles }]

describe('diffMaps', () => {
  it('finds nothing between equal maps, whatever the key order, item ids or save times', () => {
    const before = map({ name: 'A', updatedAt: 1, layers: ground({ '0,0': [{ id: 'a', assetId: 'grass', scale: 2 }] }) })
    const after = map({ updatedAt: 2, layers: ground({ '0,0': [{ scale: 2, assetId: 'grass', id: 'b' }] }), name: 'A' })
    expect(diffMaps(before, after).count).toBe(0)
  })

  it('lists added, removed and changed cells per layer', () => {
    const before = map({ layers: ground({ '0,0': [{ id: 'a', assetId: 'grass' }], '1,0': [{ id: 'b', assetId: 'dirt' }] }) })
    const after = map({ layers: ground({ '0,0': [{ id: 'a', assetId: 'stone' }], '2,3': [{ id: 'c', assetId: 'dirt' }] }) })
    const diff = diffMaps(before, after)
    expect(diff.layers).toHaveLength(1)
    expect(diff.layers[0].cells).toEqual([
      { col: 0, row: 0, status: 'changed' },
      { col: 1, row: 0, status: 'removed' },
      { col: 2, row: 3, status: 'added' },
    ])
    expect(diff.count).toBe(3)
  })

  it('reports settings values, list entries and cell sets', () => {
    const before = map({
      layers: [],
      gameSettings: { startingGold: 100, startingLives: 20 },
      waveConfigs: [{ unitHp: 10 }, { unitHp: 20 }],
      clans: [{ id: 'fire', name: 'Fire' }],
      collisionSubcells: ['1,1', '2,2'],
    })
    const after = map({
      layers: [],
      gameSettings: { startingGold: 150, startingLives: 20 },
      waveConfigs: [{ unitHp: 10 }, { unitHp: 25 }, { unitHp: 30 }],
      clans: [{ id: 'fire', name: 'Fire' }, { id: 'ice', name: 'Ice' }],
      collisionSubcells: ['2,2', '3,3', '4,4'],
    })
    const diff = diffMaps(before, after)
    expect(diff.settings).toEqual([{ key: 'gameSettings', changes: [{ key: 'startingGold', before: 100, after: 150 }] }])
    expect(diff.lists).toEqual([
      { key: 'waveConfigs', items: [{ label: '#2', status: 'changed', fields: ['unitHp'] }, { label: '#3', status: 'added', fields: [] }] },
      { key: 'clans', items: [{ label: 'Ice', status: 'added', fields: [] }] },
    ])
    expect(diff.cellSets).toEqual([{ key: 'collisionSubcells', added: 2, removed: 1 }])
    expect(diff.count).toBe(5)
  })

  it('reports other project values and whole layers', () => {
    const before = map({ name: 'Old', layers: ground({}) })
    const after = map({ name: 'New', layers: [...ground({}), { id: 'layer-props', name: 'Props', tiles: { '1,1': [{ assetId: 'tree' }] } }] })
    const diff = diffMaps(before, after)
    expect(diff.fields).toEqual([{ key: 'name', before: 'Old', after: 'New' }])
    expect(diff.layers.map(l => [l.id, l.status, l.cells.length])).toEqual([['layer-props', 'added', 1]])
  })

  it('writes equal values as equal text', () => {
    expect(stableJson({ b: 1, a: [2, { d: 3, c: undefined }] })).toBe('{"a":[2,{"d":3}],"b":1}')
  })
})
