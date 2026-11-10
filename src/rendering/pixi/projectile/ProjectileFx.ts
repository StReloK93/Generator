import { Graphics } from 'pixi.js'
import type { ParticleConfig, ParticleShape, ProjectileDefinition } from '../../../types/projectile'
import { flightOffset } from '../../../domain/projectile'
import { drawBody, drawParticle, drawTrail, hex, mixColor, type TrailPoint } from './ProjectileShapes'
import { drawBeam, drawStrike } from './ProjectileStrikes'

const DEG = Math.PI / 180
const MAX_PARTICLES = 900

/** One flying projectile as the simulation reports it this frame (its straight homing path) */
export interface FlyingShot {
  id: string
  def: ProjectileDefinition
  /** Current point on the straight path to the target */
  x: number
  y: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  traveled: number
  total: number
  offsetPerp?: number
  phaseOffset?: number
}

interface Flight {
  trail: TrailPoint[]
  angle: number
  lastX: number
  lastY: number
  emitDebt: number
  seen: boolean
}

interface Particle {
  shape: ParticleShape
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  sizeEnd: number
  colorStart: number
  colorEnd: number
  alpha: number
  gravity: number
  drag: number
  rot: number
  spin: number
}

interface TimedEffect {
  def: ProjectileDefinition
  x: number
  y: number
  startX: number
  startY: number
  age: number
  duration: number
  seed: number
}

interface Ring {
  x: number
  y: number
  color: number
  radius: number
  width: number
  age: number
  delay: number
}

interface Decal {
  x: number
  y: number
  color: number
  radius: number
  age: number
  life: number
}

const RING_LIFE = 0.45
const FLASH_LIFE = 0.2

/**
 * Projectile visuals on one Graphics: bodies, trails, flight particles, impacts, strikes and beams.
 * Pure rendering: it only draws what it is told (the game's combat, or a preview's tiny loop).
 * Each frame: beginFrame → drawFlying for every shot → endFrame.
 */
export class ProjectileFx {
  private flights = new Map<string, Flight>()
  private particles: Particle[] = []
  private strikes: TimedEffect[] = []
  private flashes: { x: number; y: number; color: number; size: number; age: number }[] = []
  private rings: Ring[] = []
  private decals: Decal[] = []
  private time = 0
  private dt = 0

  constructor(private readonly g: Graphics) {}

