import { Graphics } from 'pixi.js'
import type { BeamConfig, StrikeConfig } from '../../../types/projectile'
import { hex } from './ProjectileShapes'

const TAU = Math.PI * 2
/** Ground strikes (spikes, eruption, fissure) rise in a ring around the target from this share of their size, not on top of it */
const RING_INNER = 0.6

/** Small seeded random so a strike keeps its shape over its frames */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
/** 0 → 1 → 0 over the strike, rising fast */
const swell = (t: number) => Math.min(1, t * 5) * (1 - Math.max(0, (t - 0.55) / 0.45))

function jagged(g: Graphics, x0: number, y0: number, x1: number, y1: number, jitter: number, random: () => number, width: number, color: number, alpha: number): void {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(3, Math.round(d / 14))
  const px = -(y1 - y0) / (d || 1)
  const py = (x1 - x0) / (d || 1)
  g.moveTo(x0, y0)
  for (let i = 1; i < steps; i++) {
    const k = i / steps
    const off = (random() * 2 - 1) * jitter
    g.lineTo(x0 + (x1 - x0) * k + px * off, y0 + (y1 - y0) * k + py * off)
  }
  g.lineTo(x1, y1).stroke({ width, color, alpha })
}

function groundGlow(g: Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
  g.ellipse(x, y, r * 1.4, r * 0.7).fill({ color, alpha: alpha * 0.12 })
  g.ellipse(x, y, r, r * 0.5).fill({ color, alpha: alpha * 0.2 })
  g.ellipse(x, y, r * 0.5, r * 0.25).fill({ color, alpha: alpha * 0.3 })
}

/**
 * Instant strike at (x, y): `t` runs 0 → 1 over its duration, `time` is the clock in seconds for flicker,
 * `seed` keeps its random parts the same every frame.
 */
