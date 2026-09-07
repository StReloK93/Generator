import { MapProject, AssetItem } from '../types/map'

/**
 * Downloads a data URI or blob as a file
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Compacts a single tile item for minimal JSON serialization by stripping default values.
 */
export function compactTileItem(item: any, col: number, row: number): any {
  if (!item) return null
  const compact: any = {
    id: item.id,
    assetId: item.assetId || item.id,
  }
  if (item.x !== undefined && item.x !== col) compact.x = item.x
  if (item.y !== undefined && item.y !== row) compact.y = item.y
  if (item.spanX && item.spanX !== 1) compact.spanX = item.spanX
  if (item.spanY && item.spanY !== 1) compact.spanY = item.spanY
  if (item.scale && item.scale !== 1) compact.scale = item.scale
  if (item.offsetX && item.offsetX !== 0) compact.offsetX = item.offsetX
  if (item.offsetY && item.offsetY !== 0) compact.offsetY = item.offsetY
  if (item.flipX) compact.flipX = true
  if (item.rotation && item.rotation !== 0) compact.rotation = item.rotation
  if (item.zIndex && item.zIndex !== 0) compact.zIndex = item.zIndex
  if (item.depthOffset && item.depthOffset !== 0) compact.depthOffset = item.depthOffset
  if (item.cellZIndex && typeof item.cellZIndex === 'object') {
    const nonZero = Object.entries(item.cellZIndex).filter(([_, z]) => z !== 0)
    if (nonZero.length > 0) compact.cellZIndex = Object.fromEntries(nonZero)
  }
  if (item.anchorX !== undefined && item.anchorX !== 0.5) compact.anchorX = item.anchorX
  if (item.anchorY !== undefined && item.anchorY !== 0.88) compact.anchorY = item.anchorY
  if (item.opacity !== undefined && item.opacity !== 1.0) compact.opacity = item.opacity
  return compact
}

/**
 * Restores all default properties of a tile item from compact JSON representation.
 */
export function normalizeTileItem(raw: any, col: number, row: number): any {
  if (!raw) return null
  return {
    id: raw.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    x: raw.x !== undefined ? raw.x : col,
    y: raw.y !== undefined ? raw.y : row,
    assetId: raw.assetId || raw.id,
    zIndex: raw.zIndex || 0,
    depthOffset: raw.depthOffset || 0,
    cellZIndex: raw.cellZIndex || {},
    spanX: raw.spanX || 1,
    spanY: raw.spanY || 1,
    scale: raw.scale ?? 1.0,
    anchorX: raw.anchorX,
    anchorY: raw.anchorY,
    flipX: !!raw.flipX,
    rotation: raw.rotation || 0,
    offsetX: raw.offsetX || 0,
    offsetY: raw.offsetY || 0,
    opacity: raw.opacity ?? 1.0,
  }
}

/**
 * Builds the canonical, highly optimized JSON payload for an Isocraft Map.
 * Used identically by both Export JSON and Local Auto-save / Recents storage.
 */
