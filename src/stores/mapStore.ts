import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MapProject, Layer, TileItem, ProjectHistoryItem, GridCoord, BoxClearModalData, BoxAssetSummary, SelectedElementRef } from '../types/map'
import { cellKey, isInsideGrid } from '../utils/isometric'
import { assetManager } from '../services/assetManager'
import { MapQueries, TileMutations } from '../domain/map'

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
    name: 'New Isometric Map',
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
        name: 'Ground',
        visible: true,
        locked: false,
        opacity: 1.0,
        tiles: {},
      },
      {
        id: 'layer-objects',
        name: 'Objects',
        visible: true,
        locked: false,
        opacity: 1.0,
        tiles: {},
      },
      {
        id: 'layer-deco',
        name: 'Decoration',
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
  const maxHistoryLength = 50
  const historyRevision = ref<number>(0)

  // Computed properties
  const activeLayer = computed(() => {
    return project.value.layers.find(l => l.id === activeLayerId.value) || project.value.layers[0]
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const totalTilesCount = computed(() => {
    return MapQueries.countTotalTiles(project.value.layers)
  })

  // All placed elements across all layers for the Right Panel Outliner
  const allPlacedElements = computed<PlacedElementEntry[]>(() => {
    const list: PlacedElementEntry[] = []
    const layers = project.value.layers
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l]
      if (!layer || !layer.tiles) continue
      const tiles = layer.tiles
      for (const key in tiles) {
        const items = tiles[key]
        if (!items) continue
        const commaIdx = key.indexOf(',')
        const col = commaIdx !== -1 ? Number(key.slice(0, commaIdx)) : 0
        const row = commaIdx !== -1 ? Number(key.slice(commaIdx + 1)) : 0
        const itemArr = Array.isArray(items) ? items : [items]
        for (let i = 0; i < itemArr.length; i++) {
          const item = itemArr[i]
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

  function cloneTileItem(item: TileItem): TileItem {
    return {
      id: item.id,
      x: item.x,
      y: item.y,
      assetId: item.assetId,
      zIndex: item.zIndex,
      depthOffset: item.depthOffset,
      cellZIndex: item.cellZIndex ? { ...item.cellZIndex } : undefined,
      spanX: item.spanX,
      spanY: item.spanY,
      scale: item.scale,
      anchorX: item.anchorX,
      anchorY: item.anchorY,
      flipX: item.flipX,
      rotation: item.rotation,
      offsetX: item.offsetX,
      offsetY: item.offsetY,
      opacity: item.opacity,
    }
  }

  function cloneLayers(layers: Layer[]): Layer[] {
    const len = layers.length
    const result: Layer[] = new Array(len)
    for (let i = 0; i < len; i++) {
      const l = layers[i]
      const clonedTiles: Record<string, TileItem[]> = {}
      if (l.tiles) {
        for (const key in l.tiles) {
          const val = l.tiles[key]
          if (Array.isArray(val)) {
            const arrLen = val.length
            const arr = new Array(arrLen)
            for (let j = 0; j < arrLen; j++) {
              arr[j] = cloneTileItem(val[j])
            }
            clonedTiles[key] = arr
          } else if (val) {
            clonedTiles[key] = [cloneTileItem(val as any)]
          }
        }
      }
      result[i] = {
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        tiles: clonedTiles,
      }
    }
    return result
  }

  function pushHistory(description: string) {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push({
      description,
      timestamp: Date.now(),
      layers: cloneLayers(project.value.layers),
      buildableCells: project.value.buildableCells ? [...project.value.buildableCells] : undefined,
      waterCells: project.value.waterCells ? [...project.value.waterCells] : undefined,
      buildMode: project.value.buildMode,
      tilesCount: totalTilesCount.value,
    })

    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }

    project.value.updatedAt = Date.now()
    historyRevision.value++
  }

  function resetHistory(description = 'Map loaded') {
    history.value = [
      {
        description,
        timestamp: Date.now(),
        layers: cloneLayers(project.value.layers),
        buildableCells: project.value.buildableCells ? [...project.value.buildableCells] : undefined,
        waterCells: project.value.waterCells ? [...project.value.waterCells] : undefined,
        buildMode: project.value.buildMode,
        tilesCount: totalTilesCount.value,
      }
    ]
    historyIndex.value = 0
    project.value.updatedAt = Date.now()
    historyRevision.value++
  }

  function restoreHistoryState(index: number) {
    if (index < 0 || index >= history.value.length) return
    const state = history.value[index]
    if (state) {
      historyIndex.value = index
      project.value.layers = cloneLayers(state.layers)
      project.value.buildableCells = state.buildableCells ? [...state.buildableCells] : undefined
      project.value.waterCells = state.waterCells ? [...state.waterCells] : undefined
      project.value.buildMode = state.buildMode || 'all'
      project.value.updatedAt = Date.now()
      historyRevision.value++
    }
  }

  function undo() {
    if (!canUndo.value) return
    restoreHistoryState(historyIndex.value - 1)
  }

  function redo() {
    if (!canRedo.value) return
    restoreHistoryState(historyIndex.value + 1)
  }

  function jumpToHistory(index: number) {
    restoreHistoryState(index)
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
      name: config.name || 'New Isometric Map',
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
          name: 'Ground',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        },
        {
          id: `layer-objects-${Date.now()}`,
          name: 'Objects',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        },
        {
          id: `layer-deco-${Date.now()}`,
          name: 'Decoration',
          visible: true,
          locked: false,
          opacity: 1.0,
          tiles: {},
        }
      ],
      gameSettings: {
        startingGold: 150,
        startingLives: 20,
        wavePrepTime: 10,
      },
      characterConfig: {
        spawnCount: 10,
        speed: 2.5,
        spawnMode: 'all_doors',
        formation: 'pairs',
        pairDistance: 0.35,
        followCamera: false,
        showPathTrail: true,
        autoLoop: true,
        unitElevation: 0,
        unitScaleMultiplier: 1.0,
      },
      waveConfigs: [],
      towerBlueprints: [],
      placedTowers: [],
      clans: [],
      customRoutes: {},
      customWaypoints: {},
      buildableCells: undefined,
      waterCells: undefined,
      buildMode: 'all',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    activeLayerId.value = project.value.layers[0].id
    resetHistory('Project created')
  }

  function resizeMap(cols: number, rows: number) {
    project.value.cols = Math.max(4, Math.min(256, Math.round(cols)))
    project.value.rows = Math.max(4, Math.min(256, Math.round(rows)))
    pushHistory(`Map resized (${project.value.cols}x${project.value.rows})`)
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
    if (!layer || !layer.tiles) return []

    const results: { 
      item: TileItem
      originCol: number
      originRow: number
      isCovering: boolean
      cellZIndex: number
    }[] = []

    const seenItemIds = new Set<string>()

    // 1. Direct cell lookup (O(1))
    const directKey = cellKey(col, row)
    const directRaw = layer.tiles[directKey]
    if (directRaw) {
      const directItems = Array.isArray(directRaw) ? directRaw : [directRaw]
      for (const item of directItems) {
        if (!item || !item.id) continue
        seenItemIds.add(item.id)
        const specificZ = item.cellZIndex?.[directKey] ?? item.zIndex ?? 0
        results.push({
          item,
          originCol: col,
          originRow: row,
          isCovering: false,
          cellZIndex: specificZ,
        })
      }
    }

    // 2. Multi-cell check (search candidate origins in [col-8..col] x [row-8..row], max span 8)
    const minC = Math.max(0, col - 8)
    const minR = Math.max(0, row - 8)
    for (let c = minC; c <= col; c++) {
      for (let r = minR; r <= row; r++) {
        if (c === col && r === row) continue // already checked in direct lookup
        const k = cellKey(c, r)
        const raw = layer.tiles[k]
        if (!raw) continue

        const items = Array.isArray(raw) ? raw : [raw]
        for (const item of items) {
          if (!item || !item.id || seenItemIds.has(item.id)) continue
          const spanX = item.spanX || 1
          const spanY = item.spanY || 1
          if (spanX <= 1 && spanY <= 1) continue // single cell item not covering col,row

          if (col >= c && col < c + spanX && row >= r && row < r + spanY) {
            seenItemIds.add(item.id)
            const specificZ = item.cellZIndex?.[directKey] ?? item.zIndex ?? 0
            results.push({
              item,
              originCol: c,
              originRow: r,
              isCovering: true,
              cellZIndex: specificZ,
            })
          }
        }
      }
    }

    if (results.length > 1) {
      results.sort((a, b) => b.cellZIndex - a.cellZIndex)
    }
    return results
  }

  // Find all elements that exist directly on (col, row) OR whose multi-cell footprint covers (col, row) across ALL layers
  function getAllElementsAtOrCoveringCell(col: number, row: number): { 
    item: TileItem
    originCol: number
    originRow: number
    isCovering: boolean
    cellZIndex: number
    layerId: string
    layerName: string
  }[] {
    if (!project.value || !project.value.layers) return []
    const results: { 
      item: TileItem
      originCol: number
      originRow: number
      isCovering: boolean
      cellZIndex: number
      layerId: string
      layerName: string
    }[] = []

    for (let i = project.value.layers.length - 1; i >= 0; i--) {
      const layer = project.value.layers[i]
      if (!layer || !layer.tiles) continue
      const layerEls = getElementsAtOrCoveringCell(col, row, layer.id)
      for (const el of layerEls) {
        results.push({
          ...el,
          layerId: layer.id,
          layerName: layer.name,
        })
      }
    }

    return results
  }

  // Layer Actions
  function addLayer(name?: string) {
    const num = project.value.layers.length + 1
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name || `Layer ${num}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      tiles: {},
    }
    project.value.layers.push(newLayer)
    activeLayerId.value = newLayer.id
    pushHistory(`Added layer: ${newLayer.name}`)
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
      pushHistory(`Deleted layer: ${removed.name}`)
    }
  }

  function toggleLayerVisibility(id: string) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) {
      layer.visible = !layer.visible
      project.value.updatedAt = Date.now()
    }
  }

  function toggleLayerLock(id: string) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) {
      layer.locked = !layer.locked
      project.value.updatedAt = Date.now()
    }
  }

  function setLayerOpacity(id: string, opacity: number) {
    const layer = project.value.layers.find(l => l.id === id)
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity))
      project.value.updatedAt = Date.now()
    }
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
    pushHistory(`Reordered layers`)
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

    const asset = assetId ? assetManager.getAssetItem(assetId) : undefined

    const spanX = asset?.spanX || 1
    const spanY = asset?.spanY || 1
    const scale = asset?.scale || 1.0
    const anchorX = asset?.anchorX ?? 0.5
    const anchorY = asset?.anchorY ?? 0.88

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
      pushHistory(mode === 'stack' ? `Placed element (${col}, ${row})` : `Replaced element (${col}, ${row})`)
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
    if (items.length > 0) {
      if (items.length > 1) {
        items.pop()
        layer.tiles[key] = [...items]
      } else {
        delete layer.tiles[key]
      }
      if (pushHist) {
        pushHistory(`Deleted element (${col}, ${row})`)
      } else {
        project.value.updatedAt = Date.now()
      }
      return
    }

    // Also check covering multi-cell elements on active layer
    const covering = getElementsAtOrCoveringCell(col, row, layerId)
    if (covering.length > 0) {
      const top = covering[0]
      removeTileItem(top.originCol, top.originRow, top.item.id, layerId, pushHist)
      return
    }

    // If nothing on active layer, search across visible unlocked layers
    for (let i = project.value.layers.length - 1; i >= 0; i--) {
      const otherLayer = project.value.layers[i]
      if (otherLayer.id === layerId || !otherLayer.visible || otherLayer.locked) continue
      const otherCovering = getElementsAtOrCoveringCell(col, row, otherLayer.id)
      if (otherCovering.length > 0) {
        const top = otherCovering[0]
        removeTileItem(top.originCol, top.originRow, top.item.id, otherLayer.id, pushHist)
        break
      }
    }
  }

  function removeTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value, pushHist = true) {
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

    if (pushHist) {
      pushHistory(`Deleted element`)
    } else {
      project.value.updatedAt = Date.now()
    }
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
    pushHistory(`Moved element (${fromCol}, ${fromRow}) -> (${toCol}, ${toRow})`)
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
    pushHistory(`Moved element to layer: ${toLayer.name}`)
  }

  // --- Relative Depth Offset ---
  function shiftItemDepthOffset(col: number, row: number, itemId: string, delta: number, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const current = item.depthOffset || 0
    item.depthOffset = Math.max(-10, Math.min(10, current + delta))
    project.value.updatedAt = Date.now()
    pushHistory(`Relative depth adjusted (${item.depthOffset > 0 ? '+' : ''}${item.depthOffset})`)
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
    pushHistory(`Brought forward (${(item.zIndex || 0)})`)
  }

  function sendItemBackward(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setAllCellsZIndex(col, row, itemId, Math.max(0, (item.zIndex || 0) - 1), layerId)
    pushHistory(`Sent backward (${(item.zIndex || 0)})`)
  }

  function bringItemToTop(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const maxZ = items.reduce((max, i) => Math.max(max, i.zIndex), 0)
    setAllCellsZIndex(col, row, itemId, maxZ + 1, layerId)
    pushHistory(`Brought to front`)
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
    pushHistory(`Sent to back`)
  }

  function flipTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.flipX = !item.flipX
    project.value.updatedAt = Date.now()
    pushHistory(`Flipped horizontally`)
  }

  function rotateTileItem(col: number, row: number, itemId: string, layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    const items = getCellItems(col, row, layerId)
    const item = items.find(i => i.id === itemId)
    if (!item) return

    item.rotation = ((item.rotation || 0) + 90) % 360
    project.value.updatedAt = Date.now()
    pushHistory(`Rotated 90°`)
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

    item.anchorX = Number(Math.max(0, Math.min(1, anchorX)).toFixed(4))
    item.anchorY = Number(Math.max(0, Math.min(1, anchorY)).toFixed(4))
    project.value.updatedAt = Date.now()
  }

  function updateAllItemsOfAsset(
    assetId: string,
    updates: { anchorX?: number; anchorY?: number; spanX?: number; spanY?: number; scale?: number }
  ) {
    if (!assetId) return
    const cleanId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '')
    let updatedCount = 0

    for (const layer of project.value.layers) {
      for (const [key, items] of Object.entries(layer.tiles)) {
        const itemArr = Array.isArray(items) ? items : [items]
        for (const item of itemArr) {
          if (!item || !item.assetId) continue
          const itemClean = item.assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '')
          if (item.assetId === assetId || itemClean === cleanId || item.assetId === `sprite-${cleanId}`) {
            if (updates.anchorX !== undefined) item.anchorX = Number(Math.max(0, Math.min(1, updates.anchorX)).toFixed(4))
            if (updates.anchorY !== undefined) item.anchorY = Number(Math.max(0, Math.min(1, updates.anchorY)).toFixed(4))
            if (updates.scale !== undefined) item.scale = updates.scale
            if (updates.spanX !== undefined) item.spanX = updates.spanX
            if (updates.spanY !== undefined) item.spanY = updates.spanY
            updatedCount++
          }
        }
      }
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
    }
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
    pushHistory(`Span resized (${item.spanX}x${item.spanY})`)
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

  function fillTiles(
    cells: { col: number; row: number }[], 
    assetId: string | null, 
    layerId = activeLayerId.value,
    mode: 'replace' | 'stack' = 'replace'
  ): number {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked || cells.length === 0) return 0

    const asset = assetId ? assetManager.getAssetItem(assetId) : null
    let placedCount = 0

    for (const { col, row } of cells) {
      if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) continue
      const key = cellKey(col, row)
      if (assetId === null) {
        if (layer.tiles[key]) {
          delete layer.tiles[key]
          placedCount++
        }
      } else {
        const existing = getCellItems(col, row, layerId)

        // Prevent duplicate stacking of the exact same asset on the same cell
        const alreadyHasSame = existing.some(item => item.assetId === assetId)
        if (alreadyHasSame) {
          if (mode === 'replace' && existing.length === 1 && existing[0].assetId === assetId) {
            continue
          }
          if (mode === 'stack') {
            continue
          }
        }

        const initialZ = mode === 'stack' ? (existing.length > 0 ? Math.max(...existing.map(i => i.zIndex)) + 1 : 0) : 0

        const spanX = asset?.spanX || 1
        const spanY = asset?.spanY || 1
        const scale = asset?.scale || 1.0
        const anchorX = asset?.anchorX ?? 0.5
        const anchorY = asset?.anchorY ?? 0.88

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
        placedCount++
      }
    }

    if (placedCount > 0) {
      pushHistory(mode === 'stack' ? `Stacked ${placedCount} tiles` : `Placed ${placedCount} tiles`)
    }
    return placedCount
  }

  function fillEmptyCells(
    assetId: string,
    layerId = activeLayerId.value,
    pushHist = true
  ): number {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return 0

    const asset = assetId ? assetManager.getAssetItem(assetId) : null
    if (!asset) return 0

    const spanX = asset.spanX || 1
    const spanY = asset.spanY || 1
    const scale = asset.scale || 1.0
    const anchorX = asset.anchorX ?? 0.5
    const anchorY = asset.anchorY ?? 0.88

    const { cols, rows } = project.value
    let filledCount = 0

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const key = cellKey(c, r)
        const existing = layer.tiles[key]
        if (existing && (Array.isArray(existing) ? existing.length > 0 : true)) {
          continue
        }

        const cellZIndex: Record<string, number> = {}
        for (let cx = c; cx < c + spanX; cx++) {
          for (let cy = r; cy < r + spanY; cy++) {
            cellZIndex[cellKey(cx, cy)] = 0
          }
        }

        const newItem: TileItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 7)}-${c}-${r}`,
          x: c,
          y: r,
          assetId,
          zIndex: 0,
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

        layer.tiles[key] = [newItem]
        filledCount++
      }
    }

    if (filledCount > 0) {
      if (pushHist) {
        pushHistory(`Filled ${filledCount} empty cells on ${layer.name} with ${asset.name}`)
      } else {
        project.value.updatedAt = Date.now()
      }
    }

    return filledCount
  }


  function fillEmptyCellsInBox(
    col0: number,
    row0: number,
    col1: number,
    row1: number,
    assetId: string,
    layerId = activeLayerId.value,
    pushHist = true
  ): number {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return 0

    const asset = assetId ? assetManager.getAssetItem(assetId) : null
    if (!asset) return 0

    const spanX = asset.spanX || 1
    const spanY = asset.spanY || 1
    const scale = asset.scale || 1.0
    const anchorX = asset.anchorX ?? 0.5
    const anchorY = asset.anchorY ?? 0.88

    const minCol = Math.max(0, Math.min(col0, col1))
    const maxCol = Math.min(project.value.cols - 1, Math.max(col0, col1))
    const minRow = Math.max(0, Math.min(row0, row1))
    const maxRow = Math.min(project.value.rows - 1, Math.max(row0, row1))

    let filledCount = 0

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        const key = cellKey(c, r)
        const existing = layer.tiles[key]
        if (existing && (Array.isArray(existing) ? existing.length > 0 : true)) {
          // Keep existing occupied cells 100% untouched
          continue
        }

        const cellZIndex: Record<string, number> = {}
        for (let cx = c; cx < c + spanX; cx++) {
          for (let cy = r; cy < r + spanY; cy++) {
            cellZIndex[cellKey(cx, cy)] = 0
          }
        }

        const newItem: TileItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 7)}-${c}-${r}`,
          x: c,
          y: r,
          assetId,
          zIndex: 0,
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

        layer.tiles[key] = [newItem]
        filledCount++
      }
    }

    if (filledCount > 0) {
      if (pushHist) {
        pushHistory(`Filled ${filledCount} empty cells in area [(${minCol}, ${minRow}) -> (${maxCol}, ${maxRow})] on ${layer.name} with ${asset.name}`)
      } else {
        project.value.updatedAt = Date.now()
      }
    }

    return filledCount
  }

  function scatterFillTiles(
    cells: GridCoord[],
    assetIds: string[],
    layerId = activeLayerId.value,
    options: {
      density?: number
      randomFlip?: boolean
      placementMode?: 'replace' | 'stack' | 'empty-only'
      randomScale?: boolean
      minScale?: number
      maxScale?: number
      randomOffset?: boolean
      maxOffsetX?: number
      maxOffsetY?: number
      assetWeights?: Record<string, number>
    } = {},
    pushHist = true
  ): number {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked || !assetIds || assetIds.length === 0 || !cells || cells.length === 0) return 0

    const density = options.density ?? 1.0
    const randomFlip = !!options.randomFlip
    const placementMode = options.placementMode ?? 'stack'
    const weights = options.assetWeights

    function pickWeighted(candidates: string[]): string {
      if (!weights || candidates.length === 1) {
        return candidates[Math.floor(Math.random() * candidates.length)]
      }
      let totalWeight = 0
      for (const id of candidates) {
        totalWeight += Math.max(1, weights[id] ?? 100)
      }
      let rand = Math.random() * totalWeight
      for (const id of candidates) {
        const w = Math.max(1, weights[id] ?? 100)
        if (rand < w) return id
        rand -= w
      }
      return candidates[candidates.length - 1]
    }

    let placedCount = 0

    for (const { col: c, row: r } of cells) {
      if (c < 0 || c >= project.value.cols || r < 0 || r >= project.value.rows) continue

      if (density < 1.0 && Math.random() > density) {
        continue
      }

      const key = cellKey(c, r)
      const existing = layer.tiles[key]
      const existingList: TileItem[] = Array.isArray(existing) ? existing : (existing ? [existing as any] : [])
      const isOccupied = existingList.length > 0

      if (placementMode === 'empty-only' && isOccupied) {
        continue
      }

      // Prevent duplicate copies of the same asset on the same cell
      const existingAssetIds = new Set(existingList.map(item => item.assetId))
      const availableAssetIds = assetIds.filter(id => !existingAssetIds.has(id))

      if (availableAssetIds.length === 0) {
        // All selected assets already placed on this cell, skip to avoid duplicate
        continue
      }

      const chosenAssetId = pickWeighted(availableAssetIds)
      const asset = assetManager.getAssetItem(chosenAssetId)
      if (!asset) continue

      const spanX = asset.spanX || 1
      const spanY = asset.spanY || 1
      
      let scale = asset.scale || 1.0
      if (options.randomScale) {
        const minS = Math.max(0.1, Math.min(options.minScale ?? 0.85, options.maxScale ?? 1.15))
        const maxS = Math.max(minS, Math.max(options.minScale ?? 0.85, options.maxScale ?? 1.15))
        scale = Number((minS + Math.random() * (maxS - minS)).toFixed(2))
      }

      let offsetX = 0
      let offsetY = 0
      if (options.randomOffset) {
        const maxOX = Math.max(0, Math.min(32, options.maxOffsetX ?? 4))
        const maxOY = Math.max(0, Math.min(32, options.maxOffsetY ?? 4))
        offsetX = maxOX > 0 ? Math.round((Math.random() * 2 - 1) * maxOX) : 0
        offsetY = maxOY > 0 ? Math.round((Math.random() * 2 - 1) * maxOY) : 0
      }

      const anchorX = asset.anchorX ?? 0.5
      const anchorY = asset.anchorY ?? 0.88
      const flipX = randomFlip ? Math.random() < 0.5 : false

      const cellZIndex: Record<string, number> = {}
      for (let cx = c; cx < c + spanX; cx++) {
        for (let cy = r; cy < r + spanY; cy++) {
          cellZIndex[cellKey(cx, cy)] = 0
        }
      }

      const newItem: TileItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 7)}-${c}-${r}`,
        x: c,
        y: r,
        assetId: chosenAssetId,
        zIndex: 0,
        depthOffset: 0,
        cellZIndex,
        spanX,
        spanY,
        scale,
        anchorX,
        anchorY,
        flipX,
        rotation: 0,
        offsetX,
        offsetY,
      }

      if (placementMode === 'replace' || !isOccupied) {
        layer.tiles[key] = [newItem]
      } else {
        existingList.push(newItem)
        layer.tiles[key] = existingList
      }

      placedCount++
    }

    if (placedCount > 0) {
      if (pushHist) {
        pushHistory(`Scatter placed ${placedCount} random tiles across ${cells.length} cells on ${layer.name}`)
      } else {
        project.value.updatedAt = Date.now()
      }
    }

    return placedCount
  }

  function getBoxElementSummary(
    col0: number,
    row0: number,
    col1: number,
    row1: number
  ): BoxClearModalData {
    const minCol = Math.max(0, Math.min(col0, col1))
    const maxCol = Math.min(project.value.cols - 1, Math.max(col0, col1))
    const minRow = Math.max(0, Math.min(row0, row1))
    const maxRow = Math.min(project.value.rows - 1, Math.max(row0, row1))

    const totalCells = (maxCol - minCol + 1) * (maxRow - minRow + 1)

    const assetMap = new Map<string, BoxAssetSummary>()
    const layerItems: Record<string, { totalItems: number; assets: BoxAssetSummary[] }> = {}

    let totalItems = 0

    for (const layer of project.value.layers) {
      if (layer.locked) continue
      const layerAssetMap = new Map<string, BoxAssetSummary>()
      let layerItemCount = 0

      // Iterate through direct origin tiles in layer
      for (const [key, items] of Object.entries(layer.tiles)) {
        const [originCol, originRow] = key.split(',').map(Number)
        const itemArr = Array.isArray(items) ? items : [items]

        for (const item of itemArr) {
          if (!item || !item.assetId) continue
          const spanX = item.spanX || 1
          const spanY = item.spanY || 1

          const itemMinCol = originCol
          const itemMaxCol = originCol + spanX - 1
          const itemMinRow = originRow
          const itemMaxRow = originRow + spanY - 1

          const overlaps = (
            itemMinCol <= maxCol &&
            itemMaxCol >= minCol &&
            itemMinRow <= maxRow &&
            itemMaxRow >= minRow
          )

          if (overlaps) {
            totalItems++
            layerItemCount++

            const asset = assetManager.getAssetItem(item.assetId)
            const assetName = asset?.name || item.assetId
            const category = asset?.category || 'General'
            const previewSrc = assetManager.getPreviewDataUrl(item.assetId) || asset?.previewSrc || asset?.src || ''

            // Global map
            if (!assetMap.has(item.assetId)) {
              assetMap.set(item.assetId, {
                assetId: item.assetId,
                assetName,
                category,
                previewSrc,
                totalCount: 0,
                layerCounts: {},
              })
            }
            const globalEntry = assetMap.get(item.assetId)!
            globalEntry.totalCount++
            globalEntry.layerCounts[layer.id] = (globalEntry.layerCounts[layer.id] || 0) + 1

            // Layer specific map
            if (!layerAssetMap.has(item.assetId)) {
              layerAssetMap.set(item.assetId, {
                assetId: item.assetId,
                assetName,
                category,
                previewSrc,
                totalCount: 0,
                layerCounts: { [layer.id]: 0 },
              })
            }
            const layerEntry = layerAssetMap.get(item.assetId)!
            layerEntry.totalCount++
            layerEntry.layerCounts[layer.id]++
          }
        }
      }

      layerItems[layer.id] = {
        totalItems: layerItemCount,
        assets: Array.from(layerAssetMap.values()).sort((a, b) => b.totalCount - a.totalCount),
      }
    }

    return {
      col0: minCol,
      row0: minRow,
      col1: maxCol,
      row1: maxRow,
      totalCells,
      totalItems,
      assets: Array.from(assetMap.values()).sort((a, b) => b.totalCount - a.totalCount),
      layerItems,
    }
  }

  function getCellsElementSummary(cells: GridCoord[]): BoxClearModalData {
    if (cells.length === 0) {
      return {
        col0: 0,
        row0: 0,
        col1: 0,
        row1: 0,
        totalCells: 0,
        totalItems: 0,
        assets: [],
        layerItems: {},
        cells: [],
      }
    }

    const minCol = Math.max(0, Math.min(...cells.map(c => c.col)))
    const maxCol = Math.min(project.value.cols - 1, Math.max(...cells.map(c => c.col)))
    const minRow = Math.max(0, Math.min(...cells.map(c => c.row)))
    const maxRow = Math.min(project.value.rows - 1, Math.max(...cells.map(c => c.row)))
    const cellSet = new Set(cells.map(c => cellKey(c.col, c.row)))

    const assetMap = new Map<string, BoxAssetSummary>()
    const layerItems: Record<string, { totalItems: number; assets: BoxAssetSummary[] }> = {}
    let totalItems = 0

    const minC = Math.max(0, minCol - 8)
    const minR = Math.max(0, minRow - 8)

    for (const layer of project.value.layers) {
      if (layer.locked || !layer.tiles) continue
      const layerAssetMap = new Map<string, BoxAssetSummary>()
      let layerItemCount = 0

      for (let c = minC; c <= maxCol; c++) {
        for (let r = minR; r <= maxRow; r++) {
          const k = cellKey(c, r)
          const raw = layer.tiles[k]
          if (!raw) continue

          const itemArr = Array.isArray(raw) ? raw : [raw]
          for (const item of itemArr) {
            if (!item || !item.assetId) continue
            const spanX = item.spanX || 1
            const spanY = item.spanY || 1

            let overlaps = false
            for (let cx = c; cx < c + spanX; cx++) {
              for (let cy = r; cy < r + spanY; cy++) {
                if (cellSet.has(cellKey(cx, cy))) {
                  overlaps = true
                  break
                }
              }
              if (overlaps) break
            }

            if (overlaps) {
              totalItems++
              layerItemCount++

              const asset = assetManager.getAssetItem(item.assetId)
              const assetName = asset?.name || item.assetId
              const category = asset?.category || 'General'
              const previewSrc = assetManager.getPreviewDataUrl(item.assetId) || asset?.previewSrc || asset?.src || ''

              if (!assetMap.has(item.assetId)) {
                assetMap.set(item.assetId, {
                  assetId: item.assetId,
                  assetName,
                  category,
                  previewSrc,
                  totalCount: 0,
                  layerCounts: {},
                })
              }
              const globalEntry = assetMap.get(item.assetId)!
              globalEntry.totalCount++
              globalEntry.layerCounts[layer.id] = (globalEntry.layerCounts[layer.id] || 0) + 1

              if (!layerAssetMap.has(item.assetId)) {
                layerAssetMap.set(item.assetId, {
                  assetId: item.assetId,
                  assetName,
                  category,
                  previewSrc,
                  totalCount: 0,
                  layerCounts: { [layer.id]: 0 },
                })
              }
              const layerEntry = layerAssetMap.get(item.assetId)!
              layerEntry.totalCount++
              layerEntry.layerCounts[layer.id]++
            }
          }
        }
      }

      layerItems[layer.id] = {
        totalItems: layerItemCount,
        assets: Array.from(layerAssetMap.values()).sort((a, b) => b.totalCount - a.totalCount),
      }
    }

    return {
      col0: minCol,
      row0: minRow,
      col1: maxCol,
      row1: maxRow,
      totalCells: cells.length,
      totalItems,
      assets: Array.from(assetMap.values()).sort((a, b) => b.totalCount - a.totalCount),
      layerItems,
      cells,
    }
  }

  function getElementsInBox(
    col0: number,
    row0: number,
    col1: number,
    row1: number,
    activeLayerOnly = false
  ): SelectedElementRef[] {
    const minCol = Math.max(0, Math.min(col0, col1))
    const maxCol = Math.min(project.value.cols - 1, Math.max(col0, col1))
    const minRow = Math.max(0, Math.min(row0, row1))
    const maxRow = Math.min(project.value.rows - 1, Math.max(row0, row1))
    const result: SelectedElementRef[] = []
    const seenKeys = new Set<string>()

    const layersToScan = activeLayerOnly
      ? project.value.layers.filter(l => l.id === activeLayerId.value && !l.locked)
      : [
          ...project.value.layers.filter(l => l.id === activeLayerId.value && !l.locked),
          ...project.value.layers.filter(l => l.id !== activeLayerId.value && l.visible && !l.locked),
        ]

    const minC = Math.max(0, minCol - 8)
    const minR = Math.max(0, minRow - 8)

    for (const layer of layersToScan) {
      if (!layer || !layer.tiles) continue
      for (let c = minC; c <= maxCol; c++) {
        for (let r = minR; r <= maxRow; r++) {
          const k = cellKey(c, r)
          const raw = layer.tiles[k]
          if (!raw) continue

          const itemArr = Array.isArray(raw) ? raw : [raw]
          for (const item of itemArr) {
            if (!item || !item.id) continue
            const uniqueKey = `${layer.id}:${item.id}`
            if (seenKeys.has(uniqueKey)) continue

            const spanX = item.spanX || 1
            const spanY = item.spanY || 1
            const itemMaxCol = c + spanX - 1
            const itemMaxRow = r + spanY - 1

            const overlaps = (
              c <= maxCol &&
              itemMaxCol >= minCol &&
              r <= maxRow &&
              itemMaxRow >= minRow
            )

            if (overlaps) {
              seenKeys.add(uniqueKey)
              result.push({
                col: c,
                row: r,
                layerId: layer.id,
                itemId: item.id,
              })
            }
          }
        }
      }
    }

    return result
  }

  function deleteElementsInBox(
    col0: number,
    row0: number,
    col1: number,
    row1: number,
    targetAssetIds: string[],
    targetLayerIds?: string[],
    pushHist = true
  ): number {
    const minCol = Math.max(0, Math.min(col0, col1))
    const maxCol = Math.min(project.value.cols - 1, Math.max(col0, col1))
    const minRow = Math.max(0, Math.min(row0, row1))
    const maxRow = Math.min(project.value.rows - 1, Math.max(row0, row1))

    const targetAssetSet = new Set(targetAssetIds)
    const targetLayers = targetLayerIds && targetLayerIds.length > 0
      ? project.value.layers.filter(l => targetLayerIds.includes(l.id))
      : [project.value.layers.find(l => l.id === activeLayerId.value) || project.value.layers[0]]

    let deletedCount = 0
    const minC = Math.max(0, minCol - 8)
    const minR = Math.max(0, minRow - 8)

    for (const layer of targetLayers) {
      if (!layer || layer.locked || !layer.tiles) continue

      for (let c = minC; c <= maxCol; c++) {
        for (let r = minR; r <= maxRow; r++) {
          const k = cellKey(c, r)
          const raw = layer.tiles[k]
          if (!raw) continue

          const itemArr = Array.isArray(raw) ? raw : [raw]
          const remainingItems: TileItem[] = []

          for (const item of itemArr) {
            if (!item || !item.assetId) continue
            const spanX = item.spanX || 1
            const spanY = item.spanY || 1
            const itemMaxCol = c + spanX - 1
            const itemMaxRow = r + spanY - 1

            const overlaps = (
              c <= maxCol &&
              itemMaxCol >= minCol &&
              r <= maxRow &&
              itemMaxRow >= minRow
            )

            if (overlaps && targetAssetSet.has(item.assetId)) {
              deletedCount++
            } else {
              remainingItems.push(item)
            }
          }

          if (remainingItems.length === 0) {
            delete layer.tiles[k]
          } else {
            layer.tiles[k] = remainingItems
          }
        }
      }
    }

    if (deletedCount > 0) {
      if (pushHist) {
        pushHistory(`Cleared ${deletedCount} elements in box [(${minCol}, ${minRow}) -> (${maxCol}, ${maxRow})]`)
      } else {
        project.value.updatedAt = Date.now()
      }
    }

    return deletedCount
  }

  function deleteElementsInCells(
    cells: GridCoord[],
    targetAssetIds: string[],
    targetLayerIds?: string[],
    pushHist = true
  ): number {
    if (cells.length === 0) return 0
    const minCol = Math.max(0, Math.min(...cells.map(c => c.col)))
    const maxCol = Math.min(project.value.cols - 1, Math.max(...cells.map(c => c.col)))
    const minRow = Math.max(0, Math.min(...cells.map(c => c.row)))
    const maxRow = Math.min(project.value.rows - 1, Math.max(...cells.map(c => c.row)))

    const cellSet = new Set(cells.map(c => cellKey(c.col, c.row)))
    const targetAssetSet = new Set(targetAssetIds)
    const targetLayers = targetLayerIds && targetLayerIds.length > 0
      ? project.value.layers.filter(l => targetLayerIds.includes(l.id))
      : [project.value.layers.find(l => l.id === activeLayerId.value) || project.value.layers[0]]

    let deletedCount = 0
    const minC = Math.max(0, minCol - 8)
    const minR = Math.max(0, minRow - 8)

    for (const layer of targetLayers) {
      if (!layer || layer.locked || !layer.tiles) continue

      for (let c = minC; c <= maxCol; c++) {
        for (let r = minR; r <= maxRow; r++) {
          const k = cellKey(c, r)
          const raw = layer.tiles[k]
          if (!raw) continue

          const itemArr = Array.isArray(raw) ? raw : [raw]
          const remainingItems: TileItem[] = []

          for (const item of itemArr) {
            if (!item || !item.assetId) continue
            const spanX = item.spanX || 1
            const spanY = item.spanY || 1

            let overlaps = false
            for (let cx = c; cx < c + spanX; cx++) {
              for (let cy = r; cy < r + spanY; cy++) {
                if (cellSet.has(cellKey(cx, cy))) {
                  overlaps = true
                  break
                }
              }
              if (overlaps) break
            }

            if (overlaps && targetAssetSet.has(item.assetId)) {
              deletedCount++
            } else {
              remainingItems.push(item)
            }
          }

          if (remainingItems.length === 0) {
            delete layer.tiles[k]
          } else {
            layer.tiles[k] = remainingItems
          }
        }
      }
    }

    if (deletedCount > 0) {
      if (pushHist) {
        pushHistory(`Cleared ${deletedCount} elements in area`)
      } else {
        project.value.updatedAt = Date.now()
      }
    }

    return deletedCount
  }

  function clearLayerTiles(layerId = activeLayerId.value) {
    const layer = project.value.layers.find(l => l.id === layerId)
    if (!layer || layer.locked) return

    layer.tiles = {}
    pushHistory(`Cleared layer: ${layer.name}`)
  }

  function clearAllTiles() {
    for (const layer of project.value.layers) {
      if (!layer.locked) {
        layer.tiles = {}
      }
    }
    pushHistory('Cleared all layers')
  }

  // --- Batch Operations for Multi-Select & Identical Assets Management ---

  // Fast indexed cache of placed elements by assetId.
  // Computed ONCE whenever layers/tiles change - never recomputed on cell selection!
  const assetItemsIndex = computed(() => {
    const map = new Map<string, { col: number; row: number; layerId: string; item: TileItem }[]>()
    const layers = project.value.layers
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l]
      if (!layer || !layer.tiles) continue
      const tiles = layer.tiles
      for (const key in tiles) {
        const raw = tiles[key]
        if (!raw) continue
        const items = Array.isArray(raw) ? raw : [raw]
        const commaIdx = key.indexOf(',')
        const kCol = commaIdx !== -1 ? Number(key.slice(0, commaIdx)) : 0
        const kRow = commaIdx !== -1 ? Number(key.slice(commaIdx + 1)) : 0

        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (!item || !item.id || !item.assetId) continue

          const entry = {
            col: item.x !== undefined ? item.x : kCol,
            row: item.y !== undefined ? item.y : kRow,
            layerId: layer.id,
            item,
          }

          // Index by exact assetId
          let list = map.get(item.assetId)
          if (!list) {
            list = []
            map.set(item.assetId, list)
          }
          list.push(entry)

          // Also index by normalized cleanId if different
          const cleanId = item.assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
          if (cleanId !== item.assetId) {
            let cleanList = map.get(cleanId)
            if (!cleanList) {
              cleanList = []
              map.set(cleanId, cleanList)
            }
            cleanList.push(entry)
          }
        }
      }
    }
    return map
  })

  function getAllItemsByAssetId(assetId: string, layerId?: string): { col: number; row: number; layerId: string; item: TileItem }[] {
    if (!assetId) return []
    const cleanTargetId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    const all = assetItemsIndex.value.get(assetId) || assetItemsIndex.value.get(cleanTargetId) || []
    if (!layerId) return all
    return all.filter(e => e.layerId === layerId)
  }

  function getAssetItemCount(assetId: string, layerId?: string): number {
    if (!assetId) return 0
    const cleanTargetId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    const all = assetItemsIndex.value.get(assetId) || assetItemsIndex.value.get(cleanTargetId)
    if (!all) return 0
    if (!layerId) return all.length
    let count = 0
    for (let i = 0; i < all.length; i++) {
      if (all[i].layerId === layerId) count++
    }
    return count
  }

  function batchMoveItemsToLayer(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    targetLayerId: string
  ) {
    const targetLayer = project.value.layers.find(l => l.id === targetLayerId)
    if (!targetLayer || targetLayer.locked) return

    let movedCount = 0
    for (const entry of items) {
      if (entry.layerId === targetLayerId) continue
      const fromLayer = project.value.layers.find(l => l.id === entry.layerId)
      if (!fromLayer) continue

      const key = cellKey(entry.col, entry.row)
      const fromItems = getCellItems(entry.col, entry.row, entry.layerId)
      const index = fromItems.findIndex(i => i.id === entry.itemId)
      if (index === -1) continue

      const [item] = fromItems.splice(index, 1)
      if (fromItems.length === 0) {
        delete fromLayer.tiles[key]
      } else {
        fromLayer.tiles[key] = [...fromItems]
      }

      const toItems = getCellItems(entry.col, entry.row, targetLayerId)
      targetLayer.tiles[key] = [...toItems, item]
      entry.layerId = targetLayerId
      movedCount++
    }

    if (movedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Moved ${movedCount} elements to layer: ${targetLayer.name}`)
    }
  }

  function batchUpdateItemsAnchor(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    anchorX: number, 
    anchorY: number
  ) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.anchorX = Math.max(0, Math.min(1.0, Number(anchorX.toFixed(2))))
      item.anchorY = Math.max(0, Math.min(1.0, Number(anchorY.toFixed(2))))
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Updated anchor for ${updatedCount} elements`)
    }
  }

  function batchUpdateItemsScale(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    scale: number
  ) {
    let updatedCount = 0
    const cleanScale = Math.max(0.1, Math.min(5.0, Number(scale.toFixed(2))))
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.scale = cleanScale
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Updated scale to ${cleanScale}x for ${updatedCount} elements`)
    }
  }

  function batchAdjustItemsScale(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    delta: number
  ) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      const current = item.scale || 1.0
      item.scale = Math.max(0.1, Math.min(5.0, Number((current + delta).toFixed(2))))
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Adjusted scale for ${updatedCount} elements`)
    }
  }

  function batchShiftItemsDepthOffset(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    delta: number
  ) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      const current = item.depthOffset || 0
      item.depthOffset = Math.max(-10, Math.min(10, current + delta))
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Adjusted depth offset for ${updatedCount} elements`)
    }
  }

  function batchSetItemsDepthOffset(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    offset: number
  ) {
    let updatedCount = 0
    const cleanOffset = Math.max(-10, Math.min(10, Math.round(offset)))
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.depthOffset = cleanOffset
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Set depth offset to ${cleanOffset} for ${updatedCount} elements`)
    }
  }

  function batchAdjustItemsZIndex(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    delta: number
  ) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      const current = item.zIndex || 0
      const nextZ = Math.max(0, Math.min(999, current + delta))
      setAllCellsZIndex(entry.col, entry.row, entry.itemId, nextZ, entry.layerId)
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Adjusted Z-Index for ${updatedCount} elements`)
    }
  }

  function batchSetItemsZIndex(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    zIndex: number
  ) {
    let updatedCount = 0
    const cleanZ = Math.max(0, Math.min(999, Math.round(zIndex)))
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      setAllCellsZIndex(entry.col, entry.row, entry.itemId, cleanZ, entry.layerId)
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Set Z-Index to ${cleanZ} for ${updatedCount} elements`)
    }
  }

  function batchNudgeItemsOffset(
    items: { col: number; row: number; itemId: string; layerId: string }[], 
    dx: number, 
    dy: number
  ) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.offsetX = (item.offsetX || 0) + dx
      item.offsetY = (item.offsetY || 0) + dy
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Nudged offset for ${updatedCount} elements`)
    }
  }

  function batchResetItemsOffset(items: { col: number; row: number; itemId: string; layerId: string }[]) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.offsetX = 0
      item.offsetY = 0
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Reset offset for ${updatedCount} elements`)
    }
  }

  function batchFlipItemsX(items: { col: number; row: number; itemId: string; layerId: string }[]) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.flipX = !item.flipX
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Flipped ${updatedCount} elements`)
    }
  }

  function batchRotateItems(items: { col: number; row: number; itemId: string; layerId: string }[], angleDelta = 90) {
    let updatedCount = 0
    for (const entry of items) {
      const layer = project.value.layers.find(l => l.id === entry.layerId)
      if (!layer || layer.locked) continue

      const cellItems = getCellItems(entry.col, entry.row, entry.layerId)
      const item = cellItems.find(i => i.id === entry.itemId)
      if (!item) continue

      item.rotation = ((item.rotation || 0) + angleDelta) % 360
      updatedCount++
    }

    if (updatedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Rotated ${updatedCount} elements`)
    }
  }

  function batchRemoveTileItems(items: { col: number; row: number; itemId: string; layerId: string }[]): number {
    if (!items || items.length === 0) return 0

    // Group itemIds by layerId for O(1) set lookup
    const layerItemsToDelete = new Map<string, Set<string>>()
    // Track candidate cell keys for fast O(1) direct hits: layerId -> Set<cellKey>
    const layerCandidateKeys = new Map<string, Set<string>>()

    for (let i = 0; i < items.length; i++) {
      const entry = items[i]
      if (!entry || !entry.layerId || !entry.itemId) continue

      let itemSet = layerItemsToDelete.get(entry.layerId)
      if (!itemSet) {
        itemSet = new Set<string>()
        layerItemsToDelete.set(entry.layerId, itemSet)
      }
      itemSet.add(entry.itemId)

      let keySet = layerCandidateKeys.get(entry.layerId)
      if (!keySet) {
        keySet = new Set<string>()
        layerCandidateKeys.set(entry.layerId, keySet)
      }
      if (entry.col !== undefined && entry.row !== undefined) {
        keySet.add(cellKey(entry.col, entry.row))
      }
    }

    let removedCount = 0

    for (const [layerId, itemIdsToDelete] of layerItemsToDelete.entries()) {
      const layer = project.value.layers.find(l => l.id === layerId)
      if (!layer || layer.locked || !layer.tiles) continue

      const candidateKeys = layerCandidateKeys.get(layerId)
      const remainingToDelete = new Set(itemIdsToDelete)

      // 1. Fast-path: Check candidate keys directly
      if (candidateKeys) {
        for (const key of candidateKeys) {
          const raw = layer.tiles[key]
          if (!raw) continue

          const cellItems = Array.isArray(raw) ? raw : [raw]
          const remaining: TileItem[] = []
          let cellChanged = false

          for (let j = 0; j < cellItems.length; j++) {
            const item = cellItems[j]
            if (item && itemIdsToDelete.has(item.id)) {
              remainingToDelete.delete(item.id)
              removedCount++
              cellChanged = true
            } else {
              remaining.push(item)
            }
          }

          if (cellChanged) {
            if (remaining.length === 0) {
              delete layer.tiles[key]
            } else {
              layer.tiles[key] = remaining
            }
          }
        }
      }

      // 2. Fallback: If any multi-cell items had different origin than candidate key, scan remaining cells
      if (remainingToDelete.size > 0) {
        for (const key in layer.tiles) {
          if (candidateKeys && candidateKeys.has(key)) continue
          const raw = layer.tiles[key]
          if (!raw) continue

          const cellItems = Array.isArray(raw) ? raw : [raw]
          const remaining: TileItem[] = []
          let cellChanged = false

          for (let j = 0; j < cellItems.length; j++) {
            const item = cellItems[j]
            if (item && remainingToDelete.has(item.id)) {
              remainingToDelete.delete(item.id)
              removedCount++
              cellChanged = true
            } else {
              remaining.push(item)
            }
          }

          if (cellChanged) {
            if (remaining.length === 0) {
              delete layer.tiles[key]
            } else {
              layer.tiles[key] = remaining
            }
          }

          if (remainingToDelete.size === 0) break
        }
      }
    }

    if (removedCount > 0) {
      project.value.updatedAt = Date.now()
      pushHistory(`Deleted ${removedCount} elements`)
    }

    return removedCount
  }

  function isCellBuildable(col: number, row: number): boolean {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return false
    const cells = project.value.buildableCells
    if (project.value.buildMode === 'custom' || (Array.isArray(cells) && cells.length > 0)) {
      return Array.isArray(cells) && cells.includes(`${col},${row}`)
    }
    return true
  }

  function toggleBuildableCell(col: number, row: number) {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return
    if (!project.value.buildableCells) {
      project.value.buildableCells = []
    }
    const key = `${col},${row}`
    const idx = project.value.buildableCells.indexOf(key)
    if (idx !== -1) {
      project.value.buildableCells.splice(idx, 1)
    } else {
      project.value.buildableCells.push(key)
    }
    project.value.buildMode = 'custom'
    project.value.updatedAt = Date.now()
  }

  function setCellBuildable(col: number, row: number, buildable: boolean) {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return
    if (!project.value.buildableCells) {
      project.value.buildableCells = []
    }
    const key = `${col},${row}`
    const idx = project.value.buildableCells.indexOf(key)
    if (buildable && idx === -1) {
      project.value.buildableCells.push(key)
    } else if (!buildable && idx !== -1) {
      project.value.buildableCells.splice(idx, 1)
    }
    project.value.buildMode = 'custom'
    project.value.updatedAt = Date.now()
  }

  function batchSetBuildableCells(cells: GridCoord[], buildable: boolean) {
    if (!cells || cells.length === 0) return
    if (!project.value.buildableCells) {
      project.value.buildableCells = []
    }
    const currentSet = new Set(project.value.buildableCells)
    for (const c of cells) {
      if (!isInsideGrid(c.col, c.row, project.value.cols, project.value.rows)) continue
      const key = `${c.col},${c.row}`
      if (buildable) {
        currentSet.add(key)
      } else {
        currentSet.delete(key)
      }
    }
    project.value.buildableCells = Array.from(currentSet)
    project.value.buildMode = 'custom'
    project.value.updatedAt = Date.now()
    pushHistory(buildable ? `Added ${cells.length} buildable cells` : `Removed ${cells.length} buildable cells`)
  }

  function setAllCellsBuildable(buildable: boolean) {
    if (buildable) {
      project.value.buildMode = 'all'
      project.value.buildableCells = []
    } else {
      project.value.buildMode = 'custom'
      project.value.buildableCells = []
    }
    project.value.updatedAt = Date.now()
    pushHistory(buildable ? 'Set all cells buildable' : 'Cleared all buildable cells')
  }

  function isCellWater(col: number, row: number): boolean {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return false
    const cells = project.value.waterCells
    return Array.isArray(cells) && cells.includes(`${col},${row}`)
  }

  function toggleWaterCell(col: number, row: number) {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return
    if (!project.value.waterCells) {
      project.value.waterCells = []
    }
    const key = `${col},${row}`
    const idx = project.value.waterCells.indexOf(key)
    if (idx !== -1) {
      project.value.waterCells.splice(idx, 1)
    } else {
      project.value.waterCells.push(key)
    }
    project.value.updatedAt = Date.now()
  }

  function setCellWater(col: number, row: number, isWater: boolean) {
    if (!isInsideGrid(col, row, project.value.cols, project.value.rows)) return
    if (!project.value.waterCells) {
      project.value.waterCells = []
    }
    const key = `${col},${row}`
    const idx = project.value.waterCells.indexOf(key)
    if (isWater && idx === -1) {
      project.value.waterCells.push(key)
    } else if (!isWater && idx !== -1) {
      project.value.waterCells.splice(idx, 1)
    }
    project.value.updatedAt = Date.now()
  }

  function batchSetWaterCells(cells: GridCoord[], isWater: boolean) {
    if (!cells || cells.length === 0) return
    if (!project.value.waterCells) {
      project.value.waterCells = []
    }
    const currentSet = new Set(project.value.waterCells)
    for (const c of cells) {
      if (!isInsideGrid(c.col, c.row, project.value.cols, project.value.rows)) continue
      const key = `${c.col},${c.row}`
      if (isWater) {
        currentSet.add(key)
      } else {
        currentSet.delete(key)
      }
    }
    project.value.waterCells = Array.from(currentSet)
    project.value.updatedAt = Date.now()
    pushHistory(isWater ? `Added ${cells.length} water cells` : `Removed ${cells.length} water cells`)
  }

  function clearAllWaterCells() {
    project.value.waterCells = []
    project.value.updatedAt = Date.now()
    pushHistory('Cleared all water cells')
  }

  function fillAllWaterCells() {
    const list: string[] = []
    for (let c = 0; c < project.value.cols; c++) {
      for (let r = 0; r < project.value.rows; r++) {
        list.push(`${c},${r}`)
      }
    }
    project.value.waterCells = list
    project.value.updatedAt = Date.now()
    pushHistory('Filled all cells with water')
  }

  if (history.value.length === 0) {
    resetHistory('Initial state')
  }

  return {
    project,
    activeLayerId,
    activeLayer,
    isGameMap,
    history,
    historyIndex,
    historyRevision,
    canUndo,
    canRedo,
    totalTilesCount,
    allPlacedElements,
    getCellItems,
    getElementsAtOrCoveringCell,
    getAllElementsAtOrCoveringCell,
    getAllItemsByAssetId,
    getAssetItemCount,
    pushHistory,
    resetHistory,
    jumpToHistory,
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
    batchMoveItemsToLayer,
    setTile,
    removeTile,
    removeTileItem,
    batchRemoveTileItems,
    moveTileItem,
    setItemZIndex,
    setCellSpecificZIndex,
    setAllCellsZIndex,
    adjustCellZIndex,
    batchAdjustItemsZIndex,
    batchSetItemsZIndex,
    shiftItemDepthOffset,
    setItemDepthOffset,
    batchShiftItemsDepthOffset,
    batchSetItemsDepthOffset,
    bringItemForward,
    sendItemBackward,
    bringItemToTop,
    sendItemToBottom,
    flipTileItem,
    rotateTileItem,
    batchFlipItemsX,
    batchRotateItems,
    updateItemScale,
    batchUpdateItemsScale,
    batchAdjustItemsScale,
    updateItemAnchor,
    updateAllItemsOfAsset,
    batchUpdateItemsAnchor,
    updateItemSpan,
    updateTileOffset,
    batchNudgeItemsOffset,
    batchResetItemsOffset,
    fillTiles,
    fillEmptyCells,
    fillEmptyCellsInBox,
    scatterFillTiles,
    getBoxElementSummary,
    getCellsElementSummary,
    getElementsInBox,
    deleteElementsInBox,
    deleteElementsInCells,
    clearLayerTiles,
    clearAllTiles,
    isCellBuildable,
    toggleBuildableCell,
    setCellBuildable,
    batchSetBuildableCells,
    setAllCellsBuildable,
    isCellWater,
    toggleWaterCell,
    setCellWater,
    batchSetWaterCells,
    clearAllWaterCells,
    fillAllWaterCells,
  }
})
