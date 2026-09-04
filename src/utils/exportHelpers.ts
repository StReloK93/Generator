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
 * Builds the canonical 100% complete JSON payload for an Isocraft Map.
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
      assetPath: bp.assetPath && bp.assetPath.startsWith('data:') ? bp.assetPath : '',
    }
  })
  const resolvedWaveConfigs = waveData?.waveConfigs || (project as any).waveConfigs || []
  const resolvedCurrentWaveIndex = waveData?.currentWaveIndex ?? (project as any).currentWaveIndex ?? 0

  const processedAssets = (assets || []).map(a => {
    const isCustomDataUrl = a.src && a.src.startsWith('data:')
    return {
      id: a.id,
      name: a.name,
      fileRelativePath: a.fileRelativePath || '',
      // Only embed src if it's a custom uploaded base64 data URL
      src: isCustomDataUrl ? a.src : '',
      previewSrc: a.previewSrc || '',
      category: a.category,
      width: a.width,
      height: a.height,
      anchorX: a.anchorX,
      anchorY: a.anchorY,
      contentBounds: a.contentBounds,
      spanX: a.spanX || 1,
      spanY: a.spanY || 1,
      scale: a.scale || 1.0,
      isSample: a.isSample,
    }
  })

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
      layers: project.layers,
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
    assets: processedAssets,
    gameSettings: resolvedGameSettings,
    characterData: {
      customRoutes: resolvedCustomRoutes,
      spawnPoints: resolvedSpawnPoints,
      characterConfig: resolvedCharacterConfig,
      speed: resolvedCharacterConfig.speed,
      formation: resolvedCharacterConfig.formation,
      pairDistance: resolvedCharacterConfig.pairDistance,
      followCamera: resolvedCharacterConfig.followCamera,
      showPathTrail: resolvedCharacterConfig.showPathTrail,
      autoLoop: resolvedCharacterConfig.autoLoop,
      selectedDoorIndex: resolvedCharacterConfig.selectedDoorIndex,
    },
    towerData: {
      placedTowers: resolvedPlacedTowers,
      towerBlueprints: resolvedTowerBlueprints,
    },
    waveData: {
      waveConfigs: resolvedWaveConfigs,
      currentWaveIndex: resolvedCurrentWaveIndex,
    },
    savedAt: new Date().toISOString(),
    exportedAt: new Date().toISOString(),
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
        const data = JSON.parse(reader.result as string)
        if (!data.project || !data.project.cols || !data.project.rows) {
          throw new Error('No valid map project found in file!')
        }
        
        const characterData = data.characterData || {
          customRoutes: data.project.customRoutes || {},
          spawnPoints: data.project.spawnPoints || [],
          characterConfig: data.project.characterConfig || {},
        }

        const towerData = data.towerData || {
          placedTowers: data.project.placedTowers || [],
          towerBlueprints: data.project.towerBlueprints || [],
        }

        const waveData = data.waveData || {
          waveConfigs: data.project.waveConfigs || [],
          currentWaveIndex: data.project.currentWaveIndex ?? 0,
        }

        const gameSettings = data.project.gameSettings || data.gameSettings || {
          startingGold: 150,
          startingLives: 20,
          wavePrepTime: 10,
        }

        resolve({
          project: data.project,
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
