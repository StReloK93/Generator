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
 * Export full project state and custom assets to a JSON file
 */
export function exportProjectJson(
  project: MapProject, 
  assets: AssetItem[],
  characterData?: {
    customRoutes?: Record<string, any>
    characterConfig?: Record<string, any>
    spawnPoints?: any[]
  },
  towerData?: {
    placedTowers?: any[]
    towerBlueprints?: any[]
  },
  waveData?: {
    waveConfigs?: any[]
    currentWaveIndex?: number
  }
): void {
  const payload = {
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
      customRoutes: characterData?.customRoutes || project.customRoutes || {},
      spawnPoints: characterData?.spawnPoints || (project as any).spawnPoints || [],
      characterConfig: characterData?.characterConfig || project.characterConfig || {},
      placedTowers: towerData?.placedTowers || (project as any).placedTowers || [],
      towerBlueprints: towerData?.towerBlueprints || (project as any).towerBlueprints || [],
      waveConfigs: waveData?.waveConfigs || (project as any).waveConfigs || [],
      currentWaveIndex: waveData?.currentWaveIndex ?? (project as any).currentWaveIndex ?? 0,
      createdAt: project.createdAt,
      updatedAt: Date.now(),
    },
    // Save asset metadata without embedding heavy base64 data for built-in/sample sprites
    assets: assets.map(a => {
      const isCustomDataUrl = a.src && a.src.startsWith('data:')
      return {
        id: a.id,
        name: a.name,
        fileRelativePath: a.fileRelativePath || '',
        // Only embed src if it's a custom uploaded base64 data URL
        src: isCustomDataUrl ? a.src : '',
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
    }),
    characterData: {
      customRoutes: characterData?.customRoutes || project.customRoutes || {},
      spawnPoints: characterData?.spawnPoints || (project as any).spawnPoints || [],
      characterConfig: characterData?.characterConfig || project.characterConfig || {},
    },
    towerData: {
      placedTowers: towerData?.placedTowers || (project as any).placedTowers || [],
      towerBlueprints: towerData?.towerBlueprints || (project as any).towerBlueprints || [],
    },
    waveData: {
      waveConfigs: waveData?.waveConfigs || (project as any).waveConfigs || [],
      currentWaveIndex: waveData?.currentWaveIndex ?? (project as any).currentWaveIndex ?? 0,
    },
    exportedAt: new Date().toISOString(),
  }

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
          throw new Error('Fayl ichida xarita loyihasi topilmadi!')
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

        resolve({
          project: data.project,
          assets: data.assets || [],
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
