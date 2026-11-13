import { Container, Matrix, Sprite, Texture } from 'pixi.js'
import { AssetItem, MapProject, TileItem } from '../../types/map'
import { gridToScreen } from '../../utils/isometric'
import { depthScore, isGroundLayer } from './mapDepth'

/** Decoration that reads as woodland, so it may grow outside the map */
const WOODLAND = /plants|tree|bush|pine|oak|fir|shrub/i

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Smooth noise over the cells: neighbouring cells get close values, so a wood comes in patches of one kind */
function patchNoise(col: number, row: number, scale: number, seed: number): number {
  const x = col * scale
  const y = row * scale
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const sx = (x - x0) * (x - x0) * (3 - 2 * (x - x0))
  const sy = (y - y0) * (y - y0) * (3 - 2 * (y - y0))
  const top = hash(x0, y0, seed) + (hash(x0 + 1, y0, seed) - hash(x0, y0, seed)) * sx
  const bottom = hash(x0, y0 + 1, seed) + (hash(x0 + 1, y0 + 1, seed) - hash(x0, y0 + 1, seed)) * sx
  return top + (bottom - top) * sy
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** a..b by t, per colour channel */
function mixColor(a: number, b: number, t: number): number {
  const channel = (shift: number) => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t))
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/**
 * The world around the map, so it does not end in a black void: the map's edge ground runs on outwards (a road
 * leaving the map runs on into the woods), the map's own trees grow thick out there, and everything sinks into
 * the map's background colour the further it is from the map. Decoration only: nothing out there is part of the
 * game. Its sprites sit in the map's layers container, sorted with the map, so trees in front overlap correctly.
 */
export class MapSurroundRenderer {
  private sprites: Sprite[] = []
  private signature = ''
  private fog: Sprite | null = null

  public sync(
    project: MapProject,
    depth: number,
    parent: Container,
    resolveAsset: (assetId: string) => AssetItem | undefined,
    getTexture: (asset: AssetItem) => Texture | null,
  ): void {
    const { cols, rows, tileWidth, tileHeight } = project
    const groundIndex = project.layers.findIndex((layer, index) => isGroundLayer(layer, index))
    const groundTiles = groundIndex >= 0 ? project.layers[groundIndex].tiles : {}
    /** A cell's ground: one piece, or (a thin trail) several smaller ones laid side by side */
    const groundAt = (col: number, row: number): TileItem[] => groundTiles[`${col},${row}`] ?? []

    // The field: the map's most common ground pieces (open ground; anything else at the edge is a road running out)
    const counts = new Map<string, number>()
    for (const items of Object.values(groundTiles)) {
      const id = items[0]?.assetId
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const field = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)

    // The woods: the map's own trees
    const treeCounts = new Map<string, number>()
    project.layers.forEach((layer, index) => {
      if (index === groundIndex) return
      for (const items of Object.values(layer.tiles)) for (const item of items) if (WOODLAND.test(item.assetId)) treeCounts.set(item.assetId, (treeCounts.get(item.assetId) ?? 0) + 1)
    })
    const trees = [...treeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)

    const edge: string[] = []
    const ids = (items: TileItem[]) => items.map(item => item.assetId).join('+')
    for (let c = 0; c < cols; c++) edge.push(ids(groundAt(c, 0)), ids(groundAt(c, rows - 1)))
    for (let r = 0; r < rows; r++) edge.push(ids(groundAt(0, r)), ids(groundAt(cols - 1, r)))
    const signature = [project.id, cols, rows, tileWidth, tileHeight, project.bgColor, depth, field, trees, edge].join('|')
    if (signature === this.signature) return
    this.clear()
    if (depth <= 0 || !field.length) {
      this.signature = signature
      return
    }

    const background = parseInt((project.bgColor || '#090d16').replace('#', ''), 16)
    let complete = true
    /** How far into the fog a point is (0 at the map, 1 gone into the background), smooth and round at the corners */
    const fogAt = (col: number, row: number) => {
      const dx = Math.max(-0.5 - col, 0, col - (cols - 0.5))
      const dy = Math.max(-0.5 - row, 0, row - (rows - 0.5))
      return smoothstep(0.3, depth - 1.5, Math.hypot(dx, dy))
    }

    /** `piece`: how a ground piece sits in its cell (anchor, order), as on the map */
    const place = (assetId: string, col: number, row: number, isGround: boolean, fog: number, scale = 1, flip = false, nudge = { x: 0, y: 0 }, piece?: TileItem) => {
      const asset = resolveAsset(assetId)
      const texture = asset ? getTexture(asset) : null
      if (!asset || !texture) {
        complete = false
        return
      }
      const sprite = new Sprite(texture)
      const base = (tileWidth / (asset.width || tileWidth)) * (asset.scale || 1) * scale
      const at = gridToScreen(col, row, tileWidth, tileHeight)
      sprite.anchor.set(piece?.anchorX ?? asset.anchorX ?? 0.5, piece?.anchorY ?? asset.anchorY ?? 0.5)
      sprite.position.set(at.x + nudge.x, at.y + nudge.y)
      sprite.scale.set(flip ? -base : base, base)
      // A tree further out: darker, towards the background colour, and finally gone into it (the ground under it
      // gets the same from the fog layer, smoothly)
      if (!isGround) {
        sprite.tint = mixColor(0xffffff, background, fog * 0.85)
        sprite.alpha = 1 - smoothstep(0.6, 1, fog)
      }
      sprite.zIndex = depthScore(isGround, col + row, col - row, isGround ? 0 : 2, piece?.zIndex ?? 0)
      sprite.eventMode = 'none'
      parent.addChild(sprite)
      this.sprites.push(sprite)
    }

    for (let col = -depth; col < cols + depth; col++) {
      for (let row = -depth; row < rows + depth; row++) {
        const out = Math.max(-col, col - (cols - 1), -row, row - (rows - 1))
        if (out <= 0) continue
        const fog = fogAt(col, row)
        // Wholly inside the fog: nothing to draw (its outer half is covered too: the fog is full a cell earlier)
        if (fog >= 1) continue

        // The ground: the nearest edge cell's piece runs on outwards (a road keeps going); open ground mixes the field
        const nearCol = Math.max(0, Math.min(cols - 1, col))
        const nearRow = Math.max(0, Math.min(rows - 1, row))
        const corner = nearCol !== col && nearRow !== row
        const edgeItems = groundAt(nearCol, nearRow)
        const open = corner || !edgeItems.length || (edgeItems.length === 1 && field.includes(edgeItems[0].assetId))
        if (open) place(field[Math.floor(hash(col, row, 7) * field.length)], col, row, true, fog)
        else for (const item of edgeItems) place(item.assetId, col, row, true, fog, item.scale ?? 1, item.flipX, { x: item.offsetX ?? 0, y: item.offsetY ?? 0 }, item)

        // The woods: everywhere but on a road running out, with room between the trees; each patch mostly one kind of tree (a wood reads
        // better that way than as a random mix), every tree a little off its cell's centre so they do not stand in rows
        if (open && trees.length && hash(col, row, 13) < (out === 1 ? 0.25 : 0.5)) {
          const kind = Math.min(trees.length - 1, Math.floor(patchNoise(col, row, 0.18, 29) * trees.length + (hash(col, row, 17) - 0.5) * 0.8))
          const nudge = { x: (hash(col, row, 31) - 0.5) * tileWidth * 0.4, y: (hash(col, row, 37) - 0.5) * tileHeight * 0.4 }
          place(trees[Math.max(0, kind)], col, row, false, fog, 0.86 + hash(col, row, 19) * 0.3, hash(col, row, 23) < 0.5, nudge)
        }
      }
    }
    this.fog = fogLayer(cols, rows, depth, tileWidth, tileHeight, background, fogAt)
    parent.addChild(this.fog)
    // A texture still loading: build again on the next sync
    this.signature = complete ? signature : ''
  }

