import { describe, it, expect } from 'vitest'
import {
  gridToScreen,
  screenToGrid,
  getCellPolygon,
  getFootprintPolygon,
  getFootprintBaseCenter,
  isInsideGrid,
  cellKey,
  parseCellKey,
  getDepthScore,
  getBresenhamLine,
  getRectangleCells,
  floodFill,
  expandWaypointsToPath,
  extractWaypointsFromPath,
} from '@/utils/isometric'

describe('Isometric Math & Coordinate Transformation Utils', () => {
  const tileWidth = 128
  const tileHeight = 64

  it('gridToScreen and screenToGrid should be reversible and exact', () => {
    const testCases = [
      { col: 0, row: 0 },
      { col: 5, row: 5 },
      { col: 12, row: 4 },
      { col: 0, row: 20 },
      { col: 30, row: 0 },
    ]

    for (const { col, row } of testCases) {
      const screen = gridToScreen(col, row, tileWidth, tileHeight)
      const grid = screenToGrid(screen.x, screen.y, tileWidth, tileHeight)
      expect(grid.col).toBe(col)
      expect(grid.row).toBe(row)
    }
  })

  it('getCellPolygon should return 8 coordinate numbers forming diamond vertices (top, right, bottom, left)', () => {
    const poly = getCellPolygon(0, 0, tileWidth, tileHeight)
    expect(poly).toHaveLength(8)
    // Top vertex
    expect(poly[0]).toBe(0)
    expect(poly[1]).toBe(-32)
    // Right vertex
    expect(poly[2]).toBe(64)
    expect(poly[3]).toBe(0)
    // Bottom vertex
    expect(poly[4]).toBe(0)
    expect(poly[5]).toBe(32)
    // Left vertex
    expect(poly[6]).toBe(-64)
    expect(poly[7]).toBe(0)
  })

  it('getFootprintPolygon should scale correctly for multi-cell spans (1x1, 2x2, 3x3)', () => {
    const singleSpan = getFootprintPolygon(0, 0, 1, 1, tileWidth, tileHeight)
    const multiSpan = getFootprintPolygon(0, 0, 2, 2, tileWidth, tileHeight)
    expect(singleSpan).toHaveLength(8)
    expect(multiSpan).toHaveLength(8)
    // Multi span footprint should cover larger area
    expect(multiSpan[2] - multiSpan[6]).toBeGreaterThan(singleSpan[2] - singleSpan[6])
  })

  it('getFootprintBaseCenter should compute midpoint screen coordinate', () => {
    const center1x1 = getFootprintBaseCenter(2, 2, 1, 1, tileWidth, tileHeight)
    const expected1x1 = gridToScreen(2, 2, tileWidth, tileHeight)
    expect(center1x1.x).toBeCloseTo(expected1x1.x)
    expect(center1x1.y).toBeCloseTo(expected1x1.y)

    const center2x2 = getFootprintBaseCenter(2, 2, 2, 2, tileWidth, tileHeight)
    const expected2x2 = gridToScreen(2.5, 2.5, tileWidth, tileHeight)
    expect(center2x2.x).toBeCloseTo(expected2x2.x)
    expect(center2x2.y).toBeCloseTo(expected2x2.y)
  })

  it('isInsideGrid should correctly validate boundaries', () => {
    const cols = 20
    const rows = 15
    expect(isInsideGrid(0, 0, cols, rows)).toBe(true)
    expect(isInsideGrid(19, 14, cols, rows)).toBe(true)
    expect(isInsideGrid(-1, 0, cols, rows)).toBe(false)
    expect(isInsideGrid(0, -1, cols, rows)).toBe(false)
    expect(isInsideGrid(20, 5, cols, rows)).toBe(false)
    expect(isInsideGrid(5, 15, cols, rows)).toBe(false)
  })

  it('cellKey and parseCellKey should correctly serialize and deserialize', () => {
    const key = cellKey(14, 27)
    expect(key).toBe('14,27')
    const parsed = parseCellKey(key)
    expect(parsed.col).toBe(14)
    expect(parsed.row).toBe(27)
  })

  it('getDepthScore should prioritize front-most coordinates and layer indices', () => {
    const backDepth = getDepthScore(0, 0, 0, 0)
    const frontDepth = getDepthScore(10, 10, 0, 0)
    const higherLayerDepth = getDepthScore(0, 0, 0, 1)

    expect(frontDepth).toBeGreaterThan(backDepth)
    expect(higherLayerDepth).toBeGreaterThan(backDepth)
  })

  it('getBresenhamLine should return continuous connected line', () => {
    const line = getBresenhamLine(0, 0, 4, 4)
    expect(line.length).toBe(5)
    expect(line[0]).toEqual({ col: 0, row: 0 })
    expect(line[line.length - 1]).toEqual({ col: 4, row: 4 })

    const horizontalLine = getBresenhamLine(2, 5, 6, 5)
    expect(horizontalLine.length).toBe(5)
    for (const pt of horizontalLine) {
      expect(pt.row).toBe(5)
    }
  })

  it('getRectangleCells should return all cells inside the rectangle regardless of start/end order', () => {
    const rect1 = getRectangleCells(1, 1, 3, 2)
    expect(rect1.length).toBe(6) // 3 cols x 2 rows

    const rect2 = getRectangleCells(3, 2, 1, 1) // Reversed corners
    expect(rect2.length).toBe(6)
  })

  it('floodFill should fill contiguous matching tiles and respect boundaries', () => {
    const tiles: Record<string, { assetId: string }> = {
      '0,0': { assetId: 'grass' },
      '1,0': { assetId: 'grass' },
      '0,1': { assetId: 'grass' },
      '1,1': { assetId: 'grass' },
      '2,0': { assetId: 'stone' }, // barrier
    }

    const filled = floodFill(0, 0, 'water', tiles, 10, 10)
    expect(filled.length).toBe(4)
    expect(filled.some(c => c.col === 2 && c.row === 0)).toBe(false)
  })

  it('expandWaypointsToPath and extractWaypointsFromPath should expand and simplify routes', () => {
    const waypoints = [
      { col: 0, row: 0 },
      { col: 5, row: 0 },
      { col: 5, row: 5 },
    ]

    const expanded = expandWaypointsToPath(waypoints)
    expect(expanded.length).toBe(11) // 6 horizontal + 5 vertical
    expect(expanded[0]).toEqual({ col: 0, row: 0 })
    expect(expanded[expanded.length - 1]).toEqual({ col: 5, row: 5 })

    const extracted = extractWaypointsFromPath(expanded)
    expect(extracted).toEqual(waypoints)
  })
})
