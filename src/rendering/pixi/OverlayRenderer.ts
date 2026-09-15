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
    activeTool?: string
  ): void {
    const shouldShow = Boolean(isVisible || activeTool === 'buildable')
    const { cols, rows, tileWidth, tileHeight } = project
    const isCustom =
      project.buildMode === 'custom' ||
      (Array.isArray(project.buildableCells) && project.buildableCells.length > 0)
    const count = project.buildableCells?.length || 0
    const buildableHash =
      isCustom && project.buildableCells ? project.buildableCells.slice(0, 100).join('|') : ''
    const sig = `${shouldShow}_${activeTool || ''}_${cols}_${rows}_${tileWidth}_${tileHeight}_${project.buildMode || 'all'}_${count}_${buildableHash}`

    if (sig === this.lastBuildableSignature) return
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
    } else if (activeTool === 'box-fill') {
      strokeColor = 0x38bdf8
      fillColor = 0x0284c7
    } else if (activeTool === 'water') {
      strokeColor = 0x38bdf8
      fillColor = 0x0284c7
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

    for (const sel of items) {
      if (!sel) continue
      let itemSpanX = spanX
      let itemSpanY = spanY

      if (Array.isArray(selected)) {
        const layer = project.layers.find((l) => l.id === sel.layerId)
        if (layer) {
          const key = cellKey(sel.col, sel.row)
          const cellItems = layer.tiles[key] || []
          const found = cellItems.find((i) => i.id === sel.itemId)
          if (found) {
            itemSpanX = found.spanX || 1
            itemSpanY = found.spanY || 1
          }
        }
      }

      const poly = getFootprintPolygon(sel.col, sel.row, itemSpanX, itemSpanY, tileWidth, tileHeight)
      this.selectionGraphics
        .poly(poly)
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
    const isBoxFill = activeTool === 'box-fill'
    const isWater = activeTool === 'water'
    const isBuildable = activeTool === 'buildable' || activeTool.startsWith('buildable')
    const color =
      isEraser || isBoxClear
        ? 0xef4444
        : isBoxFill || isWater
          ? 0x0284c7
          : isBuildable
            ? 0x10b981
            : 0x6366f1
    const strokeColor =
      isEraser || isBoxClear
        ? 0xf87171
        : isBoxFill || isWater
          ? 0x38bdf8
          : isBuildable
            ? 0x34d399
            : 0x818cf8

    for (const cell of cells) {
      if (!isInsideGrid(cell.col, cell.row, project.cols, project.rows)) continue
      const poly = getCellPolygon(cell.col, cell.row, tileWidth, tileHeight)
      this.hoverGraphics
        .poly(poly)
        .fill({ color, alpha: isBoxFill || isBoxClear || isBuildable ? 0.38 : 0.35 })
        .stroke({
          width: isBoxFill || isBoxClear || isBuildable ? 2.0 : 1.5,
          color: strokeColor,
          alpha: 0.95,
        })

      if (!isEraser && !isBoxClear && !isBoxFill && !isBuildable && activeAsset && this.getTexture) {
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
    const { tileWidth, tileHeight } = project
    const isGame = Boolean(characterStore.isGameMode)
    const isDrawing = !isGame && Boolean(characterStore.isDrawingRoute)
    const drawingPathLen = characterStore.drawingPath?.length || 0
    const drawingWpLen = characterStore.drawingWaypoints?.length || 0
    const selectedWpIdx = characterStore.selectedWaypointIndex ?? -1
    const showSpawns =
      !isGame &&
      (characterStore.showPathTrail !== false ||
        isDrawing ||
        Boolean(characterStore.isSettingSpawnPoint))
    const doorsCount = characterStore.detectedDoors?.length || 0
    const selectedDoorIdx =
      characterStore.selectedDoorIndex !== null && characterStore.selectedDoorIndex !== undefined
        ? characterStore.selectedDoorIndex
        : -1
    const spawnMode = characterStore.spawnMode || 'all_doors'
    const currentRouteLen = characterStore.currentActiveRoute?.length || 0

    const wpHash =
      isDrawing && characterStore.drawingWaypoints
        ? characterStore.drawingWaypoints.map((p: GridCoord) => `${p.col},${p.row}`).join('|')
        : ''
    const showLines = Boolean(characterStore.showPathTrail !== false)

    const trailSignature = `${isGame}_${isDrawing}_${showLines}_${drawingPathLen}_${drawingWpLen}_${selectedWpIdx}_${wpHash}_${showSpawns}_${doorsCount}_${selectedDoorIdx}_${spawnMode}_${currentRouteLen}`

    if (!isDrawing && trailSignature === this.lastTrailSignature) return
    this.lastTrailSignature = trailSignature

    this.pathTrailGraphics.clear()
    this.spawnOverlayGraphics.clear()
    this.spawnMarkersContainer.removeChildren()

    if (isDrawing) {
      const colors = [0x8b5cf6, 0x38bdf8, 0xf59e0b, 0xec4899]
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
            const c = colors[dIdx % colors.length]

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

        this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
        for (let i = 1; i < screenPts.length; i++) {
          this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
        }
        this.pathTrailGraphics.stroke({ width: 8, color: 0x090d16, alpha: 0.95 })

        this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
        for (let i = 1; i < screenPts.length; i++) {
          this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
        }
        this.pathTrailGraphics.stroke({ width: 4.5, color: 0x10b981, alpha: 0.95 })

        for (let i = 0; i < screenPts.length; i += 3) {
          this.pathTrailGraphics
            .circle(screenPts[i].x, screenPts[i].y, 3)
            .fill({ color: 0x34d399, alpha: 0.85 })
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
            .fill({ color: 0xf59e0b, alpha: 0.3 })
            .stroke({ width: 2, color: 0xf59e0b, alpha: 0.8 })
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
            ? 0xf97316
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
            .stroke({ width: 2, color: 0xf59e0b, alpha: 0.7 })
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

        const colors = [0x10b981, 0x38bdf8, 0xf59e0b, 0xec4899, 0x8b5cf6, 0x06b6d4]
        const isAnyRouteSelected = selectedDoorIdx >= 0

        routesToDraw.forEach(({ route, dIdx }) => {
          if (!route || route.length <= 1) return
          const pts = route.map((p) => gridToScreen(p.col, p.row, tileWidth, tileHeight))
          const isSelectedRoute = selectedDoorIdx >= 0 && dIdx === selectedDoorIdx
          const baseColor = colors[dIdx % colors.length]
          const c = isSelectedRoute ? 0x10b981 : baseColor
          const lineAlpha = isSelectedRoute ? 1.0 : isAnyRouteSelected ? 0.32 : 0.75
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
            this.pathTrailGraphics.stroke({ width: lineWidth + 4, color: 0x34d399, alpha: 0.35 })
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

      if (showSpawns && characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
        characterStore.detectedDoors.forEach((door: any, dIdx: number) => {
          const c = door.spawnCol !== undefined ? door.spawnCol : door.col
          const r = door.spawnRow !== undefined ? door.spawnRow : door.row
          const pt = gridToScreen(c, r, tileWidth, tileHeight)
          const isSelected = selectedDoorIdx >= 0 && selectedDoorIdx === dIdx
          const beaconColor = isSelected ? 0xf59e0b : 0x10b981
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
            .stroke({ width: 2.5, color: isSelected ? 0xf59e0b : 0x34d399, alpha: 0.95 })

          this.spawnOverlayGraphics
            .circle(pt.x, badgeY + 8, 3.5)
            .fill({ color: beaconColor, alpha: 1.0 })

          const rawName = door.name || `Route ${dIdx + 1}`
          const cleanName = rawName.replace(/\s*\(\d+,\s*\d+\)/g, '').trim() || `Route ${dIdx + 1}`
          const labelText = `${cleanName} (${c}, ${r})`
          const cardW = Math.max(80, labelText.length * 6.8 + 16)
          const cardH = 22
          this.spawnOverlayGraphics
            .roundRect(pt.x - cardW / 2, badgeY - cardH + 6, cardW, cardH, 6)
            .fill({ color: 0x090d16, alpha: 0.92 })
            .stroke({ width: isSelected ? 2 : 1.5, color: beaconColor, alpha: 0.95 })

          const badgeText = new Text({
            text: labelText,
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 10,
              fontWeight: 'bold',
              fill: isSelected ? 0xfef08a : 0xf1f5f9,
              align: 'center',
            }),
          })
          badgeText.anchor.set(0.5, 0.5)
          badgeText.position.set(pt.x, badgeY - cardH / 2 + 6)
          this.spawnMarkersContainer.addChild(badgeText)
        })
      }
    }
  }

  public clear(): void {
    this.hoverGraphics.clear()
    this.selectionGraphics.clear()
    this.previewContainer.removeChildren()
    this.buildGhostSprite.visible = false
    this.buildableOverlayGraphics.clear()
    this.pathTrailGraphics.clear()
    this.spawnOverlayGraphics.clear()
    this.spawnMarkersContainer.removeChildren()
    this.lastBuildableSignature = ''
    this.lastTrailSignature = ''
  }

  public destroy(): void {
    this.clear()
    this.overlayContainer.destroy({ children: true })
  }
}
