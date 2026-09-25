import { MapProject, AssetItem } from '../types/map'
import { registerCustomProjectiles, getAllProjectilesUnified } from './projectileCatalog'

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
  if (item.isFrontWall) compact.isFrontWall = true
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
    isFrontWall: !!raw.isFrontWall,
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
    routes?: any[]
    spawnMode?: string
    formation?: string
    pairDistance?: number
    unitElevation?: number
    unitScaleMultiplier?: number
    selectedRouteIndex?: number | null
    [key: string]: any
  },
  towerData?: {
    placedTowers?: any[]
    towerBlueprints?: any[]
    clans?: any[]
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
    spawnMode?: 'all_routes' | 'single_route'
    formation?: string
    pairDistance?: number
    unitElevation?: number
    unitScaleMultiplier?: number
  }
): any {
  const resolvedGameSettings = {
    startingGold: gameSettings?.startingGold ?? project.gameSettings?.startingGold ?? 150,
    startingLives: gameSettings?.startingLives ?? project.gameSettings?.startingLives ?? 20,
    wavePrepTime: gameSettings?.wavePrepTime ?? project.gameSettings?.wavePrepTime ?? 10,
    spawnMode: gameSettings?.spawnMode ?? project.gameSettings?.spawnMode ?? characterData?.spawnMode ?? 'all_routes',
    formation: gameSettings?.formation ?? project.gameSettings?.formation ?? characterData?.formation ?? 'single',
    pairDistance: gameSettings?.pairDistance ?? project.gameSettings?.pairDistance ?? characterData?.pairDistance ?? 0.6,
    unitElevation: gameSettings?.unitElevation ?? project.gameSettings?.unitElevation ?? (characterData as any)?.unitElevation ?? 0,
    unitScaleMultiplier: gameSettings?.unitScaleMultiplier ?? project.gameSettings?.unitScaleMultiplier ?? (characterData as any)?.unitScaleMultiplier ?? 1.0,
    scoreMultiplier: gameSettings?.scoreMultiplier ?? project.gameSettings?.scoreMultiplier ?? 1.0,
  }

  const rawRoutes = characterData?.routes || (project as any).routes || []
  const resolvedRoutes = (Array.isArray(rawRoutes) ? rawRoutes : []).map((r: any, idx: number) => {
    let routePoints: any[] | undefined = Array.isArray(r.routePoints) && r.routePoints.length > 0
      ? r.routePoints.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
      : undefined

    if (!routePoints) {
      const key = r.id || `route-${idx}`
      const legacyWps = characterData?.customWaypoints?.[key] || (project as any)?.customWaypoints?.[key]
      if (Array.isArray(legacyWps) && legacyWps.length > 0) {
        routePoints = legacyWps.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
      } else {
        const c = r.col !== undefined ? r.col : (r.spawnCol ?? 2)
        const row = r.row !== undefined ? r.row : (r.spawnRow ?? 2)
        routePoints = [{ col: Number(c), row: Number(row) }]
      }
    }

    let playerCameraPoint = r.playerCameraPoint
    if (!playerCameraPoint && (r.playerCol !== undefined && r.playerRow !== undefined)) {
      playerCameraPoint = { col: Number(r.playerCol), row: Number(r.playerRow) }
    }

    return {
      id: r.id || `route-${idx + 1}`,
      name: r.name || `Route ${idx + 1}`,
      routePoints,
      playerCameraPoint: playerCameraPoint ? { col: Number(playerCameraPoint.col), row: Number(playerCameraPoint.row) } : undefined,
    }
  })

  const resolvedClans = (project as any).clans || towerData?.clans || []
  const resolvedPlacedTowers = towerData?.placedTowers || (project as any).placedTowers || []
  const rawTowerBlueprints = towerData?.towerBlueprints || (project as any).towerBlueprints || []
  const resolvedTowerBlueprints = rawTowerBlueprints.map((bp: any) => {
    const rawName = (bp.asset?.assetName || bp.assetName || bp.name || '').replace(/\.[^/.]+$/, '').trim()
    const fallbackId = rawName ? (rawName.startsWith('sprite-') ? rawName : `sprite-${rawName}`) : 'sprite-stoneColumn_W'
    const assetId = bp.asset?.assetId || bp.assetId || fallbackId
    const assetName = bp.asset?.assetName || bp.assetName || (rawName ? `${rawName}.webp` : 'stoneColumn_W.webp')
    const assetPath = bp.asset?.assetPath || (bp.assetPath && (bp.assetPath.startsWith('http://') || bp.assetPath.startsWith('https://')) ? bp.assetPath : '')
    const projId = bp.projectileId || bp.projectileType || bp.projectile?.type || 'fireball'
    const targetStrategy = bp.targetStrategy || 'first'

    const levels = Array.isArray(bp.levels) && bp.levels.length > 0
      ? bp.levels.map((lvl: any, idx: number) => {
          const isLvlSplash = lvl.isSplash !== undefined ? Boolean(lvl.isSplash) : (idx === 0 ? Boolean(bp.isSplash) : false)
          return {
            ...lvl,
            level: lvl.level || (idx + 1),
            name: lvl.name || (idx === 0 ? bp.name : `${bp.name} ${idx + 1}`),
            cost: Number(lvl.cost ?? bp.cost ?? 100),
            damage: Number(lvl.damage ?? bp.damage ?? 20),
            attackSpeed: Number(lvl.attackSpeed ?? bp.attackSpeed ?? 1.0),
            range: Number(lvl.range ?? bp.range ?? 3.0),
            isSplash: isLvlSplash,
            splashRadius: isLvlSplash ? Number(lvl.splashRadius ?? bp.splashRadius ?? 1.5) : undefined,
            splashType: isLvlSplash ? (lvl.splashType || bp.splashType || 'falloff') : undefined,
            traits: Array.isArray(lvl.traits) ? [...lvl.traits] : (Array.isArray(bp.traits) ? [...bp.traits] : []),
            effects: Array.isArray(lvl.effects) && lvl.effects.length > 0
              ? [...lvl.effects]
              : (Array.isArray(bp.effects) && bp.effects.length > 0 ? [...bp.effects] : undefined),
          }
        })
      : [
          {
            ...bp,
            level: 1,
            name: bp.name || 'Tower',
            cost: Number(bp.cost ?? 100),
            damage: Number(bp.damage ?? 20),
            attackSpeed: Number(bp.attackSpeed ?? 1.0),
            range: Number(bp.range ?? 3.0),
            isSplash: Boolean(bp.isSplash),
            splashRadius: Boolean(bp.isSplash) ? Number(bp.splashRadius ?? 1.5) : undefined,
            splashType: Boolean(bp.isSplash) ? (bp.splashType || 'falloff') : undefined,
            traits: Array.isArray(bp.traits) ? [...bp.traits] : [],
            effects: Array.isArray(bp.effects) && bp.effects.length > 0 ? [...bp.effects] : undefined,
          }
        ]

    return {
      id: bp.id,
      name: bp.name,
      description: bp.description || '',
      clanId: bp.clanId || (resolvedClans[0]?.id || 'clan-iron'),
      asset: {
        assetId,
        assetName,
        assetPath,
        scale: Number(bp.asset?.scale ?? bp.scale ?? 1.0),
        spanX: Number(bp.asset?.spanX ?? bp.spanX ?? 1),
        spanY: Number(bp.asset?.spanY ?? bp.spanY ?? 1),
        anchorX: Number(bp.asset?.anchorX ?? bp.anchorX ?? 0.5),
        anchorY: Number(bp.asset?.anchorY ?? bp.anchorY ?? 0.88),
        muzzleOffsetX: Number(bp.asset?.muzzleOffsetX ?? bp.muzzleOffsetX ?? 0),
        muzzleOffsetY: Number(bp.asset?.muzzleOffsetY ?? bp.muzzleOffsetY ?? 0),
      },
      projectileId: projId,
      targetStrategy,
      levels,
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
    goldReward: Number(w.goldReward) || (Number(w.unitBonus) || 1),
    unitBonus: w.unitBonus !== undefined ? Number(w.unitBonus) : (Number(w.goldReward) || 1),
    endWaveBonus: w.endWaveBonus !== undefined ? Number(w.endWaveBonus) : 50,
    characterModel: w.characterModel || 'male',
    animSpeed: Number(w.animSpeed) || 1.0,
    offsetY: Number(w.offsetY) || 0,
    unitScale: Number(w.unitScale) || 1.0,
    unitVariant: w.unitVariant || 'normal',
    variantTint: w.variantTint,
    immunities: Array.isArray(w.immunities) ? [...w.immunities] : [],
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
      depthOffset: a.depthOffset || 0,
      isFrontWall: !!a.isFrontWall,
      isSample: a.isSample,
    }))

  return {
    version: '2.1.0',
    type: 'isocraft-map-project',
    project: {
      id: project.id,
      name: project.name,
      gameMode: project.gameMode || 'td',
      cols: project.cols,
      rows: project.rows,
      tileWidth: project.tileWidth,
      tileHeight: project.tileHeight,
      bgColor: project.bgColor,
      showGrid: project.showGrid,
      gridColor: project.gridColor,
      layers: compactedLayers,
      gameSettings: resolvedGameSettings,
      clans: resolvedClans.map((c: any) => ({ ...c })),
      routes: resolvedRoutes,
      placedTowers: resolvedPlacedTowers,
      towerBlueprints: resolvedTowerBlueprints,
      waveConfigs: resolvedWaveConfigs,
      buildableCells: project.buildableCells || [],
      waterCells: project.waterCells || [],
      collisionSubcells: project.collisionSubcells || [],
      buildMode: project.buildMode || 'all',
      customProjectiles: getAllProjectilesUnified().filter(p => p.identity?.isCustom),
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
 * Yields execution to the main browser thread to allow UI rendering & smooth animations
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/**
 * LEGACY IMPORT / MIGRATION BOUNDARY ONLY:
 * Normalizes legacy project schemas (e.g. `spawnPoints`, `customWaypoints`, `customRoutes`, `playerCol`)
 * into the canonical runtime `RouteInfo[]` format.
 */
export function normalizeLegacyImportRoutes(project: any, data?: any): any[] {
  const rawRoutes = project?.routes || data?.characterData?.routes || project?.spawnPoints || data?.characterData?.spawnPoints || []
  return (Array.isArray(rawRoutes) ? rawRoutes : []).map((r: any, idx: number) => {
    let routePoints: any[] | undefined = Array.isArray(r.routePoints) && r.routePoints.length > 0
      ? r.routePoints.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
      : undefined

    if (!routePoints) {
      const key = r.id || `route-${idx}`
      const legacyWps = project?.customWaypoints?.[key] || data?.characterData?.customWaypoints?.[key] || project?.customRoutes?.[key]
      if (Array.isArray(legacyWps) && legacyWps.length > 0) {
        routePoints = legacyWps.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
      } else {
        const c = r.col !== undefined ? r.col : (r.spawnCol ?? 2)
        const row = r.row !== undefined ? r.row : (r.spawnRow ?? 2)
        routePoints = [{ col: Number(c), row: Number(row) }]
      }
    }

    let playerCameraPoint = r.playerCameraPoint
    if (!playerCameraPoint && (r.playerCol !== undefined && r.playerRow !== undefined)) {
      playerCameraPoint = { col: Number(r.playerCol), row: Number(r.playerRow) }
    }

    const startPt = routePoints && routePoints.length > 0 ? routePoints[0] : { col: 2, row: 2 }

    return {
      id: r.id || `route-${idx + 1}`,
      name: r.name || `Route ${idx + 1}`,
      routePoints: routePoints || [startPt],
      playerCameraPoint: playerCameraPoint ? { col: Number(playerCameraPoint.col), row: Number(playerCameraPoint.row) } : undefined,
    }
  })
}

/**
 * Imports project and assets from JSON file asynchronously without blocking the browser thread
 */
export async function importProjectFromJson(
  file: File,
  onProgress?: (progress: number, stageKey: string) => void
): Promise<{ 
  project: MapProject
  assets: AssetItem[]
  gameSettings?: any
  characterData?: {
    routes?: any[]
    [key: string]: any
  }
  towerData?: {
    placedTowers?: any[]
    towerBlueprints?: any[]
    clans?: any[]
  }
  waveData?: {
    waveConfigs?: any[]
    currentWaveIndex?: number
  }
}> {
  onProgress?.(15, 'import.readingFile')
  await yieldToMain()

  const text = await file.text()
  onProgress?.(35, 'import.readingFile')
  await yieldToMain()

  const rawData = JSON.parse(text)
  const data = rawData.payload || rawData
  const project = data.project || data
  if (!project || !project.cols || !project.rows) {
    throw new Error('No valid map project found in file!')
  }

  onProgress?.(50, 'import.syncingAssets')
  await yieldToMain()

  // Normalize all layers & tiles in non-blocking batches
  if (project.layers && Array.isArray(project.layers)) {
    const totalLayers = project.layers.length
    for (let lIdx = 0; lIdx < totalLayers; lIdx++) {
      const layer = project.layers[lIdx]
      if (layer.tiles) {
        const entries = Object.entries(layer.tiles)
        const batchSize = 1000
        for (let i = 0; i < entries.length; i += batchSize) {
          const chunk = entries.slice(i, i + batchSize)
          for (const [key, items] of chunk) {
            const [col, row] = key.split(',').map(Number)
            const itemArr = Array.isArray(items) ? items : [items]
            layer.tiles[key] = itemArr.map(item => normalizeTileItem(item, col, row))
          }
          if (entries.length > batchSize) {
            await yieldToMain()
          }
        }
      }
    }
  }
  
  project.waterCells = Array.isArray(project.waterCells) ? project.waterCells : []
  project.buildableCells = Array.isArray(project.buildableCells) ? project.buildableCells : []
  project.collisionSubcells = Array.isArray(project.collisionSubcells) ? project.collisionSubcells : []
  
  onProgress?.(75, 'import.restoringLayers')
  await yieldToMain()

  onProgress?.(90, 'import.hydratingTD')
  await yieldToMain()

  const resolvedImportedRoutes = normalizeLegacyImportRoutes(project, data)
  project.routes = resolvedImportedRoutes

  const characterData = {
    routes: resolvedImportedRoutes,
  }

  const towerData = data.towerData || {
    clans: project.clans || data.clans || [],
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

  const incomingCustomProj = data.customProjectiles || project.customProjectiles
  if (Array.isArray(incomingCustomProj) && incomingCustomProj.length > 0) {
    registerCustomProjectiles(incomingCustomProj)
  }

  onProgress?.(100, 'import.mapReady')
  await yieldToMain()

  return {
    project,
    assets: data.assets || [],
    gameSettings,
    characterData,
    towerData,
    waveData,
  }
}