  public clear(): void {
    for (const sprite of this.sprites) {
      sprite.parent?.removeChild(sprite)
      sprite.destroy()
    }
    this.sprites = []
    if (this.fog) {
      this.fog.parent?.removeChild(this.fog)
      this.fog.destroy({ texture: true, textureSource: true })
      this.fog = null
    }
    this.signature = ''
  }
}

/** Fog pixels per cell: the GPU smooths between them, so a few are enough for a soft gradient */
const FOG_RESOLUTION = 6

/**
 * The fog over the ground around the map: one small picture in cell space, laid flat on the map's plane with the
 * isometric transform. Above all ground (map and surroundings), below every tree, wall and unit; clear over the map.
 */
function fogLayer(
  cols: number,
  rows: number,
  depth: number,
  tileWidth: number,
  tileHeight: number,
  background: number,
  fogAt: (col: number, row: number) => number,
): Sprite {
  const width = (cols + depth * 2) * FOG_RESOLUTION
  const height = (rows + depth * 2) * FOG_RESOLUTION
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(width, height)
  const start = -depth - 0.5
  for (let py = 0; py < height; py++) {
    const row = start + (py + 0.5) / FOG_RESOLUTION
    for (let px = 0; px < width; px++) {
      const col = start + (px + 0.5) / FOG_RESOLUTION
      const i = (py * width + px) << 2
      image.data[i] = (background >> 16) & 255
      image.data[i + 1] = (background >> 8) & 255
      image.data[i + 2] = background & 255
      image.data[i + 3] = Math.round(fogAt(col, row) * 255)
    }
  }
  ctx.putImageData(image, 0, 0)

  const fog = new Sprite(Texture.from(canvas))
  // Cell space to screen: a cell step along the column goes (+halfW, +halfH), along the row (-halfW, +halfH)
  const k = 1 / FOG_RESOLUTION
  const halfW = tileWidth / 2
  const halfH = tileHeight / 2
  // The picture's corner is cell (start, start): on screen straight above the map's top corner
  fog.setFromMatrix(new Matrix(halfW * k, halfH * k, -halfW * k, halfH * k, 0, 2 * start * halfH))
  // Over all ground (at most 50,000), under all walls, trees and units (100,000 and up, less the surroundings' depth)
  fog.zIndex = 60000
  fog.eventMode = 'none'
  return fog
}
