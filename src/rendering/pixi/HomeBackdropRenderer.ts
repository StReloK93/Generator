import { Application, Container, Sprite, Texture, type Ticker } from 'pixi.js'

/** Embers rise in the colors of the clans on the horizon: mostly fire gold, some blood red, some frost blue */
const EMBER_COLORS = [0xf5c04a, 0xf5c04a, 0xe9a23b, 0xffd98a, 0xf08a3c, 0xe11d48, 0x7dd3fc]
const RAY_COLOR = 0xf3c766
const FOG_COLOR = 0x8a5418
/** One ember per this many square pixels of screen (fewer on phones), within the bounds below */
const EMBER_AREA = 9000
const MIN_EMBERS = 28
const MAX_EMBERS = 140
const RAY_COUNT = 5
const FOG_COUNT = 3

interface Ember {
  sprite: Sprite
  x: number
  y: number
  speed: number
  sway: number
  swayFreq: number
  phase: number
  age: number
  life: number
  size: number
  twinkle: number
}

interface Ray {
  sprite: Sprite
  angle: number
  swing: number
  phase: number
  alpha: number
}

interface Fog {
  sprite: Sprite
  speed: number
  phase: number
  height: number
}

/**
 * The home page's living background: embers rising from the horizon, soft light rays from above and slow warm fog.
 * Owns its own Pixi application inside `host`; with reduced motion it draws one still frame.
 */
export class HomeBackdropRenderer {
  private readonly app = new Application()
  private readonly embers: Ember[] = []
  private readonly rays: Ray[] = []
  private readonly fogs: Fog[] = []
  private readonly layer = new Container()
  private glow!: Texture
  private ray!: Texture
  private time = 0
  private destroyed = false
  private ready = false

  constructor(private readonly host: HTMLElement) {}

  public async start(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      preference: 'webgl',
    })
    // Unmounted while starting
    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }
    this.ready = true
    this.app.canvas.style.position = 'absolute'
    this.app.canvas.style.inset = '0'
    this.host.appendChild(this.app.canvas)

    this.glow = Texture.from(glowCanvas())
    this.ray = Texture.from(rayCanvas())
    this.app.stage.addChild(this.layer)
    this.build()
    this.app.renderer.on('resize', () => this.build())

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.update(0)
      this.app.render()
      this.app.ticker.stop()
    } else {
      this.app.ticker.add(this.onTick)
    }
  }

  public destroy(): void {
    this.destroyed = true
    if (!this.ready) return
    this.app.ticker.remove(this.onTick)
    this.app.destroy(true, { children: true })
    this.glow.destroy(true)
    this.ray.destroy(true)
  }

  private onTick = (ticker: Ticker) => this.update(Math.min(ticker.deltaMS / 1000, 0.1))

  /** (Re)creates everything for the current screen size */
  private build(): void {
    const { width, height } = this.app.screen
    this.layer.removeChildren().forEach(child => child.destroy())
    this.embers.length = 0
    this.rays.length = 0
    this.fogs.length = 0

    for (let i = 0; i < RAY_COUNT; i++) {
      const sprite = new Sprite({ texture: this.ray, anchor: { x: 0.5, y: 0 }, blendMode: 'add', tint: RAY_COLOR })
      sprite.position.set(width * (0.5 + (i - (RAY_COUNT - 1) / 2) * 0.07), -height * 0.08)
      sprite.width = width * (0.1 + Math.random() * 0.08)
      sprite.height = height * 1.25
      this.layer.addChild(sprite)
      this.rays.push({
        sprite,
        angle: (i - (RAY_COUNT - 1) / 2) * 0.22,
        swing: 0.04 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.05 + Math.random() * 0.05,
      })
    }

    for (let i = 0; i < FOG_COUNT; i++) {
      const sprite = new Sprite({ texture: this.glow, anchor: 0.5, blendMode: 'add', tint: FOG_COLOR })
      sprite.width = width * (0.55 + Math.random() * 0.3)
      sprite.height = height * (0.35 + Math.random() * 0.15)
      sprite.position.set(Math.random() * width, height * (0.62 + Math.random() * 0.25))
      sprite.alpha = 0.1 + Math.random() * 0.06
      this.layer.addChild(sprite)
      this.fogs.push({ sprite, speed: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8), phase: Math.random() * 10, height: sprite.height })
    }

    const count = Math.max(MIN_EMBERS, Math.min(MAX_EMBERS, Math.round((width * height) / EMBER_AREA)))
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite({ texture: this.glow, anchor: 0.5, blendMode: 'add' })
      this.layer.addChild(sprite)
      const ember = { sprite } as Ember
      this.respawn(ember, true)
      this.embers.push(ember)
    }
  }

  /** A new ember low on the screen (at start: anywhere, already part way through its life) */
  private respawn(ember: Ember, anywhere: boolean): void {
    const { width, height } = this.app.screen
    ember.x = Math.random() * width
    ember.y = anywhere ? height * (0.15 + Math.random() * 0.85) : height * (0.75 + Math.random() * 0.3)
    ember.speed = 14 + Math.random() * 34
    ember.sway = 6 + Math.random() * 22
    ember.swayFreq = 0.3 + Math.random() * 0.8
    ember.phase = Math.random() * Math.PI * 2
    ember.life = 5 + Math.random() * 7
    ember.age = anywhere ? Math.random() * ember.life : 0
    ember.size = 2.5 + Math.random() * Math.random() * 9
    ember.twinkle = 2 + Math.random() * 5
    ember.sprite.tint = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)]
  }

  private update(dt: number): void {
    this.time += dt
    const t = this.time
    const { width } = this.app.screen

    for (const ray of this.rays) {
      ray.sprite.rotation = ray.angle + Math.sin(t * 0.12 + ray.phase) * ray.swing
      ray.sprite.alpha = ray.alpha * (0.65 + 0.35 * Math.sin(t * 0.35 + ray.phase))
    }

    for (const fog of this.fogs) {
      const s = fog.sprite
      s.x += fog.speed * dt
      const half = s.width / 2
      if (s.x - half > width) s.x = -half
      else if (s.x + half < 0) s.x = width + half
      s.height = fog.height * (1 + Math.sin(t * 0.2 + fog.phase) * 0.08)
    }

    for (const e of this.embers) {
      e.age += dt
      if (e.age >= e.life) this.respawn(e, false)
      e.y -= e.speed * dt
      const progress = e.age / e.life
      // Fades in, glows, fades out; flickers a little like a spark
      const fade = Math.min(1, progress * 5, (1 - progress) * 2.5)
      const flicker = 0.75 + 0.25 * Math.sin(t * e.twinkle + e.phase)
      e.sprite.position.set(e.x + Math.sin(t * e.swayFreq + e.phase) * e.sway, e.y)
      e.sprite.alpha = fade * flicker
      e.sprite.scale.set((e.size / 32) * (0.8 + 0.2 * flicker))
    }
  }
}

/** A soft round glow (white, tinted per sprite) */
function glowCanvas(): HTMLCanvasElement {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return canvas
}

/** A light ray: bright at the top, fading down and to both sides */
function rayCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const down = ctx.createLinearGradient(0, 0, 0, canvas.height)
  down.addColorStop(0, 'rgba(255,255,255,1)')
  down.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = down
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const sides = ctx.createLinearGradient(0, 0, canvas.width, 0)
  sides.addColorStop(0, 'rgba(255,255,255,0)')
  sides.addColorStop(0.5, 'rgba(255,255,255,1)')
  sides.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = sides
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}
