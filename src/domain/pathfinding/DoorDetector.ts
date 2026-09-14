import { DoorInfo } from '../../stores/characterStore'

export class DoorDetector {
  /**
   * Calculates quadrant index and corner label based on grid coordinates and map dimensions.
   */
  public static calculateQuadrant(
    col: number,
    row: number,
    cols: number,
    rows: number
  ): { quadrant: number; cornerName: string } {
    const midC = Math.floor(cols / 2)
    const midR = Math.floor(rows / 2)

    if (col <= midC && row <= midR) {
      return { quadrant: 0, cornerName: 'Circle 1 (North)' }
    } else if (col >= midC && row <= midR) {
      return { quadrant: 1, cornerName: 'Circle 2 (East)' }
    } else if (col >= midC && row >= midR) {
      return { quadrant: 2, cornerName: 'Circle 3 (South)' }
    } else {
      return { quadrant: 3, cornerName: 'Circle 4 (West)' }
    }
  }

  /**
   * Creates a normalized spawn point object.
   */
  public static createSpawnPoint(
    col: number,
    row: number,
    cols: number,
    rows: number,
    index: number,
    customName?: string
  ): DoorInfo {
    const { quadrant, cornerName } = this.calculateQuadrant(col, row, cols, rows)
    return {
      id: `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      col,
      row,
      spawnCol: col,
      spawnRow: row,
      quadrant,
      isCorner: true,
      cornerName,
      assetId: '',
      layerId: 'layer-ground',
      name: customName || `Route ${index + 1}`,
    }
  }
}
