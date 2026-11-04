import { BlurFilter, ColorMatrixFilter, Container, Graphics, Sprite } from 'pixi.js'
import { GridCoord, MapProject } from '../../types/map'
import { HideSeekAvatarView, HideSeekRenderView, HideSeekSpotView } from '../types'
import { gridToScreen } from '../../utils/isometric'
import type { EntitySprite } from './MapRenderer'
import { assetManager } from '../../services/assetManager'
import { getCharacterMeta } from '../../utils/characterUtils'

interface AvatarNode {
  container: Container
  ring: Graphics
  sprite: Sprite
  /** 0 = upright, 1 = fully crouched (eases so sneaking starts / ends smoothly) */
  crouch: number
}

const AVATAR_SCALE = 0.9
/** Sneaking: the character ducks a little lower and wider, and slightly fades into the dark */
const CROUCH_SQUASH = 0.1
const CROUCH_WIDEN = 0.04
const CROUCH_FADE = 0.25
const CROUCH_EASE = 10
/** Warm dungeon night (a cold blue made the stone look grey) */
const NIGHT_COLOR = 0x140d08
/** The whole maze stays faintly visible; only the sight cone is really lit */
const NIGHT_ALPHA = 0.8
const BLIND_ALPHA = 0.99
/** Nested sight shapes per light layer: many thin bands read as one smooth gradient (the blur hides the steps) */
const FALLOFF_STEPS = 14
/** Each erase band clears this much of the night: together they clear it fully at the player */
const ERASE_BAND_ALPHA = 1 - Math.pow(0.01, 1 / FALLOFF_STEPS)
/** GPU blur over the night and the lantern glow: soft cone edges, no polygon corners (screen pixels) */
const NIGHT_SOFTNESS = 18
const GLOW_SOFTNESS = 24
/** Warm lantern glow added inside the cone: strongest at the lantern, fading out along the beam */
const GLOW_COLOR = 0xffc976
const GLOW_BAND_ALPHA = 0.022
/** A burning flare makes the glow this much stronger */
const FLARE_GLOW_FACTOR = 2.5
/** Lantern flicker: tiny, irregular breathing of the glow and the light's reach */
const FLICKER_GLOW = 0.12
const FLICKER_REACH = 0.025
/** Walls / props at the edge of the light are this dim before they fade into the night */
const DIM_LEVEL = 0.3
/** Below this light a wall / prop fades out into the night (so the dark maze shows no silhouettes) */
const FADE_IN_LIGHT = 0.35
/** Lit walls take the lantern's warm color: green and blue fall off a little faster than red */
const LANTERN_TINT = [1, 0.95, 0.85]
/** Walls / props out of the light: a dim grey outline of the maze */
const DARK_WALL_ALPHA = 0.9
/** Own character hidden behind a wall / prop: a white x-ray silhouette over everything (like the Hero mode) */
const XRAY_ALPHA = 0.85
const XRAY_Z_INDEX = 999999
/** Only things up to this many tiles (on screen) in front of the character are tested */
const OCCLUDER_RANGE = 4
/** Points of the character's body that count as covered: knees and chest, in tile heights above the feet */
const BODY_PROBES = [0.3, 0.75]
/** A visible character never sinks fully into the dark */
const MIN_AVATAR_LIGHT = 0.45
/** Props are tested this far in front of them, towards the player (so the prop itself does not block the test) */
const FACE_PROBE = 0.3
/** Wall sprite suffix -> the cell edge it stands on (_E upper-left, _W lower-right, _N lower-left, _S upper-right) */
const WALL_EDGES: Record<string, [number, number]> = { E: [-0.5, 0], W: [0.5, 0], N: [0, 0.5], S: [0, -0.5] }
const CHEST_CLOSED = 'sprite-chestClosed_E'
const CHEST_OPEN = 'sprite-chestOpen_E'
/** Above the ground plane (< 50,000) and below walls / props (100,000+) inside the layers container:
 * the night covers the floor, walls and characters are lit (or darkened) one by one */
const NIGHT_Z_INDEX = 90000
const GLOW_Z_INDEX = 90100
/** Treasure gems: dropped on the floor, or carried over a hider's head */
const TREASURE_COLOR = 0x38bdf8
const TREASURE_CORE_COLOR = 0xe0f2fe
/** A carried gem floats this many tile heights over the carrier's feet */
const CARRY_GEM_LIFT = 2.4
/** Characters sort among walls / props like the Hero mode (100,000 + depth) */
const AVATAR_DEPTH_BIAS = 500
const BEACON_Z_INDEX = 940000
const ROUTE_Z_INDEX = 945000
const BEAM_COLOR = 0xfcd34d
const BEAM_CORE_COLOR = 0xfff7d6
/** Light beam height above a chest, in tiles */
const BEAM_HEIGHT = 2.2
const ROUTE_DOT_SPACING = 0.4
const ROUTE_COLOR = 0xfff1c7
const EFFECTS_Z_INDEX = 946000
/** Footprints lie on the floor under the night (only those in light are drawn) */
const PRINTS_Z_INDEX = 85000
const PRINT_COLOR = 0x24170c
/** Depth inside a cell: doors like map walls (layer 1), candle stands, chests, barrels */
const DOOR_DEPTH = 20
const TORCH_DEPTH = 300
const SPOT_DEPTH = 450
const CANDLE = 'sprite-candleStand_E'
const FLAME_COLOR = 0xffb347
const FLAME_CORE_COLOR = 0xfff3c4
/** Candle light on the floor: share of its radius that fades out */
const TORCH_FADE_SHARE = 0.75
/** Every burning candle is drawn wherever it is (a far one going dark looked as if a hider had blown it out), so each
 * gets fewer, stronger bands than the player's own light (the blur hides the steps) */
