/**
 * What changed between two versions of a map file: the saved one and the one in the editor. Both are expected in the
 * same canonical form (the map file payload, compact tiles), so only real edits show up. Pure: no Vue, no Pixi.
 */

export type MapChangeStatus = 'added' | 'removed' | 'changed'

/** One map cell of one layer whose contents differ. */
export interface MapCellChange {
  col: number
  row: number
  status: MapChangeStatus
}

export interface MapLayerChange {
  id: string
  name: string
  status: MapChangeStatus
  /** Layer properties that changed (name, visible, opacity, locked) */
  fields: string[]
  cells: MapCellChange[]
}

/** A single value: a primitive shows before → after; an object or list only that it changed. */
export interface MapFieldChange {
  key: string
  before: unknown
  after: unknown
}

/** One entry of a list (a route, a wave, a tower, a clan, ...). */
export interface MapItemChange {
  label: string
  status: MapChangeStatus
  /** Its fields that changed (for a changed entry) */
  fields: string[]
}

export interface MapCellSetChange {
  key: string
  added: number
  removed: number
}

export interface MapDiff {
  fields: MapFieldChange[]
  layers: MapLayerChange[]
  cellSets: MapCellSetChange[]
  settings: { key: string; changes: MapFieldChange[] }[]
  lists: { key: string; items: MapItemChange[] }[]
  /** Every change counted once (a cell, a value, a list entry, a cell set) */
  count: number
}

/** Bookkeeping that changes on every save without the map changing */
const IGNORED = new Set(['id', 'createdAt', 'updatedAt'])
const CELL_SETS = ['collisionSubcells', 'buildableCells', 'waterCells']
const SETTINGS = ['gameSettings', 'hideSeekSettings']
/** Lists whose entries are matched by `id` (else by position) */
const LISTS = ['routes', 'waveConfigs', 'towerBlueprints', 'clans', 'placedTowers', 'customProjectiles']

/** JSON with object keys sorted, so two equal values always give the same text. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b)
const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** What stands in a cell, ignoring item ids (a redrawn but identical cell is unchanged). */
function cellSignature(items: unknown): string {
  return asList(items)
    .map(item => {
      const { id: _id, ...look } = asRecord(item)
      return stableJson(look)
    })
    .sort()
    .join('|')
}

function diffLayer(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): MapLayerChange | null {
  const layer = after ?? before ?? {}
  const beforeTiles = asRecord(before?.tiles)
  const afterTiles = asRecord(after?.tiles)
  const cells: MapCellChange[] = []
  for (const key of new Set([...Object.keys(beforeTiles), ...Object.keys(afterTiles)])) {
    const was = cellSignature(beforeTiles[key])
    const now = cellSignature(afterTiles[key])
    if (was === now) continue
    const [col, row] = key.split(',').map(Number)
    cells.push({ col, row, status: !was ? 'added' : !now ? 'removed' : 'changed' })
  }
  cells.sort((a, b) => a.row - b.row || a.col - b.col)
  const fields = before && after ? ['name', 'visible', 'locked', 'opacity'].filter(key => !same(before[key], after[key])) : []
  if (before && after && cells.length === 0 && fields.length === 0) return null
  return {
    id: String(layer.id ?? ''),
    name: String(layer.name ?? layer.id ?? ''),
    status: !before ? 'added' : !after ? 'removed' : 'changed',
    fields,
    cells,
  }
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>, keys?: string[]): MapFieldChange[] {
  const all = keys ?? [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return all.filter(key => !same(before[key], after[key])).map(key => ({ key, before: before[key], after: after[key] }))
}

function itemLabel(item: Record<string, unknown>, index: number): string {
  const name = item.name ?? item.id
  return typeof name === 'string' && name ? name : `#${index + 1}`
}

function diffList(before: unknown[], after: unknown[]): MapItemChange[] {
  const byId = [...before, ...after].every(item => typeof asRecord(item).id === 'string')
  const keyOf = (item: unknown, index: number) => (byId ? String(asRecord(item).id) : String(index))
  const was = new Map(before.map((item, i) => [keyOf(item, i), { item: asRecord(item), index: i }]))
  const now = new Map(after.map((item, i) => [keyOf(item, i), { item: asRecord(item), index: i }]))
  const changes: MapItemChange[] = []
  for (const key of new Set([...was.keys(), ...now.keys()])) {
    const a = was.get(key)
    const b = now.get(key)
    if (a && b) {
      const fields = diffFields(a.item, b.item).map(f => f.key)
      if (fields.length > 0) changes.push({ label: itemLabel(b.item, b.index), status: 'changed', fields })
    } else if (b) changes.push({ label: itemLabel(b.item, b.index), status: 'added', fields: [] })
    else if (a) changes.push({ label: itemLabel(a.item, a.index), status: 'removed', fields: [] })
  }
  return changes
}

function diffCellSet(key: string, before: unknown[], after: unknown[]): MapCellSetChange | null {
  const was = new Set(before.map(stableJson))
  const now = new Set(after.map(stableJson))
  const added = [...now].filter(c => !was.has(c)).length
  const removed = [...was].filter(c => !now.has(c)).length
  return added || removed ? { key, added, removed } : null
}

/** Everything that differs between the map payloads `before` and `after` ({ project, assets }). */
export function diffMaps(before: unknown, after: unknown): MapDiff {
  const was = asRecord(asRecord(before).project)
  const now = asRecord(asRecord(after).project)

  const beforeLayers = asList(was.layers).map(asRecord)
  const afterLayers = asList(now.layers).map(asRecord)
  const layerIds = [...new Set([...beforeLayers, ...afterLayers].map(l => String(l.id)))]
  const layers = layerIds
    .map(id => diffLayer(beforeLayers.find(l => String(l.id) === id), afterLayers.find(l => String(l.id) === id)))
    .filter((l): l is MapLayerChange => l !== null)

  const cellSets = CELL_SETS.map(key => diffCellSet(key, asList(was[key]), asList(now[key]))).filter((c): c is MapCellSetChange => c !== null)
  const settings = SETTINGS.map(key => ({ key, changes: diffFields(asRecord(was[key]), asRecord(now[key])) })).filter(s => s.changes.length > 0)
  const lists = [
    ...LISTS.map(key => ({ key, items: diffList(asList(was[key]), asList(now[key])) })),
    { key: 'assets', items: diffList(asList(asRecord(before).assets), asList(asRecord(after).assets)) },
  ].filter(l => l.items.length > 0)

  // Everything else on the project (name, size, colors, picture, labyrinth, ...)
  const handled = new Set(['layers', ...CELL_SETS, ...SETTINGS, ...LISTS, ...IGNORED])
  const keys = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter(key => !handled.has(key)).sort()
  const fields = diffFields(was, now, keys)

  const count =
    fields.length +
    layers.reduce((sum, l) => sum + Math.max(1, l.cells.length + l.fields.length), 0) +
    cellSets.length +
    settings.reduce((sum, s) => sum + s.changes.length, 0) +
    lists.reduce((sum, l) => sum + l.items.length, 0)
  return { fields, layers, cellSets, settings, lists, count }
}
