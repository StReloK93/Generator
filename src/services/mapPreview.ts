import type { AssetItem, MapProject } from '../types/map'
import { useAssetStore } from '../stores/assetStore'
import { assetManager } from './assetManager'
import { getGameMapDataById, sanitizeMapId, type MapSummary } from './mapManager'
import { renderMapPreview } from '../rendering/pixi/MapPreviewRenderer'

/**
 * A picture of a map for the map picker: the picture its author attached (previewImage), otherwise the map drawn
 * small from the game's sprites plus the map's own assets (once per map). Drawing loads the game atlases first
 * (the game needs them anyway once the map is picked).
 */
export async function getMapPreview(map: MapSummary): Promise<string> {
  const project: MapProject = map.raw.project || map.raw
  const cover = attachedPicture(project)
  if (cover) return cover
  await assetManager.loadGame()
  const assets = new Map(useAssetStore().assetMap)
  const own: AssetItem[] = Array.isArray(map.raw.assets) ? map.raw.assets : []
  for (const asset of own) if (asset?.id) assets.set(asset.id, asset)
  return renderMapPreview(map.id, project, assets)
}

/**
 * The map's attached picture, newest first: a picture set in the editor lives in the map's draft (the same one the
 * game plays) before the map file is exported again.
 */
function attachedPicture(project: MapProject): string | undefined {
  const keys = new Set([project.id, project.name].filter(Boolean).map(sanitizeMapId))
  for (const key of keys) {
    const payload = getGameMapDataById(key)?.payload
    const cover = (payload?.project || payload)?.previewImage
    if (cover) return cover
  }
  return project.previewImage
}