export function drawStrike(g: Graphics, s: StrikeConfig, x: number, y: number, t: number, time: number, seed: number): void {
  const main = hex(s.color)
  const second = hex(s.color2)
  const core = hex(s.core)
  const r = s.size
  const fade = 1 - t
  const random = seeded(seed)

  switch (s.style) {
    case 'bolt': {
      const flicker = 0.6 + 0.4 * Math.sin(time * 70)
      const flash = seeded(seed + Math.floor(time * 24))
      groundGlow(g, x, y, r, main, fade)
      for (let i = 0; i < Math.max(1, s.count); i++) {
        const sx = x + (random() - 0.5) * r * 1.2
        jagged(g, sx, y - 280, x, y, 16, flash, 9, main, 0.25 * fade * flicker)
        jagged(g, sx, y - 280, x, y, 14, seeded(seed + i + Math.floor(time * 24)), 3, core, fade * flicker)
      }
      g.circle(x, y, r * 0.45 * (0.6 + fade)).fill({ color: core, alpha: 0.7 * fade })
      break
    }
    case 'pillar': {
      const w = r * 0.55 * swell(t)
      groundGlow(g, x, y, r * 1.2, main, swell(t))
      g.rect(x - w * 1.6, y - 320, w * 3.2, 320).fill({ color: main, alpha: 0.15 * fade })
      g.rect(x - w, y - 320, w * 2, 320).fill({ color: main, alpha: 0.4 * fade })
      g.rect(x - w * 0.35, y - 320, w * 0.7, 320).fill({ color: core, alpha: 0.9 * fade })
      for (let i = 0; i < s.count; i++) {
        const py = y - ((time * 260 + random() * 320) % 320)
        g.circle(x + (random() - 0.5) * w * 2, py, 2).fill({ color: core, alpha: fade })
      }
      break
    }
    case 'meteor': {
      const fall = Math.min(1, t / 0.55)
      const mx = x + 140 * (1 - fall)
      const my = y - 280 * (1 - fall)
      if (fall < 1) {
        for (let i = 6; i >= 1; i--) {
          const k = i / 6
          g.circle(mx + 140 * 0.08 * i, my - 280 * 0.08 * i, r * (1 - k * 0.6)).fill({ color: i > 3 ? second : main, alpha: 0.35 * (1 - k) + 0.1 })
        }
        g.circle(mx, my, r * 0.75).fill({ color: main, alpha: 1 })
        g.circle(mx - r * 0.15, my - r * 0.15, r * 0.4).fill({ color: core, alpha: 0.9 })
      } else {
        const k = (t - 0.55) / 0.45
        groundGlow(g, x, y, r * (1.5 + k * 2), main, 1 - k)
        g.ellipse(x, y, r * (1 + k * 3), r * 0.5 * (1 + k * 3)).stroke({ width: 3 * (1 - k), color: core, alpha: 1 - k })
      }
      break
    }
    case 'rain': {
      groundGlow(g, x, y, r, main, fade * 0.7)
      for (let i = 0; i < s.count; i++) {
        const start = random() * 0.45
        const k = Math.min(1, Math.max(0, (t - start) / 0.4))
        if (k <= 0 || k >= 1) continue
        const dx = x + (random() * 2 - 1) * r
        const dy = y + (random() * 2 - 1) * r * 0.5
        const top = dy - 220 * (1 - k)
        g.moveTo(dx + 20 * (1 - k), top - 22).lineTo(dx, top).stroke({ width: 2.4, color: main, alpha: 0.9 })
        g.circle(dx, top, 2.2).fill({ color: core, alpha: 1 })
      }
      break
    }
    case 'spikes': {
      const grow = swell(t)
      groundGlow(g, x, y, r, main, grow)
      for (let i = 0; i < s.count; i++) {
        const a = (i / s.count) * TAU + random() * 0.6
        const d = r * (RING_INNER + random() * (1 - RING_INNER))
        const bx = x + Math.cos(a) * d
        const by = y + Math.sin(a) * d * 0.5
        const h = r * (0.7 + random() * 0.8) * grow
        const w = r * 0.14
        g.poly([bx - w, by, bx + w, by, bx + (random() - 0.5) * w, by - h]).fill({ color: main, alpha: 0.95 }).stroke({ width: 1, color: core, alpha: 0.7 * grow })
      }
      break
    }
    case 'eruption': {
      groundGlow(g, x, y, r, main, fade)
      for (let i = 0; i < s.count * 2; i++) {
        const start = random() * 0.5
        const k = Math.min(1, Math.max(0, (t - start) / 0.5))
        if (k <= 0 || k >= 1) continue
        const h = easeOut(k) * r * (3 + random() * 3)
        const a = (i / (s.count * 2)) * TAU + random() * 0.5
        const d = r * (RING_INNER + random() * 0.3)
        const bx = x + Math.cos(a) * d + Math.sin(k * 6 + i) * 4
        const by = y + Math.sin(a) * d * 0.5
        const size = r * 0.3 * (1 - k * 0.6)
        g.circle(bx, by - h, size * 1.6).fill({ color: second, alpha: 0.3 * (1 - k) })
        g.circle(bx, by - h, size).fill({ color: i % 3 === 0 ? core : main, alpha: 1 - k })
      }
      break
    }
    case 'fissure': {
      const k = easeOut(Math.min(1, t * 2))
      groundGlow(g, x, y, r, main, fade)
      for (let i = 0; i < s.count; i++) {
        const a = (i / s.count) * TAU + random()
        const from = r * RING_INNER
        const len = from + r * (0.5 + random() * 0.7) * k
        const x0 = x + Math.cos(a) * from
        const y0 = y + Math.sin(a) * from * 0.5
        const x1 = x + Math.cos(a) * len
        const y1 = y + Math.sin(a) * len * 0.5
        jagged(g, x0, y0, x1, y1, 4, seeded(seed + i), 4, main, 0.5 * fade)
        jagged(g, x0, y0, x1, y1, 4, seeded(seed + i), 1.5, core, fade)
      }
      break
    }
    case 'portal': {
      const open = swell(t)
      const rx = r * open
      g.ellipse(x, y - r * 0.3, rx, rx * 0.5).fill({ color: 0x050010, alpha: 0.85 * open })
      for (let i = 0; i < s.count; i++) {
        const a = time * 5 + (i / s.count) * TAU
        g.moveTo(x, y - r * 0.3).lineTo(x + Math.cos(a) * rx, y - r * 0.3 + Math.sin(a) * rx * 0.5).stroke({ width: 2, color: second, alpha: 0.5 * open })
      }
      g.ellipse(x, y - r * 0.3, rx, rx * 0.5).stroke({ width: 4, color: main, alpha: open })
      g.ellipse(x, y - r * 0.3, rx * 0.85, rx * 0.42).stroke({ width: 1.5, color: core, alpha: open })
      break
    }
    case 'vortex': {
      const k = swell(t)
      for (let arm = 0; arm < s.count; arm++) {
        let prevX = x
        let prevY = y
        for (let j = 1; j <= 12; j++) {
          const d = (j / 12) * r * 1.3 * k
          const a = time * 8 + (arm / s.count) * TAU + j * 0.45
          const px = x + Math.cos(a) * d
          const py = y + Math.sin(a) * d * 0.5
          g.moveTo(prevX, prevY).lineTo(px, py).stroke({ width: 3 * (1 - j / 14), color: j < 6 ? core : main, alpha: k * (1 - j / 13) })
          prevX = px
          prevY = py
        }
      }
      groundGlow(g, x, y, r * 0.8, second, k)
      break
    }
    case 'nova': {
      const k = easeOut(t)
      const rr = r * (0.3 + k * 1.2)
      g.ellipse(x, y, rr, rr * 0.5).fill({ color: main, alpha: 0.12 * fade })
      g.ellipse(x, y, rr, rr * 0.5).stroke({ width: 6 * fade + 1, color: main, alpha: 0.6 * fade })
      g.ellipse(x, y, rr * 0.75, rr * 0.375).stroke({ width: 2, color: core, alpha: fade })
      for (let i = 0; i < s.count; i++) {
        const a = (i / s.count) * TAU
        g.moveTo(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.3)
          .lineTo(x + Math.cos(a) * rr * 1.15, y + Math.sin(a) * rr * 0.575)
          .stroke({ width: 2, color: second, alpha: fade })
      }
      break
    }
    case 'rune': {
      const k = swell(t)
      const rot = time * 1.6
      groundGlow(g, x, y, r, main, k)
      g.ellipse(x, y, r, r * 0.5).stroke({ width: 2.5, color: main, alpha: k })
      g.ellipse(x, y, r * 0.78, r * 0.39).stroke({ width: 1.2, color: core, alpha: k })
      const n = Math.max(3, s.count)
      const pts: number[] = []
      for (let i = 0; i < n; i++) {
        const a = rot + ((i * 2) % n) / n * TAU
        pts.push(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.39)
      }
      g.poly(pts).stroke({ width: 1.5, color: second, alpha: k })
      for (let i = 0; i < n; i++) {
        const a = -rot + (i / n) * TAU
        g.rect(x + Math.cos(a) * r * 0.9 - 2, y + Math.sin(a) * r * 0.45 - 2, 4, 4).fill({ color: core, alpha: k })
      }
      break
    }
    case 'blades': {
      const k = swell(t)
      for (let i = 0; i < s.count; i++) {
        const a = time * 9 + (i / s.count) * TAU
        const bx = x + Math.cos(a) * r * k
        const by = y - r * 0.2 + Math.sin(a) * r * 0.5 * k
        const tx = Math.cos(a + Math.PI / 2) * r * 0.45
        const ty = Math.sin(a + Math.PI / 2) * r * 0.22
        g.poly([bx - tx, by - ty, bx + tx * 0.2 + Math.cos(a) * 5, by + ty * 0.2 + Math.sin(a) * 3, bx + tx, by + ty]).fill({ color: main, alpha: k }).stroke({ width: 1, color: core, alpha: k })
      }
      groundGlow(g, x, y, r, second, k * 0.7)
      break
    }
  }
}