const TORCH_FALLOFF_STEPS = 8
const TORCH_ERASE_BAND_ALPHA = 1 - Math.pow(0.01, 1 / TORCH_FALLOFF_STEPS)
const TORCH_GLOW_ALPHA = 0.028 * (FALLOFF_STEPS / TORCH_FALLOFF_STEPS)
const HUNT_COLOR = 0xef4444
/** Open exit gates send up a green beam everyone sees */
const EXIT_BEAM_COLOR = 0x4ade80
const EXIT_BEAM_CORE_COLOR = 0xdcfce7/** Barrels / crates a hider can sit in (one per spot, cycling); cabinets are bookcases standing against a wall */
const SPOT_ASSETS = ['sprite-barrels_E', 'sprite-woodenCrates_E', 'sprite-sacksCrate_E', 'sprite-barrelsStacked_S']
const spotAsset = (spot: HideSeekSpotView, i: number) => (spot.kind === 'cabinet' ? `sprite-bookcaseBooks_${spot.facing}` : SPOT_ASSETS[i % SPOT_ASSETS.length])

/** A prop sprite placed on a map cell (barrels, cabinets, doors, candle stands). */
interface PropView extends GridCoord {
  assetId: string
  /** Added to the cell's depth (100,000 + (col + row) * 1000) */
  depth: number
  level: number
  /** Breathing: the barrel the player sits in */
  wobble?: number
}
const STONE_COLOR = 0xd6d3d1
const BELL_COLOR = 0xfbbf24
const JAIL_TINT = 0x7c8794
const JAIL_COLOR = 0x94a3b8
/** Own character inside a barrel: a faint outline so the player knows where they are */
const HIDDEN_SELF_ALPHA = 0.35

/** 0..1 light -> sprite tint: warm lantern color, dimmer towards the edge of the light. */
function litTint(light: number): number {
  const k = DIM_LEVEL + (1 - DIM_LEVEL) * light
  const [r, g, b] = LANTERN_TINT.map(c => Math.round(255 * k * (c + (1 - c) * (1 - light))))
  return (r << 16) | (g << 8) | b
}

/** 0..1 light -> opacity. */
function litAlpha(light: number): number {
  return Math.min(1, light / FADE_IN_LIGHT)
}

/** Lights one sprite of the maze: warm in the light, a dim grey outline in the dark. */
function light(sprite: Sprite, level: number): void {
  sprite.tint = litTint(level)
  sprite.alpha = Math.max(litAlpha(level), DARK_WALL_ALPHA)
}

/** The cell edge a wall / door piece stands on, end to end (grid). */
function edgeLine(cell: GridCoord, edge: [number, number]): [GridCoord, GridCoord] {
  const mid = { col: cell.col + edge[0], row: cell.row + edge[1] }
  const [along0, along1] = edge[0] !== 0 ? [0, 0.5] : [0.5, 0]
  return [{ col: mid.col - along0, row: mid.row - along1 }, { col: mid.col + along0, row: mid.row + along1 }]
}

/**
 * Hide & seek visuals: a dim night over the whole maze with the player's sight cone erased out of it (GPU-blurred soft
 * edges), a flickering warm lantern glow, walls / props / characters lit by it, treasure
 * chests, gadgets and the click-to-move route.
 */
export class HideSeekRenderer {
  /** Night and the cone erased from it, rendered (and blurred) together so the erase only cuts the night */
  private night = new Container()
  private nightGraphics = new Graphics()
  private holeGraphics = new Graphics()
  private glowGraphics = new Graphics()
  private xray = new Sprite()
  private beaconGraphics = new Graphics()
  private routeGraphics = new Graphics()
  private effectsGraphics = new Graphics()
  /** Map walls / props tinted last frame (reset when the match ends) */
  private litEntities: readonly EntitySprite[] = []
  private chestSprites: Sprite[] = []
  private spotSprites: Sprite[] = []
  private doorSprites: Sprite[] = []
  private torchSprites: Sprite[] = []
  private exitSprites: Sprite[] = []
  private printGraphics = new Graphics()
  private avatars = new Map<string, AvatarNode>()
  private lastFrameAt = performance.now()