export function buildFullProjectJsonPayload(
  project: MapProject, 
  assets: AssetItem[],
  characterData?: {
    customRoutes?: Record<string, any>
    characterConfig?: Record<string, any>
    spawnPoints?: any[]
    speed?: number
    formation?: string
    pairDistance?: number
    followCamera?: boolean
    showPathTrail?: boolean
    autoLoop?: boolean
    selectedDoorIndex?: number
  },
  towerData?: {
    placedTowers?: any[]
    towerBlueprints?: any[]
  },
  waveData?: {
    waveConfigs?: any[]
    currentWaveIndex?: number
  },
  gameSettings?: {
    startingGold: number
    startingLives: number
    wavePrepTime: number
    scoreMultiplier?: number
  }
): any {
  const resolvedGameSettings = gameSettings || project.gameSettings || {
    startingGold: 150,
    startingLives: 20,
    wavePrepTime: 10,
  }

  const resolvedCustomRoutes = characterData?.customRoutes || project.customRoutes || {}
  const resolvedSpawnPoints = characterData?.spawnPoints || (project as any).spawnPoints || []
  const resolvedCharacterConfig = {
    ...(project.characterConfig || {}),
    ...(characterData?.characterConfig || {}),
    speed: characterData?.speed ?? characterData?.characterConfig?.speed ?? project.characterConfig?.speed ?? 1.5,
    formation: characterData?.formation ?? characterData?.characterConfig?.formation ?? project.characterConfig?.formation ?? 'single',
    pairDistance: characterData?.pairDistance ?? characterData?.characterConfig?.pairDistance ?? project.characterConfig?.pairDistance ?? 0.6,
    followCamera: characterData?.followCamera ?? characterData?.characterConfig?.followCamera ?? project.characterConfig?.followCamera ?? false,
    showPathTrail: characterData?.showPathTrail ?? characterData?.characterConfig?.showPathTrail ?? project.characterConfig?.showPathTrail ?? true,
    autoLoop: characterData?.autoLoop ?? characterData?.characterConfig?.autoLoop ?? project.characterConfig?.autoLoop ?? false,
    selectedDoorIndex: characterData?.selectedDoorIndex ?? characterData?.characterConfig?.selectedDoorIndex ?? project.characterConfig?.selectedDoorIndex ?? 0,
  }

  const resolvedPlacedTowers = towerData?.placedTowers || (project as any).placedTowers || []
  const rawTowerBlueprints = towerData?.towerBlueprints || (project as any).towerBlueprints || []
  const resolvedTowerBlueprints = rawTowerBlueprints.map((bp: any) => {
    const rawName = (bp.assetName || '').replace(/\.[^/.]+$/, '').trim()
    const fallbackId = rawName ? (rawName.startsWith('sprite-') ? rawName : `sprite-${rawName}`) : 'sprite-stoneColumn_W'
    return {
      ...bp,
      assetId: bp.assetId || fallbackId,
      assetName: bp.assetName || (rawName ? `${rawName}.png` : 'stoneColumn_W.png'),
      assetPath: bp.assetPath && (bp.assetPath.startsWith('http://') || bp.assetPath.startsWith('https://')) ? bp.assetPath : '',
    }
  })
  const rawWaveConfigs = waveData?.waveConfigs || (project as any).waveConfigs || []
  const resolvedWaveConfigs = rawWaveConfigs.map((w: any) => ({
    waveNumber: w.waveNumber,
    name: w.name,
    unitHp: Number(w.unitHp) || 100,
    unitSpeed: Number(w.unitSpeed) || 2.5,
    unitCount: Number(w.unitCount) || 10,
    isBoss: !!w.isBoss,
    goldReward: Number(w.goldReward) || 25,
    characterModel: w.characterModel || 'male',
  }))
  const resolvedCurrentWaveIndex = waveData?.currentWaveIndex ?? (project as any).currentWaveIndex ?? 0

  // Compact layers to remove redundant default values from every single cell
  const compactedLayers = (project.layers || []).map(layer => {
    const compactTiles: Record<string, any[]> = {}
    for (const [key, items] of Object.entries(layer.tiles || {})) {
      const [col, row] = key.split(',').map(Number)
      const itemArr = Array.isArray(items) ? items : [items]
      const compactedList = itemArr
        .map(item => compactTileItem(item, col, row))
        .filter(Boolean)
      if (compactedList.length > 0) {
        compactTiles[key] = compactedList
      }
    }
    return {
      id: layer.id,
      name: layer.name,
      visible: layer.visible !== false,
      locked: !!layer.locked,
      opacity: layer.opacity ?? 1.0,
      tiles: compactTiles,
    }
  })

  // ONLY serialize custom uploaded/linked assets. Built-in system sprites are baked in atlas manifests and never stored in JSON!
  const customAssetsOnly = (assets || [])
    .filter(a => {
      if (!a) return false
      const hasCustomSrc = !!(a.src && (a.src.startsWith('data:') || a.src.startsWith('http://') || a.src.startsWith('https://') || a.src.startsWith('blob:')))
      return hasCustomSrc || (!a.isSample && !!a.src)
    })
    .map(a => ({
      id: a.id,
      name: a.name,
      fileRelativePath: a.fileRelativePath || '',
      src: a.src || '',
      previewSrc: a.previewSrc || '',
      category: a.category || 'Custom',
      width: a.width,
      height: a.height,
      anchorX: a.anchorX,
      anchorY: a.anchorY,
      contentBounds: a.contentBounds,
      spanX: a.spanX || 1,
      spanY: a.spanY || 1,
      scale: a.scale || 1.0,
      isSample: a.isSample,
    }))

  return {
    version: '2.1.0',
    type: 'isocraft-map-project',
    project: {
      id: project.id,
      name: project.name,
      cols: project.cols,
      rows: project.rows,
      tileWidth: project.tileWidth,
      tileHeight: project.tileHeight,
      bgColor: project.bgColor,
      showGrid: project.showGrid,
      gridColor: project.gridColor,
      layers: compactedLayers,
      gameSettings: resolvedGameSettings,
      customRoutes: resolvedCustomRoutes,
      spawnPoints: resolvedSpawnPoints,
      characterConfig: resolvedCharacterConfig,
      placedTowers: resolvedPlacedTowers,
      towerBlueprints: resolvedTowerBlueprints,
      waveConfigs: resolvedWaveConfigs,
      currentWaveIndex: resolvedCurrentWaveIndex,
      createdAt: project.createdAt || Date.now(),
      updatedAt: Date.now(),
    },
    assets: customAssetsOnly,
    savedAt: new Date().toISOString(),
  }
}

