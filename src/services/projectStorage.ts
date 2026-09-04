import { MapProject, AssetItem } from '../types/map'
import { buildFullProjectJsonPayload } from '../utils/exportHelpers'

export interface RecentProjectItem {
  id: string
  name: string
  cols: number
  rows: number
  tilesCount: number
  updatedAt: number
  payload?: any // Exact 100% identical JSON payload as .isomap.json export file
  project: MapProject
  assets?: AssetItem[]
  characterData?: any
  waveData?: any
  towerData?: any
  gameSettings?: any
}

const STORAGE_KEY = 'isocraft_recent_projects_v1'
const MAX_RECENT_PROJECTS = 10

export function getRecentProjects(): RecentProjectItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    }
    return []
  } catch (e) {
    console.warn('Error reading recent projects:', e)
    return []
  }
}

export function saveRecentProject(
  project: MapProject,
  assets: AssetItem[],
  characterData?: any,
  waveData?: any,
  towerData?: any,
  gameSettings?: any
): void {
  try {
    if (!project || !project.cols || !project.layers || project.layers.length === 0) return

    let totalTiles = 0
    for (const l of project.layers) {
      if (l.tiles) {
        for (const items of Object.values(l.tiles)) {
          totalTiles += Array.isArray(items) ? items.length : 1
        }
      }
    }

    const projectId = project.id || `proj-${Date.now()}`
    project.id = projectId

    // Build the EXACT same canonical payload as exported JSON file!
    const fullPayload = buildFullProjectJsonPayload(
      project, 
      assets, 
      characterData, 
      towerData, 
      waveData, 
      gameSettings
    )

    const entry: RecentProjectItem = {
      id: projectId,
      name: project.name || 'Untitled Map',
      cols: project.cols,
      rows: project.rows,
      tilesCount: totalTiles,
      updatedAt: Date.now(),
      payload: fullPayload,
      project: fullPayload.project,
      assets: fullPayload.assets,
      characterData: fullPayload.characterData,
      waveData: fullPayload.waveData,
      towerData: fullPayload.towerData,
      gameSettings: fullPayload.gameSettings,
    }

    const recents = getRecentProjects().filter(p => p.id !== projectId && p.name !== entry.name)
    recents.unshift(entry)

    const trimmed = recents.slice(0, MAX_RECENT_PROJECTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Error saving recent project:', e)
  }
}

export function deleteRecentProject(projectId: string): RecentProjectItem[] {
  try {
    const recents = getRecentProjects().filter(p => p.id !== projectId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents))
    return recents
  } catch (e) {
    console.warn('Error deleting recent project:', e)
    return []
  }
}

export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (isToday) {
    return `Bugun, ${hours}:${minutes}`
  }

  const day = date.getDate()
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
  const month = months[date.getMonth()]

  return `${day}-${month}, ${hours}:${minutes}`
}
