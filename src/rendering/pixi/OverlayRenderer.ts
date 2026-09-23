import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import { MapProject, AssetItem, GridCoord, SelectedElementRef } from '../../types/map'
import {
  gridToScreen,
  getCellPolygon,
  getFootprintPolygon,
  getFootprintBaseCenter,
  isInsideGrid,
  cellKey,
} from '../../utils/isometric'

export class OverlayRenderer {
  public overlayContainer: Container
  public hoverGraphics: Graphics
  public selectionGraphics: Graphics
  public previewContainer: Container
  public buildGhostSprite: Sprite
  public buildableOverlayGraphics: Graphics
  public pathTrailGraphics: Graphics
  public spawnOverlayGraphics: Graphics
  public spawnMarkersContainer: Container

  private lastBuildableSignature = ''
  private lastTrailSignature = ''
  public getTexture?: (asset: AssetItem) => Texture | null

  constructor() {
    this.overlayContainer = new Container()
    this.hoverGraphics = new Graphics()
    this.selectionGraphics = new Graphics()
    this.previewContainer = new Container()
    this.buildGhostSprite = new Sprite()
    this.buildGhostSprite.visible = false
    this.buildableOverlayGraphics = new Graphics()
    this.pathTrailGraphics = new Graphics()
    this.spawnOverlayGraphics = new Graphics()
    this.spawnMarkersContainer = new Container()

    this.overlayContainer.addChild(this.hoverGraphics)
    this.overlayContainer.addChild(this.selectionGraphics)
    this.overlayContainer.addChild(this.previewContainer)
    this.overlayContainer.addChild(this.buildGhostSprite)
    this.overlayContainer.addChild(this.buildableOverlayGraphics)
    this.overlayContainer.addChild(this.pathTrailGraphics)
    this.overlayContainer.addChild(this.spawnOverlayGraphics)
    this.overlayContainer.addChild(this.spawnMarkersContainer)
  }

