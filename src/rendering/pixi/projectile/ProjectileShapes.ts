import { Assets, Graphics, Texture } from 'pixi.js'
import type { BodyLayer, ParticleShape, ProjectileDefinition, TrailConfig } from '../../../types/projectile'
import { assetManager } from '../../../services/assetManager'

const DEG = Math.PI / 180
const TAU = Math.PI * 2

// ==========================================
// Colors
// ==========================================

const colorCache = new Map<string, number>()

export function hex(css: string): number {
  let n = colorCache.get(css)
  if (n === undefined) {
    n = parseInt(css.slice(1), 16) || 0
    colorCache.set(css, n)
  }
  return n
}

export function mixColor(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, t))
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k)
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k)
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k)
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)
}

// ==========================================
// Sprite layers (game assets as projectile bodies)
// ==========================================

const spriteTextures = new Map<string, Texture | null>()

function spriteTexture(assetId: string): Texture | null {
  if (!assetId) return null
  const loaded = assetManager.getTexture(assetId)
  if (loaded) return loaded
  if (!spriteTextures.has(assetId)) {
    spriteTextures.set(assetId, null)
    const src = assetManager.getFullPreviewDataUrl(assetId) || assetManager.getPreviewDataUrl(assetId)
    if (src) Assets.load<Texture>(src).then(tex => spriteTextures.set(assetId, tex)).catch(() => {})
  }
  return spriteTextures.get(assetId) ?? null
}

// ==========================================
// Body shapes (local space: +x points along the flight, r = half width, len = half length)
// ==========================================

function regular(sides: number, r: number, len: number, rot = 0): number[] {
  const pts: number[] = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU
    pts.push(Math.cos(a) * len, Math.sin(a) * r)
  }
  return pts
}

function starPoints(points: number, r: number, len: number, inner: number): number[] {
  const pts: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU - Math.PI / 2
    const k = i % 2 === 0 ? 1 : inner
    pts.push(Math.cos(a) * len * k, Math.sin(a) * r * k)
  }
  return pts
}

/** Round body with a pointed front (teardrop) or a flickering tail behind (flame) */
function dropPoints(r: number, len: number, flame: boolean, time: number): number[] {
  const pts: number[] = []
  const cx = flame ? len - r : -len + r
  const from = flame ? -Math.PI * 0.62 : Math.PI * 0.35
  const to = flame ? Math.PI * 0.62 : Math.PI * 1.65
  for (let i = 0; i <= 12; i++) {
    const a = from + ((to - from) * i) / 12
    pts.push(cx + Math.cos(a) * r, Math.sin(a) * r)
  }
  if (flame) {
    const sway = Math.sin(time * 22) * r * 0.35
    pts.push(-len * 0.35, r * 0.55 + sway * 0.4, -len, sway, -len * 0.35, -r * 0.55 + sway * 0.4)
  } else {
    pts.push(len, 0)
  }
  return pts
}

function crescentPoints(r: number, len: number, inner: number): number[] {
  const pts: number[] = []
  const span = Math.PI * 0.62
  for (let i = 0; i <= 14; i++) {
    const a = -span + (2 * span * i) / 14
    pts.push(Math.cos(a) * len, Math.sin(a) * r)
  }
  const shift = len * (1 - inner) * 1.3
  for (let i = 14; i >= 0; i--) {
    const a = -span + (2 * span * i) / 14
    pts.push(Math.cos(a) * len * 0.95 - shift, Math.sin(a) * r * 0.95)
  }
  return pts
}

function scaled(points: [number, number][], len: number, r: number): number[] {
  return points.flatMap(([x, y]) => [x * len, y * r])
}

const BOLT: [number, number][] = [[1, 0], [0.1, 0.6], [0.25, 0.12], [-1, 0], [-0.1, -0.6], [-0.25, -0.12]]
const BLADE: [number, number][] = [
  [1, 0], [0.6, 0.42], [-0.4, 0.42], [-0.4, 0.95], [-0.55, 0.95], [-0.55, 0.25], [-1, 0.25],
  [-1, -0.25], [-0.55, -0.25], [-0.55, -0.95], [-0.4, -0.95], [-0.4, -0.42], [0.6, -0.42],
]
const ROCKET: [number, number][] = [[1, 0], [0.5, 0.75], [-0.55, 0.75], [-1, 1.5], [-0.85, 0.5], [-0.85, -0.5], [-1, -1.5], [-0.55, -0.75], [0.5, -0.75]]
const DIAMOND: [number, number][] = [[1, 0], [-0.15, 1], [-0.7, 0], [-0.15, -1]]
const FEATHER: [number, number][] = [[1, 0], [0.5, 0.75], [-0.2, 0.9], [-0.8, 0.55], [-1, 0.15], [-1, -0.15], [-0.8, -0.55], [-0.2, -0.9], [0.5, -0.75]]