/**
 * Export full project state and custom assets to a JSON file
 */
export function exportProjectJson(
  project: MapProject, 
  assets: AssetItem[],
  characterData?: any,
  towerData?: any,
  waveData?: any,
  gameSettings?: any
): void {
  const payload = buildFullProjectJsonPayload(
    project, 
    assets, 
    characterData, 
    towerData, 
    waveData, 
    gameSettings
  )

  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const cleanName = (project.name || 'isocraft_map').toLowerCase().replace(/[^a-z0-9_-]+/gi, '_')
  const filename = `${cleanName}.isomap.json`

  downloadDataUrl(url, filename)
  URL.revokeObjectURL(url)
}

/**
 * Imports project and assets from JSON file
 */
export function importProjectFromJson(
  file: File
): Promise<{ 
  project: MapProject
  assets: AssetItem[]
  gameSettings?: any
  characterData?: {
    customRoutes?: Record<string, any>
    characterConfig?: Record<string, any>
    spawnPoints?: any[]
  }
  towerData?: {
    placedTowers?: any[]
    towerBlueprints?: any[]
  }
  waveData?: {
    waveConfigs?: any[]
    currentWaveIndex?: number
  }
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rawData = JSON.parse(reader.result as string)
        const data = rawData.payload || rawData
        const project = data.project || data
        if (!project || !project.cols || !project.rows) {
          throw new Error('No valid map project found in file!')
        }

        // Normalize all layers & tiles
        if (project.layers) {
          for (const layer of project.layers) {
            if (layer.tiles) {
              for (const [key, items] of Object.entries(layer.tiles)) {
                const [col, row] = key.split(',').map(Number)
                const itemArr = Array.isArray(items) ? items : [items]
                layer.tiles[key] = itemArr.map(item => normalizeTileItem(item, col, row))
              }
            }
          }
        }
        
        const characterData = data.characterData || {
          customRoutes: project.customRoutes || {},
          spawnPoints: project.spawnPoints || [],
          characterConfig: project.characterConfig || {},
        }

        const towerData = data.towerData || {
          placedTowers: project.placedTowers || [],
          towerBlueprints: project.towerBlueprints || [],
        }

        const waveData = data.waveData || {
          waveConfigs: project.waveConfigs || [],
          currentWaveIndex: project.currentWaveIndex ?? 0,
        }

        const gameSettings = project.gameSettings || data.gameSettings || {
          startingGold: 150,
          startingLives: 20,
          wavePrepTime: 10,
        }

        resolve({
          project,
          assets: data.assets || [],
          gameSettings,
          characterData,
          towerData,
          waveData,
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