  constructor() {
    this.night.zIndex = NIGHT_Z_INDEX
    this.night.addChild(this.nightGraphics, this.holeGraphics)
    this.holeGraphics.blendMode = 'erase'
    this.night.filters = [new BlurFilter({ strength: NIGHT_SOFTNESS, quality: 3 })]
    this.glowGraphics.zIndex = GLOW_Z_INDEX
    this.glowGraphics.blendMode = 'add'
    this.glowGraphics.filters = [new BlurFilter({ strength: GLOW_SOFTNESS, quality: 3 })]
    this.printGraphics.zIndex = PRINTS_Z_INDEX
    const white = new ColorMatrixFilter()
    white.brightness(10, false)
    this.xray.filters = [white]
    this.xray.alpha = XRAY_ALPHA
    this.xray.zIndex = XRAY_Z_INDEX
    this.beaconGraphics.zIndex = BEACON_Z_INDEX
    this.routeGraphics.zIndex = ROUTE_Z_INDEX
    this.effectsGraphics.zIndex = EFFECTS_Z_INDEX
  }

  public render(view: HideSeekRenderView, project: MapProject, layersContainer: Container, worldContainer: Container, entities: readonly EntitySprite[]): void {
    for (const node of [this.night, this.glowGraphics, this.xray, this.printGraphics]) {
      if (node.parent !== layersContainer) layersContainer.addChild(node)
    }
    for (const node of [this.beaconGraphics, this.routeGraphics, this.effectsGraphics]) {
      if (node.parent !== worldContainer) worldContainer.addChild(node)
    }

    const now = performance.now()
    const deltaSec = Math.min(0.1, (now - this.lastFrameAt) / 1000)
    this.lastFrameAt = now

    this.syncChests(view, project, layersContainer)
    this.syncSpots(view, project, layersContainer)
    this.syncProps(this.doorSprites, view.doors.map(d => ({
      col: d.col,
      row: d.row,
      assetId: `sprite-stoneWallDoor${d.open ? 'Open' : 'Closed'}_${d.suffix}`,
      depth: d.depthOffset * 1000 + DOOR_DEPTH,
      level: 0,
    })), project, layersContainer)
    this.syncProps(this.exitSprites, view.exits.map(d => ({
      col: d.col,
      row: d.row,
      assetId: `sprite-stoneWallGate${d.open ? 'Open' : 'Closed'}_${d.suffix}`,
      depth: d.depthOffset * 1000 + DOOR_DEPTH,
      level: 0,
    })), project, layersContainer)
    this.syncProps(this.torchSprites, view.torches.map(t => ({ col: t.col, row: t.row, assetId: CANDLE, depth: TORCH_DEPTH, level: t.lit ? 1 : view.lightAt(t) })), project, layersContainer)
    this.syncAvatars(view, project, layersContainer, deltaSec)
    this.lightEntities(view, entities)
    this.drawXray(view, project, entities)
    this.drawEffects(view, project)
    this.drawTreasures(view, now / 1000, project)
    const reaches = this.flicker(view.sightReaches, now / 1000)
    this.drawNight(view, reaches, project)
    this.drawGlow(view, reaches, now / 1000, project)
    this.drawFootprints(view, project)
    this.drawRoute(view.route, project)
  }