function fillShape(g: Graphics, layer: BodyLayer, r: number, len: number, color: number, alpha: number, time: number): void {
  const stroke = layer.outlineWidth > 0 ? { width: layer.outlineWidth, color: hex(layer.outlineColor), alpha } : null
  const poly = (pts: number[]) => {
    g.poly(pts).fill({ color, alpha })
    if (stroke) g.poly(pts).stroke(stroke)
  }

  switch (layer.shape) {
    case 'orb':
      g.ellipse(0, 0, len, r).fill({ color, alpha })
      if (stroke) g.ellipse(0, 0, len, r).stroke(stroke)
      break
    case 'ring': {
      const width = Math.max(1, r * (1 - layer.inner))
      g.ellipse(0, 0, len - width / 2, r - width / 2).stroke({ width, color, alpha })
      break
    }
    case 'polygon':
      poly(regular(Math.max(3, layer.sides), r, len))
      break
    case 'star':
      poly(starPoints(Math.max(3, layer.sides), r, len, layer.inner))
      break
    case 'spikes':
      poly(starPoints(Math.max(4, layer.sides), r, len, Math.max(0.45, layer.inner)))
      break
    case 'shuriken':
      poly(starPoints(Math.max(3, layer.sides), r, len, Math.min(0.35, layer.inner)))
      g.circle(0, 0, r * 0.18).fill({ color: 0x0b1120, alpha: alpha * 0.85 })
      break
    case 'diamond':
      poly(scaled(DIAMOND, len, r))
      break
    case 'teardrop':
      poly(dropPoints(r, len, false, time))
      break
    case 'flame':
      poly(dropPoints(r, len, true, time))
      break
    case 'bolt':
      poly(scaled(BOLT, len, r))
      break
    case 'blade':
      poly(scaled(BLADE, len, r))
      break
    case 'rocket':
      poly(scaled(ROCKET, len, r))
      g.circle(len * 0.15, 0, r * 0.38).fill({ color: 0xffffff, alpha: alpha * 0.55 })
      break
    case 'feather':
      poly(scaled(FEATHER, len, r))
      g.moveTo(-len, 0).lineTo(len * 0.9, 0).stroke({ width: Math.max(0.6, r * 0.12), color: 0xffffff, alpha: alpha * 0.45 })
      break
    case 'crescent':
      poly(crescentPoints(r, len, layer.inner))
      break
    case 'cross': {
      const w = Math.max(1, r * Math.max(0.15, layer.inner) * 0.7)
      g.rect(-len, -w, len * 2, w * 2).fill({ color, alpha })
      g.rect(-w, -r, w * 2, r * 2).fill({ color, alpha })
      break
    }
    case 'arrow': {
      const shaft = Math.max(0.8, r * 0.22)
      g.rect(-len, -shaft, len * 1.6, shaft * 2).fill({ color, alpha })
      poly([len, 0, len * 0.55, r, len * 0.55, -r])
      g.poly([-len * 0.95, 0, -len * 0.62, 0, -len * 1.08, r]).fill({ color, alpha: alpha * 0.9 })
      g.poly([-len * 0.95, 0, -len * 0.62, 0, -len * 1.08, -r]).fill({ color, alpha: alpha * 0.9 })
      break
    }
    case 'skull':
      g.circle(0, -r * 0.15, r).fill({ color, alpha })
      g.roundRect(-r * 0.55, r * 0.45, r * 1.1, r * 0.6, r * 0.2).fill({ color, alpha })
      g.circle(-r * 0.38, -r * 0.1, r * 0.27).fill({ color: 0x0b1120, alpha: alpha * 0.9 })
      g.circle(r * 0.38, -r * 0.1, r * 0.27).fill({ color: 0x0b1120, alpha: alpha * 0.9 })
      g.poly([0, r * 0.2, -r * 0.12, r * 0.42, r * 0.12, r * 0.42]).fill({ color: 0x0b1120, alpha: alpha * 0.8 })
      break
    case 'sprite': {
      const tex = spriteTexture(layer.assetId)
      if (tex && tex.width > 0) {
        const h = r * 2
        const w = (tex.width / tex.height) * h * layer.stretch
        g.texture(tex, 0xffffff, -w / 2, -h / 2, w, h)
      } else {
        g.ellipse(0, 0, len, r).fill({ color, alpha: alpha * 0.6 })
      }
      break
    }
  }
}