/** Instant beam from the muzzle (sx, sy) to the target (x, y); `t` runs 0 → 1 over its duration */
export function drawBeam(g: Graphics, b: BeamConfig, sx: number, sy: number, x: number, y: number, t: number, time: number): void {
  const main = hex(b.color)
  const core = hex(b.core)
  const fade = 1 - t
  const w = b.width * (0.4 + 0.6 * fade)
  const d = Math.hypot(x - sx, y - sy) || 1
  const px = -(y - sy) / d
  const py = (x - sx) / d

  switch (b.style) {
    case 'laser':
      g.moveTo(sx, sy).lineTo(x, y).stroke({ width: w * 3.2, color: main, alpha: 0.18 * fade })
      g.moveTo(sx, sy).lineTo(x, y).stroke({ width: w, color: main, alpha: 0.9 * fade })
      g.moveTo(sx, sy).lineTo(x, y).stroke({ width: Math.max(1, w * 0.35), color: core, alpha: fade })
      break
    case 'lightning': {
      const random = seeded(Math.floor(time * 30))
      jagged(g, sx, sy, x, y, b.jitter, random, w * 3, main, 0.3 * fade)
      jagged(g, sx, sy, x, y, b.jitter, seeded(Math.floor(time * 30)), w, core, fade)
      break
    }
    case 'wave': {
      for (const phase of [0, Math.PI]) {
        const steps = Math.max(8, Math.round(d / 8))
        g.moveTo(sx, sy)
        for (let i = 1; i <= steps; i++) {
          const k = i / steps
          const off = Math.sin(k * Math.PI * 6 - time * 18 + phase) * b.jitter * Math.sin(k * Math.PI)
          g.lineTo(sx + (x - sx) * k + px * off, sy + (y - sy) * k + py * off)
        }
        g.stroke({ width: w * 0.6, color: phase === 0 ? main : core, alpha: 0.85 * fade })
      }
      g.moveTo(sx, sy).lineTo(x, y).stroke({ width: w * 2.2, color: main, alpha: 0.12 * fade })
      break
    }
    case 'pulse': {
      g.moveTo(sx, sy).lineTo(x, y).stroke({ width: Math.max(1, w * 0.4), color: main, alpha: 0.6 * fade })
      for (let i = 0; i < 4; i++) {
        const k = (time * 2.5 + i / 4) % 1
        const bx = sx + (x - sx) * k
        const by = sy + (y - sy) * k
        g.circle(bx, by, w * 1.4).fill({ color: main, alpha: 0.3 * fade })
        g.circle(bx, by, w * 0.7).fill({ color: core, alpha: fade })
      }
      break
    }
  }
  g.circle(sx, sy, w * 1.5).fill({ color: main, alpha: 0.5 * fade })
  g.circle(x, y, w * 2).fill({ color: main, alpha: 0.35 * fade })
  g.circle(x, y, w).fill({ color: core, alpha: fade })
}
