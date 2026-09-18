import { Application, Container, Point } from 'pixi.js'
import { MapProject, Point2D } from '../../types/map'
import { gridToScreen } from '../../utils/isometric'

export class PixiContext {
  public app: Application
  public isInitialized = false
  public stageContainer: Container
  public worldContainer: Container
  public currentFps: number = 60
  public onTick?: (deltaSec: number) => void
  public onFrame?: (deltaSec: number) => void

  constructor() {
    this.app = new Application()
    this.stageContainer = new Container()
    this.worldContainer = new Container()
  }

  async init(containerEl: HTMLElement, width: number, height: number): Promise<void> {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(window.devicePixelRatio || 1, 2)

    await this.app.init({
      width,
      height,
      backgroundColor: 0x090d16,
      backgroundAlpha: 1,
      antialias: !isMobile,
      resolution: dpr,
      autoDensity: true,
    })

    containerEl.appendChild(this.app.canvas)

    this.app.stage.addChild(this.stageContainer)
    this.stageContainer.addChild(this.worldContainer)

    let frameCount = 0
    let lastFpsSampleTime = performance.now()

    this.app.ticker.add((ticker) => {
      frameCount++
      const now = performance.now()
      if (now - lastFpsSampleTime >= 500) {
        this.currentFps = Math.max(1, Math.round((frameCount * 1000) / (now - lastFpsSampleTime)))
        frameCount = 0
        lastFpsSampleTime = now
      }

      const deltaSec = ticker.deltaTime / 60
      if (this.onFrame) {
        this.onFrame(deltaSec)
      }
      if (this.onTick) {
        this.onTick(deltaSec)
      }
    })

    this.isInitialized = true
  }

  resize(width: number, height: number): void {
    if (!this.isInitialized) return
    this.app.renderer.resize(width, height)
  }

  setTransform(zoom: number, pan: Point2D): void {
    this.worldContainer.scale.set(zoom)
    this.worldContainer.position.set(pan.x, pan.y)
  }

  setPan(panX: number, panY: number): void {
    this.worldContainer.position.set(panX, panY)
  }

  centerMap(project: MapProject, viewWidth: number, viewHeight: number, zoom = 1.0): Point2D {
    const midCol = (project.cols - 1) / 2
    const midRow = (project.rows - 1) / 2

    const centerScreen = gridToScreen(midCol, midRow, project.tileWidth, project.tileHeight)

    const panX = viewWidth / 2 - centerScreen.x * zoom
    const panY = viewHeight / 2 - centerScreen.y * zoom

    return { x: Math.round(panX), y: Math.round(panY) }
  }

  stopTicker(): void {
    if (this.isInitialized && this.app.ticker) {
      this.app.ticker.stop()
    }
  }

  startTicker(): void {
    if (this.isInitialized && this.app.ticker && !this.app.ticker.started) {
      this.app.ticker.start()
    }
  }

  destroy(): void {
    this.stopTicker()
    if (this.isInitialized) {
      try {
        if (this.stageContainer && !this.stageContainer.destroyed) {
          this.stageContainer.removeChildren()
        }
        if (this.worldContainer && !this.worldContainer.destroyed) {
          this.worldContainer.removeChildren()
        }
        if (this.app?.renderer) {
          this.app.destroy(true, { children: false, texture: false })
        }
      } catch (e) {
        console.warn('PixiContext destroy error:', e)
      } finally {
        this.isInitialized = false
      }
    }
  }
}