/** Draws one body layer at (x, y) flying at `angle`; `fade` dims it (afterimages) */
export function drawLayer(g: Graphics, layer: BodyLayer, x: number, y: number, angle: number, time: number, fade = 1): void {
  const alpha = layer.alpha * fade
  if (alpha <= 0.01) return
  const pulse = layer.pulse > 0 ? 1 + layer.pulse * Math.sin(time * layer.pulseSpeed * TAU) : 1
  const r = layer.size * pulse
  const len = r * layer.stretch
  const color = hex(layer.color)
  const baseX = x + Math.cos(angle) * layer.offset
  const baseY = y + Math.sin(angle) * layer.offset
  const copies = Math.max(1, layer.copies)

  for (let c = 0; c < copies; c++) {
    let px = baseX
    let py = baseY
    let rot = (layer.faceFlight ? angle : 0) + layer.rotation * DEG + layer.spin * DEG * time
    if (layer.orbit > 0) {
      const a = time * layer.orbitSpeed * TAU + (c / copies) * TAU
      px += Math.cos(a) * layer.orbit
      py += Math.sin(a) * layer.orbit * 0.55
    } else if (copies > 1) {
      rot += (c / copies) * TAU
    }

    if (layer.glow > 0) {
      const gr = Math.max(r, len)
      g.circle(px, py, gr * 2.6).fill({ color, alpha: 0.05 * layer.glow * fade })
      g.circle(px, py, gr * 1.8).fill({ color, alpha: 0.09 * layer.glow * fade })
      g.circle(px, py, gr * 1.3).fill({ color, alpha: 0.14 * layer.glow * fade })
    }

    g.save()
    g.translateTransform(px, py)
    g.rotateTransform(rot)
    fillShape(g, layer, r, len, color, alpha, time)
    g.restore()
  }
}

export function drawBody(g: Graphics, def: ProjectileDefinition, x: number, y: number, angle: number, time: number, fade = 1): void {
  for (const layer of def.body) drawLayer(g, layer, x, y, angle, time, fade)
}

// ==========================================
// Particles
// ==========================================

export function drawParticle(g: Graphics, shape: ParticleShape, x: number, y: number, size: number, rot: number, color: number, alpha: number, vx: number, vy: number): void {
  if (size <= 0.05 || alpha <= 0.01) return
  switch (shape) {
    case 'square': {
      const c = Math.cos(rot) * size
      const s = Math.sin(rot) * size
      g.poly([x + c - s, y + s + c, x - c - s, y - s + c, x - c + s, y - s - c, x + c + s, y + s - c]).fill({ color, alpha })
      break
    }
    case 'star':
    case 'cross': {
      const c = Math.cos(rot) * size * 1.4
      const s = Math.sin(rot) * size * 1.4
      const w = shape === 'star' ? Math.max(0.8, size * 0.45) : Math.max(1, size * 0.6)
      g.moveTo(x - c, y - s).lineTo(x + c, y + s).stroke({ width: w, color, alpha })
      g.moveTo(x + s, y - c).lineTo(x - s, y + c).stroke({ width: w, color, alpha })
      if (shape === 'star') g.circle(x, y, size * 0.45).fill({ color: 0xffffff, alpha })
      break
    }
    case 'spark': {
      const speed = Math.hypot(vx, vy) || 1
      const l = size * 2.4 + speed * 0.025
      g.moveTo(x, y).lineTo(x - (vx / speed) * l, y - (vy / speed) * l).stroke({ width: Math.max(0.8, size * 0.6), color, alpha })
      break
    }
    case 'ember':
      g.circle(x, y, size * 1.8).fill({ color, alpha: alpha * 0.25 })
      g.circle(x, y, size).fill({ color, alpha })
      g.circle(x, y, size * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.8 })
      break
    case 'shard': {
      const c = Math.cos(rot) * size
      const s = Math.sin(rot) * size
      g.poly([x + c * 1.6, y + s * 1.6, x - s * 0.55, y + c * 0.55, x - c * 1.6, y - s * 1.6, x + s * 0.55, y - c * 0.55]).fill({ color, alpha })
      break
    }
    case 'ring':
      g.circle(x, y, size).stroke({ width: Math.max(0.6, size * 0.3), color, alpha })
      break
    case 'smoke':
      g.circle(x, y, size).fill({ color, alpha: alpha * 0.35 })
      g.circle(x, y, size * 0.6).fill({ color, alpha: alpha * 0.35 })
      break
    case 'leaf': {
      const c = Math.cos(rot)
      const s = Math.sin(rot)
      const l = size * 1.4
      const w = size * 0.6
      g.poly([x + c * l, y + s * l, x - s * w, y + c * w, x - c * l, y - s * l, x + s * w, y - c * w]).fill({ color, alpha })
      break
    }
    case 'bubble':
      g.circle(x, y, size).fill({ color, alpha: alpha * 0.35 }).stroke({ width: 0.8, color, alpha })
      g.circle(x - size * 0.35, y - size * 0.35, size * 0.25).fill({ color: 0xffffff, alpha: alpha * 0.8 })
      break
    default:
      g.circle(x, y, size).fill({ color, alpha })
  }
}