  /** Advances the clock and draws what lies on the ground (scorch marks) under everything else */
  public beginFrame(dt: number): void {
    this.dt = Math.min(0.1, Math.max(0, dt))
    this.time += this.dt
    for (const f of this.flights.values()) f.seen = false

    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]
      d.age += this.dt
      if (d.age >= d.life) {
        this.decals.splice(i, 1)
        continue
      }
      const k = 1 - d.age / d.life
      this.g.ellipse(d.x, d.y, d.radius, d.radius * 0.5).fill({ color: d.color, alpha: 0.35 * k })
      this.g.ellipse(d.x, d.y, d.radius * 0.6, d.radius * 0.3).fill({ color: d.color, alpha: 0.3 * k })
    }
  }

  /** Draws a flying projectile: shadow, trail, shed particles and its body */
  public drawFlying(shot: FlyingShot): void {
    const { def } = shot
    // A staggered volley's later projectiles wait at the muzzle before they set off
    if (shot.traveled < 0) return
    const total = Math.max(1, shot.total)
    const progress = Math.min(1, Math.max(0, shot.traveled / total))
    const { side, lift } = flightOffset(def, progress, total, shot.offsetPerp ?? 0, shot.phaseOffset ?? 0)
    const dx = shot.targetX - shot.startX
    const dy = shot.targetY - shot.startY
    const d = Math.hypot(dx, dy) || 1
    const groundX = shot.x + (-dy / d) * side
    const groundY = shot.y + (dx / d) * side * 0.5
    const x = groundX
    const y = groundY - lift

    let f = this.flights.get(shot.id)
    if (!f) {
      f = { trail: [], angle: Math.atan2(dy, dx), lastX: x, lastY: y, emitDebt: 0, seen: true }
      this.flights.set(shot.id, f)
    }
    f.seen = true
    const mx = x - f.lastX
    const my = y - f.lastY
    if (mx * mx + my * my > 0.25) f.angle = Math.atan2(my, mx)
    f.lastX = x
    f.lastY = y

    if (def.motion.shadow) {
      const s = Math.max(4, (def.body[0]?.size ?? 6) * 0.8)
      this.g.ellipse(groundX, groundY + 4, s, s * 0.45).fill({ color: 0x000000, alpha: 0.22 / (1 + lift / 60) })
    }

    f.trail.push({ x, y, angle: f.angle })
    while (f.trail.length > def.trail.length) f.trail.shift()
    drawTrail(this.g, def, f.trail, this.time)

    const e = def.emitter
    if (e.amount > 0 && this.dt > 0) {
      f.emitDebt += e.amount * this.dt
      while (f.emitDebt >= 1) {
        f.emitDebt -= 1
        this.spawnParticle(e, x, y, f.angle + Math.PI)
      }
    }

    drawBody(this.g, def, x, y, f.angle, this.time)
  }

  /** Hit visuals: flash, rings, particle burst and a ground mark */
  public impact(def: ProjectileDefinition, x: number, y: number): void {
    const im = def.impact
    if (im.flashSize > 0) this.flashes.push({ x, y, color: hex(im.flashColor), size: im.flashSize, age: 0 })
    for (let i = 0; i < im.ringCount; i++) {
      this.rings.push({ x, y, color: hex(im.ringColor), radius: im.ringRadius * (1 - i * 0.25), width: im.ringWidth, age: 0, delay: i * 0.08 })
    }
    for (let i = 0; i < im.burst.amount; i++) this.spawnParticle(im.burst, x, y, -Math.PI / 2)
    if (im.decalRadius > 0) this.decals.push({ x, y, color: hex(im.decalColor), radius: im.decalRadius, age: 0, life: im.decalLife })
  }

  /** An instant beam (from the muzzle) or strike (at the target) */
  public strike(def: ProjectileDefinition, startX: number, startY: number, x: number, y: number): void {
    const duration = def.behavior === 'beam' ? def.beam.duration : def.strike.duration
    this.strikes.push({ def, x, y, startX, startY, age: 0, duration, seed: Math.floor(Math.random() * 1e9) })
  }

  /** Forgets flights that were not drawn this frame and draws particles, strikes, rings and flashes on top */
  public endFrame(): void {
    for (const [id, f] of this.flights) if (!f.seen) this.flights.delete(id)
    const g = this.g
    const dt = this.dt

    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]
      s.age += dt
      if (s.age >= s.duration) {
        this.strikes.splice(i, 1)
        continue
      }
      const t = s.age / s.duration
      if (s.def.behavior === 'beam') drawBeam(g, s.def.beam, s.startX, s.startY, s.x, s.y, t, this.time)
      else drawStrike(g, s.def.strike, s.x, s.y, t, this.time, s.seed)
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      const damp = Math.max(0, 1 - p.drag * dt)
      p.vx *= damp
      p.vy = p.vy * damp + p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      const k = 1 - p.life / p.maxLife
      const size = p.size + (p.sizeEnd - p.size) * k
      drawParticle(g, p.shape, p.x, p.y, size, p.rot, mixColor(p.colorStart, p.colorEnd, k), p.alpha * (1 - k * k), p.vx, p.vy)
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]
      r.age += dt
      const a = r.age - r.delay
      if (a >= RING_LIFE) {
        this.rings.splice(i, 1)
        continue
      }
      if (a < 0) continue
      const k = a / RING_LIFE
      const rad = r.radius * (1 - Math.pow(1 - k, 3))
      g.ellipse(r.x, r.y, rad, rad * 0.5).stroke({ width: r.width * 3 * (1 - k), color: r.color, alpha: 0.25 * (1 - k) })
      g.ellipse(r.x, r.y, rad, rad * 0.5).stroke({ width: r.width, color: r.color, alpha: 0.9 * (1 - k) })
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i]
      fl.age += dt
      if (fl.age >= FLASH_LIFE) {
        this.flashes.splice(i, 1)
        continue
      }
      const k = 1 - fl.age / FLASH_LIFE
      const r = fl.size * (0.5 + (1 - k) * 0.8)
      g.circle(fl.x, fl.y, r * 1.7).fill({ color: fl.color, alpha: 0.15 * k })
      g.circle(fl.x, fl.y, r).fill({ color: fl.color, alpha: 0.4 * k })
      g.circle(fl.x, fl.y, r * 0.4).fill({ color: 0xffffff, alpha: 0.9 * k })
    }
  }

  public get isIdle(): boolean {
    return this.flights.size === 0 && this.particles.length === 0 && this.strikes.length === 0 &&
      this.rings.length === 0 && this.flashes.length === 0 && this.decals.length === 0
  }

  public clear(): void {
    this.flights.clear()
    this.particles.length = 0
    this.strikes.length = 0
    this.rings.length = 0
    this.flashes.length = 0
    this.decals.length = 0
  }

  private spawnParticle(c: ParticleConfig, x: number, y: number, direction: number): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift()
    const half = (c.spread * DEG) / 2
    const a = c.spread >= 360 ? Math.random() * Math.PI * 2 : direction + (Math.random() * 2 - 1) * half
    const speed = c.speed * (0.45 + Math.random() * 0.75)
    const life = c.life * (0.7 + Math.random() * 0.5)
    this.particles.push({
      shape: c.shape,
      x: x + (Math.random() - 0.5) * 3,
      y: y + (Math.random() - 0.5) * 3,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed * 0.65,
      life,
      maxLife: life,
      size: c.size * (0.7 + Math.random() * 0.6),
      sizeEnd: c.sizeEnd,
      colorStart: hex(c.color),
      colorEnd: hex(c.colorEnd),
      alpha: c.alpha,
      gravity: c.gravity,
      drag: c.drag,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
    })
  }
}
