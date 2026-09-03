import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MapProject, Layer, TileItem, ProjectHistoryItem } from '../types/map'
import { cellKey, isInsideGrid } from '../utils/isometric'
import { useAssetStore } from './assetStore'

export interface PlacedElementEntry {
  item: TileItem
  layerId: string
  layerName: string
  col: number
  row: number
}

export const useMapStore = defineStore('mapStore', () => {
  // Project configuration
  const project = ref<MapProject>({
    id: `proj-${Date.now()}`,
    name: 'Yangi Izometrik Karta',
    cols: 60,
    rows: 60,
    tileWidth: 128,
    tileHeight: 64,
    bgColor: '#0d1322',
    showGrid: true,
    gridColor: '#38bdf8',
    layers: [
      {
        id: 'layer-ground',
        name: 'Ground (Yer)',
        visible: true,
        locked: false,
        opacity: 1.0,
        tiles: {},
      },
      {
        id: 'layer-objects',
        name: 'Objects (Obyektlar)',
        visible: true,
        locked: false,
        opacity: 1.0,
        tiles: {},
      },
      {
        id: 'layer-deco',
        name: 'Decoration (Bezaklar)',
        visible: true,
        locked: false,
        opacity: 1.0,
        tiles: {},
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  const activeLayerId = ref<string>('layer-ground')
  const isGameMap = ref<boolean>(false)

  // History for Undo / Redo
  const history = ref<ProjectHistoryItem[]>([])
  const historyIndex = ref<number>(-1)
  const maxHistoryLength = 30

  // Computed properties
  const activeLayer = computed(() => {
    return project.value.layers.find(l => l.id === activeLayerId.value) || project.value.layers[0]
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const totalTilesCount = computed(() => {
    let count = 0
    for (const layer of project.value.layers) {
      for (const items of Object.values(layer.tiles)) {
        count += Array.isArray(items) ? items.length : 1
      }
    }
    return count
  })

  // All placed elements across all layers for the Right Panel Outliner
  const allPlacedElements = computed<PlacedElementEntry[]>(() => {
    const list: PlacedElementEntry[] = []
    for (const layer of project.value.layers) {
      for (const [key, items] of Object.entries(layer.tiles)) {
        const [col, row] = key.split(',').map(Number)
        const itemArr = Array.isArray(items) ? items : [items]
        for (const item of itemArr) {
          if (item && item.id) {
            list.push({
              item,
              layerId: layer.id,
              layerName: layer.name,
              col: item.x !== undefined ? item.x : col,
              row: item.y !== undefined ? item.y : row,
            })
          }
        }
      }
    }
    return list
  })

  function cloneLayers(layers: Layer[]): Layer[] {
    return JSON.parse(JSON.stringify(layers))
  }

  function pushHistory(description: string) {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push({
      description,
      timestamp: Date.now(),
      layers: cloneLayers(project.value.layers),
    })

    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }

    project.value.updatedAt = Date.now()
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    const state = history.value[historyIndex.value]
    if (state) {
      project.value.layers = cloneLayers(state.layers)
      project.value.updatedAt = Date.now()
    }
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    const state = history.value[historyIndex.value]
    if (state) {
      project.value.layers = cloneLayers(state.layers)
      project.value.updatedAt = Date.now()
    }
  }

  function createNewProject(config: {
    name: string
    cols: number
    rows: number
    tileWidth: number
    tileHeight: number
    bgColor?: string
    showGrid?: boolean
  }) {
    project.value = {
      id: `proj-${Date.now()}`,
      name: config.name || 'Yangi Izometrik Karta',
      cols: Math.max(2, Math.min(256, config.cols)),
      rows: Math.max(2, Math.min(256, config.rows)),
      tileWidth: config.tileWidth || 128,
      tileHeight: config.tileHeight || 64,
      bgColor: config.bgColor || '#0d1322',
      showGrid: config.showGrid !== undefined ? config.showGrid : true,
      gridColor: '#38bdf8',
      layers: [
        {
          id: `layer-ground-${Date.now()}`,
          name: 'Ground (Yer)',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        },
        {
          id: `layer-objects-${Date.now()}`,
          name: 'Objects (Obyektlar)',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        },
        {
          id: `layer-deco-${Date.now()}`,
          name: 'Decoration (Bezaklar)',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    activeLayerId.value = project.value.layers[0].id

    history.value = [
      {
        description: 'Loyiha yaratildi',
        timestamp: Date.now(),
        layers: cloneLayers(project.value.layers),
      }
    ]
    historyIndex.value = 0
  }

  function resizeMap(cols: number, rows: number) {
    project.value.cols = Math.max(4, Math.min(256, Math.round(cols)))
    project.value.rows = Math.max(4, Math.min(256, Math.round(rows)))
    pushHistory(`Xarita o'lchami o'zgartirildi (${project.value.cols}x${project.value.rows})`)
  }

  // Get items placed directly at a specific cell
  function getCellItems(col: number, row: number, layerId = activeLayerId.value): TileItem[] {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer) return []
    const key = cellKey(col, row)
    const raw = layer.tiles[key]
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    const normalized: TileItem[] = [{
      id: (raw as any).id || `tile-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      x: col,
      y: row,
      assetId: (raw as any).assetId,
      zIndex: (raw as any).zIndex || 0,
      depthOffset: (raw as any).depthOffset || 0,
      cellZIndex: (raw as any).cellZIndex || {},
      spanX: (raw as any).spanX || 1,
      spanY: (raw as any).spanY || 1,
      scale: (raw as any).scale || 1.0,
      anchorX: (raw as any).anchorX,
      anchorY: (raw as any).anchorY,
    }]
    layer.tiles[key] = normalized
    return normalized
  }

  // Find all elements that exist directly on (col, row) OR whose multi-cell footprint covers (col, row)
  function getElementsAtOrCoveringCell(col: number, row: number, layerId = activeLayerId.value): { 
    item: TileItem
    originCol: number
    originRow: number
    isCovering: boolean
    cellZIndex: number
  }[] {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer) return []

    const results: { 
      item: TileItem
      originCol: number
      originRow: number
      isCovering: boolean
      cellZIndex: number
    }[] = []

    for (const [key, items] of Object.entries(layer.tiles)) {
      const [originCol, originRow] = key.split(',').map(Number)
      const itemArr = Array.isArray(items) ? items : [items]

      for (const item of itemArr) {
        if (!item) continue
        const spanX = item.spanX || 1
        const spanY = item.spanY || 1

        const inBounds = col >= originCol && col < originCol + spanX && row >= originRow && row < originRow + spanY

        if (inBounds) {
          const specificZ = item.cellZIndex?.[cellKey(col, row)] ?? item.zIndex ?? 0
          results.push({
            item,
            originCol,
            originRow,
            isCovering: originCol !== col || originRow !== row,
            cellZIndex: specificZ,
          })
        }
      }
    }

    results.sort((a, b) => b.cellZIndex - a.cellZIndex)
    return results
  }

  // Layer Actions
  function addLayer(name?: string) {
    const num = project.value.layers.length + 1
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name || `Qatlam ${num}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      tiles: {},
    }
    project.value.layers.push(newLayer)
    activeLayerId.value = newLayer.id
    pushHistory(`Yangi qatlam qo'shildi: ${newLayer.name}`)
  }

  function removeLayer(id: string) {
    if (project.value.layers.length <= 1) return
    const index = project.value.layers.findIndex(l => l.id === id)
    if (index !== -1) {
      const removed = project.value.layers[index]
      project.value.layers.splice(index, 1)
      if (activeLayerId.value === id) {
        activeLayerId.value = project.value.layers[Math.max(0, index - 1)].id
      }
      pushHistory(`Qatlam o'chirildi: ${removed.name}`)
    }
  }

  function toggleLayerVisibility(id: string) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) layer.visible = !layer.visible
  }

  function toggleLayerLock(id: string) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) layer.locked = !layer.locked
  }

  function setLayerOpacity(id: string, opacity: number) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) layer.opacity = Math.max(0, Math.min(1, opacity))
  }

  function renameLayer(id: string, newName: string) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer && newName.trim()) layer.name = newName.trim()
  }

  function moveLayer(id: string, direction: 'up' | 'down') {
    const index = project.value.layers.findIndex(l => l.id === id)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index + 1 : index - 1
    if (targetIndex < 0 || targetIndex >= project.value.layers.length) return

    const [moved] = project.value.layers.splice(index, 1)
    project.value.layers.splice(targetIndex, 0, moved)
    pushHistory(`Qatlam tartibi o'zgartirildi`)
  }

  // Set / Add Tile to cell (Stack or Replace)
  function setTile(
    col: number, 
    row: number, 
    assetId: string, 
    mode: 'stack' | 'replace' = 'stack', 
    layerId = activeLayerId.value, 
    pushHist = true
  ): TileItem | null {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return null

    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return null

    const key = cellKey(col, row)
    const existing = getCellItems(col, row, layerId)

    // Check if the exact same asset already exists on this cell
    const alreadyHasSame = existing.some(item => item.assetId === assetId)
    if (alreadyHasSame) {
      if (mode === 'replace' && existing.length === 1 && existing[0].assetId === assetId) {
        return existing[0]
      }
      if (mode === 'stack') {
        // Do not place duplicate identical asset in the same cell on the same layer
        return existing.find(item => item.assetId === assetId) || existing[0]
      }
    }

    const assetStore = useAssetStore()
    const asset = assetStore.assets.find(a => a.id === assetId)

    const spanX = asset?.spanX || 1
    const spanY = asset?.spanY || 1
    const scale = asset?.scale || 1.0
    const anchorX = asset?.anchorX ?? 0.5
    const anchorY = asset?.anchorY ?? 0.5

    const initialZ = mode === 'stack' ? (existing.length > 0 ? Math.max(...existing.map(i => i.zIndex)) + 1 : 0) : 0

    const cellZIndex: Record<string, number> = {}
    for (let cx = col; cx < col + spanX; cx++) {
      for (let cy = row; cy < row + spanY; cy++) {
        cellZIndex[cellKey(cx, cy)] = initialZ
      }
    }

    const newItem: TileItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      x: col,
      y: row,
      assetId,
      zIndex: initialZ,
      depthOffset: 0,
      cellZIndex,
      spanX,
      spanY,
      scale,
      anchorX,
      anchorY,
      flipX: false,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    }

    if (mode === 'replace' || existing.length === 0) {
      layer.tiles[key] = [newItem]
    } else {
      layer.tiles[key] = [...existing, newItem]
    }

    if (pushHist) {
      pushHistory(mode === 'stack' ? `Element joylashtirildi (${col}, ${row})` : `Element almashtirildi (${col}, ${row})`)
    } else {
      project.value.updatedAt = Date.now()
    }

    return newItem
  }

  function removeTile(col: number, row: number, layerId = activeLayerId.value, pushHist = true) {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return

    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const key = cellKey(col, row)
    const items = getCellItems(col, row, layerId)
    if (items.length === 0) return

    if (items.length > 1) {
      items.pop()
      layer.tiles[key] = [...items]
    } else {
      delete layer.tiles[key]
    }

    if (pushHist) {
      pushHistory(`Element o'chirildi (${col}, ${row})`)
    } else {
      project.value.updatedAt = Date.now()
    }
  }

  function removeTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const key = cellKey(col, row)
    const items = getCellItems(col, row, layerId)
    const updated = items.filter(i => i.id !== itemId)

    if (updated.length === 0) {
      delete layer.tiles[key]
    } else {
      layer.tiles[key] = updated
    }

    pushHistory(`Element o'chirildi`)
  }

  function moveTileItem(
    fromCol: number, 
    fromRow: number, 
    toCol: number, 
    toRow: number, 
    itemId: string, 
    layerId = activeLayerId.value
  ) {
    if (!isInsideGrid(toCol, toRow, project.value.cols, project.value.rows)) return

    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const fromKey = cellKey(fromCol, fromRow)
    const toKey = cellKey(toCol, toRow)

    const fromItems = getCellItems(fromCol, fromRow, layerId)
    const itemIndex = fromItems.findIndex(i => i.id === itemId)
    if (itemIndex === -1) return

    const [item] = fromItems.splice(itemIndex, 1)
    if (fromItems.length === 0) {
      delete layer.tiles[fromKey]
    } else {
      layer.tiles[fromKey] = [...fromItems]
    }

    const dx = toCol - fromCol
    const dy = toRow - fromRow

    item.x = toCol
    item.y = toRow

    if (item.cellZIndex) {
      const newCellZ: Record<string, number> = {}
      for (const [k, z] of Object.entries(item.cellZIndex)) {
        const [cx, cy] = k.split(',').map(Number)
        newCellZ[cellKey(cx + dx, cy + dy)] = z
      }
      item.cellZIndex = newCellZ
    }

    const toItems = getCellItems(toCol, toRow, layerId)
    item.zIndex = toItems.length > 0 ? Math.max(...toItems.map(i => i.zIndex)) + 1 : 0

    layer.tiles[toKey] = [...toItems, item]
    pushHistory(`Element ko'chirildi (${fromCol}, ${fromRow}) -> (${toCol}, ${toRow})`)
  }

  // Move an element from one layer to another
  function moveItemToLayer(itemId: string, fromLayerId: string, toLayerId: string, col: number, row: number) {
    if (fromLayerId === toLayerId) return
    const fromLayer = project.value.layers.find(l => l.id === fromLayerId)
    const toLayer = project.value.layers.find(l => l.id === toLayerId)
    if (!fromLayer || !toLayer) return

    const key = cellKey(col, row)
    const fromItems = getCellItems(col, row, fromLayerId)
    const index = fromItems.findIndex(i => i.id === itemId)
    if (index === -1) return

    const [item] = fromItems.splice(index, 1)
    if (fromItems.length === 0) {
      delete fromLayer.tiles[key]
    } else {
      fromLayer.tiles[key] = [...fromItems]
    }

    const toItems = getCellItems(col, row, toLayerId)
    toLayer.tiles[key] = [...toItems, item]
    pushHistory(`Element qatlamiga ko'chirildi: ${toLayer.name}`)
  }

  // --- Relative Depth Offset (Atrofdagi qo'shnilarga nisbatan Z-Index) ---
  function shiftItemDepthOffset(col: number, row: number, itemId: string, delta: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const current = item.depthOffset || 0
    item.depthOffset = Math.max(-10, Math.min(10, current + delta))
    project.value.updatedAt = Date.now()
    pushHistory(`Atrofdagilarga nisbatan Z o'zgartirildi (${item.depthOffset > 0 ? '+' : ''}${item.depthOffset})`)
  }

  function setItemDepthOffset(col: number, row: number, itemId: string, offset: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.depthOffset = Math.max(-10, Math.min(10, Math.round(offset)))
    project.value.updatedAt = Date.now()
  }

  // --- Z-Index Management (Per-cell & Global) ---

  function setCellSpecificZIndex(
    originCol: number, 
    originRow: number, 
    itemId: string, 
    cellCol: number, 
    cellRow: number, 
    zIndex: number, 
    layerId = activeLayerId.value
  ) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(originCol, originRow, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    if (!item.cellZIndex) item.cellZIndex = {}
    const zVal = Math.max(0, Math.min(999, Math.round(zIndex)))
    item.cellZIndex[cellKey(cellCol, cellRow)] = zVal

    item.zIndex = Math.max(item.zIndex, ...Object.values(item.cellZIndex))
    project.value.updatedAt = Date.now()
  }

  function setAllCellsZIndex(
    originCol: number, 
    originRow: number, 
    itemId: string, 
    zIndex: number, 
    layerId = activeLayerId.value
  ) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(originCol, originRow, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const zVal = Math.max(0, Math.min(999, Math.round(zIndex)))
    item.zIndex = zVal
    item.cellZIndex = {}

    const spanX = item.spanX || 1
    const spanY = item.spanY || 1
    for (let cx = item.x; cx < item.x + spanX; cx++) {
      for (let cy = item.y; cy < item.y + spanY; cy++) {
        item.cellZIndex[cellKey(cx, cy)] = zVal
      }
    }

    project.value.updatedAt = Date.now()
  }

  function adjustCellZIndex(
    originCol: number, 
    originRow: number, 
    itemId: string, 
    cellCol: number, 
    cellRow: number, 
    delta: number, 
    layerId = activeLayerId.value
  ) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(originCol, originRow, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    if (!item.cellZIndex) item.cellZIndex = {}
    const currentZ = item.cellZIndex[cellKey(cellCol, cellRow)] ?? item.zIndex ?? 0
    setCellSpecificZIndex(originCol, originRow, itemId, cellCol, cellRow, currentZ + delta, layerId)
  }

  function setItemZIndex(col: number, row: number, itemId: string, zIndex: number, layerId = activeLayerId.value) {
    setAllCellsZIndex(col, row, itemId, zIndex, layerId)
  }

  function bringItemForward(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setAllCellsZIndex(col, row, itemId, (item.zIndex || 0) + 1, layerId)
    pushHistory(`Z-Index ko'tarildi (${(item.zIndex || 0)})`)
  }

  function sendItemBackward(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setAllCellsZIndex(col, row, itemId, Math.max(0, (item.zIndex || 0) - 1), layerId)
    pushHistory(`Z-Index tushirildi (${(item.zIndex || 0)})`)
  }

  function bringItemToTop(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0)
    setAllCellsZIndex(col, row, itemId, maxZ + 1, layerId)
    pushHistory(`Element eng yuqoriga chiqarildi`)
  }

  function sendItemToBottom(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    for (const other of items) {
      if (other.id !== itemId) {
        other.zIndex += 1
        if (other.cellZIndex) {
          for (const k of Object.keys(other.cellZIndex)) other.cellZIndex[k] += 1
        }
      }
    }
    setAllCellsZIndex(col, row, itemId, 0, layerId)
    pushHistory(`Element eng pastga tushirildi`)
  }

  function flipTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.flipX = !item.flipX
    project.value.updatedAt = Date.now()
    pushHistory(`Element gorizontal burildi (Flip)`)
  }

  function rotateTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.rotation = ((item.rotation || 0) + 90) % 360
    project.value.updatedAt = Date.now()
    pushHistory(`Element 90° burildi`)
  }

  function updateItemScale(col: number, row: number, itemId: string, scale: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.scale = Math.max(0.2, Math.min(4.0, Number(scale.toFixed(2))))
    project.value.updatedAt = Date.now()
  }

  function updateItemAnchor(col: number, row: number, itemId: string, anchorX: number, anchorY: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.anchorX = Number(Math.max(0, Math.min(1, anchorX)).toFixed(2))
    item.anchorY = Number(Math.max(0, Math.min(1, anchorY)).toFixed(2))
    project.value.updatedAt = Date.now()
  }

  function updateItemSpan(col: number, row: number, itemId: string, spanX: number, spanY: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.spanX = Math.max(1, Math.min(8, spanX))
    item.spanY = Math.max(1, Math.min(8, spanY))

    if (!item.cellZIndex) item.cellZIndex = {}
    for (let cx = item.x; cx < item.x + item.spanX; cx++) {
      for (let cy = item.y; cy < item.y + item.spanY; cy++) {
        const k = cellKey(cx, cy)
        if (item.cellZIndex[k] === undefined) {
          item.cellZIndex[k] = item.zIndex || 0
        }
      }
    }

    project.value.updatedAt = Date.now()
    pushHistory(`Katak o'lchami o'zgartirildi (${item.spanX}x${item.spanY})`)
  }

  function updateTileOffset(col: number, row: number, itemId: string, offsetX: number, offsetY: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.offsetX = offsetX
    item.offsetY = offsetY
    project.value.updatedAt = Date.now()
  }

  function fillTiles(cells: { col: number; row: number }[], assetId: string | null, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked || cells.length === 0) return

    const assetStore = useAssetStore()
    const asset = assetId ? assetStore.assets.find(a => a.id === assetId) : null

    for (const { col, row } of cells) {
      if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) continue
      const key = cellKey(col, row)
      if (assetId === null) {
        delete layer.tiles[key]
      } else {
        const newItem: TileItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
          x: col,
          y: row,
          assetId,
          zIndex: 0,
          depthOffset: 0,
          cellZIndex: { [key]: 0 },
          spanX: asset?.spanX || 1,
          spanY: asset?.spanY || 1,
          scale: asset?.scale || 1.0,
          anchorX: asset?.anchorX ?? 0.5,
          anchorY: asset?.anchorY ?? 0.5,
        }
        layer.tiles[key] = [newItem]
      }
    }

    pushHistory(`${cells.length} ta plitka joylashtirildi`)
  }

  function clearLayerTiles(layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    layer.tiles = {}
    pushHistory(`Qatlam tozalandi: ${layer.name}`)
  }

  function clearAllTiles() {
    for (const layer of project.value.layers) {
      if (!layer.locked) {
        layer.tiles = {}
      }
    }
    pushHistory('Barcha qatlamlar tozalandi')
  }

  if (history.value.length === 0) {
    history.value.push({
      description: 'Dastlabki holat',
      timestamp: Date.now(),
      layers: cloneLayers(project.value.layers),
    })
    historyIndex.value = 0
  }

  return {
    project,
    activeLayerId,
    activeLayer,
    isGameMap,
    canUndo,
    canRedo,
    totalTilesCount,
    allPlacedElements,
    getCellItems,
    getElementsAtOrCoveringCell,
    pushHistory,
    undo,
    redo,
    createNewProject,
    resizeMap,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    renameLayer,
    moveLayer,
    moveItemToLayer,
    setTile,
    removeTile,
    removeTileItem,
    moveTileItem,
    setItemZIndex,
    setCellSpecificZIndex,
    setAllCellsZIndex,
    adjustCellZIndex,
    shiftItemDepthOffset,
    setItemDepthOffset,
    bringItemForward,
    sendItemBackward,
    bringItemToTop,
    sendItemToBottom,
    flipTileItem,
    rotateTileItem,
    updateItemScale,
    updateItemAnchor,
    updateItemSpan,
    updateTileOffset,
    fillTiles,
    clearLayerTiles,
    clearAllTiles,
  }
})
