import { Graphics } from 'pixi.js'
import { ProjectileDefinition } from '../../types/projectile'

/**
 * Unified ProjectileRenderer (Pure PixiJS 8)
 * Single Source of Truth for rendering projectiles across Editor Preview, Tower Preview, TD Settings, and Game runtime.
 */
export class ProjectileRenderer {
  /**
   * Renders the projectile visual head/body onto a PixiJS Graphics context
   */
  public static renderHead(
    g: Graphics,
    def: ProjectileDefinition,
    renderX: number,
    renderY: number,
    angle: number,
    startX: number,
    startY: number,
    timeMs: number
  ): void {
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    const perpX = -sinA
    const perpY = cosA

    const visual = def.visual
    const size = visual.size ?? 10
    const scale = (visual.scale || 1.0) * Math.max(0.3, size / 10)
    const shape = visual.shape || 'circle'
    const colHex = visual.colorHex || 0xf97316
    const glowColHex = visual.glowColorHex || colHex
    const coreColHex = visual.coreColorHex || 0xffffff
    const alpha = visual.alpha ?? 1.0

    // 1. LASERS / BEAMS
    if (def.movement.isLaser || def.formation.type === 'laser_beam') {
      this.drawLaser(g, startX, startY, renderX, renderY, scale, timeMs, colHex, glowColHex, coreColHex, def.trail.width || 4)
      return
    }

    // 2. PROCEDURAL FLAME COMET
    if (shape === 'procedural_flame') {
      this.drawFlame(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, timeMs, size, colHex, glowColHex, coreColHex)
    }
    // 3. FLAME ROCKET / MISSILE
    else if (shape === 'rocket') {
      this.drawRocket(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, timeMs, visual.length ?? 28, colHex, glowColHex, coreColHex)
    }
    // 4. ARROW
    else if (shape === 'arrow') {
      const len = visual.length ?? 24
      this.drawArrow(g, renderX, renderY, cosA, sinA, len, 0x92400e, colHex, 0x475569, scale)
    }
    // 5. DIAMOND SHARD
    else if (shape === 'diamond_shard') {
      this.drawDiamondShard(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, colHex, glowColHex, coreColHex)
    }
    // 6. STAR
    else if (shape === 'star') {
      const rot = timeMs * 0.001 * 0.8
      const pts = visual.points ?? 4
      this.drawStar(g, renderX, renderY, pts, 16.0 * scale, 5.5 * scale, rot, colHex, alpha)
      this.drawStar(g, renderX, renderY, pts, 10.0 * scale, 3.5 * scale, rot + Math.PI / pts, coreColHex, 1.0)
      g.circle(renderX, renderY, 3.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    }
    // 7. LINE STREAK
    else if (shape === 'line_streak') {
      this.drawLineStreak(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, timeMs, visual.length ?? 34, size, colHex, glowColHex, coreColHex)
    }
    // 8. SAND CLUSTER
    else if (shape === 'sand_cluster') {
      this.drawSandCluster(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, timeMs, visual.length ?? 34, size, colHex, glowColHex, coreColHex)
    }
    // 9. INSTANT STRIKE (Sky Strike / Ground Burst / Unit Aura)
    else if (shape === 'instant_strike' || def.movement.isInstant) {
      this.drawInstantStrike(g, renderX, renderY, scale, timeMs, size, def.movement.instantType || 'sky_strike', colHex, glowColHex, coreColHex, shape)
    }
    // 10. ENERGY ORB
    else if (shape === 'energy_orb') {
      const r = 8.0 * scale
      g.circle(renderX, renderY, r * 1.35).fill({ color: glowColHex, alpha: 0.35 * alpha })
      g.circle(renderX, renderY, r).fill({ color: colHex, alpha: 0.95 * alpha }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 0.9 })
      g.circle(renderX, renderY, r * 0.45).fill({ color: coreColHex, alpha: 1.0 })
      g.circle(renderX, renderY, r * 0.2).fill({ color: 0xffffff, alpha: 1.0 })
    }
    // 11. ENERGY WAVE / CRESCENT
    else if (shape === 'energy_wave') {
      const wLen = (size ?? 12) * 1.2 * scale
      const tipX = renderX + cosA * 4 * scale
      const tipY = renderY + sinA * 4 * scale
      g.poly([
        { x: tipX + perpX * wLen, y: tipY + perpY * wLen },
        { x: tipX + cosA * 8 * scale, y: tipY + sinA * 8 * scale },
        { x: tipX - perpX * wLen, y: tipY - perpY * wLen },
        { x: tipX - cosA * 4 * scale, y: tipY - sinA * 4 * scale },
      ]).fill({ color: colHex, alpha: 0.95 * alpha }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 1.0 })
    }
    // 12. SHURIKEN
    else if (shape === 'shuriken') {
      const rot = timeMs * 0.001 * 2.5
      this.drawStar(g, renderX, renderY, 4, 14.0 * scale, 3.5 * scale, rot, colHex, 1.0)
      g.circle(renderX, renderY, 4.0 * scale).fill({ color: 0x0f172a, alpha: 1.0 }).stroke({ width: 1.2 * scale, color: coreColHex, alpha: 1.0 })
      g.circle(renderX, renderY, 1.8 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    }
    // 13. SAWBLADE
    else if (shape === 'sawblade') {
      const rot = timeMs * 0.001 * 3.0
      g.circle(renderX, renderY, 14.0 * scale).fill({ color: 0x475569, alpha: 0.95 }).stroke({ width: 2.0 * scale, color: 0x1e293b, alpha: 1.0 })
      this.drawStar(g, renderX, renderY, 10, 16.5 * scale, 10.5 * scale, rot, colHex, 1.0)
      g.circle(renderX, renderY, 6.0 * scale).fill({ color: 0x0f172a, alpha: 1.0 }).stroke({ width: 1.5 * scale, color: coreColHex, alpha: 1.0 })
      g.circle(renderX, renderY, 2.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    }
    // 14. LIGHTNING BOLT
    else if (shape === 'lightning_bolt') {
      const len = (visual.length ?? 24) * scale
      const p1 = { x: renderX + cosA * len, y: renderY + sinA * len }
      const p2 = { x: renderX + cosA * 4 * scale + perpX * 6 * scale, y: renderY + sinA * 4 * scale + perpY * 6 * scale }
      const p3 = { x: renderX + cosA * 6 * scale, y: renderY + sinA * 6 * scale }
      const p4 = { x: renderX - cosA * 8 * scale + perpX * 7 * scale, y: renderY - sinA * 8 * scale + perpY * 7 * scale }
      const p5 = { x: renderX - cosA * (len * 0.6), y: renderY - sinA * (len * 0.6) }
      g.poly([p1, p2, p3, p4, p5]).stroke({ width: 3.0 * scale, color: glowColHex, alpha: 0.7 })
      g.poly([p1, p2, p3, p4, p5]).stroke({ width: 1.8 * scale, color: colHex, alpha: 1.0 })
      g.circle(p1.x, p1.y, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    }
    // DEFAULT CIRCLE
    else {
      g.circle(renderX, renderY, 10 * scale).fill({ color: glowColHex, alpha: 0.4 * alpha })
      g.circle(renderX, renderY, 6 * scale).fill({ color: colHex, alpha: 0.95 * alpha })
      g.circle(renderX, renderY, 2.5 * scale).fill({ color: coreColHex, alpha: 1.0 })
    }

    // SATELLITES / ORBITERS
    const satCount = typeof def.formation?.satelliteCount === 'number'
      ? def.formation.satelliteCount
      : (def.formation?.type === 'satellites' ? 3 : 0)
    if (satCount > 0) {
      const orbitR = (13.0 + size * 0.9) * scale
      const satPulse = Math.sin(timeMs * 0.001 * 3.5) * 1.5 * scale
      for (let s = 0; s < satCount; s++) {
        const sAng = timeMs * 0.001 * 3.5 + (s * Math.PI * 2) / satCount
        const sx = renderX + Math.cos(sAng) * (orbitR + satPulse)
        const sy = renderY + Math.sin(sAng) * (orbitR + satPulse) * 0.65

        g.circle(sx, sy, 4.5 * scale).fill({ color: glowColHex, alpha: 0.5 })
        g.circle(sx, sy, 2.8 * scale).fill({ color: coreColHex, alpha: 0.95 })
        g.circle(sx, sy, 1.2 * scale).fill({ color: 0xffffff, alpha: 1.0 })
      }
    }
  }

  /**
   * Renders the trailing path
   */
  public static renderTrail(
    g: Graphics,
    def: ProjectileDefinition,
    trail: { x: number; y: number; alpha?: number }[],
    nowTimeMs: number
  ): void {
    if (def.movement.isLaser || def.movement.isInstant || def.visual.shape === 'instant_strike') return
    if (!trail || trail.length < 2) return

    const style = def.trail.style || 'solid_line'
    if (style === 'none') return

    const color = def.trail.colorHex ?? def.visual.colorHex
    const alpha = def.trail.alpha ?? 0.7
    const width = def.trail.width ?? 4

    if (style === 'particles') {
      for (let t = 0; t < trail.length; t++) {
        const pt = trail[t]
        const frac = (t + 1) / trail.length
        const r = Math.max(0.8, frac * width * 0.75)
        g.circle(pt.x, pt.y, r).fill({ color, alpha: frac * alpha })
      }
    } else if (style === 'glow_streak') {
      g.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) g.lineTo(trail[t].x, trail[t].y)
      g.stroke({ width: Math.max(1.5, width * 2.2), color, alpha: alpha * 0.35, cap: 'round', join: 'round' })

      g.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) g.lineTo(trail[t].x, trail[t].y)
      g.stroke({ width, color, alpha: alpha * 0.9, cap: 'round', join: 'round' })
    } else if (style === 'solid_line') {
      g.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) g.lineTo(trail[t].x, trail[t].y)
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' })
    }
  }

  // --- Internal Shape Renderers ---

  private static drawFlame(
    g: Graphics,
    x: number,
    y: number,
    cosA: number,
    sinA: number,
    perpX: number,
    perpY: number,
    scale: number,
    timeMs: number,
    size: number,
    col: number,
    glowCol: number,
    coreCol: number
  ) {
    const t = timeMs * 0.001
    const headR = (size >= 18 ? 14 : size >= 12 ? 10 : 7.5) * scale
    const tailLen = (size >= 18 ? 32 : size >= 12 ? 22 : 16) * scale

    // Outer Aura
    const auraPulse = 1.0 + Math.sin(t * 14) * 0.08
    g.circle(x - cosA * 2 * scale, y - sinA * 2 * scale, headR * 1.55 * auraPulse)
      .fill({ color: glowCol, alpha: 0.28 })

    // Tongues
    const numTongues = size >= 18 ? 6 : size >= 12 ? 4 : 3
    for (let i = 0; i < numTongues; i++) {
      const frac = (i / (numTongues - 1 || 1)) - 0.5
      const phase = i * 2.1 + t * (15 + i * 3)
      const tongueLen = tailLen * (0.65 + Math.sin(phase) * 0.35) * (1 - Math.abs(frac) * 0.3)
      const tongueSpread = (headR * 0.85 * frac) + Math.cos(phase * 0.8) * 2.5 * scale
      const tipPx = x - cosA * tongueLen + perpX * tongueSpread
      const tipPy = y - sinA * tongueLen + perpY * tongueSpread
      const baseW = headR * (0.6 - Math.abs(frac) * 0.2)

      g.poly([
        { x: x + perpX * (tongueSpread + baseW), y: y + perpY * (tongueSpread + baseW) },
        { x: tipPx, y: tipPy },
        { x: x + perpX * (tongueSpread - baseW), y: y + perpY * (tongueSpread - baseW) },
        { x: x + cosA * (headR * 0.4), y: y + sinA * (headR * 0.4) }
      ]).fill({ color: col, alpha: 0.85 })
    }

    // Main head
    g.circle(x, y, headR * (1.0 + Math.sin(t * 18) * 0.05)).fill({ color: col, alpha: 0.95 })
    g.circle(x + cosA * (headR * 0.15), y + sinA * (headR * 0.15), headR * 0.65).fill({ color: coreCol, alpha: 1.0 })
    g.circle(x + cosA * (headR * 0.3), y + sinA * (headR * 0.3), headR * 0.32).fill({ color: 0xffffff, alpha: 1.0 })
  }

  private static drawRocket(
    g: Graphics,
    x: number,
    y: number,
    cosA: number,
    sinA: number,
    perpX: number,
    perpY: number,
    scale: number,
    timeMs: number,
    length: number,
    col: number,
    glowCol: number,
    coreCol: number
  ) {
    const t = timeMs * 0.001
    const len = length * scale
    const w = Math.max(5, 8 * 1.1) * scale

    const noseX = x + cosA * (len * 0.75)
    const noseY = y + sinA * (len * 0.75)
    const tailX = x - cosA * (len * 0.45)
    const tailY = y - sinA * (len * 0.45)
    const midX = x - cosA * (len * 0.05)
    const midY = y - sinA * (len * 0.05)

    // Jet thruster
    const jetLen = len * 0.75 * (Math.sin(t * 35) * 0.15 + 1.0)
    g.poly([
      { x: tailX + perpX * (w * 0.55), y: tailY + perpY * (w * 0.55) },
      { x: tailX - cosA * jetLen, y: tailY - sinA * jetLen },
      { x: tailX - perpX * (w * 0.55), y: tailY - perpY * (w * 0.55) },
    ]).fill({ color: glowCol, alpha: 0.9 })

    // Missile body
    g.poly([
      { x: noseX, y: noseY },
      { x: midX + perpX * w, y: midY + perpY * w },
      { x: tailX + perpX * (w * 0.6), y: tailY + perpY * (w * 0.6) },
      { x: tailX, y: tailY },
      { x: tailX - perpX * (w * 0.6), y: tailY - perpY * (w * 0.6) },
      { x: midX - perpX * w, y: midY - perpY * w },
    ]).fill({ color: col, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: glowCol, alpha: 0.9 })

    g.circle(noseX, noseY, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }

  private static drawLaser(
    g: Graphics,
    startX: number,
    startY: number,
    renderX: number,
    renderY: number,
    scale: number,
    timeMs: number,
    col: number,
    glowCol: number,
    coreCol: number,
    width: number
  ) {
    const t = timeMs * 0.001
    const baseW = Math.max(3.5, width * scale)
    const beamPulse = 1.0 + Math.sin(t * 20) * 0.08

    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: baseW * 3.8 * beamPulse, color: glowCol, alpha: 0.25, cap: 'round' })
    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: baseW * 2.0, color: col, alpha: 0.75, cap: 'round' })
    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: Math.max(1.8, baseW * 0.5), color: coreCol, alpha: 1.0, cap: 'round' })

    g.circle(startX, startY, baseW * 2.0).fill({ color: glowCol, alpha: 0.5 })
    g.circle(renderX, renderY, baseW * 2.5).fill({ color: glowCol, alpha: 0.4 })
    g.circle(renderX, renderY, baseW * 1.0).fill({ color: 0xffffff, alpha: 1.0 })
  }

  private static drawArrow(g: Graphics, x: number, y: number, cosA: number, sinA: number, len: number, shaftCol: number, tipCol: number, strokeCol: number, scale: number) {
    const tipX = x + cosA * 4 * scale
    const tipY = y + sinA * 4 * scale
    const tailX = tipX - cosA * len * scale
    const tailY = tipY - sinA * len * scale

    g.moveTo(tailX, tailY).lineTo(tipX - cosA * 3 * scale, tipY - sinA * 3 * scale).stroke({ width: 1.8 * scale, color: shaftCol, alpha: 1.0 })
    const headBaseX = tipX - cosA * 6 * scale
    const headBaseY = tipY - sinA * 6 * scale
    const perpX = -sinA * 2.8 * scale
    const perpY = cosA * 2.8 * scale
    g.poly([
      { x: tipX, y: tipY },
      { x: headBaseX + perpX, y: headBaseY + perpY },
      { x: headBaseX - cosA * 1.5 * scale, y: headBaseY - sinA * 1.5 * scale },
      { x: headBaseX - perpX, y: headBaseY - perpY },
    ]).fill({ color: tipCol, alpha: 1.0 }).stroke({ width: 0.8 * scale, color: strokeCol, alpha: 1.0 })
  }

  private static drawDiamondShard(g: Graphics, x: number, y: number, cosA: number, sinA: number, perpX: number, perpY: number, scale: number, col: number, glowCol: number, coreCol: number) {
    const polyTop = [
      { x: x + cosA * 20 * scale, y: y + sinA * 20 * scale },
      { x: x - cosA * 2 * scale - perpX * 8 * scale, y: y - sinA * 2 * scale - perpY * 8 * scale },
      { x: x - cosA * 16 * scale, y: y - sinA * 16 * scale },
    ]
    const polyBot = [
      { x: x + cosA * 20 * scale, y: y + sinA * 20 * scale },
      { x: x - cosA * 2 * scale + perpX * 8 * scale, y: y - sinA * 2 * scale + perpY * 8 * scale },
      { x: x - cosA * 16 * scale, y: y - sinA * 16 * scale },
    ]
    g.poly(polyTop).fill({ color: col, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
    g.poly(polyBot).fill({ color: glowCol, alpha: 0.85 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
    g.moveTo(x - cosA * 16 * scale, y - sinA * 16 * scale).lineTo(x + cosA * 20 * scale, y + sinA * 20 * scale).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
  }

  private static drawLineStreak(g: Graphics, cx: number, cy: number, cosA: number, sinA: number, perpX: number, perpY: number, scale: number, timeMs: number, lenVal: number, sizeVal: number, col: number, glowCol: number, coreCol: number) {
    const len = lenVal * scale
    const w = Math.max(2.0, sizeVal * scale * 0.6)
    const tipX = cx + cosA * (len * 0.5)
    const tipY = cy + sinA * (len * 0.5)
    const tailX = cx - cosA * (len * 0.5)
    const tailY = cy - sinA * (len * 0.5)

    g.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ width: w * 3.5, color: glowCol, alpha: 0.3, cap: 'round' })
    g.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ width: w * 1.8, color: col, alpha: 0.9, cap: 'round' })
    g.moveTo(tailX + cosA * 4 * scale, tailY + sinA * 4 * scale).lineTo(tipX, tipY).stroke({ width: Math.max(1.2, w * 0.6), color: coreCol, alpha: 1.0, cap: 'round' })
  }

  private static drawSandCluster(g: Graphics, cx: number, cy: number, cosA: number, sinA: number, perpX: number, perpY: number, scale: number, timeMs: number, lenVal: number, sizeVal: number, col: number, glowCol: number, coreCol: number) {
    const len = lenVal * scale
    const rBase = Math.max(5, sizeVal * scale * 0.85)
    const grainCount = 42
    const time = timeMs * 0.001

    for (let i = 0; i < grainCount; i++) {
      const frac = (i / grainCount) - 0.5
      const theta = time * 4.0 + i * 1.618
      const grainRadial = rBase * (0.35 + 0.65 * Math.abs(Math.sin(i * 3.71 + time * 1.5)))
      const swirlCos = Math.cos(theta)
      const swirlSin = Math.sin(theta)

      const posX = cx + cosA * (frac * len) + perpX * (swirlCos * grainRadial)
      const posY = cy + sinA * (frac * len) + perpY * (swirlSin * grainRadial * 0.65)

      g.circle(posX, posY, Math.max(0.8, 1.3 * scale)).fill({ color: i % 2 === 0 ? col : glowCol, alpha: 0.7 })
    }
  }

  private static drawInstantStrike(
    g: Graphics,
    cx: number,
    cy: number,
    scale: number,
    timeMs: number,
    size: number,
    instantType: string,
    col: number,
    glowCol: number,
    coreCol: number,
    shape?: string
  ) {
    const r = (size ?? 16) * scale
    const time = timeMs * 0.001

    switch (instantType) {
      // ══════════════════════════════════════════════════════════
      // 1. SKY STRIKES (Osmondan tushuvchi)
      // ══════════════════════════════════════════════════════════
      case 'sky_thunder':
      case 'sky_strike': {
        const beamTop = cy - 160 * scale
        // Jagged lightning segments
        g.moveTo(cx, beamTop)
        const segments = 6
        let curX = cx
        for (let s = 1; s <= segments; s++) {
          const segY = beamTop + ((cy - beamTop) * s) / segments
          const offset = s === segments ? 0 : Math.sin(time * 30 + s * 3.7) * 14 * scale
          const nextX = cx + offset
          g.lineTo(nextX, segY)
          curX = nextX
        }
        g.stroke({ width: r * 1.5, color: glowCol, alpha: 0.35, cap: 'round', join: 'round' })

        g.moveTo(cx, beamTop)
        for (let s = 1; s <= segments; s++) {
          const segY = beamTop + ((cy - beamTop) * s) / segments
          const offset = s === segments ? 0 : Math.sin(time * 30 + s * 3.7) * 14 * scale
          g.lineTo(cx + offset, segY)
        }
        g.stroke({ width: r * 0.7, color: col, alpha: 0.9, cap: 'round', join: 'round' })

        // Core white channel
        g.moveTo(cx, beamTop)
        for (let s = 1; s <= segments; s++) {
          const segY = beamTop + ((cy - beamTop) * s) / segments
          const offset = s === segments ? 0 : Math.sin(time * 30 + s * 3.7) * 14 * scale
          g.lineTo(cx + offset, segY)
        }
        g.stroke({ width: r * 0.3, color: 0xffffff, alpha: 1.0, cap: 'round', join: 'round' })

        // Impact ground spark & flash
        const pulse = Math.sin(time * 24) * 3 * scale
        g.ellipse(cx, cy, (r * 2.2) + pulse, (r * 1.1) + pulse * 0.5).stroke({ width: 2.5 * scale, color: coreCol, alpha: 0.95 })
        g.circle(cx, cy, r * 0.7).fill({ color: 0xffffff, alpha: 0.95 })
        break
      }

      case 'heavenly_pillar': {
        const beamTop = cy - 200 * scale
        // Translucent outer light column
        g.poly([
          { x: cx - r * 1.8, y: beamTop },
          { x: cx + r * 1.8, y: beamTop },
          { x: cx + r * 2.4, y: cy },
          { x: cx - r * 2.4, y: cy }
        ]).fill({ color: glowCol, alpha: 0.25 })

        // Inner beam
        g.poly([
          { x: cx - r * 0.9, y: beamTop },
          { x: cx + r * 0.9, y: beamTop },
          { x: cx + r * 1.2, y: cy },
          { x: cx - r * 1.2, y: cy }
        ]).fill({ color: col, alpha: 0.6 })

        // Pure radiant core
        g.moveTo(cx, beamTop).lineTo(cx, cy).stroke({ width: r * 0.6, color: 0xffffff, alpha: 0.95 })

        // Ground Holy Rings
        const rot = time * 2
        g.ellipse(cx, cy, r * 2.5, r * 1.25).stroke({ width: 2.2 * scale, color: glowCol, alpha: 0.9 })
        g.ellipse(cx, cy, r * 1.5, r * 0.75).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 0.95 })
        break
      }

      case 'meteor_fall': {
        const angle = -Math.PI * 0.35 // 65 deg incoming angle
        const dist = 160 * scale
        const startX = cx - Math.cos(angle) * dist
        const startY = cy - Math.sin(angle) * dist

        // Burning streak tail
        g.moveTo(startX, startY).lineTo(cx, cy).stroke({ width: r * 2.0, color: glowCol, alpha: 0.35, cap: 'round' })
        g.moveTo(startX + Math.cos(angle) * 30, startY + Math.sin(angle) * 30).lineTo(cx, cy).stroke({ width: r * 1.0, color: col, alpha: 0.85, cap: 'round' })

        // Meteorite head or custom shape
        if (shape === 'arrow') {
          this.drawArrow(g, cx, cy, Math.cos(angle), Math.sin(angle), 30 * scale, col, glowCol, coreCol, scale * 1.2)
        } else if (shape === 'star') {
          this.drawStar(g, cx, cy, 5, 20 * scale, 8 * scale, time * 2, col, 1.0)
          g.circle(cx, cy, 6 * scale).fill({ color: coreCol, alpha: 1.0 })
        } else if (shape === 'diamond_shard') {
          this.drawDiamondShard(g, cx, cy, Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), scale * 1.3, col, glowCol, coreCol)
        } else if (shape === 'rocket') {
          this.drawRocket(g, cx, cy, Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), scale, timeMs, 30, col, glowCol, coreCol)
        } else if (shape === 'shuriken' || shape === 'sawblade') {
          this.drawStar(g, cx, cy, 8, 20 * scale, 12 * scale, time * 6, col, 1.0)
          g.circle(cx, cy, 6 * scale).fill({ color: coreCol, alpha: 1.0 })
        } else {
          // Default meteor / fiery orb
          g.circle(cx, cy, r * 1.2).fill({ color: col, alpha: 0.95 })
          g.circle(cx, cy, r * 0.7).fill({ color: coreCol, alpha: 1.0 })
          g.circle(cx, cy, r * 0.35).fill({ color: 0xffffff, alpha: 1.0 })
        }

        // Impact crater aura
        g.ellipse(cx, cy, r * 2.6, r * 1.3).stroke({ width: 2.5 * scale, color: glowCol, alpha: 0.8 })
        break
      }

      case 'solar_beam': {
        const beamTop = cy - 220 * scale
        g.moveTo(cx, beamTop).lineTo(cx, cy).stroke({ width: r * 3.0, color: glowCol, alpha: 0.2, cap: 'round' })
        g.moveTo(cx, beamTop).lineTo(cx, cy).stroke({ width: r * 1.4, color: col, alpha: 0.75, cap: 'round' })
        g.moveTo(cx, beamTop).lineTo(cx, cy).stroke({ width: r * 0.5, color: 0xffffff, alpha: 1.0, cap: 'round' })

        // Solar flare rays on ground
        for (let i = 0; i < 8; i++) {
          const a = time * 3 + (i * Math.PI) / 4
          const rayLen = r * (1.6 + Math.sin(time * 10 + i) * 0.4)
          g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * rayLen, cy + Math.sin(a) * rayLen * 0.5).stroke({ width: 1.8 * scale, color: coreCol, alpha: 0.85 })
        }
        g.circle(cx, cy, r * 0.8).fill({ color: 0xffffff, alpha: 0.95 })
        break
      }

      case 'arrow_rain': {
        // Volley of falling arrows
        const offsets = [-20, -10, 0, 10, 20]
        const fallAngle = Math.PI * 0.6
        const arrowLen = 22 * scale
        for (let i = 0; i < offsets.length; i++) {
          const offX = offsets[i] * scale
          const offY = (Math.sin(time * 8 + i * 1.5) * 6) * scale
          const aX = cx + offX
          const aY = cy + offY
          const tipX = aX
          const tipY = aY
          const tailX = tipX - Math.cos(fallAngle) * arrowLen
          const tailY = tipY - Math.sin(fallAngle) * arrowLen

          g.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ width: 2.2 * scale, color: col, alpha: 0.9, cap: 'round' })
          g.circle(tipX, tipY, 2.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
          g.ellipse(tipX, tipY, 6 * scale, 3 * scale).fill({ color: glowCol, alpha: 0.5 })
        }
        break
      }

      case 'holy_spear': {
        const topY = cy - 180 * scale
        // Giant descending spear shaft
        g.moveTo(cx, topY).lineTo(cx, cy).stroke({ width: r * 0.7, color: col, alpha: 0.9, cap: 'round' })
        g.moveTo(cx, topY).lineTo(cx, cy).stroke({ width: r * 0.25, color: 0xffffff, alpha: 1.0, cap: 'round' })

        // Spearhead
        g.poly([
          { x: cx, y: cy + r * 0.4 },
          { x: cx + r * 0.7, y: cy - r * 1.5 },
          { x: cx, y: cy - r * 1.0 },
          { x: cx - r * 0.7, y: cy - r * 1.5 },
        ]).fill({ color: coreCol, alpha: 1.0 }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 1.0 })

        // Radiant halo ring
        g.ellipse(cx, cy - r * 0.8, r * 1.8, r * 0.9).stroke({ width: 2.0 * scale, color: glowCol, alpha: 0.85 })
        break
      }

      // ══════════════════════════════════════════════════════════
      // 2. GROUND BURSTS (Yerdan otiluvchi)
      // ══════════════════════════════════════════════════════════
      case 'ground_fissure':
      case 'ground_burst': {
        // Jagged ground crack fissures
        const crackCount = 5
        for (let i = 0; i < crackCount; i++) {
          const baseAng = (i * Math.PI * 2) / crackCount + 0.3
          const crackLen = r * (1.8 + Math.sin(time * 6 + i) * 0.4)
          g.moveTo(cx, cy)
          const midX = cx + Math.cos(baseAng + 0.2) * (crackLen * 0.5)
          const midY = cy + Math.sin(baseAng + 0.2) * (crackLen * 0.5) * 0.5
          const endX = cx + Math.cos(baseAng) * crackLen
          const endY = cy + Math.sin(baseAng) * crackLen * 0.5
          g.lineTo(midX, midY).lineTo(endX, endY).stroke({ width: 3.2 * scale, color: col, alpha: 0.9, cap: 'round' })
          g.lineTo(midX, midY).lineTo(endX, endY).stroke({ width: 1.4 * scale, color: 0xffffff, alpha: 1.0, cap: 'round' })
        }
        // Magma/energy glow in center
        g.ellipse(cx, cy, r * 1.5, r * 0.75).fill({ color: glowCol, alpha: 0.55 })
        g.circle(cx, cy, r * 0.45).fill({ color: 0xffffff, alpha: 0.9 })
        break
      }

      case 'magma_geyser': {
        // Lava eruption column from ground upward
        const eruptH = 110 * scale * (0.8 + Math.sin(time * 12) * 0.2)
        const geyserW = r * 1.4
        g.poly([
          { x: cx - geyserW * 0.8, y: cy },
          { x: cx - geyserW * 0.4, y: cy - eruptH * 0.7 },
          { x: cx, y: cy - eruptH },
          { x: cx + geyserW * 0.4, y: cy - eruptH * 0.7 },
          { x: cx + geyserW * 0.8, y: cy }
        ]).fill({ color: col, alpha: 0.85 })

        g.poly([
          { x: cx - geyserW * 0.3, y: cy },
          { x: cx, y: cy - eruptH * 0.85 },
          { x: cx + geyserW * 0.3, y: cy }
        ]).fill({ color: coreCol, alpha: 0.95 })

        // Ground bubbling magma pool
        g.ellipse(cx, cy, r * 2.2, r * 1.1).fill({ color: glowCol, alpha: 0.45 }).stroke({ width: 2.2 * scale, color: col, alpha: 0.9 })
        break
      }

      case 'frost_spikes': {
        // Erupting sharp crystal spikes
        const spikeCount = 6
        for (let i = 0; i < spikeCount; i++) {
          const ang = (i * Math.PI * 2) / spikeCount + (i % 2 === 0 ? 0.2 : -0.2)
          const spikeLen = r * (1.6 + (i % 3) * 0.5)
          const tipX = cx + Math.cos(ang) * spikeLen
          const tipY = (cy - Math.abs(Math.sin(ang)) * 25 * scale) + Math.sin(ang) * spikeLen * 0.4
          const baseW = 5 * scale
          const perpAng = ang + Math.PI * 0.5

          g.poly([
            { x: cx + Math.cos(perpAng) * baseW, y: cy + Math.sin(perpAng) * baseW * 0.5 },
            { x: tipX, y: tipY },
            { x: cx - Math.cos(perpAng) * baseW, y: cy - Math.sin(perpAng) * baseW * 0.5 },
          ]).fill({ color: col, alpha: 0.9 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 0.95 })
        }
        g.ellipse(cx, cy, r * 1.8, r * 0.9).stroke({ width: 1.8 * scale, color: glowCol, alpha: 0.85 })
        break
      }

      case 'poison_roots': {
        // Thorny bramble vines twisting outward
        for (let i = 0; i < 4; i++) {
          const rootAng = (i * Math.PI) / 2 + time * 0.5
          const len = r * 1.8
          g.moveTo(cx, cy)
          const c1x = cx + Math.cos(rootAng + 0.5) * (len * 0.4)
          const c1y = cy + Math.sin(rootAng + 0.5) * (len * 0.4) * 0.5
          const c2x = cx + Math.cos(rootAng - 0.3) * (len * 0.8)
          const c2y = cy + Math.sin(rootAng - 0.3) * (len * 0.8) * 0.5
          const tipX = cx + Math.cos(rootAng) * len
          const tipY = cy + Math.sin(rootAng) * len * 0.5
          g.lineTo(c1x, c1y).lineTo(c2x, c2y).lineTo(tipX, tipY).stroke({ width: 3.5 * scale, color: col, alpha: 0.9, cap: 'round' })
          g.circle(tipX, tipY, 3 * scale).fill({ color: coreCol, alpha: 0.9 })
        }
        g.ellipse(cx, cy, r * 1.6, r * 0.8).fill({ color: glowCol, alpha: 0.35 })
        break
      }

      case 'void_portal': {
        // Swirling dark hole on ground with accretion ring
        const rot = time * 4
        g.ellipse(cx, cy, r * 2.2, r * 1.1).fill({ color: 0x020617, alpha: 0.95 }).stroke({ width: 2.8 * scale, color: col, alpha: 0.9 })

        // Spiral tendrils into center
        for (let i = 0; i < 3; i++) {
          const a = rot + (i * Math.PI * 2) / 3
          g.moveTo(cx + Math.cos(a) * r * 2.0, cy + Math.sin(a) * r * 1.0)
          g.lineTo(cx + Math.cos(a + 1.2) * r * 1.0, cy + Math.sin(a + 1.2) * r * 0.5)
          g.lineTo(cx, cy).stroke({ width: 2.2 * scale, color: glowCol, alpha: 0.8 })
        }
        g.circle(cx, cy, r * 0.35).fill({ color: coreCol, alpha: 1.0 })
        break
      }

      case 'quake_stomp': {
        // Triple expanding concentric ground shockwaves
        for (let ring = 1; ring <= 3; ring++) {
          const ringR = r * (0.8 * ring + (time * 2) % 0.8)
          const alpha = Math.max(0, 1.0 - ring * 0.28)
          g.ellipse(cx, cy, ringR * 1.4, ringR * 0.7).stroke({ width: (4 - ring) * scale, color: col, alpha })
        }
        g.ellipse(cx, cy, r * 1.2, r * 0.6).fill({ color: glowCol, alpha: 0.5 })
        break
      }

      // ══════════════════════════════════════════════════════════
      // 3. UNIT AURA & SURROUNDINGS (Unit atrofidagi usullar)
      // ══════════════════════════════════════════════════════════
      case 'unit_singularity':
      case 'unit_aura': {
        // Gravitational singularity sphere with orbiting particle disks
        const pulse = 1.0 + Math.sin(time * 15) * 0.12
        g.ellipse(cx, cy, r * 1.8 * pulse, r * 0.9 * pulse).stroke({ width: 2.2 * scale, color: glowCol, alpha: 0.85 })
        g.circle(cx, cy, r * 0.9 * pulse).fill({ color: 0x09090b, alpha: 0.95 }).stroke({ width: 2.0 * scale, color: col, alpha: 0.95 })
        g.circle(cx, cy, r * 0.45).fill({ color: coreCol, alpha: 1.0 })

        // Orbiting satellites
        for (let i = 0; i < 3; i++) {
          const ang = time * 5 + (i * Math.PI * 2) / 3
          const orbX = cx + Math.cos(ang) * (r * 1.6)
          const orbY = cy + Math.sin(ang) * (r * 0.8)
          g.circle(orbX, orbY, 3 * scale).fill({ color: 0xffffff, alpha: 1.0 })
        }
        break
      }

      case 'void_vortex': {
        const rot = -time * 5
        g.ellipse(cx, cy, r * 2.4, r * 1.2).stroke({ width: 2.5 * scale, color: col, alpha: 0.85 })
        for (let i = 0; i < 4; i++) {
          const a = rot + (i * Math.PI) / 2
          const vx = cx + Math.cos(a) * (r * 1.7)
          const vy = cy + Math.sin(a) * (r * 0.85)
          g.moveTo(cx, cy).lineTo(vx, vy).stroke({ width: 2.0 * scale, color: glowCol, alpha: 0.75 })
          g.circle(vx, vy, 3.5 * scale).fill({ color: coreCol, alpha: 1.0 })
        }
        g.circle(cx, cy, r * 0.5).fill({ color: 0x4c0519, alpha: 0.95 }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 1.0 })
        break
      }

      case 'swirling_blades': {
        // 4 spinning crescent blades
        const bladeCount = 4
        const rot = time * 8
        const orbitR = r * 1.6
        for (let i = 0; i < bladeCount; i++) {
          const a = rot + (i * Math.PI * 2) / bladeCount
          const bx = cx + Math.cos(a) * orbitR
          const by = cy + Math.sin(a) * orbitR * 0.55
          const bladeAng = a + Math.PI * 0.5

          const bLen = 14 * scale
          g.moveTo(bx - Math.cos(bladeAng) * bLen, by - Math.sin(bladeAng) * bLen)
            .lineTo(bx + Math.cos(bladeAng) * bLen, by + Math.sin(bladeAng) * bLen)
            .stroke({ width: 3.5 * scale, color: col, alpha: 0.95, cap: 'round' })
          g.circle(bx, by, 2 * scale).fill({ color: 0xffffff, alpha: 1.0 })
        }
        g.ellipse(cx, cy, orbitR * 1.1, orbitR * 0.55).stroke({ width: 1.2 * scale, color: glowCol, alpha: 0.4 })
        break
      }

      case 'frost_nova': {
        // Radial burst of 8 ice crystals expanding outward
        const count = 8
        const pulse = (time * 3) % 1.0
        const blastR = r * (0.8 + pulse * 1.2)
        const alpha = Math.max(0, 1.0 - pulse)
        g.ellipse(cx, cy, blastR * 1.5, blastR * 0.75).stroke({ width: 2.5 * scale, color: col, alpha })

        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count
          const ix = cx + Math.cos(a) * blastR
          const iy = cy + Math.sin(a) * blastR * 0.5
          g.moveTo(cx, cy).lineTo(ix, iy).stroke({ width: 1.2 * scale, color: glowCol, alpha: alpha * 0.8 })
          g.circle(ix, iy, 2.5 * scale).fill({ color: 0xffffff, alpha })
        }
        break
      }

      case 'poison_cloud': {
        // Billowing bubbling toxic gas clouds
        const bubbleCount = 6
        for (let i = 0; i < bubbleCount; i++) {
          const a = (i * Math.PI * 2) / bubbleCount + time * 0.8
          const bubbleR = (r * 0.6) + Math.sin(time * 6 + i) * (r * 0.2)
          const dist = r * (0.9 + Math.sin(time * 4 + i * 2) * 0.3)
          const bx = cx + Math.cos(a) * dist
          const by = cy + Math.sin(a) * dist * 0.5
          g.circle(bx, by, bubbleR).fill({ color: col, alpha: 0.55 }).stroke({ width: 1.0 * scale, color: coreCol, alpha: 0.7 })
        }
        g.ellipse(cx, cy, r * 1.2, r * 0.6).fill({ color: glowCol, alpha: 0.7 })
        break
      }

      case 'electric_discharge': {
        // Chaotic sphere of tesla arcs
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 + time * 2
          const arcR = r * (1.2 + Math.sin(time * 25 + i * 3) * 0.4)
          const ax = cx + Math.cos(a) * arcR
          const ay = cy + Math.sin(a) * arcR * 0.6
          g.moveTo(cx, cy).lineTo(ax, ay).stroke({ width: 2.0 * scale, color: glowCol, alpha: 0.9 })
          g.circle(ax, ay, 2 * scale).fill({ color: 0xffffff, alpha: 1.0 })
        }
        g.circle(cx, cy, r * 0.5).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ width: 2 * scale, color: col, alpha: 1.0 })
        break
      }

      case 'rune_seal': {
        // Ancient occult spinning rune circle
        const rot = time * 1.5
        g.ellipse(cx, cy, r * 2.2, r * 1.1).stroke({ width: 2.2 * scale, color: col, alpha: 0.9 })
        g.ellipse(cx, cy, r * 1.4, r * 0.7).stroke({ width: 1.5 * scale, color: glowCol, alpha: 0.75 })

        // 4 Rune points
        for (let i = 0; i < 4; i++) {
          const a = rot + (i * Math.PI) / 2
          const rx = cx + Math.cos(a) * (r * 1.8)
          const ry = cy + Math.sin(a) * (r * 0.9)
          g.poly([
            { x: rx, y: ry - 4 * scale },
            { x: rx + 3 * scale, y: ry },
            { x: rx, y: ry + 4 * scale },
            { x: rx - 3 * scale, y: ry }
          ]).fill({ color: coreCol, alpha: 0.95 })
        }
        g.circle(cx, cy, r * 0.35).fill({ color: 0xffffff, alpha: 1.0 })
        break
      }

      case 'holy_halo': {
        // Multi-layered golden angelic halo
        const pulse = 1.0 + Math.sin(time * 8) * 0.1
        g.ellipse(cx, cy, r * 2.5 * pulse, r * 1.25 * pulse).stroke({ width: 2.5 * scale, color: glowCol, alpha: 0.9 })
        g.ellipse(cx, cy, r * 1.8 * pulse, r * 0.9 * pulse).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 0.95 })
        g.ellipse(cx, cy, r * 1.0 * pulse, r * 0.5 * pulse).fill({ color: coreCol, alpha: 0.4 })
        break
      }

      default: {
        g.circle(cx, cy, r * 0.9).fill({ color: col, alpha: 0.9 }).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
        g.circle(cx, cy, r * 0.4).fill({ color: 0xffffff, alpha: 1.0 })
        break
      }
    }
  }

  private static drawStar(g: Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number, rot: number, color: number, alpha: number) {
    const polyPoints: { x: number; y: number }[] = []
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const a = rot + (i * Math.PI) / points
      polyPoints.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
    g.poly(polyPoints).fill({ color, alpha })
  }
}
