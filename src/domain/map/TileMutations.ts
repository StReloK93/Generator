import { TileItem, AssetItem } from '../../types/map'

export class TileMutations {
  /**
   * Creates a new TileItem with calculated anchors, dimensions, and zIndex offsets.
   */
  public static createTileItem(
    col: number,
    row: number,
    assetId: string,
    assetMeta?: AssetItem,
    mode: 'replace' | 'stack' = 'replace',
    existingItems: TileItem[] = []
  ): TileItem {
    const spanX = assetMeta?.spanX || 1
    const spanY = assetMeta?.spanY || 1
    const scale = assetMeta?.scale || 1.0
    const anchorX = assetMeta?.anchorX ?? 0.5
    const anchorY = assetMeta?.anchorY ?? 0.5

    const initialZ = mode === 'stack' ? (existingItems.length > 0 ? Math.max(...existingItems.map(i => i.zIndex)) + 1 : 0) : 0

    const cellZIndex: Record<string, number> = {}
    for (let cx = col; cx < col + spanX; cx++) {
      for (let cy = row; cy < row + spanY; cy++) {
        cellZIndex[`${cx},${cy}`] = initialZ
      }
    }

    return {
      id: `tile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      opacity: 1.0,
    }
  }

  /**
   * Tests whether an item at origin (item.x, item.y) with span spans over (col, row).
   */
  public static isCoveringCell(item: TileItem, col: number, row: number): boolean {
    const originCol = item.x !== undefined ? item.x : col
    const originRow = item.y !== undefined ? item.y : row
    const spanX = item.spanX || 1
    const spanY = item.spanY || 1

    return col >= originCol && col < originCol + spanX && row >= originRow && row < originRow + spanY
  }
}
