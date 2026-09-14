import { Layer } from '../../types/map'

export class MapQueries {
  /**
   * Returns a set of all asset IDs used across all layers in the map.
   */
  public static getUsedAssetIds(layers?: Layer[] | null): Set<string> {
    const usedIds = new Set<string>()
    if (!layers) return usedIds

    for (const layer of layers) {
      if (!layer.tiles) continue
      for (const items of Object.values(layer.tiles)) {
        if (Array.isArray(items)) {
          for (const cell of items) {
            if (cell.assetId) {
              usedIds.add(cell.assetId)
              const clean = cell.assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '')
              usedIds.add(clean)
            }
          }
        }
      }
    }

    return usedIds
  }

  /**
   * Counts the total number of placed tile items across all layers.
   */
  public static countTotalTiles(layers?: Layer[] | null): number {
    if (!layers) return 0
    let count = 0
    for (const layer of layers) {
      if (!layer.tiles) continue
      for (const items of Object.values(layer.tiles)) {
        count += Array.isArray(items) ? items.length : 1
      }
    }
    return count
  }
}