  /** Dropped treasures glinting on the floor, and a gem over everyone who carries one home. */
  private drawTreasures(view: HideSeekRenderView, time: number, project: MapProject): void {
    const g = this.effectsGraphics
    const { tileWidth, tileHeight } = project
    const gem = (x: number, y: number, size: number) => {
      g.circle(x, y, size * 2.2).fill({ color: TREASURE_COLOR, alpha: 0.18 })
      g.poly([x, y - size * 1.3, x + size, y, x, y + size * 1.3, x - size, y]).fill({ color: TREASURE_COLOR, alpha: 0.95 })
      g.poly([x, y - size * 1.3, x + size * 0.45, y, x, y + size * 0.4, x - size * 0.45, y]).fill({ color: TREASURE_CORE_COLOR, alpha: 0.9 })
    }
    view.treasures.forEach((t, i) => {
      const p = gridToScreen(t.col, t.row, tileWidth, tileHeight)
      gem(p.x, p.y - tileHeight * 0.25 + Math.sin(time * 3 + i) * 3, 7)
    })
    for (const avatar of view.avatars) {
      if (!avatar.carrying || !avatar.visible) continue
      const p = gridToScreen(avatar.col, avatar.row, tileWidth, tileHeight)
      gem(p.x, p.y - tileHeight * CARRY_GEM_LIFT + Math.sin(time * 4) * 2, 6)
    }
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

  /** The sight polygon with every ray cut at `fraction` of its own reach (cone or flare circle). Fixed reaches keep it steady. */
  private scaledSight(sight: GridCoord[], fraction: number, reaches: number[]): GridCoord[] {
    const [origin, ...rays] = sight
    return [
      origin,
      ...rays.map((p, i) => {
        const reach = (reaches[i] ?? 0) * fraction
        const d = Math.hypot(p.col - origin.col, p.row - origin.row)
        const k = d > reach ? reach / d : 1
        return { col: origin.col + (p.col - origin.col) * k, row: origin.row + (p.row - origin.row) * k }
      }),
    ]
  }

  /** Walls keep one dim stone color (only the floor is lit); props take the light where they stand. */
  private lightEntities(view: HideSeekRenderView, entities: readonly EntitySprite[]): void {
    this.litEntities = entities
    const origin = view.vision?.[0]
    for (const e of entities) {
      if (this.wallEdge(e)) {
        light(e.sprite, view.vision || view.blind ? 0 : 1)
        continue
      }
      let level = view.vision || view.blind ? 0 : 1
      if (origin) {
        // Probed just in front of the prop, towards the player, so it never blocks its own test
        const d = Math.hypot(e.col - origin.col, e.row - origin.row)
        const k = d > FACE_PROBE ? FACE_PROBE / d : 0
        level = view.lightAt({ col: e.col + (origin.col - e.col) * k, row: e.row + (origin.row - e.row) * k })
      }
      light(e.sprite, level)
    }
  }

  /** Own character covered by a wall / prop in front of it: shows its white silhouette on top (walls stay as they are). */
  private drawXray(view: HideSeekRenderView, project: MapProject, entities: readonly EntitySprite[]): void {
    const me = view.avatars.find(a => a.isMe && a.visible && !a.hidden)
    const node = me && this.avatars.get(me.id)
    this.xray.visible = !!node?.sprite.visible && this.isCovered(node, entities, project)
    if (!node || !this.xray.visible) return
    this.xray.texture = node.sprite.texture
    this.xray.anchor.copyFrom(node.sprite.anchor)
    this.xray.scale.copyFrom(node.sprite.scale)
    this.xray.position.copyFrom(node.container.position)
  }

  /** Whether a wall / prop drawn in front of the character hides its chest or knees (screen space, by the drawn shapes). */
  private isCovered(node: AvatarNode, entities: readonly EntitySprite[], project: MapProject): boolean {
    const body = node.container
    const parent = body.parent
    if (!parent) return false
    const probes = BODY_PROBES.map(k => body.toGlobal({ x: 0, y: -project.tileHeight * k }))
    const toGlobal = (p: GridCoord) => parent.toGlobal(gridToScreen(p.col, p.row, project.tileWidth, project.tileHeight))

    const covers = (sprite: Sprite, assetId: string, line?: [GridCoord, GridCoord]): boolean => {
      if (!sprite.visible || sprite.alpha <= 0 || sprite.zIndex <= body.zIndex) return false
      // Cheap pre-filter before measuring the sprite
      const dx = sprite.x - body.x
      const dy = sprite.y - body.y
      if (Math.abs(dx) > project.tileWidth * OCCLUDER_RANGE || dy < 0 || dy > project.tileHeight * OCCLUDER_RANGE) return false
      // The drawn part of the texture (sprites carry a lot of transparent padding)
      const content = assetManager.getAssetItem(assetId)?.contentBounds
      const { width, height } = sprite.texture.orig
      const local = (x: number, y: number) => sprite.toGlobal({ x: x - sprite.anchor.x * width, y: y - sprite.anchor.y * height })
      const topLeft = local(content?.minX ?? 0, content?.minY ?? 0)
      const bottomRight = local(content?.maxX ?? width, content?.maxY ?? height)
      if (!line) return probes.some(p => p.x > topLeft.x && p.x < bottomRight.x && p.y > topLeft.y && p.y < bottomRight.y)
      // A wall: the face rising from its base line on the floor up to the top of the drawn stones
      const [a, b] = line.map(toGlobal).sort((u, v) => u.x - v.x)
      const wallHeight = Math.min(a.y, b.y) - topLeft.y
      return probes.some(p => {
        if (p.x < a.x || p.x > b.x || b.x === a.x) return false
        const base = a.y + ((b.y - a.y) * (p.x - a.x)) / (b.x - a.x)
        return p.y <= base && p.y >= base - wallHeight
      })
    }
    const wallLine = (e: EntitySprite) => {
      const edge = this.wallEdge(e)
      return edge ? edgeLine(e, edge) : undefined
    }
    return (
      entities.some(e => covers(e.sprite, e.assetId, wallLine(e))) ||
      this.doorPieces.some(({ sprite, assetId, col, row, suffix }) => covers(sprite, assetId, edgeLine({ col, row }, WALL_EDGES[suffix]))) ||
      this.spotSprites.some((sprite, i) => covers(sprite, this.spotAssets[i] ?? ''))
    )
  }

  /** Door pieces / spot assets drawn this frame (the x-ray tests them like walls / props) */
  private doorPieces: { sprite: Sprite; assetId: string; col: number; row: number; suffix: string }[] = []
  private spotAssets: string[] = []

  private wallEdge(e: EntitySprite): [number, number] | undefined {
    return assetManager.getAssetItem(e.assetId)?.category === 'Walls' ? WALL_EDGES[e.assetId.slice(-1)] : undefined
  }

  /** Lantern flicker: every ray's reach breathes a little, irregularly (two detuned waves). */
  private flicker(reaches: number[], time: number): number[] {
    const k = 1 - FLICKER_REACH * (0.5 + 0.3 * Math.sin(time * 7.3) + 0.2 * Math.sin(time * 17.9))
    return reaches.map(r => r * k)
  }

  /** The night over the floor with the sight cone erased out of it: clear at the lantern, fading out along the beam. */
  private drawNight(view: HideSeekRenderView, reaches: number[], project: MapProject): void {
    const night = this.nightGraphics
    const hole = this.holeGraphics
    night.clear()
    hole.clear()
    this.night.visible = !!view.vision || view.blind
    if (!this.night.visible) return

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
    night.rect(minX, minY, maxX - minX, maxY - minY).fill({ color: NIGHT_COLOR, alpha: view.blind ? BLIND_ALPHA : NIGHT_ALPHA })
    if (view.blind || !view.vision) return

    // Nested cones, each erasing a little more: the full cone clears the near part, its fading tail only partly
    const fadeShare = Math.min(1, view.lightFadeWidth / Math.max(...reaches, view.lightFadeWidth))
    for (let i = 0; i < FALLOFF_STEPS; i++) {
      const fraction = 1 - (fadeShare * i) / FALLOFF_STEPS
      hole.poly(this.toScreen(this.scaledSight(view.vision, fraction, reaches), project)).fill({ color: 0xffffff, alpha: ERASE_BAND_ALPHA })
    }
    // Burning candles light the floor around them (walls cast shadows)
    for (const torch of view.torches) {
      if (!torch.glow) continue
      const radii = torch.glow.slice(1).map(() => view.torchRadius)
      for (let i = 0; i < TORCH_FALLOFF_STEPS; i++) {
        const fraction = 1 - (TORCH_FADE_SHARE * i) / TORCH_FALLOFF_STEPS
        hole.poly(this.toScreen(this.scaledSight(torch.glow, fraction, radii), project)).fill({ color: 0xffffff, alpha: TORCH_ERASE_BAND_ALPHA })
      }
    }
  }

  /** Warm lantern light added on top of the lit floor: a soft wedge, brightest at the lantern, gently flickering. */
  private drawGlow(view: HideSeekRenderView, reaches: number[], time: number, project: MapProject): void {
    const g = this.glowGraphics
    g.clear()
    if (!view.vision || view.blind) return
    const flicker = 1 + FLICKER_GLOW * (0.6 * Math.sin(time * 9.1) + 0.4 * Math.sin(time * 23.7))
    const alpha = GLOW_BAND_ALPHA * flicker * (view.flareLit ? FLARE_GLOW_FACTOR : 1)
    for (let i = 1; i <= FALLOFF_STEPS; i++) {
      g.poly(this.toScreen(this.scaledSight(view.vision, i / FALLOFF_STEPS, reaches), project)).fill({ color: GLOW_COLOR, alpha })
    }
    view.torches.forEach((torch, t) => {
      if (!torch.glow) return
      const radii = torch.glow.slice(1).map(() => view.torchRadius)
      // Each candle flickers on its own
      const candle = TORCH_GLOW_ALPHA * (1 + FLICKER_GLOW * 1.5 * Math.sin(time * (8.3 + t) + t * 2.1))
      for (let i = 1; i <= TORCH_FALLOFF_STEPS; i++) {
        g.poly(this.toScreen(this.scaledSight(torch.glow, i / TORCH_FALLOFF_STEPS, radii), project)).fill({ color: GLOW_COLOR, alpha: candle })
      }
    })
  }

  private syncChests(view: HideSeekRenderView, project: MapProject, layersContainer: Container): void {
    const { tileWidth, tileHeight } = project
    while (this.chestSprites.length > view.chests.length) this.chestSprites.pop()?.destroy()
    while (this.chestSprites.length < view.chests.length) this.chestSprites.push(new Sprite())

    this.beaconGraphics.clear()
    const time = performance.now() / 1000

    view.exitBeacons.forEach((exit, i) => {
      const p = gridToScreen(exit.col, exit.row, tileWidth, tileHeight)
      this.drawBeam(p.x, p.y, tileWidth, tileHeight, time + i * 1.3, EXIT_BEAM_COLOR, EXIT_BEAM_CORE_COLOR, 1.6)
    })

    view.chests.forEach((chest, i) => {
      const sprite = this.chestSprites[i]
      if (sprite.parent !== layersContainer) layersContainer.addChild(sprite)
      const assetId = chest.lidOpen ? CHEST_OPEN : CHEST_CLOSED
      const texture = assetManager.getTexture(assetId)
      const asset = assetManager.getAssetItem(assetId)
      sprite.visible = !!texture && chest.visible
      if (texture && sprite.texture !== texture) sprite.texture = texture
      const pos = gridToScreen(chest.col, chest.row, tileWidth, tileHeight)
      sprite.position.set(pos.x, pos.y)
      sprite.anchor.set(asset?.anchorX ?? 0.5, asset?.anchorY ?? 0.88)
      sprite.scale.set(tileWidth / (asset?.width || 256))
      sprite.zIndex = 100000 + Math.round((chest.col + chest.row) * 1000) + 400
      light(sprite, view.lightAt(chest))
      // Chests that may still hold treasure send up a beam of light (hiders see it through the dark)
      if (chest.glow) this.drawBeam(pos.x, pos.y, tileWidth, tileHeight, time + i * 0.7)
      if (!chest.visible) return

      if (chest.lidOpen && chest.hasLoot) this.drawLoot(pos.x, pos.y, tileWidth, time)
      if (chest.lootProgress > 0) this.drawLootProgress(pos.x, pos.y, tileWidth, tileHeight, chest.lootProgress)
    })
  }

  private drawBeam(x: number, y: number, tileWidth: number, tileHeight: number, time: number, color = BEAM_COLOR, core = BEAM_CORE_COLOR, size = 1): void {
    const g = this.beaconGraphics
    const pulse = 0.8 + Math.sin(time * 2.4) * 0.2
    const height = tileHeight * BEAM_HEIGHT * 2 * size
    const base = y - tileHeight * 0.25

    // Ground glow
    for (let i = 3; i >= 1; i--) {
      const rx = tileWidth * 0.16 * i
      g.ellipse(x, y, rx * size, (rx * size * tileHeight) / tileWidth).fill({ color, alpha: 0.1 * pulse })
    }
    // Beam: wide soft layers around a thin bright core, fading out towards the top
    for (const [width, alpha, layer] of [[0.34, 0.08, color], [0.18, 0.14, color], [0.07, 0.4, core]]) {
      const half = tileWidth * width * 0.5 * size
      const steps = 6
      for (let k = 0; k < steps; k++) {
        const y0 = base - (height * k) / steps
        const y1 = base - (height * (k + 1)) / steps
        const w0 = half * (1 - (k / steps) * 0.35)
        const w1 = half * (1 - ((k + 1) / steps) * 0.35)
        g.poly([x - w0, y0, x + w0, y0, x + w1, y1, x - w1, y1]).fill({ color: layer, alpha: alpha * pulse * (1 - k / steps) })
      }
    }
    // Motes drifting up the beam
    for (let m = 0; m < 3; m++) {
      const t = (time * 0.35 + m / 3) % 1
      const mx = x + Math.sin((time + m) * 3) * tileWidth * 0.03
      g.circle(mx, base - height * t, 2.2).fill({ color: core, alpha: 0.8 * (1 - t) })
    }
  }

  /** Looting: a ring around the chest fills up clockwise from the top. */
  private drawLootProgress(x: number, y: number, tileWidth: number, tileHeight: number, progress: number): void {
    const g = this.beaconGraphics
    const rx = tileWidth * 0.36
    const ry = (rx * tileHeight) / tileWidth
    g.ellipse(x, y, rx, ry).stroke({ width: 5, color: 0x000000, alpha: 0.45 })
    const points: number[] = []
    const steps = Math.max(2, Math.ceil(progress * 48))
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * progress * Math.PI * 2
      points.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry)
    }
    g.poly(points, false).stroke({ width: 4, color: BEAM_COLOR, alpha: 0.95, cap: 'round' })
  }

  /** An open chest that still holds the treasure: a golden gem bobbing above the open lid. */
  private drawLoot(x: number, y: number, tileWidth: number, time: number): void {
    const g = this.beaconGraphics
    const cy = y - tileWidth * (0.42 + Math.sin(time * 3) * 0.03)
    const r = tileWidth * (0.09 + Math.sin(time * 6) * 0.008)
    g.circle(x, cy, r * 2.2).fill({ color: BEAM_COLOR, alpha: 0.25 })
    g.poly([x, cy - r, x + r * 0.7, cy, x, cy + r, x - r * 0.7, cy]).fill({ color: 0xfbbf24, alpha: 1 })
    g.poly([x, cy - r * 0.55, x + r * 0.35, cy, x, cy + r * 0.2, x - r * 0.35, cy]).fill({ color: BEAM_CORE_COLOR, alpha: 0.9 })
  }

  /** Barrels / cabinets: drawn in the map layers so walls and characters sort around them. */
  private syncSpots(view: HideSeekRenderView, project: MapProject, layersContainer: Container): void {
    const time = performance.now() / 1000
    this.spotAssets = view.spots.map((spot, i) => spotAsset(spot, i))
    this.syncProps(
      this.spotSprites,
      view.spots.map((spot, i) => ({
        col: spot.col,
        row: spot.row,
        assetId: this.spotAssets[i],
        depth: SPOT_DEPTH,
        level: view.lightAt(spot),
        // The barrel you sit in breathes a little
        wobble: spot.occupied ? Math.sin(time * 2.2) * 0.012 : 0,
      })),
      project,
      layersContainer
    )
  }

  /** Places one pooled sprite per prop in the map layers, sorted by depth and lit like the walls around it. */
  private syncProps(sprites: Sprite[], props: PropView[], project: MapProject, layersContainer: Container): void {
    const { tileWidth, tileHeight } = project
    while (sprites.length > props.length) sprites.pop()?.destroy()
    while (sprites.length < props.length) sprites.push(new Sprite())
    props.forEach((prop, i) => {
      const sprite = sprites[i]
      if (sprite.parent !== layersContainer) layersContainer.addChild(sprite)
      const texture = assetManager.getTexture(prop.assetId)
      const asset = assetManager.getAssetItem(prop.assetId)
      sprite.visible = !!texture
      if (texture && sprite.texture !== texture) sprite.texture = texture
      const pos = gridToScreen(prop.col, prop.row, tileWidth, tileHeight)
      const scale = tileWidth / (asset?.width || 256)
      const wobble = prop.wobble ?? 0
      sprite.position.set(pos.x, pos.y)
      sprite.anchor.set(asset?.anchorX ?? 0.5, asset?.anchorY ?? 0.88)
      sprite.scale.set(scale * (1 + wobble), scale * (1 - wobble))
      sprite.zIndex = 100000 + Math.round((prop.col + prop.row) * 1000) + prop.depth
      light(sprite, prop.level)
    })
    if (sprites === this.doorSprites) {
      // Remember the pieces for the x-ray test
      this.doorPieces = props.map((p, i) => ({ sprite: sprites[i], assetId: p.assetId, col: p.col, row: p.row, suffix: p.assetId.slice(-1) }))
    }
  }

  /** Footprints of running players: little dark soles on the floor, only where there is light to see them. */
  private drawFootprints(view: HideSeekRenderView, project: MapProject): void {
    const g = this.printGraphics
    g.clear()
    const { tileWidth, tileHeight } = project
    for (const print of view.footprints) {
      const level = view.lightAt(print)
      if (level <= 0) continue
      // Screen direction of the step, and the side the foot is on
      const ahead = gridToScreen(Math.cos(print.facing), Math.sin(print.facing), tileWidth, tileHeight)
      const len = Math.hypot(ahead.x, ahead.y) || 1
      const fx = ahead.x / len
      const fy = ahead.y / len
      const side = (print.left ? -1 : 1) * tileWidth * 0.05
      const at = gridToScreen(print.col, print.row, tileWidth, tileHeight)
      const cx = at.x - fy * side
      const cy = at.y + fx * side * 0.5
      const points: number[] = []
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2
        const along = Math.cos(a) * tileWidth * 0.045
        const across = Math.sin(a) * tileWidth * 0.022
        points.push(cx + fx * along - fy * across, cy + fy * along + fx * across * 0.5)
      }
      g.poly(points).fill({ color: PRINT_COLOR, alpha: 0.6 * (1 - print.age) * Math.min(1, level * 2) })
    }
  }

  /** Bell traps, flying stones, noise ripples and the stone aiming line. */
  private drawEffects(view: HideSeekRenderView, project: MapProject): void {
    const g = this.effectsGraphics
    g.clear()
    const { tileWidth, tileHeight } = project
    const at = (p: GridCoord) => gridToScreen(p.col, p.row, tileWidth, tileHeight)
    const time = performance.now() / 1000

    // Candle flames on top of the burning stands
    const candle = assetManager.getAssetItem(CANDLE)
    const flameLift = candle?.contentBounds ? (candle.anchorY * candle.height - candle.contentBounds.minY) * (tileWidth / candle.width) : tileHeight * 0.8
    view.torches.forEach((torch, t) => {
      if (!torch.lit) return
      const p = at(torch)
      const flicker = 1 + 0.15 * Math.sin(time * (11 + t) + t)
      const y = p.y - flameLift - 3
      g.circle(p.x, y, 9 * flicker).fill({ color: FLAME_COLOR, alpha: 0.18 })
      g.ellipse(p.x, y, 3 * flicker, 5 * flicker).fill({ color: FLAME_COLOR, alpha: 0.85 })
      g.ellipse(p.x, y + 1, 1.5, 2.5).fill({ color: FLAME_CORE_COLOR, alpha: 0.95 })
    })

    // The hunt: an arrow around the seeker pointing at the nearest hider
    if (view.huntHint) {
      const from = at(view.huntHint.from)
      const dir = gridToScreen(Math.cos(view.huntHint.angle), Math.sin(view.huntHint.angle), tileWidth, tileHeight)
      const len = Math.hypot(dir.x, dir.y) || 1
      const ux = dir.x / len
      const uy = dir.y / len
      const r = tileWidth * 0.55
      const tip = { x: from.x + ux * (r + 18), y: from.y + uy * (r + 18) - tileHeight * 0.4 }
      const base = { x: from.x + ux * r, y: from.y + uy * r - tileHeight * 0.4 }
      const alpha = Math.min(1, view.huntHint.strength * 1.5)
      g.poly([tip.x, tip.y, base.x - uy * 10, base.y + ux * 10, base.x + uy * 10, base.y - ux * 10]).fill({ color: HUNT_COLOR, alpha: 0.9 * alpha })
      g.circle(tip.x, tip.y, 16).fill({ color: HUNT_COLOR, alpha: 0.15 * alpha })
    }

    for (const trap of view.traps) {
      const p = at(trap)
      const swing = trap.ringing ? Math.sin(time * 30) * 4 : 0
      g.ellipse(p.x, p.y, tileWidth * 0.13, tileHeight * 0.13).fill({ color: 0x000000, alpha: 0.35 })
      // Small bell: dome, rim and clapper
      g.poly([p.x - 7 + swing, p.y - 6, p.x + 7 + swing, p.y - 6, p.x + 4 + swing, p.y - 18, p.x - 4 + swing, p.y - 18]).fill({ color: BELL_COLOR, alpha: 0.95 })
      g.circle(p.x + swing, p.y - 19, 3).fill({ color: BELL_COLOR, alpha: 0.95 })
      g.circle(p.x + swing * 1.4, p.y - 4, 2).fill({ color: 0x78350f, alpha: 1 })
    }

    for (const stone of view.stones) {
      const a = at(stone.from)
      const b = at(stone.to)
      // Arc: up and down over the throw
      const lift = Math.sin(stone.t * Math.PI) * tileHeight * 1.4
      g.circle(a.x + (b.x - a.x) * stone.t, a.y + (b.y - a.y) * stone.t - lift - 20, 4).fill({ color: STONE_COLOR, alpha: 1 })
    }

    for (const ripple of view.ripples) {
      const p = at(ripple)
      const rx = tileWidth * (0.15 + ripple.age * (ripple.kind === 'bell' ? 1.6 : 0.9))
      const color = ripple.kind === 'bell' ? BELL_COLOR : STONE_COLOR
      g.ellipse(p.x, p.y, rx, (rx * tileHeight) / tileWidth).stroke({ width: 3, color, alpha: 0.8 * (1 - ripple.age) })
    }

    if (view.aim) {
      const a = at(view.aim.from)
      const b = at(view.aim.to)
      for (let t = 0.1; t < 1; t += 0.1) {
        const lift = Math.sin(t * Math.PI) * tileHeight * 1.4
        g.circle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - lift - 20 * (1 - t), 2.5).fill({ color: STONE_COLOR, alpha: 0.7 })
      }
      g.ellipse(b.x, b.y, tileWidth * 0.2, tileHeight * 0.2).stroke({ width: 2, color: STONE_COLOR, alpha: 0.9 })
    }
  }

  private syncAvatars(view: HideSeekRenderView, project: MapProject, layersContainer: Container, deltaSec: number): void {
    const seen = new Set<string>()
    for (const avatar of view.avatars) {
      seen.add(avatar.id)
      let node = this.avatars.get(avatar.id)
      if (!node) {
        node = this.createAvatar()
        this.avatars.set(avatar.id, node)
      }
      if (node.container.parent !== layersContainer) layersContainer.addChild(node.container)
      this.updateAvatar(node, avatar, project, deltaSec)
      if (avatar.visible) node.sprite.tint = avatar.jailed ? JAIL_TINT : litTint(avatar.isMe ? 1 : Math.max(MIN_AVATAR_LIGHT, view.lightAt(avatar)))
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
    return { container, ring, sprite, crouch: 0 }
  }

  private updateAvatar(node: AvatarNode, avatar: HideSeekAvatarView, project: MapProject, deltaSec: number): void {
    const { tileWidth, tileHeight } = project
    node.crouch += ((avatar.sneaking ? 1 : 0) - node.crouch) * Math.min(1, deltaSec * CROUCH_EASE)
    node.container.visible = avatar.visible
    if (!avatar.visible) return

    const pos = gridToScreen(avatar.col, avatar.row, tileWidth, tileHeight)
    node.container.position.set(pos.x, pos.y)
    node.container.zIndex = 100000 + Math.round((avatar.col + avatar.row) * 1000) + AVATAR_DEPTH_BIAS

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
      node.sprite.scale.set(scale * (1 + CROUCH_WIDEN * node.crouch), scale * (1 - CROUCH_SQUASH * node.crouch))
      node.sprite.alpha = avatar.hidden ? HIDDEN_SELF_ALPHA : 1 - CROUCH_FADE * node.crouch
      node.sprite.anchor.set(meta?.anchorX ?? 0.5, meta?.anchorY ?? 0.898)
    }

    const color = parseInt(avatar.color.replace('#', ''), 16) || 0x38bdf8
    const rx = tileWidth * 0.22
    const ry = tileHeight * 0.22
    node.ring.clear()
    const ringAlpha = 1 - 0.5 * node.crouch
    node.ring.ellipse(0, 0, rx, ry).fill({ color, alpha: (avatar.isMe ? 0.3 : 0.18) * ringAlpha })
    node.ring.ellipse(0, 0, rx, ry).stroke({ width: 2, color, alpha: 0.9 * ringAlpha })
    // Jail: a ring of chain links around the caught player's feet
    if (avatar.jailed) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        node.ring.ellipse(Math.cos(a) * rx * 1.35, Math.sin(a) * ry * 1.35, 4, 2.5).stroke({ width: 2, color: JAIL_COLOR, alpha: 0.95 })
      }
    }
  }

  public clear(): void {
    for (const node of this.avatars.values()) node.container.destroy({ children: true })
    this.avatars.clear()
    for (const e of this.litEntities) if (!e.sprite.destroyed) Object.assign(e.sprite, { tint: 0xffffff, alpha: 1 })
    this.litEntities = []
    for (const sprite of [...this.chestSprites, ...this.spotSprites, ...this.doorSprites, ...this.exitSprites, ...this.torchSprites]) sprite.destroy()
    this.exitSprites = []
    this.chestSprites = []
    this.spotSprites = []
    this.doorSprites = []
    this.torchSprites = []
    this.doorPieces = []
    this.printGraphics.clear()
    this.effectsGraphics.clear()
    this.nightGraphics.clear()
    this.holeGraphics.clear()
    this.glowGraphics.clear()
    this.xray.visible = false
    this.beaconGraphics.clear()
    this.routeGraphics.clear()
  }

  public destroy(): void {
    this.clear()
    for (const node of [this.night, this.glowGraphics, this.printGraphics, this.xray, this.beaconGraphics, this.routeGraphics, this.effectsGraphics]) {
      if (!node.destroyed) node.destroy({ children: true })
    }
  }
}
