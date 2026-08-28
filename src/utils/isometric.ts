import { GridCoord, Point2D } from '../types/map'

/**
 * Transforms Grid coordinates (col, row) to Screen coordinates (x, y).
 * The returned point is the exact center of the isometric diamond tile.
 */
export function gridToScreen(col: number, row: number, tileWidth: number, tileHeight: number): Point2D {
  const halfW = tileWidth / 2
  const halfH = tileHeight / 2
  return {
    x: (col - row) * halfW,
    y: (col + row) * halfH,
  }
}

/**
 * Transforms Screen coordinates (x, y) to Grid coordinates (col, row).
 * Mathematically exact diamond isometric projection with rounded cell rounding.
 */
export function screenToGrid(x: number, y: number, tileWidth: number, tileHeight: number): GridCoord {
  const halfW = tileWidth / 2
  const halfH = tileHeight / 2

  const u = (x / halfW + y / halfH) / 2
  const v = (y / halfH - x / halfW) / 2

  const col = Math.floor(u + 0.5)
  const row = Math.floor(v + 0.5)

  return { col, row }
}

/**
 * Returns the 4 vertices of the isometric diamond cell.
 * Order: Top, Right, Bottom, Left
 */
export function getCellPolygon(col: number, row: number, tileWidth: number, tileHeight: number): number[] {
  const center = gridToScreen(col, row, tileWidth, tileHeight)
  const halfW = tileWidth / 2
  const halfH = tileHeight / 2

  return [
    center.x, center.y - halfH, // Top
    center.x + halfW, center.y, // Right
    center.x, center.y + halfH, // Bottom
    center.x - halfW, center.y, // Left
  ]
}

/**
 * Returns the 4 outer vertices of a multi-cell footprint (spanX x spanY)
 */
export function getFootprintPolygon(
  col: number, 
  row: number, 
  spanX = 1, 
  spanY = 1, 
  tileWidth: number, 
  tileHeight: number
): number[] {
  const halfW = tileWidth / 2
  const halfH = tileHeight / 2

  // 1. Top Vertex (Top of cell col, row)
  const topX = (col - row) * halfW
  const topY = (col + row) * halfH - halfH

  // 2. Right Vertex (Right of cell col + spanX - 1, row)
  const rightX = (col + spanX - row) * halfW
  const rightY = (col + spanX - 1 + row) * halfH

  // 3. Bottom Vertex (Bottom of cell col + spanX - 1, row + spanY - 1)
  const bottomX = (col + spanX - 1 - (row + spanY - 1)) * halfW
  const bottomY = (col + spanX - 1 + row + spanY - 1) * halfH + halfH

  // 4. Left Vertex (Left of cell col, row + spanY - 1)
  const leftX = (col - (row + spanY - 1) - 1) * halfW
  const leftY = (col + row + spanY - 1) * halfH

  return [
    topX, topY,
    rightX, rightY,
    bottomX, bottomY,
    leftX, leftY
  ]
}

/**
 * Returns the exact base center screen point of a multi-cell footprint (spanX x spanY)
 */
export function getFootprintBaseCenter(
  col: number, 
  row: number, 
  spanX = 1, 
  spanY = 1, 
  tileWidth: number, 
  tileHeight: number
): Point2D {
  const midCol = col + (spanX - 1) / 2
  const midRow = row + (spanY - 1) / 2
  return gridToScreen(midCol, midRow, tileWidth, tileHeight)
}

/**
 * Checks whether (col, row) is within map bounds [0, cols) and [0, rows)
 */
export function isInsideGrid(col: number, row: number, cols: number, rows: number): boolean {
  return col >= 0 && col < cols && row >= 0 && row < rows
}

/**
 * Format cell key for records
 */
export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

/**
 * Parse cell key back into GridCoord
 */
export function parseCellKey(key: string): GridCoord {
  const [col, row] = key.split(',').map(Number)
  return { col, row }
}

/**
 * Calculates depth rendering score for isometric Y-sorting.
 * For multi-cell objects (spanX x spanY), the front-most bottom corner determines depth.
 */
export function getDepthScore(
  col: number, 
  row: number, 
  zIndex = 0, 
  layerIndex = 0, 
  spanX = 1, 
  spanY = 1
): number {
  const effectiveCol = col + (spanX - 1)
  const effectiveRow = row + (spanY - 1)
  return (effectiveCol + effectiveRow) * 1000 + layerIndex * 100 + zIndex
}

/**
 * Generates cells on a straight line between two grid coordinates using Bresenham's algorithm
 */
export function getBresenhamLine(col0: number, row0: number, col1: number, row1: number): GridCoord[] {
  const cells: GridCoord[] = []
  let x0 = col0
  let y0 = row0
  const dx = Math.abs(col1 - x0)
  const dy = Math.abs(row1 - y0)
  const sx = x0 < col1 ? 1 : -1
  const sy = y0 < row1 ? 1 : -1
  let err = dx - dy

  while (true) {
    cells.push({ col: x0, row: y0 })
    if (x0 === col1 && y0 === row1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }

  return cells
}

/**
 * Generates all cells within the bounding rectangle [col0..col1] x [row0..row1]
 */
export function getRectangleCells(col0: number, row0: number, col1: number, row1: number): GridCoord[] {
  const cells: GridCoord[] = []
  const minCol = Math.min(col0, col1)
  const maxCol = Math.max(col0, col1)
  const minRow = Math.min(row0, row1)
  const maxRow = Math.max(row0, row1)

  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      cells.push({ col: c, row: r })
    }
  }
  return cells
}

/**
 * Flood Fill algorithm on isometric grid
 */
export function floodFill(
  startCol: number,
  startRow: number,
  newAssetId: string | null,
  currentTiles: Record<string, { assetId: string }>,
  cols: number,
  rows: number
): GridCoord[] {
  if (!isInsideGrid(startCol, startRow, cols, rows)) return []

  const startKey = cellKey(startCol, startRow)
  const targetAssetId = currentTiles[startKey]?.assetId || null

  if (targetAssetId === newAssetId) return []

  const result: GridCoord[] = []
  const visited = new Set<string>()
  const queue: GridCoord[] = [{ col: startCol, row: startRow }]

  while (queue.length > 0) {
    const current = queue.shift()!
    const key = cellKey(current.col, current.row)

    if (visited.has(key)) continue
    visited.add(key)

    if (!isInsideGrid(current.col, current.row, cols, rows)) continue

    const currentTileAsset = currentTiles[key]?.assetId || null
    if (currentTileAsset === targetAssetId) {
      result.push(current)

      queue.push({ col: current.col + 1, row: current.row })
      queue.push({ col: current.col - 1, row: current.row })
      queue.push({ col: current.col, row: current.row + 1 })
      queue.push({ col: current.col, row: current.row - 1 })
    }
  }

  return result
}