  public renderBuildableOverlay(
    project: MapProject,
    isVisible: boolean,
    activeTool?: string,
    force = false
  ): void {
    const shouldShow = Boolean(isVisible || activeTool === 'buildable')
    const { cols, rows, tileWidth, tileHeight, updatedAt } = project
    const isCustom =
      project.buildMode === 'custom' ||
      (Array.isArray(project.buildableCells) && project.buildableCells.length > 0)
    const count = project.buildableCells?.length || 0
    const sig = `${shouldShow}_${activeTool || ''}_${cols}_${rows}_${tileWidth}_${tileHeight}_${project.buildMode || 'all'}_${count}_${updatedAt || 0}`

    if (!force && sig === this.lastBuildableSignature) return
    this.lastBuildableSignature = sig

    this.buildableOverlayGraphics.clear()
    if (!shouldShow) return

    const buildableSet = new Set(project.buildableCells || [])

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const isBuildable = isCustom ? buildableSet.has(`${c},${r}`) : true
        const poly = getCellPolygon(c, r, tileWidth, tileHeight)
        if (isBuildable) {
          this.buildableOverlayGraphics
            .poly(poly)
            .fill({ color: 0x10b981, alpha: 0.18 })
            .stroke({ width: 1.5, color: 0x34d399, alpha: 0.75 })
        } else if (activeTool === 'buildable') {
          this.buildableOverlayGraphics
            .poly(poly)
            .fill({ color: 0xef4444, alpha: 0.08 })
            .stroke({ width: 1, color: 0xf87171, alpha: 0.35 })
        }
      }
    }
  }

  public renderHoverCell(
    hovered: GridCoord | null,
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.hoverGraphics.clear()
    this.previewContainer.removeChildren()

    if (!hovered || !isInsideGrid(hovered.col, hovered.row, project.cols, project.rows)) {
      return
    }

    const { tileWidth, tileHeight } = project
    const spanX = activeAsset ? activeAsset.spanX || 1 : 1
    const spanY = activeAsset ? activeAsset.spanY || 1 : 1

    const poly = getFootprintPolygon(hovered.col, hovered.row, spanX, spanY, tileWidth, tileHeight)

    let strokeColor = 0x38bdf8
    let fillColor = 0x38bdf8

    if (activeTool === 'buildable') {
      strokeColor = 0x34d399
      fillColor = 0x10b981
    } else if (activeTool === 'buildable-block') {
      strokeColor = 0xf87171
      fillColor = 0xef4444
    } else if (activeTool === 'eraser' || activeTool === 'box-clear') {
      strokeColor = 0xf87171
      fillColor = 0xef4444
    } else if (activeTool === 'bucket') {
      strokeColor = 0x10b981
      fillColor = 0x10b981
    } else if (activeTool === 'picker') {
      strokeColor = 0xf59e0b
      fillColor = 0xf59e0b
    } else if (activeTool === 'box-fill' || activeTool === 'box') {
      if (activeAsset) {
        strokeColor = 0x38bdf8
        fillColor = 0x0284c7
      } else {
        strokeColor = 0xc084fc
        fillColor = 0x9333ea
      }
    } else if (activeTool === 'water') {
      strokeColor = 0x5eead4
      fillColor = 0x155e75
    } else if (activeTool === 'scatter') {
      strokeColor = 0xc084fc
      fillColor = 0x9333ea
    } else if (!activeAsset) {
      strokeColor = 0xa855f7
      fillColor = 0xa855f7
    }

    this.hoverGraphics
      .poly(poly)
      .fill({
        color: fillColor,
        alpha:
          activeTool === 'box-fill' ||
          activeTool === 'box-clear' ||
          activeTool === 'water' ||
          activeTool === 'scatter' ||
          activeTool.startsWith('buildable')
            ? 0.35
            : 0.28,
      })
      .stroke({ width: 2, color: strokeColor, alpha: 0.95 })

    // Ghost preview fitted to 1 tile width
    if (
      activeAsset &&
      activeTool !== 'box-fill' &&
      activeTool !== 'box-clear' &&
      activeTool !== 'eraser' &&
      activeTool !== 'picker' &&
      activeTool !== 'water' &&
      activeTool !== 'scatter' &&
      !activeTool.startsWith('buildable') &&
      this.getTexture
    ) {
      const texture = this.getTexture(activeAsset)
      if (texture) {
        const ghost = new Sprite(texture)
        ghost.anchor.set(activeAsset.anchorX, activeAsset.anchorY)
        const baseCenter = getFootprintBaseCenter(
          hovered.col,
          hovered.row,
          spanX,
          spanY,
          tileWidth,
          tileHeight
        )
        ghost.position.set(baseCenter.x, baseCenter.y)

        const baseScale = (tileWidth * spanX) / (activeAsset.width || tileWidth)
        const scaleVal = baseScale * (activeAsset.scale || 1.0)
        ghost.scale.set(scaleVal)
        ghost.alpha = 0.65
        this.previewContainer.addChild(ghost)
      }
    }
  }

  public renderSelection(
    selected: SelectedElementRef | SelectedElementRef[] | null,
    project: MapProject,
    spanX = 1,
    spanY = 1
  ): void {
    this.selectionGraphics.clear()
    if (!selected) return

    const { tileWidth, tileHeight } = project
    const items = Array.isArray(selected) ? selected : [selected]
    if (items.length === 0) return

    const isMulti = Array.isArray(selected)
    const layerMap = isMulti
      ? new Map(project.layers.map((l) => [l.id, l]))
      : null

    let hasDrawn = false
    for (let i = 0; i < items.length; i++) {
      const sel = items[i]
      if (!sel) continue
      let itemSpanX = spanX
      let itemSpanY = spanY

      if (isMulti && layerMap) {
        const layer = layerMap.get(sel.layerId)
        if (layer) {
          const key = cellKey(sel.col, sel.row)
          const cellItems = layer.tiles[key]
          if (cellItems) {
            const found = cellItems.find((ci) => ci.id === sel.itemId)
            if (found) {
              itemSpanX = found.spanX || 1
              itemSpanY = found.spanY || 1
            }
          }
        }
      }

      const poly = getFootprintPolygon(sel.col, sel.row, itemSpanX, itemSpanY, tileWidth, tileHeight)
      this.selectionGraphics.poly(poly)
      hasDrawn = true
    }

    if (hasDrawn) {
      this.selectionGraphics
        .fill({ color: 0xa855f7, alpha: 0.35 })
        .stroke({ width: 2.5, color: 0xc084fc, alpha: 1.0 })
    }
  }

  public renderPreviewCells(
    cells: GridCoord[],
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.hoverGraphics.clear()
    this.previewContainer.removeChildren()

    if (cells.length === 0) return

    const { tileWidth, tileHeight } = project
    const isEraser = activeTool === 'eraser' || activeTool === 'buildable-block'
    const isBoxClear = activeTool === 'box-clear'
    const isBoxFill = (activeTool === 'box-fill' || activeTool === 'box') && !!activeAsset
    const isBoxSelect = (activeTool === 'box-fill' || activeTool === 'box') && !activeAsset
    const isBox = isBoxFill || isBoxSelect || isBoxClear
    const isWater = activeTool === 'water'
    const isScatter = activeTool === 'scatter'
    const isBuildable = activeTool === 'buildable' || activeTool.startsWith('buildable')
    const isSelection = !activeAsset && (activeTool === 'brush' || activeTool === 'select' || activeTool === 'line' || isBoxSelect)

    const color =
      isEraser || isBoxClear
        ? 0xef4444
        : isSelection || isScatter
          ? 0x9333ea
          : isBoxFill || isWater || activeTool === 'line' || activeTool === 'brush'
            ? 0x0284c7
            : isBuildable
              ? 0x10b981
              : 0x6366f1
    const strokeColor =
      isEraser || isBoxClear
        ? 0xf87171
        : isSelection || isScatter
          ? 0xc084fc
          : isBoxFill || isWater || activeTool === 'line' || activeTool === 'brush'
            ? 0x38bdf8
            : isBuildable
              ? 0x34d399
              : 0x818cf8

    // Fast-path: For box/rectangular regions (selection marquee, eraser box, box fill, box clear, buildable, water, scatter, etc.)
    // draw a single bounding isometric diamond (1 draw call instead of NxM separate polygon draw calls)
    if (cells.length > 1) {
      let minCol = cells[0].col
      let maxCol = cells[0].col
      let minRow = cells[0].row
      let maxRow = cells[0].row
      for (let i = 1; i < cells.length; i++) {
        const c = cells[i]
        if (c.col < minCol) minCol = c.col
        if (c.col > maxCol) maxCol = c.col
        if (c.row < minRow) minRow = c.row
        if (c.row > maxRow) maxRow = c.row
      }

      const expectedRectCount = (maxCol - minCol + 1) * (maxRow - minRow + 1)
      const isRect = cells.length === expectedRectCount || isBox

      if (isRect) {
        minCol = Math.max(0, Math.min(project.cols - 1, minCol))
        maxCol = Math.max(0, Math.min(project.cols - 1, maxCol))
        minRow = Math.max(0, Math.min(project.rows - 1, minRow))
        maxRow = Math.max(0, Math.min(project.rows - 1, maxRow))

        const topPt = gridToScreen(minCol, minRow, tileWidth, tileHeight)
        const rightPt = gridToScreen(maxCol, minRow, tileWidth, tileHeight)
        const botPt = gridToScreen(maxCol, maxRow, tileWidth, tileHeight)
        const leftPt = gridToScreen(minCol, maxRow, tileWidth, tileHeight)

        const boxDiamond = [
          { x: topPt.x, y: topPt.y - tileHeight / 2 },
          { x: rightPt.x + tileWidth / 2, y: rightPt.y },
          { x: botPt.x, y: botPt.y + tileHeight / 2 },
          { x: leftPt.x - tileWidth / 2, y: leftPt.y },
        ]

        this.hoverGraphics
          .poly(boxDiamond)
          .fill({ color, alpha: 0.35 })
          .stroke({ width: 2.0, color: strokeColor, alpha: 0.95 })
        return
      }
    }

    for (const cell of cells) {
      if (!isInsideGrid(cell.col, cell.row, project.cols, project.rows)) continue
      const poly = getCellPolygon(cell.col, cell.row, tileWidth, tileHeight)
      this.hoverGraphics
        .poly(poly)
        .fill({ color, alpha: isBox || isBuildable || isScatter ? 0.38 : 0.35 })
        .stroke({
          width: isBox || isBuildable || isScatter ? 2.0 : 1.5,
          color: strokeColor,
          alpha: 0.95,
        })

      if (!isEraser && !isBox && !isBuildable && activeAsset && this.getTexture) {
        const texture = this.getTexture(activeAsset)
        if (texture) {
          const ghost = new Sprite(texture)
          ghost.anchor.set(activeAsset.anchorX, activeAsset.anchorY)
          const center = gridToScreen(cell.col, cell.row, tileWidth, tileHeight)
          ghost.position.set(center.x, center.y)

          const baseScale = tileWidth / (activeAsset.width || tileWidth)
          const scaleVal = baseScale * (activeAsset.scale || 1.0)
          ghost.scale.set(scaleVal)
          ghost.alpha = 0.55
          this.previewContainer.addChild(ghost)
        }
      }
    }
  }

  public renderTeammateHovers(teammateHovers: Map<string, any>, project: any): void {
    if (!this.hoverGraphics) return
    this.hoverGraphics.clear()

    if (!teammateHovers || teammateHovers.size === 0) return

    const { tileWidth, tileHeight } = project
    const now = Date.now()

    for (const [_, hover] of teammateHovers.entries()) {
      if (now - hover.lastUpdated > 3000) continue
      const pt = gridToScreen(hover.col, hover.row, tileWidth, tileHeight)
      const colHex = hover.playerColor ? parseInt(hover.playerColor.replace('#', '0x')) : 0x38bdf8

      const hw = tileWidth / 2
      const hh = tileHeight / 2

      this.hoverGraphics
        .poly([
          { x: pt.x, y: pt.y - hh },
          { x: pt.x + hw, y: pt.y },
          { x: pt.x, y: pt.y + hh },
          { x: pt.x - hw, y: pt.y },
        ])
        .fill({ color: colHex, alpha: 0.18 })
        .stroke({ width: 2.5, color: colHex, alpha: 0.9 })
    }
  }

  public renderRouteAndSpawns(characterStore: any, project: MapProject): void {
    const isGame = Boolean(characterStore.isGameMode)
    if (isGame) {
      this.pathTrailGraphics.clear()
      this.spawnOverlayGraphics.clear()
      this.spawnMarkersContainer.removeChildren()
      return
    }

    const { tileWidth, tileHeight } = project
    const isDrawing = Boolean(characterStore.isDrawingRoute)
    const drawingPathLen = characterStore.drawingPath?.length || 0
    const drawingWpLen = characterStore.drawingWaypoints?.length || 0
    const selectedWpIdx = characterStore.selectedWaypointIndex ?? -1
    const showSpawns =
      characterStore.showPathTrail !== false ||
      isDrawing ||
      Boolean(characterStore.isSettingSpawnPoint)
    const doorsCount = characterStore.detectedDoors?.length || 0
    const selectedDoorIdx =
      characterStore.selectedDoorIndex !== null && characterStore.selectedDoorIndex !== undefined
        ? characterStore.selectedDoorIndex
        : -1
    const spawnMode = characterStore.spawnMode || 'all_doors'
    const currentRouteLen = characterStore.currentActiveRoute?.length || 0

    const playerHexColors = [
      0xef4444, // Slot 1 - Red (P1)
      0x3b82f6, // Slot 2 - Blue (P2)
      0x10b981, // Slot 3 - Green (P3)
      0xf59e0b, // Slot 4 - Amber (P4)
      0xa855f7, // Slot 5 - Purple (P5)
      0xec4899, // Slot 6 - Pink (P6)
      0x06b6d4, // Slot 7 - Cyan (P7)
      0xf97316, // Slot 8 - Orange (P8)
    ]

    const wpHash =
      isDrawing && characterStore.drawingWaypoints
        ? characterStore.drawingWaypoints.map((p: GridCoord) => `${p.col},${p.row}`).join('|')
        : ''
    const showLines = Boolean(characterStore.showPathTrail !== false)
    const playerBasesHash = (characterStore.detectedDoors || [])
      .map((d: any) => `${d.spawnCol},${d.spawnRow}->${d.playerCol},${d.playerRow}`)
      .join('|')

    const trailSignature = `${isGame}_${isDrawing}_${showLines}_${drawingPathLen}_${drawingWpLen}_${selectedWpIdx}_${wpHash}_${showSpawns}_${doorsCount}_${selectedDoorIdx}_${spawnMode}_${currentRouteLen}_${playerBasesHash}_${Boolean(characterStore.isSettingPlayerStartPoint)}`

    if (!isDrawing && trailSignature === this.lastTrailSignature) return
    this.lastTrailSignature = trailSignature

    this.pathTrailGraphics.clear()
    this.spawnOverlayGraphics.clear()
    this.spawnMarkersContainer.removeChildren()

    if (isDrawing) {
      if (characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
        characterStore.detectedDoors.forEach((_: any, dIdx: number) => {
          if (
            dIdx === selectedDoorIdx &&
            characterStore.drawingPath &&
            characterStore.drawingPath.length > 0
          ) {
            return
          }
          const otherRoute = characterStore.getRouteForDoor
            ? characterStore.getRouteForDoor(dIdx)
            : null
          if (otherRoute && otherRoute.length > 1) {
            const otherPts = otherRoute.map((p: GridCoord) =>
              gridToScreen(p.col, p.row, tileWidth, tileHeight)
            )
            const c = playerHexColors[dIdx % playerHexColors.length]

            this.pathTrailGraphics.moveTo(otherPts[0].x, otherPts[0].y)
            for (let i = 1; i < otherPts.length; i++) {
              this.pathTrailGraphics.lineTo(otherPts[i].x, otherPts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: 3.5, color: c, alpha: 0.35 })

            for (let i = 0; i < otherPts.length; i += 4) {
              this.pathTrailGraphics.circle(otherPts[i].x, otherPts[i].y, 2.5).fill({ color: c, alpha: 0.6 })
            }
          }
        })
      }

      const activeRoute = characterStore.drawingPath
      if (activeRoute && activeRoute.length > 1) {
        const screenPts = activeRoute.map((p: GridCoord) =>
          gridToScreen(p.col, p.row, tileWidth, tileHeight)
        )
        const activeColor = playerHexColors[Math.max(0, selectedDoorIdx) % playerHexColors.length]

        this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
        for (let i = 1; i < screenPts.length; i++) {
          this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
        }
        this.pathTrailGraphics.stroke({ width: 8, color: 0x090d16, alpha: 0.95 })

        this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
        for (let i = 1; i < screenPts.length; i++) {
          this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
        }
        this.pathTrailGraphics.stroke({ width: 4.5, color: activeColor, alpha: 0.95 })

        for (let i = 0; i < screenPts.length; i += 3) {
          this.pathTrailGraphics
            .circle(screenPts[i].x, screenPts[i].y, 3)
            .fill({ color: activeColor, alpha: 0.85 })
            .stroke({ width: 1, color: 0xffffff, alpha: 0.95 })
        }
      }

      const waypoints: GridCoord[] = characterStore.drawingWaypoints || []
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i]
        const pt = gridToScreen(wp.col, wp.row, tileWidth, tileHeight)
        const isSelected = i === selectedWpIdx
        const isStart = i === 0
        const isEnd = i === waypoints.length - 1 && waypoints.length > 1

        const groundPoly = getCellPolygon(wp.col, wp.row, tileWidth, tileHeight)
        if (isSelected) {
          this.spawnOverlayGraphics
            .poly(groundPoly)
            .fill({ color: 0xfacc15, alpha: 0.45 })
            .stroke({ width: 2.5, color: 0xfacc15, alpha: 1.0 })
        } else if (isStart) {
          this.spawnOverlayGraphics
            .poly(groundPoly)
            .fill({ color: 0xef4444, alpha: 0.35 })
            .stroke({ width: 2, color: 0xef4444, alpha: 0.85 })
        } else if (isEnd) {
          this.spawnOverlayGraphics
            .poly(groundPoly)
            .fill({ color: 0x38bdf8, alpha: 0.3 })
            .stroke({ width: 2, color: 0x38bdf8, alpha: 0.8 })
        } else {
          this.spawnOverlayGraphics
            .poly(groundPoly)
            .fill({ color: 0x10b981, alpha: 0.2 })
            .stroke({ width: 1.5, color: 0x10b981, alpha: 0.6 })
        }

        const circleRadius = isSelected ? 15 : isStart || isEnd ? 13 : 11.5
        const fillColor = isSelected
          ? 0xf59e0b
          : isStart
            ? 0xef4444
            : isEnd
              ? 0x0284c7
              : 0x10b981

        if (isSelected) {
          this.pathTrailGraphics
            .circle(pt.x, pt.y, 23)
            .stroke({ width: 2, color: 0xffffff, alpha: 0.8 })
          this.pathTrailGraphics
            .circle(pt.x, pt.y, 18)
            .stroke({ width: 3.5, color: 0xfacc15, alpha: 1.0 })
        } else if (isStart) {
          this.pathTrailGraphics
            .circle(pt.x, pt.y, 16)
            .stroke({ width: 2, color: 0xef4444, alpha: 0.8 })
        } else if (isEnd) {
          this.pathTrailGraphics
            .circle(pt.x, pt.y, 16)
            .stroke({ width: 2, color: 0x38bdf8, alpha: 0.7 })
        }

        this.pathTrailGraphics
          .circle(pt.x, pt.y, circleRadius)
          .fill({ color: fillColor, alpha: 1.0 })
          .stroke({ width: isSelected ? 3 : 2.5, color: 0xffffff, alpha: 1.0 })

        const numText = new Text({
          text: String(i + 1),
          style: new TextStyle({
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: isSelected ? 12 : 11,
            fontWeight: '900',
            fill: 0xffffff,
            stroke: { color: 0x090d16, width: 2.5 },
            align: 'center',
          }),
        })
        numText.anchor.set(0.5, 0.5)
        numText.position.set(pt.x, pt.y)
        this.spawnMarkersContainer.addChild(numText)

        if (isSelected) {
          const selTag = new Text({
            text: `Point #${i + 1} (Click to move)`,
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 10,
              fontWeight: 'bold',
              fill: 0xfacc15,
              stroke: { color: 0x090d16, width: 3 },
              align: 'center',
            }),
          })
          selTag.anchor.set(0.5, 1.0)
          selTag.position.set(pt.x, pt.y - 26)
          this.spawnMarkersContainer.addChild(selTag)
        }
      }
    } else if (showSpawns) {
      if (characterStore.showPathTrail !== false) {
        const doors = characterStore.detectedDoors || []
        const routesToDraw: { route: GridCoord[]; dIdx: number }[] =
          doors.length > 0
            ? doors.map((_: any, idx: number) => ({
                route: characterStore.getRouteForDoor
                  ? characterStore.getRouteForDoor(idx)
                  : characterStore.currentActiveRoute,
                dIdx: idx,
              }))
            : [{ route: characterStore.currentActiveRoute, dIdx: 0 }]

        const isAnyRouteSelected = selectedDoorIdx >= 0

        routesToDraw.forEach(({ route, dIdx }) => {
          if (!route || route.length <= 1) return
          const pts = route.map((p) => gridToScreen(p.col, p.row, tileWidth, tileHeight))
          const isSelectedRoute = selectedDoorIdx >= 0 && dIdx === selectedDoorIdx
          const baseColor = playerHexColors[dIdx % playerHexColors.length]
          const c = baseColor
          const lineAlpha = isSelectedRoute ? 1.0 : isAnyRouteSelected ? 0.35 : 0.8
          const lineWidth = isSelectedRoute ? 4.5 : 2.5
          const outlineWidth = isSelectedRoute ? 7.5 : 4.5

          this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
          }
          this.pathTrailGraphics.stroke({
            width: outlineWidth,
            color: 0x090d16,
            alpha: isSelectedRoute ? 0.95 : isAnyRouteSelected ? 0.4 : 0.65,
          })

          if (isSelectedRoute) {
            this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: lineWidth + 4, color: baseColor, alpha: 0.35 })
          }

          this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
          }
          this.pathTrailGraphics.stroke({ width: lineWidth, color: c, alpha: lineAlpha })

          const step = isSelectedRoute ? 2 : 4
          for (let i = 0; i < pts.length; i += step) {
            this.pathTrailGraphics
              .circle(pts[i].x, pts[i].y, isSelectedRoute ? 3.5 : 2.5)
              .fill({ color: c, alpha: lineAlpha })
              .stroke({
                width: isSelectedRoute ? 1.5 : 1,
                color: 0xffffff,
                alpha: isSelectedRoute ? 0.95 : 0.5,
              })
          }
        })
      }

      if (characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
        characterStore.detectedDoors.forEach((door: any, dIdx: number) => {
          const c = door.spawnCol !== undefined ? door.spawnCol : door.col
          const r = door.spawnRow !== undefined ? door.spawnRow : door.row
          const pt = gridToScreen(c, r, tileWidth, tileHeight)
          const isSelected = selectedDoorIdx >= 0 && selectedDoorIdx === dIdx
          const playerColor = playerHexColors[dIdx % playerHexColors.length]
          const beaconColor = isSelected ? 0xfacc15 : playerColor
          const poly = getCellPolygon(c, r, tileWidth, tileHeight)

          this.spawnOverlayGraphics
            .poly(poly)
            .fill({ color: beaconColor, alpha: isSelected ? 0.45 : 0.28 })
            .stroke({ width: isSelected ? 3 : 2, color: beaconColor, alpha: 1.0 })

          this.spawnOverlayGraphics
            .ellipse(pt.x, pt.y, tileWidth * 0.4, tileHeight * 0.4)
            .stroke({ width: isSelected ? 2 : 1.5, color: beaconColor, alpha: 0.85 })

          this.spawnOverlayGraphics
            .circle(pt.x, pt.y, isSelected ? 5.5 : 4)
            .fill({ color: 0xffffff, alpha: 1.0 })
            .stroke({ width: 2, color: beaconColor, alpha: 1.0 })

          const badgeY = pt.y - Math.max(38, tileHeight * 0.75)
          this.spawnOverlayGraphics
            .moveTo(pt.x, pt.y)
            .lineTo(pt.x, badgeY + 8)
            .stroke({ width: 2.5, color: beaconColor, alpha: 0.95 })

          this.spawnOverlayGraphics
            .circle(pt.x, badgeY + 8, 3.5)
            .fill({ color: beaconColor, alpha: 1.0 })

          const rawName = door.name || `Spawn ${dIdx + 1}`
          const cleanName = rawName.replace(/\s*\(\d+,\s*\d+\)/g, '').trim() || `Spawn ${dIdx + 1}`
          const playerLabel = `P${dIdx + 1}`
          const labelText = `${playerLabel}: ${cleanName} (${c}, ${r})`
          const cardW = Math.max(90, labelText.length * 6.5 + 24)
          const cardH = 22

          // Outer card glow & background
          this.spawnOverlayGraphics
            .roundRect(pt.x - cardW / 2, badgeY - cardH + 6, cardW, cardH, 6)
            .fill({ color: 0x090d16, alpha: 0.94 })
            .stroke({ width: isSelected ? 2.5 : 1.8, color: beaconColor, alpha: 0.95 })

          // Left mini pill for P1 / P2
          this.spawnOverlayGraphics
            .roundRect(pt.x - cardW / 2 + 3, badgeY - cardH + 8, 22, 18, 4)
            .fill({ color: playerColor, alpha: 1.0 })

          const pText = new Text({
            text: playerLabel,
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 10,
              fontWeight: '900',
              fill: 0xffffff,
              align: 'center',
            }),
          })
          pText.anchor.set(0.5, 0.5)
          pText.position.set(pt.x - cardW / 2 + 14, badgeY - cardH / 2 + 6)
          this.spawnMarkersContainer.addChild(pText)

          const badgeText = new Text({
            text: `${cleanName} (${c}, ${r})`,
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 10,
              fontWeight: 'bold',
              fill: isSelected ? 0xfef08a : 0xf1f5f9,
              align: 'left',
            }),
          })
          badgeText.anchor.set(0, 0.5)
          badgeText.position.set(pt.x - cardW / 2 + 28, badgeY - cardH / 2 + 6)
          this.spawnMarkersContainer.addChild(badgeText)

          // -------------------------------------------------------------
          // Render Player Start / Base Point (Independent build point for player)
          // -------------------------------------------------------------
          if (door.playerCol !== undefined && door.playerRow !== undefined) {
            const bCol = door.playerCol
            const bRow = door.playerRow
            const bPt = gridToScreen(bCol, bRow, tileWidth, tileHeight)
            const bPoly = getCellPolygon(bCol, bRow, tileWidth, tileHeight)
            const baseColor = isSelected ? 0x38bdf8 : playerColor

            // Base cell highlight polygon (distinct from monster routes)
            this.spawnOverlayGraphics
              .poly(bPoly)
              .fill({ color: baseColor, alpha: isSelected ? 0.35 : 0.2 })
              .stroke({ width: isSelected ? 2.5 : 1.8, color: baseColor, alpha: 0.95 })

            // Center radiant beacon
            this.spawnOverlayGraphics
              .circle(bPt.x, bPt.y, isSelected ? 5 : 3.5)
              .fill({ color: 0xffffff, alpha: 1.0 })
              .stroke({ width: 2, color: baseColor, alpha: 1.0 })

            // Floating Base Badge
            const baseBadgeY = bPt.y - Math.max(34, tileHeight * 0.7)
            this.spawnOverlayGraphics
              .moveTo(bPt.x, bPt.y)
              .lineTo(bPt.x, baseBadgeY + 8)
              .stroke({ width: 2, color: baseColor, alpha: 0.9 })

            const baseCardW = 95
            const baseCardH = 20

            this.spawnOverlayGraphics
              .roundRect(bPt.x - baseCardW / 2, baseBadgeY - baseCardH + 6, baseCardW, baseCardH, 5)
              .fill({ color: 0x090d16, alpha: 0.92 })
              .stroke({ width: isSelected ? 2 : 1.5, color: baseColor, alpha: 0.9 })

            this.spawnOverlayGraphics
              .roundRect(bPt.x - baseCardW / 2 + 3, baseBadgeY - baseCardH + 8, 20, 16, 3.5)
              .fill({ color: playerColor, alpha: 1.0 })

            const bpText = new Text({
              text: playerLabel,
              style: new TextStyle({
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 9.5,
                fontWeight: '900',
                fill: 0xffffff,
                align: 'center',
              }),
            })
            bpText.anchor.set(0.5, 0.5)
            bpText.position.set(bPt.x - baseCardW / 2 + 13, baseBadgeY - baseCardH / 2 + 6)
            this.spawnMarkersContainer.addChild(bpText)

            const baseLabel = new Text({
              text: `Base (${bCol}, ${bRow})`,
              style: new TextStyle({
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 9.5,
                fontWeight: 'bold',
                fill: isSelected ? 0xbae6fd : 0xe2e8f0,
                align: 'left',
              }),
            })
            baseLabel.anchor.set(0, 0.5)
            baseLabel.position.set(bPt.x - baseCardW / 2 + 26, baseBadgeY - baseCardH / 2 + 6)
            this.spawnMarkersContainer.addChild(baseLabel)
          }
        })
      }
    }
  }

  public clear(): void {
    try {
      if (this.hoverGraphics && !this.hoverGraphics.destroyed) this.hoverGraphics.clear()
      if (this.selectionGraphics && !this.selectionGraphics.destroyed) this.selectionGraphics.clear()
      if (this.previewContainer && !this.previewContainer.destroyed) this.previewContainer.removeChildren()
      if (this.buildGhostSprite && !this.buildGhostSprite.destroyed) this.buildGhostSprite.visible = false
      if (this.buildableOverlayGraphics && !this.buildableOverlayGraphics.destroyed) this.buildableOverlayGraphics.clear()
      if (this.pathTrailGraphics && !this.pathTrailGraphics.destroyed) this.pathTrailGraphics.clear()
      if (this.spawnOverlayGraphics && !this.spawnOverlayGraphics.destroyed) this.spawnOverlayGraphics.clear()
      if (this.spawnMarkersContainer && !this.spawnMarkersContainer.destroyed) this.spawnMarkersContainer.removeChildren()
      this.lastBuildableSignature = ''
      this.lastTrailSignature = ''
    } catch (e) {
      console.warn('[OverlayRenderer] clear caught:', e)
    }
  }

  public destroy(): void {
    try {
      this.clear()
      if (this.overlayContainer && !this.overlayContainer.destroyed) {
        this.overlayContainer.destroy({ children: true })
      }
    } catch (e) {
      console.warn('[OverlayRenderer] destroy caught:', e)
    }
  }
}