// ==========================================
// Trails
// ==========================================

export interface TrailPoint {
  x: number
  y: number
  angle: number
}

/** Draws a trail through `points` (oldest first, the head last) */
export function drawTrail(g: Graphics, def: ProjectileDefinition, points: TrailPoint[], time: number): void {
  const t: TrailConfig = def.trail
  const n = points.length
  if (t.style === 'none' || n < 2) return
  const head = hex(t.color)
  const tail = hex(t.colorEnd)

  if (t.style === 'ghost') {
    for (let i = n - 2; i >= 0; i -= 2) {
      const k = (i + 1) / n
      drawBody(g, def, points[i].x, points[i].y, points[i].angle, time, k * t.alpha * 0.45)
    }
    return
  }
  if (t.style === 'dots') {
    for (let i = 0; i < n - 1; i++) {
      const k = (i + 1) / n
      g.circle(points[i].x, points[i].y, Math.max(0.6, (t.width / 2) * k)).fill({ color: mixColor(tail, head, k), alpha: t.alpha * k })
    }
    return
  }

  for (let i = 0; i < n - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const k0 = i / (n - 1)
    const k1 = (i + 1) / (n - 1)
    const color = mixColor(tail, head, k1)
    const alpha = t.alpha * k1

    if (t.style === 'ribbon') {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const px = -dy / d
      const py = dx / d
      const w0 = (t.width / 2) * k0
      const w1 = (t.width / 2) * k1
      g.poly([a.x + px * w0, a.y + py * w0, b.x + px * w1, b.y + py * w1, b.x - px * w1, b.y - py * w1, a.x - px * w0, a.y - py * w0]).fill({ color, alpha })
      if (k1 > 0.4) g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: Math.max(0.6, w1 * 0.6), color: 0xffffff, alpha: alpha * 0.35 })
    } else if (t.style === 'line') {
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: Math.max(0.6, t.width * k1), color, alpha })
    } else if (t.style === 'zigzag') {
      const j0 = i === 0 ? 0 : Math.sin(time * 40 + i * 2.3) * t.width * 0.9
      const j1 = Math.sin(time * 40 + (i + 1) * 2.3) * t.width * 0.9 * (i + 1 === n - 1 ? 0 : 1)
      const ang = a.angle + Math.PI / 2
      g.moveTo(a.x + Math.cos(ang) * j0, a.y + Math.sin(ang) * j0)
        .lineTo(b.x + Math.cos(ang) * j1, b.y + Math.sin(ang) * j1)
        .stroke({ width: Math.max(0.8, t.width * 0.35 * (0.5 + k1)), color, alpha })
    } else {
      for (const side of [-1, 1]) {
        const ang = a.angle + Math.PI / 2
        const o0 = Math.sin(time * 9 + i * 0.7) * t.width * 0.6 * side * k0
        const o1 = Math.sin(time * 9 + (i + 1) * 0.7) * t.width * 0.6 * side * k1
        g.moveTo(a.x + Math.cos(ang) * o0, a.y + Math.sin(ang) * o0)
          .lineTo(b.x + Math.cos(ang) * o1, b.y + Math.sin(ang) * o1)
          .stroke({ width: Math.max(0.6, t.width * 0.25 * (0.4 + k1)), color, alpha })
      }
    }
  }
}
