import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { MapProject } from '../../types/map'
import { gridToScreen, getCellPolygon, getFootprintPolygon } from '../../utils/isometric'

export class GridRenderer {
  public container: Container
  public gridGraphics: Graphics
  public borderGraphics: Graphics
  public coordsContainer: Container

  constructor() {
    this.container = new Container()
    this.gridGraphics = new Graphics()
    this.borderGraphics = new Graphics()
    this.coordsContainer = new Container()

    this.container.addChild(this.gridGraphics)
    this.container.addChild(this.borderGraphics)
    this.container.addChild(this.coordsContainer)
  }

  renderGrid(
    project: MapProject,
    showGrid: boolean,
    gridOpacity: number,
    showCoords: boolean,
    showCenter = true,
    showSymmetry = true
  ): void {
    this.gridGraphics.clear()
    this.borderGraphics.clear()
    this.coordsContainer.removeChildren()

    const { cols, rows, tileWidth, tileHeight } = project
    const halfW = tileWidth / 2
    const halfH = tileHeight / 2
    const midCol = (cols - 1) / 2
    const midRow = (rows - 1) / 2
    const centerPt = gridToScreen(midCol, midRow, tileWidth, tileHeight)

    const gridColorNum = parseInt(project.gridColor.replace('#', ''), 16) || 0x38bdf8

    if (showGrid) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const poly = getCellPolygon(c, r, tileWidth, tileHeight)
          this.gridGraphics
            .poly(poly)
            .stroke({ width: 1, color: gridColorNum, alpha: gridOpacity })
        }
      }

      // Exact Outer perimeter border
      const pTop = { x: 0, y: -halfH }
      const pRight = { x: cols * halfW, y: (cols - 1) * halfH }
      const pBottom = { x: (cols - rows) * halfW, y: (cols + rows - 1) * halfH }
      const pLeft = { x: -rows * halfW, y: (rows - 1) * halfH }

      this.borderGraphics
        .moveTo(pTop.x, pTop.y)
        .lineTo(pRight.x, pRight.y)
        .lineTo(pBottom.x, pBottom.y)
        .lineTo(pLeft.x, pLeft.y)
        .closePath()
        .stroke({ width: 2, color: 0x6366f1, alpha: Math.min(1, gridOpacity * 2 + 0.4) })

      // Exact Symmetry Axis Lines passing directly through the true center of the map
      if (showSymmetry) {
        // 1. Grid Column symmetry axis
        const colStart = gridToScreen(midCol, -0.5, tileWidth, tileHeight)
        const colEnd = gridToScreen(midCol, rows - 0.5, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(colStart.x, colStart.y)
          .lineTo(colEnd.x, colEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.85 })

        // 2. Grid Row symmetry axis
        const rowStart = gridToScreen(-0.5, midRow, tileWidth, tileHeight)
        const rowEnd = gridToScreen(cols - 0.5, midRow, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(rowStart.x, rowStart.y)
          .lineTo(rowEnd.x, rowEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.85 })

        // 3. Screen Diagonal Symmetry Axes (Corner to Corner Cross)
        this.borderGraphics
          .moveTo(pTop.x, pTop.y)
          .lineTo(pBottom.x, pBottom.y)
          .stroke({ width: 1.5, color: 0x06b6d4, alpha: 0.6 })

        this.borderGraphics
          .moveTo(pLeft.x, pLeft.y)
          .lineTo(pRight.x, pRight.y)
          .stroke({ width: 1.5, color: 0x06b6d4, alpha: 0.6 })
      }

      // Center Origin Highlight & Glowing Center Point
      if (showCenter) {
        const isOddOdd = cols % 2 !== 0 && rows % 2 !== 0

        if (isOddOdd) {
          const centerPoly = getCellPolygon(midCol, midRow, tileWidth, tileHeight)
          this.borderGraphics
            .poly(centerPoly)
            .fill({ color: 0x10b981, alpha: 0.28 })
            .stroke({ width: 2.5, color: 0x34d399, alpha: 0.95 })
        } else {
          const c0 = Math.floor(midCol)
          const r0 = Math.floor(midRow)
          const spanX = cols % 2 === 0 ? 2 : 1
          const spanY = rows % 2 === 0 ? 2 : 1
          const centerPoly = getFootprintPolygon(c0, r0, spanX, spanY, tileWidth, tileHeight)
          this.borderGraphics
            .poly(centerPoly)
            .fill({ color: 0x10b981, alpha: 0.22 })
            .stroke({ width: 2, color: 0x34d399, alpha: 0.85 })
        }

        // Outer glow ring
        this.borderGraphics
          .circle(centerPt.x, centerPt.y, 8)
          .stroke({ width: 1.5, color: 0x34d399, alpha: 0.7 })

        // Central Bullseye Dot
        this.borderGraphics
          .circle(centerPt.x, centerPt.y, 4.5)
          .fill({ color: 0x10b981, alpha: 1.0 })
          .stroke({ width: 2, color: 0xffffff, alpha: 0.95 })

        // Central Crosshair Ticks
        this.borderGraphics
          .moveTo(centerPt.x - 12, centerPt.y)
          .lineTo(centerPt.x + 12, centerPt.y)
          .moveTo(centerPt.x, centerPt.y - 12)
          .lineTo(centerPt.x, centerPt.y + 12)
          .stroke({ width: 1.5, color: 0xffffff, alpha: 0.85 })

        // Center Pin Badge
        const centerLabel = isOddOdd
          ? `[CENTER] (${midCol}, ${midRow})`
          : `[CENTER] (${cols % 2 === 0 ? `${midCol - 0.5}..${midCol + 0.5}` : midCol}, ${rows % 2 === 0 ? `${midRow - 0.5}..${midRow + 0.5}` : midRow})`

        const centerBadge = new Text({
          text: centerLabel,
          style: new TextStyle({
            fontFamily: 'SpaceMono, monospace',
            fontSize: Math.max(10, Math.min(12, tileWidth / 9)),
            fontWeight: 'bold',
            fill: 0x34d399,
            stroke: { color: 0x090d16, width: 3 },
            align: 'center',
          })
        })
        centerBadge.anchor.set(0.5, 1.5)
        centerBadge.position.set(centerPt.x, centerPt.y)
        this.coordsContainer.addChild(centerBadge)
      }
    }

    if (showCoords) {
      const textStyle = new TextStyle({
        fontFamily: 'SpaceMono, monospace',
        fontSize: Math.max(9, Math.min(12, tileWidth / 10)),
        fill: 0x94a3b8,
        align: 'center',
      })

      const isOddOdd = cols % 2 !== 0 && rows % 2 !== 0

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (isOddOdd && c === midCol && r === midRow) continue
          const pt = gridToScreen(c, r, tileWidth, tileHeight)
          const coordText = new Text({
            text: `${c},${r}`,
            style: textStyle,
          })
          coordText.anchor.set(0.5, 0.5)
          coordText.position.set(pt.x, pt.y)
          this.coordsContainer.addChild(coordText)
        }
      }
    }
  }

  clear(): void {
    try {
      if (this.gridGraphics && !this.gridGraphics.destroyed) this.gridGraphics.clear()
      if (this.borderGraphics && !this.borderGraphics.destroyed) this.borderGraphics.clear()
      if (this.coordsContainer && !this.coordsContainer.destroyed) this.coordsContainer.removeChildren()
    } catch (e) {
      console.warn('[GridRenderer] clear caught:', e)
    }
  }

  destroy(): void {
    try {
      this.clear()
      if (this.container && !this.container.destroyed) {
        this.container.destroy({ children: true })
      }
    } catch (e) {
      console.warn('[GridRenderer] destroy caught:', e)
    }
  }
}
