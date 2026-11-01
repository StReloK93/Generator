import { Container, Graphics, Sprite } from 'pixi.js'
import { GridCoord, MapProject } from '../../types/map'
import { HideSeekAvatarView, HideSeekRenderView } from '../types'
import { gridToScreen } from '../../utils/isometric'
import { assetManager } from '../../services/assetManager'
import { getCharacterMeta } from '../../utils/characterUtils'

interface AvatarNode {
  container: Container
  ring: Graphics
  sprite: Sprite
}

const AVATAR_SCALE = 0.9
/** Warm dungeon night (a cold blue made the stone look grey) */
const NIGHT_COLOR = 0x140d08
const NIGHT_ALPHA = 0.64
const BLIND_ALPHA = 0.94
/** Many thin nested bands read as one smooth gradient */
const FALLOFF_STEPS = 10
/** Night starts creeping back into the cone from this fraction of the sight range... */
const FOG_START = 0.45
/** ...and each band adds this alpha, so the far end matches the outside night: 1 - (1 - a)^steps = NIGHT_ALPHA */
const FOG_BAND_ALPHA = 1 - Math.pow(1 - NIGHT_ALPHA, 1 / FALLOFF_STEPS)
const LIGHT_COLOR = 0xffe7a3
/** Per-band lantern alpha: the bands stack up, so the light is warmest at the player and fades out at the range */
const LIGHT_BAND_ALPHA = 0.018
/** Faint lantern glow around the player's feet (also behind them), in tiles */
const HALO_RADIUS = 0.9
const HALO_BAND_ALPHA = 0.02
const CHEST_CLOSED = 'sprite-chestClosed_E'
const CHEST_OPEN = 'sprite-chestOpen_E'
/** Above the ground plane (< 50,000) and below walls / props (100,000+) inside the layers container */
const LIGHT_Z_INDEX = 90000
const FOG_Z_INDEX = 900000
const BEACON_Z_INDEX = 940000
const ROUTE_Z_INDEX = 945000
const ROUTE_DOT_SPACING = 0.4
const ROUTE_COLOR = 0xfff1c7
const ACTORS_Z_INDEX = 950000

/**
 * Hide & seek visuals: the local player's sight cone, the night fog outside it, treasure chests,
 * and the characters (drawn above the fog so a visible character is never half hidden by it).
 */
export class HideSeekRenderer {
  private lightGraphics = new Graphics()
  private fogGraphics = new Graphics()
  private beaconGraphics = new Graphics()
  private routeGraphics = new Graphics()
  private actorsContainer = new Container()
  private chestSprites: Sprite[] = []
  private avatars = new Map<string, AvatarNode>()

  constructor() {
    this.lightGraphics.zIndex = LIGHT_Z_INDEX
    this.fogGraphics.zIndex = FOG_Z_INDEX
    this.beaconGraphics.zIndex = BEACON_Z_INDEX
    this.routeGraphics.zIndex = ROUTE_Z_INDEX
    this.actorsContainer.zIndex = ACTORS_Z_INDEX
    this.actorsContainer.sortableChildren = true
  }

  public render(view: HideSeekRenderView, project: MapProject, layersContainer: Container, worldContainer: Container): void {
    if (this.lightGraphics.parent !== layersContainer) layersContainer.addChild(this.lightGraphics)
    for (const node of [this.fogGraphics, this.beaconGraphics, this.routeGraphics, this.actorsContainer]) {
      if (node.parent !== worldContainer) worldContainer.addChild(node)
    }

    this.syncChests(view, project, layersContainer)
    this.syncAvatars(view.avatars, project)
    this.drawLight(view, project)
    this.drawFog(view, project)
    this.drawRoute(view.route, project)
  }

