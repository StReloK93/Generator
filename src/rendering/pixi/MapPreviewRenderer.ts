import { autoDetectRenderer, Container, Graphics, Rectangle, type Renderer } from 'pixi.js'
import type { AssetItem, MapProject } from '../../types/map'
import { getFootprintBaseCenter } from '../../utils/isometric'
import { MapRenderer } from './MapRenderer'

/** Final preview size (2:1, the shape of an isometric map) */
const PREVIEW_WIDTH = 640
const PREVIEW_HEIGHT = 320
/** The map is drawn this many times bigger, then shrunk smoothly (a direct tiny render shimmers) */
const SUPERSAMPLE = 3
const WATER_COLOR = 0x2c6e8a

let rendererPromise: Promise<Renderer> | null = null
const previews = new Map<string, Promise<string>>()
/** One map at a time: they share the renderer */
let queue: Promise<unknown> = Promise.resolve()

/**
 * A picture of the whole map for the map picker, drawn by the same MapRenderer as the game (one hidden renderer,
 * every map drawn once and kept by `key`). Resolves to an image data URL.
 */
export function renderMapPreview(key: string, project: MapProject, assets: Map<string, AssetItem>): Promise<string> {
  let preview = previews.get(key)
  if (!preview) {
    const run = () => draw(project, assets)
    preview = queue.then(run, run)
    queue = preview.catch(() => undefined)
    previews.set(key, preview)
    preview.catch(() => previews.delete(key))
  }
  return preview
}

/** The map behind `key` changed: its picture is drawn again next time. */
export function forgetMapPreview(key: string): void {
  previews.delete(key)
}

async function draw(project: MapProject, assets: Map<string, AssetItem>): Promise<string> {
  const width = PREVIEW_WIDTH * SUPERSAMPLE
  const height = PREVIEW_HEIGHT * SUPERSAMPLE
  rendererPromise ??= autoDetectRenderer({ width, height, backgroundAlpha: 0, antialias: true, preference: 'webgl' })
  const renderer = await rendererPromise

  const mapRenderer = new MapRenderer()
  const root = new Container()
  try {
    // Sprites outside the game atlases (a map's own assets) load as images first
    await mapRenderer.preloadAssetsBatch(usedAssets(project, assets))
    mapRenderer.syncLayers(project, assets)

    const map = new Container()
    map.addChild(waterCells(project), mapRenderer.layersContainer)
    root.addChild(map)

    const bounds = map.getLocalBounds()
    const scale = Math.min(width / bounds.width, height / bounds.height)
    map.scale.set(scale)
    map.position.set(
      (width - bounds.width * scale) / 2 - bounds.x * scale,
      (height - bounds.height * scale) / 2 - bounds.y * scale,
    )

    const big = renderer.extract.canvas({ target: root, frame: new Rectangle(0, 0, width, height) }) as HTMLCanvasElement
    return shrink(big).toDataURL('image/webp', 0.85)
  } finally {
    mapRenderer.destroy()
    root.destroy({ children: true })
  }
}

/** The assets the map's tiles use */
function usedAssets(project: MapProject, assets: Map<string, AssetItem>): AssetItem[] {
  const used = new Map<string, AssetItem>()
  for (const layer of project.layers) {
    for (const items of Object.values(layer.tiles)) {
      for (const item of Array.isArray(items) ? items : [items]) {
        const asset = item && assets.get(item.assetId)
        if (asset) used.set(asset.id, asset)
      }
    }
  }
  return [...used.values()]
}

/** Water is animated in the game (WaterRenderer); the preview paints its cells flat */
function waterCells(project: MapProject): Graphics {
  const g = new Graphics()
  const halfW = project.tileWidth / 2
  const halfH = project.tileHeight / 2
  for (const key of project.waterCells ?? []) {
    const [col, row] = key.split(',').map(Number)
    const c = getFootprintBaseCenter(col, row, 1, 1, project.tileWidth, project.tileHeight)
    g.poly([c.x, c.y - halfH, c.x + halfW, c.y, c.x, c.y + halfH, c.x - halfW, c.y])
  }
  return g.fill(WATER_COLOR)
}

/** Halves the picture until it reaches the preview size (smooth, without the shimmer of one big step) */
function shrink(source: HTMLCanvasElement): HTMLCanvasElement {
  let current = source
  while (current.width > PREVIEW_WIDTH) {
    const next = document.createElement('canvas')
    next.width = Math.max(PREVIEW_WIDTH, Math.round(current.width / 2))
    next.height = Math.max(PREVIEW_HEIGHT, Math.round(current.height / 2))
    const ctx = next.getContext('2d')
    if (!ctx) break
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(current, 0, 0, next.width, next.height)
    current = next
  }
  return current
}