  /** Click-to-move: faint dotted line along the path and a pulsing ring on the destination. */
  private drawRoute(route: GridCoord[], project: MapProject): void {
    const g = this.routeGraphics
    g.clear()
    if (route.length < 2) return
    const { tileWidth, tileHeight } = project

    let carry = ROUTE_DOT_SPACING / 2
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]
      const b = route[i]
      const length = Math.hypot(b.col - a.col, b.row - a.row)
      for (let d = carry; d < length; d += ROUTE_DOT_SPACING) {
        const t = d / length
        const p = gridToScreen(a.col + (b.col - a.col) * t, a.row + (b.row - a.row) * t, tileWidth, tileHeight)
        g.circle(p.x, p.y, 2.5).fill({ color: ROUTE_COLOR, alpha: 0.35 })
      }
      carry = (carry - length) % ROUTE_DOT_SPACING
      if (carry < 0) carry += ROUTE_DOT_SPACING
    }

    const end = route[route.length - 1]
    const p = gridToScreen(end.col, end.row, tileWidth, tileHeight)
    const pulse = (performance.now() % 1200) / 1200
    const rx = tileWidth * (0.12 + pulse * 0.16)
    g.ellipse(p.x, p.y, rx, rx / 2).stroke({ width: 2, color: ROUTE_COLOR, alpha: 0.6 * (1 - pulse) })
    g.ellipse(p.x, p.y, tileWidth * 0.14, tileHeight * 0.14).stroke({ width: 2, color: ROUTE_COLOR, alpha: 0.75 })
    g.ellipse(p.x, p.y, 3.5, 2).fill({ color: ROUTE_COLOR, alpha: 0.9 })
  }

  private toScreen(points: GridCoord[], project: MapProject): number[] {
    const flat: number[] = []
    for (const p of points) {
      const s = gridToScreen(p.col, p.row, project.tileWidth, project.tileHeight)
      flat.push(s.x, s.y)
    }
    return flat
  }

  /** The cone with every ray cut at `fraction` of the full sight range (same apex). A fixed range keeps it steady. */
  private scaledCone(cone: GridCoord[], fraction: number, visionRange: number): GridCoord[] {
    const [origin, ...rays] = cone
    const reach = visionRange * fraction
    return [
      origin,
      ...rays.map(p => {
        const d = Math.hypot(p.col - origin.col, p.row - origin.row)
        const k = d > reach ? reach / d : 1
        return { col: origin.col + (p.col - origin.col) * k, row: origin.row + (p.row - origin.row) * k }
      }),
    ]
  }

  private drawLight(view: HideSeekRenderView, project: MapProject): void {
    const g = this.lightGraphics
    g.clear()
    if (!view.vision || view.blind) return
    // Lantern light: shrinking nested cones stack up, warmest at the player and fading out at the sight range
    for (let i = 1; i <= FALLOFF_STEPS; i++) {
      g.poly(this.toScreen(this.scaledCone(view.vision, i / FALLOFF_STEPS, view.visionRange), project))
        .fill({ color: LIGHT_COLOR, alpha: LIGHT_BAND_ALPHA })
    }
  }

  private drawFog(view: HideSeekRenderView, project: MapProject): void {
    const g = this.fogGraphics
    g.clear()
    if (!view.vision && !view.blind) return

    // Generous rectangle around the whole isometric map
    const { cols, rows, tileWidth, tileHeight } = project
    const corners = [
      gridToScreen(-4, -4, tileWidth, tileHeight),
      gridToScreen(cols + 4, -4, tileWidth, tileHeight),
      gridToScreen(-4, rows + 4, tileWidth, tileHeight),
      gridToScreen(cols + 4, rows + 4, tileWidth, tileHeight),
    ]
    const minX = Math.min(...corners.map(c => c.x)) - 2000
    const maxX = Math.max(...corners.map(c => c.x)) + 2000
    const minY = Math.min(...corners.map(c => c.y)) - 2000
    const maxY = Math.max(...corners.map(c => c.y)) + 2000

    g.rect(minX, minY, maxX - minX, maxY - minY).fill({ color: NIGHT_COLOR, alpha: view.blind ? BLIND_ALPHA : NIGHT_ALPHA })
    if (view.blind || !view.vision) return

    const cone = this.toScreen(view.vision, project)
    g.poly(cone).cut()
    // Soft far edge: night creeps back in band by band, reaching the outside fog exactly at the sight range
    for (let i = 0; i < FALLOFF_STEPS; i++) {
      const fraction = FOG_START + ((1 - FOG_START) * i) / FALLOFF_STEPS
      g.poly(cone).fill({ color: NIGHT_COLOR, alpha: FOG_BAND_ALPHA })
      g.poly(this.toScreen(this.scaledCone(view.vision, fraction, view.visionRange), project)).cut()
    }

    // Lantern glow around the player's feet: only tints the night, never reveals what is behind
    const apex = gridToScreen(view.vision[0].col, view.vision[0].row, tileWidth, tileHeight)
    for (let i = 1; i <= FALLOFF_STEPS / 2; i++) {
      const rx = (HALO_RADIUS * tileWidth * i) / (FALLOFF_STEPS / 2) / Math.SQRT2
      g.ellipse(apex.x, apex.y, rx, (rx * tileHeight) / tileWidth).fill({ color: LIGHT_COLOR, alpha: HALO_BAND_ALPHA })
    }
  }

  private syncChests(view: HideSeekRenderView, project: MapProject, layersContainer: Container): void {
    const { tileWidth, tileHeight } = project
    while (this.chestSprites.length > view.chests.length) this.chestSprites.pop()?.destroy()
    while (this.chestSprites.length < view.chests.length) this.chestSprites.push(new Sprite())

    const beacons = this.beaconGraphics
    beacons.clear()
    const pulse = 0.55 + Math.sin(performance.now() * 0.004) * 0.25

    view.chests.forEach((chest, i) => {
      const sprite = this.chestSprites[i]
      if (sprite.parent !== layersContainer) layersContainer.addChild(sprite)
      const assetId = chest.opened ? CHEST_OPEN : CHEST_CLOSED
      const texture = assetManager.getTexture(assetId)
      const asset = assetManager.getAssetItem(assetId)
      sprite.visible = !!texture
      if (texture && sprite.texture !== texture) sprite.texture = texture
      const pos = gridToScreen(chest.col, chest.row, tileWidth, tileHeight)
      sprite.position.set(pos.x, pos.y)
      sprite.anchor.set(asset?.anchorX ?? 0.5, asset?.anchorY ?? 0.88)
      sprite.scale.set(tileWidth / (asset?.width || 256))
      sprite.zIndex = 100000 + Math.round((chest.col + chest.row) * 1000) + 400

      // Closed chests glow through the night so both players know where the objectives are
      if (!chest.opened) {
        beacons.ellipse(pos.x, pos.y, tileWidth * 0.32, tileHeight * 0.32).fill({ color: 0xfbbf24, alpha: 0.18 * pulse })
        beacons.ellipse(pos.x, pos.y, tileWidth * 0.32, tileHeight * 0.32).stroke({ width: 2, color: 0xfde68a, alpha: 0.7 * pulse })
        beacons.poly([pos.x, pos.y - 58, pos.x + 7, pos.y - 48, pos.x, pos.y - 38, pos.x - 7, pos.y - 48]).fill({ color: 0xfbbf24, alpha: 0.9 })
      }
    })
  }

  private syncAvatars(avatars: HideSeekAvatarView[], project: MapProject): void {
    const seen = new Set<string>()
    for (const avatar of avatars) {
      seen.add(avatar.id)
      let node = this.avatars.get(avatar.id)
      if (!node) {
        node = this.createAvatar()
        this.avatars.set(avatar.id, node)
        this.actorsContainer.addChild(node.container)
      }
      this.updateAvatar(node, avatar, project)
    }

    for (const [id, node] of this.avatars) {
      if (seen.has(id)) continue
      node.container.destroy({ children: true })
      this.avatars.delete(id)
    }
  }

  private createAvatar(): AvatarNode {
    const container = new Container()
    container.sortableChildren = true
    const ring = new Graphics()
    ring.zIndex = 1
    const sprite = new Sprite()
    sprite.zIndex = 2
    container.addChild(ring, sprite)
    return { container, ring, sprite }
  }

  private updateAvatar(node: AvatarNode, avatar: HideSeekAvatarView, project: MapProject): void {
    const { tileWidth, tileHeight } = project
    node.container.visible = avatar.visible
    if (!avatar.visible) return

    const pos = gridToScreen(avatar.col, avatar.row, tileWidth, tileHeight)
    node.container.position.set(pos.x, pos.y)
    node.container.zIndex = Math.round((avatar.col + avatar.row) * 1000)

    const texture = assetManager.getCharacterTexture(
      avatar.direction,
      avatar.action,
      avatar.action === 'Idle' ? '0' : avatar.frame,
      avatar.model
    )
    node.sprite.visible = !!texture
    if (texture) {
      if (node.sprite.texture !== texture) node.sprite.texture = texture
      const meta = getCharacterMeta(avatar.model)
      const scale = (tileWidth / (meta?.cellWidth || 256)) * (meta?.scale ?? 1) * AVATAR_SCALE
      node.sprite.scale.set(scale)
      node.sprite.anchor.set(meta?.anchorX ?? 0.5, meta?.anchorY ?? 0.898)
    }

    const color = parseInt(avatar.color.replace('#', ''), 16) || 0x38bdf8
    const rx = tileWidth * 0.22
    const ry = tileHeight * 0.22
    node.ring.clear()
    node.ring.ellipse(0, 0, rx, ry).fill({ color, alpha: avatar.isMe ? 0.3 : 0.18 })
    node.ring.ellipse(0, 0, rx, ry).stroke({ width: 2, color, alpha: 0.9 })
  }

  public clear(): void {
    for (const node of this.avatars.values()) node.container.destroy({ children: true })
    this.avatars.clear()
    for (const sprite of this.chestSprites) sprite.destroy()
    this.chestSprites = []
    this.lightGraphics.clear()
    this.fogGraphics.clear()
    this.beaconGraphics.clear()
    this.routeGraphics.clear()
  }

  public destroy(): void {
    this.clear()
    for (const node of [this.lightGraphics, this.fogGraphics, this.beaconGraphics, this.routeGraphics, this.actorsContainer]) {
      if (!node.destroyed) node.destroy({ children: true })
    }
  }
}
