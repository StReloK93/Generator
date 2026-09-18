import { Graphics } from 'pixi.js'
import { ProjectileType } from '../types/map'
import { PROJECTILE_CATALOG, getProjectileDef, ProjectileDef } from './projectileCatalog'
import type { ProjectileConfig } from '../stores/projectileStore'

export interface ProjectileVisualTheme {
  type: ProjectileType
  trailColorHex: number
  trailColorCss: string
  trailAlpha: number
  sparkColorHex: number
  sparkColorCss: string
  shockwaveColorHex: number
  shockwaveColorCss: string
  hasArc: boolean
  isLaser: boolean
}

export const PROJECTILE_THEMES: Record<string, ProjectileVisualTheme> = {}

// Auto-populate from catalog
for (const p of PROJECTILE_CATALOG) {
  PROJECTILE_THEMES[p.id] = {
    type: p.id,
    trailColorHex: p.trailColorHex,
    trailColorCss: p.trailColorCss,
    trailAlpha: p.trailAlpha,
    sparkColorHex: p.sparkColorHex,
    sparkColorCss: p.sparkColorCss,
    shockwaveColorHex: p.shockwaveColorHex,
    shockwaveColorCss: p.shockwaveColorCss,
    hasArc: p.hasArc,
    isLaser: p.isLaser,
  }
}

export function getProjectileTheme(type: string, customColor?: number): ProjectileVisualTheme {
  const def = getProjectileDef(type)
  const trailColorHex = def.trailColorHex ?? customColor ?? 0xfbbf24
  const hexStr = '#' + trailColorHex.toString(16).padStart(6, '0')
  const r = (trailColorHex >> 16) & 0xff
  const g = (trailColorHex >> 8) & 0xff
  const b = trailColorHex & 0xff

  const isLaser = Boolean(def.isLaser || type.includes('laser') || def.formation === 'laser_beam')
  const hasArc = isLaser ? false : (def.hasArc === false ? false : Boolean(def.hasArc))

  return {
    type: (type as ProjectileType) || 'fireball',
    trailColorHex,
    trailColorCss: def.trailColorCss || `rgba(${r}, ${g}, ${b}, ${def.trailAlpha ?? 0.7})`,
    trailAlpha: def.trailAlpha ?? 0.7,
    sparkColorHex: def.sparkColorHex ?? trailColorHex,
    sparkColorCss: def.sparkColorCss || hexStr,
    shockwaveColorHex: def.shockwaveColorHex ?? trailColorHex,
    shockwaveColorCss: def.shockwaveColorCss || hexStr,
    hasArc: hasArc,
    isLaser: isLaser,
  }
}

function drawPixiStar(g: Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number, rot: number, color: number, alpha: number) {
  const polyPoints: { x: number; y: number }[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = rot + (i * Math.PI) / points
    polyPoints.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  g.poly(polyPoints).fill({ color, alpha })
}

function drawCanvasStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outerR: number, innerR: number, rot: number, fillStyle: string) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = rot + (i * Math.PI) / points
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
}

function drawSinglePixiArrow(g: Graphics, x: number, y: number, cosA: number, sinA: number, len: number, shaftCol: number, tipCol: number, strokeCol: number, scale = 1.0) {
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

  const fX = tailX + cosA * 2 * scale
  const fY = tailY + sinA * 2 * scale
  g.poly([
    { x: fX, y: fY },
    { x: fX - sinA * 2.5 * scale + cosA * 4 * scale, y: fY + cosA * 2.5 * scale + sinA * 4 * scale },
    { x: fX + cosA * 5 * scale, y: fY + sinA * 5 * scale },
    { x: fX + sinA * 2.5 * scale + cosA * 4 * scale, y: fY - cosA * 2.5 * scale + sinA * 4 * scale },
  ]).fill({ color: tipCol, alpha: 0.85 })
}

function drawSingleCanvasArrow(ctx: CanvasRenderingContext2D, len: number, shaftCol: string, tipCol: string, strokeCol: string) {
  ctx.strokeStyle = shaftCol
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-len, 0)
  ctx.lineTo(4, 0)
  ctx.stroke()

  ctx.fillStyle = tipCol
  ctx.strokeStyle = strokeCol
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.lineTo(2, -2.8)
  ctx.lineTo(3.5, 0)
  ctx.lineTo(2, 2.8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = tipCol
  ctx.beginPath()
  ctx.moveTo(-len + 2, 0)
  ctx.lineTo(-len + 5, -2.5)
  ctx.lineTo(-len + 7, 0)
  ctx.lineTo(-len + 5, 2.5)
  ctx.closePath()
  ctx.fill()
}

/**
 * Procedural Organic Flaming Comet Fireball (PixiJS 8)
 * Real dynamic animated fire with dancing tongues, heat corona and flying embers
 */
function drawPixiProceduralFlame(
  g: Graphics,
  x: number,
  y: number,
  cosA: number,
  sinA: number,
  perpX: number,
  perpY: number,
  scale: number,
  time: number,
  tier: 'simple' | 'middle' | 'strong',
  outerCol: number,
  midCol: number,
  coreCol: number
) {
  const t = time * 0.001
  const headR = (tier === 'strong' ? 14 : tier === 'middle' ? 10 : 7.5) * scale
  const tailLen = (tier === 'strong' ? 32 : tier === 'middle' ? 22 : 16) * scale

  // 1. Outer Deep Red/Crimson Heat Corona (Pulsing and Breathing)
  const auraPulse = 1.0 + Math.sin(t * 14) * 0.08
  const auraR = headR * 1.55 * auraPulse
  g.circle(x - cosA * 2 * scale, y - sinA * 2 * scale, auraR)
    .fill({ color: outerCol, alpha: 0.28 })

  // 2. Trailing Dancing Flame Tongues (Backwards flickering fire wisps)
  const numTongues = tier === 'strong' ? 6 : tier === 'middle' ? 4 : 3
  for (let i = 0; i < numTongues; i++) {
    const frac = (i / (numTongues - 1 || 1)) - 0.5
    const phase = i * 2.1 + t * (15 + i * 3)
    const tongueLen = tailLen * (0.65 + Math.sin(phase) * 0.35) * (1 - Math.abs(frac) * 0.3)
    const tongueSpread = (headR * 0.85 * frac) + Math.cos(phase * 0.8) * 2.5 * scale
    const tipPx = x - cosA * tongueLen + perpX * tongueSpread
    const tipPy = y - sinA * tongueLen + perpY * tongueSpread
    const baseW = headR * (0.6 - Math.abs(frac) * 0.2)

    // Outer flame tongue (Orange)
    g.poly([
      { x: x + perpX * (tongueSpread + baseW), y: y + perpY * (tongueSpread + baseW) },
      { x: tipPx, y: tipPy },
      { x: x + perpX * (tongueSpread - baseW), y: y + perpY * (tongueSpread - baseW) },
      { x: x + cosA * (headR * 0.4), y: y + sinA * (headR * 0.4) }
    ]).fill({ color: midCol, alpha: 0.85 })

    // Inner bright tongue wisp (Golden Amber)
    const innerLen = tongueLen * 0.6
    const innerTipX = x - cosA * innerLen + perpX * (tongueSpread * 0.7)
    const innerTipY = y - sinA * innerLen + perpY * (tongueSpread * 0.7)
    g.poly([
      { x: x + perpX * (tongueSpread * 0.5 + baseW * 0.5), y: y + perpY * (tongueSpread * 0.5 + baseW * 0.5) },
      { x: innerTipX, y: innerTipY },
      { x: x + perpX * (tongueSpread * 0.5 - baseW * 0.5), y: y + perpY * (tongueSpread * 0.5 - baseW * 0.5) }
    ]).fill({ color: coreCol, alpha: 0.95 })
  }

  // 3. Main Fireball Head Body (Incandescent Plasma Sphere)
  const headPulse = 1.0 + Math.sin(t * 18) * 0.05
  g.circle(x, y, headR * headPulse)
    .fill({ color: midCol, alpha: 0.95 })

  // 4. Inner Golden-Yellow Core Mantle
  const coreR = headR * 0.65 * (1.0 + Math.cos(t * 20) * 0.06)
  g.circle(x + cosA * (headR * 0.15), y + sinA * (headR * 0.15), coreR)
    .fill({ color: coreCol, alpha: 1.0 })

  // 5. White-Hot Solar Nucleus (Front Ignition Center)
  const nucleusR = headR * 0.32
  g.circle(x + cosA * (headR * 0.3), y + sinA * (headR * 0.3), nucleusR)
    .fill({ color: 0xffffff, alpha: 1.0 })

  // 6. Flying Micro-Embers / Sparks Blowing Backwards
  const emberCount = tier === 'strong' ? 5 : tier === 'middle' ? 3 : 2
  for (let e = 0; e < emberCount; e++) {
    const ePhase = t * (8 + e * 3) + e * 3.7
    const eDist = headR + (ePhase % 1.0) * (tailLen * 1.2)
    const eSpread = Math.sin(ePhase * 4) * (headR * 0.8)
    const eAlpha = (1.0 - (ePhase % 1.0)) * 0.9
    const ex = x - cosA * eDist + perpX * eSpread
    const ey = y - sinA * eDist + perpY * eSpread
    const eR = Math.max(1.0, (2.2 - (ePhase % 1.0) * 1.5) * scale)
    g.circle(ex, ey, eR).fill({ color: e % 2 === 0 ? 0xffffff : coreCol, alpha: eAlpha })
  }
}

/**
 * Procedural Aerodynamic Flame Rocket (PixiJS 8)
 */
function drawPixiProceduralRocket(
  g: Graphics,
  x: number,
  y: number,
  cosA: number,
  sinA: number,
  perpX: number,
  perpY: number,
  scale: number,
  time: number,
  def: any
) {
  const t = time * 0.001
  const len = (def.length ?? 28) * scale
  const w = Math.max(5, (def.size ?? 8) * 1.1) * scale
  
  const noseX = x + cosA * (len * 0.75)
  const noseY = y + sinA * (len * 0.75)
  const tailX = x - cosA * (len * 0.45)
  const tailY = y - sinA * (len * 0.45)
  const midX = x - cosA * (len * 0.05)
  const midY = y - sinA * (len * 0.05)

  // 1. Multi-Stage High-Velocity Jet Afterburner Exhaust
  const jetFlicker = Math.sin(t * 35) * 0.15 + 1.0
  const jetLen = len * 0.75 * jetFlicker
  const jetTipX = tailX - cosA * jetLen
  const jetTipY = tailY - sinA * jetLen
  
  // Outer orange thruster plume
  g.poly([
    { x: tailX + perpX * (w * 0.55), y: tailY + perpY * (w * 0.55) },
    { x: jetTipX, y: jetTipY },
    { x: tailX - perpX * (w * 0.55), y: tailY - perpY * (w * 0.55) },
  ]).fill({ color: def.trailColorHex || 0xfbbf24, alpha: 0.9 })

  // Inner superheated white-yellow jet needle
  const coreJetLen = jetLen * 0.55
  g.poly([
    { x: tailX + perpX * (w * 0.28), y: tailY + perpY * (w * 0.28) },
    { x: tailX - cosA * coreJetLen, y: tailY - sinA * coreJetLen },
    { x: tailX - perpX * (w * 0.28), y: tailY - perpY * (w * 0.28) },
  ]).fill({ color: 0xffffff, alpha: 1.0 })

  // 2. Aerodynamic Missile Hull (Sharpened Needle Warhead)
  g.poly([
    { x: noseX, y: noseY },
    { x: midX + perpX * w, y: midY + perpY * w },
    { x: tailX + perpX * (w * 0.6), y: tailY + perpY * (w * 0.6) },
    { x: tailX, y: tailY },
    { x: tailX - perpX * (w * 0.6), y: tailY - perpY * (w * 0.6) },
    { x: midX - perpX * w, y: midY - perpY * w },
  ]).fill({ color: def.colorHex || 0xf97316, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: def.trailColorHex || 0xfbbf24, alpha: 0.9 })

  // 3. Swept Flame Stabilizer Fins
  const finLick = Math.sin(t * 22) * 2.0 * scale
  g.poly([
    { x: midX + perpX * w, y: midY + perpY * w },
    { x: tailX - cosA * 4 * scale + perpX * (w * 1.5 + finLick), y: tailY - sinA * 4 * scale + perpY * (w * 1.5 + finLick) },
    { x: tailX + perpX * (w * 0.6), y: tailY + perpY * (w * 0.6) }
  ]).fill({ color: 0xef4444, alpha: 0.85 })
  g.poly([
    { x: midX - perpX * w, y: midY - perpY * w },
    { x: tailX - cosA * 4 * scale - perpX * (w * 1.5 + finLick), y: tailY - sinA * 4 * scale - perpY * (w * 1.5 + finLick) },
    { x: tailX - perpX * (w * 0.6), y: tailY - perpY * (w * 0.6) }
  ]).fill({ color: 0xef4444, alpha: 0.85 })

  // 4. Inner Molten Warhead Core
  g.poly([
    { x: noseX - cosA * 4 * scale, y: noseY - sinA * 4 * scale },
    { x: midX + perpX * (w * 0.45), y: midY + perpY * (w * 0.45) },
    { x: tailX + cosA * 3 * scale, y: tailY + sinA * 3 * scale },
    { x: midX - perpX * (w * 0.45), y: midY - perpY * (w * 0.45) },
  ]).fill({ color: def.sparkColorHex || 0xfef08a, alpha: 1.0 })

  // 5. Incandescent Nose Spark & Core Node
  g.circle(noseX, noseY, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  g.circle(midX, midY, 2.5 * scale).fill({ color: 0xffffff, alpha: 0.95 })
}

/**
 * Procedural Plasma Laser Beam (PixiJS 8)
 */
function drawPixiProceduralLaser(
  g: Graphics,
  startX: number,
  startY: number,
  renderX: number,
  renderY: number,
  scale: number,
  time: number,
  def: any
) {
  const t = time * 0.001
  const baseW = Math.max(3.5, (def.trailWidth ?? 5) * scale)
  const beamColor = def.colorHex || 0xf97316
  const glowColor = def.trailColorHex || 0xfbbf24
  const coreColor = def.sparkColorHex || 0xffffff

  const beamPulse = 1.0 + Math.sin(t * 20) * 0.08

  // Layer 1: Wide Outer Atmospheric Energy Bloom (Heat Shimmer)
  g.moveTo(startX, startY).lineTo(renderX, renderY)
    .stroke({ width: baseW * 3.8 * beamPulse, color: 0xef4444, alpha: 0.22, cap: 'round' })

  // Layer 2: Radiant Searing Plasma Flame Stream
  g.moveTo(startX, startY).lineTo(renderX, renderY)
    .stroke({ width: baseW * 2.0, color: glowColor, alpha: 0.75, cap: 'round' })

  // Layer 3: Focused Orange Plasma Beam
  g.moveTo(startX, startY).lineTo(renderX, renderY)
    .stroke({ width: baseW * 1.2, color: beamColor, alpha: 0.9, cap: 'round' })

  // Layer 4: Superheated White-Hot Core Laser Needle
  g.moveTo(startX, startY).lineTo(renderX, renderY)
    .stroke({ width: Math.max(1.8, baseW * 0.5), color: coreColor, alpha: 1.0, cap: 'round' })

  // Dynamic Energy Pulses racing along the beam
  const dist = Math.hypot(renderX - startX, renderY - startY)
  if (dist > 20) {
    const pulseFrac = (t * 4.0) % 1.0
    const px = startX + (renderX - startX) * pulseFrac
    const py = startY + (renderY - startY) * pulseFrac
    g.circle(px, py, baseW * 1.1).fill({ color: 0xffffff, alpha: 0.85 })
  }

  // Muzzle Flare & Solar Starburst at Tower Cannon Origin
  const mPulse = 1.0 + Math.sin(t * 25) * 0.15
  g.circle(startX, startY, baseW * 2.2 * mPulse).fill({ color: glowColor, alpha: 0.5 })
  g.circle(startX, startY, baseW * 1.2).fill({ color: 0xffffff, alpha: 0.95 })

  // Target Impact Plasma Orb & Boiling Spark Eruption
  const impPulse = 1.0 + Math.cos(t * 28) * 0.12
  g.circle(renderX, renderY, baseW * 2.8 * impPulse).fill({ color: 0xef4444, alpha: 0.35 })
  g.circle(renderX, renderY, baseW * 1.8).fill({ color: glowColor, alpha: 0.85 })
  g.circle(renderX, renderY, baseW * 0.9).fill({ color: 0xffffff, alpha: 1.0 })
}

/**
 * PixiJS 8 Rendering for all Projectile Types with Dynamic Scale & Handcrafted Shapes
 */
export function renderPixiProjectileHead(
  g: Graphics,
  type: string,
  renderX: number,
  renderY: number,
  angle: number,
  startX: number,
  startY: number,
  time: number,
  customConfig?: Partial<ProjectileConfig>
): void {
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const perpX = -sinA
  const perpY = cosA
  const baseDef = getProjectileDef(type)
  const def = customConfig ? { ...baseDef, ...customConfig } : baseDef
  const size = def.size ?? 10
  const scale = Math.max(0.3, size / 10)
  const shape = def.shape || 'circle'

  // 1. LASERS / BEAMS (AAA Multi-Layer Plasma Laser Cannon Beam)
  if (def.isLaser || type.includes('laser') || def.formation === 'laser_beam' || type === 'holy_ray' || type === 'fire_flamethrower' || type === 'poison_acid_spray') {
    drawPixiProceduralLaser(g, startX, startY, renderX, renderY, scale, time, def)
    return
  }

  // 2. ARROW
  if (shape === 'arrow') {
    const arrowLen = def.length ?? 24
    drawSinglePixiArrow(g, renderX, renderY, cosA, sinA, arrowLen, 0x92400e, def.colorHex || 0xf8fafc, 0x475569, scale)
  }
  // 3. DIAMOND SHARD (Faceted Crystal Lance)
  else if (shape === 'diamond_shard') {
    const polyTop = [
      { x: renderX + cosA * 20 * scale, y: renderY + sinA * 20 * scale },
      { x: renderX - cosA * 2 * scale - perpX * 8 * scale, y: renderY - sinA * 2 * scale - perpY * 8 * scale },
      { x: renderX - cosA * 16 * scale, y: renderY - sinA * 16 * scale },
    ]
    const polyBot = [
      { x: renderX + cosA * 20 * scale, y: renderY + sinA * 20 * scale },
      { x: renderX - cosA * 2 * scale + perpX * 8 * scale, y: renderY - sinA * 2 * scale + perpY * 8 * scale },
      { x: renderX - cosA * 16 * scale, y: renderY - sinA * 16 * scale },
    ]
    g.poly(polyTop).fill({ color: def.colorHex, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
    g.poly(polyBot).fill({ color: def.sparkColorHex, alpha: 0.85 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
    g.moveTo(renderX - cosA * 16 * scale, renderY - sinA * 16 * scale).lineTo(renderX + cosA * 20 * scale, renderY + sinA * 20 * scale).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
  }
  // 4. STAR
  else if (shape === 'star') {
    const rot = time * 0.012
    const pts = def.points ?? 4
    drawPixiStar(g, renderX, renderY, pts, 16.0 * scale, 5.5 * scale, rot, def.colorHex, 0.95)
    drawPixiStar(g, renderX, renderY, pts, 10.0 * scale, 3.5 * scale, rot + Math.PI / pts, def.sparkColorHex, 1.0)
    g.circle(renderX, renderY, 3.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 5. SAWBLADE
  else if (shape === 'sawblade') {
    const rot = time * 0.03
    g.circle(renderX, renderY, 14.0 * scale).fill({ color: 0x475569, alpha: 0.95 }).stroke({ width: 2.0 * scale, color: 0x1e293b, alpha: 1.0 })
    drawPixiStar(g, renderX, renderY, 10, 16.5 * scale, 10.5 * scale, rot, def.colorHex, 1.0)
    g.circle(renderX, renderY, 6.0 * scale).fill({ color: 0x0f172a, alpha: 1.0 }).stroke({ width: 1.5 * scale, color: def.sparkColorHex, alpha: 1.0 })
    g.circle(renderX, renderY, 2.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 6. SKULL
  else if (shape === 'skull') {
    g.circle(renderX, renderY, 11.5 * scale).fill({ color: def.colorHex, alpha: 0.95 }).stroke({ width: 1.5 * scale, color: 0x0f172a, alpha: 1.0 })
    const jawX = renderX + cosA * 6 * scale
    const jawY = renderY + sinA * 6 * scale
    g.roundRect(jawX - 5 * scale, jawY - 4 * scale, 10 * scale, 8 * scale, 2 * scale).fill({ color: def.colorHex, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: 0x0f172a, alpha: 1.0 })
    g.circle(renderX + cosA * 2 * scale - perpX * 4 * scale, renderY + sinA * 2 * scale - perpY * 4 * scale, 2.5 * scale).fill({ color: def.sparkColorHex, alpha: 1.0 })
    g.circle(renderX + cosA * 2 * scale + perpX * 4 * scale, renderY + sinA * 2 * scale + perpY * 4 * scale, 2.5 * scale).fill({ color: def.sparkColorHex, alpha: 1.0 })
    g.circle(renderX + cosA * 2 * scale - perpX * 4 * scale, renderY + sinA * 2 * scale - perpY * 4 * scale, 1.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    g.circle(renderX + cosA * 2 * scale + perpX * 4 * scale, renderY + sinA * 2 * scale + perpY * 4 * scale, 1.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 7. GREATSWORD
  else if (shape === 'greatsword') {
    const swordLen = def.length ?? 28
    const poly = [
      { x: renderX + cosA * swordLen * scale, y: renderY + sinA * swordLen * scale },
      { x: renderX - perpX * 8 * scale, y: renderY - perpY * 8 * scale },
      { x: renderX - cosA * 14 * scale, y: renderY - sinA * 14 * scale },
      { x: renderX + perpX * 8 * scale, y: renderY + perpY * 8 * scale },
    ]
    g.poly(poly).fill({ color: def.colorHex, alpha: 0.85 }).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
    g.moveTo(renderX - cosA * 14 * scale, renderY - sinA * 14 * scale).lineTo(renderX + cosA * swordLen * scale, renderY + sinA * swordLen * scale).stroke({ width: 3.0 * scale, color: def.sparkColorHex, alpha: 1.0 })
    g.moveTo(renderX - cosA * 10 * scale, renderY - sinA * 10 * scale).lineTo(renderX + cosA * (swordLen - 4) * scale, renderY + sinA * (swordLen - 4) * scale).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 1.0 })
  }
  // 8. HAMMER
  else if (shape === 'hammer') {
    const hx = renderX + cosA * 10 * scale
    const hy = renderY + sinA * 10 * scale
    g.moveTo(renderX - cosA * 14 * scale, renderY - sinA * 14 * scale).lineTo(hx, hy).stroke({ width: 4.0 * scale, color: 0x78350f, alpha: 1.0 })
    g.roundRect(hx - 7 * scale, hy - 7 * scale, 14 * scale, 14 * scale, 3 * scale).fill({ color: def.colorHex, alpha: 1.0 }).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
    g.circle(hx, hy, 3.5 * scale).fill({ color: def.sparkColorHex, alpha: 1.0 })
  }
  // 9. BOULDER
  else if (shape === 'boulder') {
    const r = 11.0 * scale
    g.circle(renderX, renderY, r).fill({ color: def.colorHex || 0x78716c, alpha: 1.0 }).stroke({ width: 1.8 * scale, color: 0x292524, alpha: 1.0 })
    g.circle(renderX - 3 * scale, renderY - 3 * scale, r * 0.4).fill({ color: def.sparkColorHex || 0xd6d3d1, alpha: 0.85 })
    g.circle(renderX + 3 * scale, renderY + 3 * scale, r * 0.25).fill({ color: 0x1c1917, alpha: 0.9 })
  }
  // 10. FEATHER
  else if (shape === 'feather') {
    const fLen = def.length ?? 24
    g.moveTo(renderX - cosA * (fLen * 0.6) * scale, renderY - sinA * (fLen * 0.6) * scale).lineTo(renderX + cosA * (fLen * 0.4) * scale, renderY + sinA * (fLen * 0.4) * scale).stroke({ width: 2.5 * scale, color: def.colorHex, alpha: 0.95 })
    g.circle(renderX + cosA * (fLen * 0.4) * scale, renderY + sinA * (fLen * 0.4) * scale, 3.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 11. SPEAR / LANCE
  else if (shape === 'spear_lance') {
    const lanceLen = def.length ?? 28
    const tipX = renderX + cosA * lanceLen * scale
    const tipY = renderY + sinA * lanceLen * scale
    const tailX = renderX - cosA * (lanceLen * 0.5) * scale
    const tailY = renderY - sinA * (lanceLen * 0.5) * scale
    g.moveTo(tailX, tailY).lineTo(tipX - cosA * 8 * scale, tipY - sinA * 8 * scale).stroke({ width: 2.2 * scale, color: 0x94a3b8, alpha: 1.0 })
    const guardX = tipX - cosA * 10 * scale
    const guardY = tipY - sinA * 10 * scale
    g.moveTo(guardX - perpX * 5 * scale, guardY - perpY * 5 * scale).lineTo(guardX + perpX * 5 * scale, guardY + perpY * 5 * scale).stroke({ width: 2.0 * scale, color: def.trailColorHex, alpha: 1.0 })
    g.poly([
      { x: tipX, y: tipY },
      { x: guardX + perpX * 3.5 * scale, y: guardY + perpY * 3.5 * scale },
      { x: guardX - cosA * 2 * scale, y: guardY - sinA * 2 * scale },
      { x: guardX - perpX * 3.5 * scale, y: guardY - perpY * 3.5 * scale },
    ]).fill({ color: def.colorHex, alpha: 1.0 }).stroke({ width: 1.0 * scale, color: 0xffffff, alpha: 1.0 })
    g.circle(tipX, tipY, 1.8 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 12. FLAME WISP / FLAME ROCKET (Fiery Aerodynamic Missile)
  else if (shape === 'flame_wisp' || (shape as string) === 'rocket' || (shape as string) === 'missile' || type === 'flame_rocket') {
    drawPixiProceduralRocket(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, time, def)
  }
  // 13. LIGHTNING BOLT
  else if (shape === 'lightning_bolt') {
    const len = (def.length ?? 24) * scale
    const p1 = { x: renderX + cosA * len, y: renderY + sinA * len }
    const p2 = { x: renderX + cosA * 4 * scale + perpX * 6 * scale, y: renderY + sinA * 4 * scale + perpY * 6 * scale }
    const p3 = { x: renderX + cosA * 6 * scale, y: renderY + sinA * 6 * scale }
    const p4 = { x: renderX - cosA * 8 * scale + perpX * 7 * scale, y: renderY - sinA * 8 * scale + perpY * 7 * scale }
    const p5 = { x: renderX - cosA * (len * 0.6), y: renderY - sinA * (len * 0.6) }
    g.poly([p1, p2, p3, p4, p5]).stroke({ width: 3.0 * scale, color: def.trailColorHex, alpha: 0.7 })
    g.poly([p1, p2, p3, p4, p5]).stroke({ width: 1.8 * scale, color: def.colorHex, alpha: 1.0 })
    g.circle(p1.x, p1.y, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 14. SHURIKEN
  else if (shape === 'shuriken') {
    const rot = time * 0.025
    drawPixiStar(g, renderX, renderY, 4, 14.0 * scale, 3.5 * scale, rot, def.colorHex, 1.0)
    g.circle(renderX, renderY, 4.0 * scale).fill({ color: 0x0f172a, alpha: 1.0 }).stroke({ width: 1.2 * scale, color: def.sparkColorHex, alpha: 1.0 })
    g.circle(renderX, renderY, 1.8 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 15. ENERGY ORB (Clean, no satellite circles)
  else if (shape === 'energy_orb') {
    const r = 8.0 * scale
    g.circle(renderX, renderY, r * 1.35).fill({ color: def.trailColorHex, alpha: 0.35 })
    g.circle(renderX, renderY, r).fill({ color: def.colorHex, alpha: 0.95 }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 0.9 })
    g.circle(renderX, renderY, r * 0.45).fill({ color: def.sparkColorHex || 0xffffff, alpha: 1.0 })
    g.circle(renderX, renderY, r * 0.2).fill({ color: 0xffffff, alpha: 1.0 })
  }
  // 16. ENERGY WAVE / CRESCENT BLADE
  else if (shape === 'energy_wave') {
    const wLen = (def.size ?? 12) * 1.2 * scale
    const tipX = renderX + cosA * 4 * scale
    const tipY = renderY + sinA * 4 * scale
    g.poly([
      { x: tipX + perpX * wLen, y: tipY + perpY * wLen },
      { x: tipX + cosA * 8 * scale, y: tipY + sinA * 8 * scale },
      { x: tipX - perpX * wLen, y: tipY - perpY * wLen },
      { x: tipX - cosA * 4 * scale, y: tipY - sinA * 4 * scale },
    ]).fill({ color: def.colorHex, alpha: 0.95 }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 1.0 })
    g.moveTo(tipX - perpX * (wLen * 0.7), tipY - perpY * (wLen * 0.7)).lineTo(tipX + perpX * (wLen * 0.7), tipY + perpY * (wLen * 0.7)).stroke({ width: 2.0 * scale, color: def.sparkColorHex, alpha: 1.0 })
  }
  // 17. ORGANIC FIREBALL / DEFAULT (Real procedural burning flame)
  else {
    const outerCol = def.shockwaveColorHex || 0xdc2626
    const midCol = def.colorHex || 0xf97316
    const coreCol = def.sparkColorHex || 0xfef08a

    let tier: 'simple' | 'middle' | 'strong' = 'simple'
    if (type === 'strong_flame' || size >= 18) {
      tier = 'strong'
    } else if (type === 'middle_flame' || size >= 12) {
      tier = 'middle'
    }

    drawPixiProceduralFlame(g, renderX, renderY, cosA, sinA, perpX, perpY, scale, time, tier, outerCol, midCol, coreCol)
  }

  // SATELLITES / ORBITING MINI-FLAMES (Only if satelliteCount > 0)
  const satCount = def.satelliteCount ?? (def.formation === 'satellites' ? 3 : 0)
  if (satCount > 0) {
    const orbitR = (13.0 + size * 0.9) * scale
    const satPulse = Math.sin(time * 0.035) * 1.5 * scale
    for (let s = 0; s < satCount; s++) {
      const sAng = time * 0.035 + (s * Math.PI * 2) / satCount
      const sx = renderX + Math.cos(sAng) * (orbitR + satPulse)
      const sy = renderY + Math.sin(sAng) * (orbitR + satPulse) * 0.65

      g.circle(sx, sy, 4.5 * scale).fill({ color: def.trailColorHex, alpha: 0.5 })
      g.circle(sx, sy, 2.8 * scale).fill({ color: def.sparkColorHex, alpha: 0.95 })
      g.circle(sx, sy, 1.2 * scale).fill({ color: 0xffffff, alpha: 1.0 })
    }
  }
}

/**
 * Procedural Organic Flaming Comet Fireball (HTML5 Canvas2D)
 */
function drawCanvasProceduralFlame(
  ctx: CanvasRenderingContext2D,
  time: number,
  tier: 'simple' | 'middle' | 'strong',
  outerCss: string,
  midCss: string,
  coreCss: string,
  sparkCss: string
) {
  const t = time * 0.001
  const headR = tier === 'strong' ? 14 : tier === 'middle' ? 10 : 7.5
  const tailLen = tier === 'strong' ? 32 : tier === 'middle' ? 22 : 16

  // 1. Outer Deep Red/Crimson Heat Aura (Pulsing)
  const auraPulse = 1.0 + Math.sin(t * 14) * 0.08
  const auraR = headR * 1.55 * auraPulse
  ctx.save()
  ctx.beginPath()
  ctx.arc(-2, 0, auraR, 0, Math.PI * 2)
  ctx.fillStyle = outerCss || '#dc2626'
  ctx.globalAlpha = 0.28
  ctx.fill()
  ctx.restore()

  // 2. Trailing Dancing Flame Lobes (Wisps licking backwards)
  const numTongues = tier === 'strong' ? 6 : tier === 'middle' ? 4 : 3
  for (let i = 0; i < numTongues; i++) {
    const frac = (i / (numTongues - 1 || 1)) - 0.5
    const phase = i * 2.1 + t * (15 + i * 3)
    const tongueLen = tailLen * (0.65 + Math.sin(phase) * 0.35) * (1 - Math.abs(frac) * 0.3)
    const tongueSpread = (headR * 0.85 * frac) + Math.cos(phase * 0.8) * 2.5
    const baseW = headR * (0.6 - Math.abs(frac) * 0.2)

    // Outer flame tongue
    ctx.beginPath()
    ctx.moveTo(0, tongueSpread + baseW)
    ctx.quadraticCurveTo(-tongueLen * 0.5, tongueSpread * 1.2, -tongueLen, tongueSpread)
    ctx.quadraticCurveTo(-tongueLen * 0.5, tongueSpread * 0.8, 0, tongueSpread - baseW)
    ctx.lineTo(headR * 0.4, 0)
    ctx.closePath()
    ctx.fillStyle = midCss || '#f97316'
    ctx.globalAlpha = 0.85
    ctx.fill()

    // Inner golden flame tongue
    const innerLen = tongueLen * 0.6
    ctx.beginPath()
    ctx.moveTo(0, (tongueSpread + baseW) * 0.5)
    ctx.quadraticCurveTo(-innerLen * 0.5, tongueSpread * 0.7, -innerLen, tongueSpread * 0.7)
    ctx.quadraticCurveTo(-innerLen * 0.5, tongueSpread * 0.3, 0, (tongueSpread - baseW) * 0.5)
    ctx.closePath()
    ctx.fillStyle = coreCss || '#fbbf24'
    ctx.globalAlpha = 0.95
    ctx.fill()
  }

  // 3. Main Fireball Plasma Body
  const headPulse = 1.0 + Math.sin(t * 18) * 0.05
  ctx.beginPath()
  ctx.arc(0, 0, headR * headPulse, 0, Math.PI * 2)
  ctx.fillStyle = midCss || '#f97316'
  ctx.globalAlpha = 0.95
  ctx.fill()

  // 4. Inner Golden-Yellow Core
  const coreR = headR * 0.65 * (1.0 + Math.cos(t * 20) * 0.06)
  ctx.beginPath()
  ctx.arc(headR * 0.15, 0, coreR, 0, Math.PI * 2)
  ctx.fillStyle = sparkCss || '#fef08a'
  ctx.globalAlpha = 1.0
  ctx.fill()

  // 5. White-Hot Ignition Nucleus
  const nucleusR = headR * 0.32
  ctx.beginPath()
  ctx.arc(headR * 0.3, 0, nucleusR, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 1.0
  ctx.fill()

  // 6. Flying Micro-Embers / Sparks Blowing Backwards
  const emberCount = tier === 'strong' ? 5 : tier === 'middle' ? 3 : 2
  for (let e = 0; e < emberCount; e++) {
    const ePhase = t * (8 + e * 3) + e * 3.7
    const eDist = headR + (ePhase % 1.0) * (tailLen * 1.2)
    const eSpread = Math.sin(ePhase * 4) * (headR * 0.8)
    const eAlpha = (1.0 - (ePhase % 1.0)) * 0.9
    const eR = Math.max(1.0, 2.2 - (ePhase % 1.0) * 1.5)
    ctx.beginPath()
    ctx.arc(-eDist, eSpread, eR, 0, Math.PI * 2)
    ctx.fillStyle = e % 2 === 0 ? '#ffffff' : (coreCss || '#fbbf24')
    ctx.globalAlpha = eAlpha
    ctx.fill()
  }
}

/**
 * Procedural Aerodynamic Flame Rocket (Canvas2D)
 */
function drawCanvasProceduralRocket(
  ctx: CanvasRenderingContext2D,
  time: number,
  len: number,
  w: number,
  colCss: string,
  trailCss: string,
  sparkCss: string
) {
  const t = time * 0.001
  const noseX = len * 0.75
  const tailX = -len * 0.45
  const midX = -len * 0.05

  // 1. Afterburner Jet Thruster Exhaust
  const jetFlicker = Math.sin(t * 35) * 0.15 + 1.0
  const jetLen = len * 0.75 * jetFlicker
  
  // Outer thruster cone
  ctx.beginPath()
  ctx.moveTo(tailX, w * 0.55)
  ctx.lineTo(tailX - jetLen, 0)
  ctx.lineTo(tailX, -w * 0.55)
  ctx.closePath()
  ctx.fillStyle = trailCss || '#fbbf24'
  ctx.globalAlpha = 0.9
  ctx.fill()

  // Inner superheated white-yellow jet
  ctx.beginPath()
  ctx.moveTo(tailX, w * 0.28)
  ctx.lineTo(tailX - jetLen * 0.55, 0)
  ctx.lineTo(tailX, -w * 0.28)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 1.0
  ctx.fill()

  // 2. Aerodynamic Missile Hull
  ctx.beginPath()
  ctx.moveTo(noseX, 0)
  ctx.lineTo(midX, -w)
  ctx.lineTo(tailX, -w * 0.6)
  ctx.lineTo(tailX, w * 0.6)
  ctx.lineTo(midX, w)
  ctx.closePath()
  ctx.fillStyle = colCss || '#f97316'
  ctx.globalAlpha = 0.95
  ctx.fill()
  ctx.strokeStyle = trailCss || '#fbbf24'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // 3. Swept Flame Stabilizer Fins
  const finLick = Math.sin(t * 22) * 2.0
  ctx.beginPath()
  ctx.moveTo(midX, -w)
  ctx.lineTo(tailX - 4, -(w * 1.5 + finLick))
  ctx.lineTo(tailX, -w * 0.6)
  ctx.closePath()
  ctx.fillStyle = '#ef4444'
  ctx.globalAlpha = 0.85
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(midX, w)
  ctx.lineTo(tailX - 4, (w * 1.5 + finLick))
  ctx.lineTo(tailX, w * 0.6)
  ctx.closePath()
  ctx.fillStyle = '#ef4444'
  ctx.globalAlpha = 0.85
  ctx.fill()

  // 4. Inner Molten Warhead Core
  ctx.beginPath()
  ctx.moveTo(noseX - 4, 0)
  ctx.lineTo(midX, -w * 0.45)
  ctx.lineTo(tailX + 3, 0)
  ctx.lineTo(midX, w * 0.45)
  ctx.closePath()
  ctx.fillStyle = sparkCss || '#fef08a'
  ctx.globalAlpha = 1.0
  ctx.fill()

  // 5. Incandescent Nose Spark & Core
  ctx.beginPath()
  ctx.arc(noseX, 0, 2.0, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 1.0
  ctx.fill()

  ctx.beginPath()
  ctx.arc(midX, 0, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.95
  ctx.fill()
}

/**
 * Procedural Plasma Laser Beam (Canvas2D)
 */
function drawCanvasProceduralLaser(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  renderX: number,
  renderY: number,
  scale: number,
  time: number,
  def: any
) {
  const t = time * 0.001
  const baseW = Math.max(3.5, (def.trailWidth ?? 5) * scale)
  const beamColor = def.colorCss || '#f97316'
  const glowColor = def.trailColorCss || '#fbbf24'
  const coreColor = def.sparkColorCss || '#ffffff'

  const beamPulse = 1.0 + Math.sin(t * 20) * 0.08

  ctx.save()
  // Layer 1: Wide Outer Atmospheric Energy Bloom (Heat Shimmer)
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(renderX, renderY)
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = baseW * 3.8 * beamPulse
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.22
  ctx.stroke()

  // Layer 2: Radiant Searing Plasma Flame Stream
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(renderX, renderY)
  ctx.strokeStyle = glowColor
  ctx.lineWidth = baseW * 2.0
  ctx.globalAlpha = 0.75
  ctx.stroke()

  // Layer 3: Focused Orange Plasma Beam
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(renderX, renderY)
  ctx.strokeStyle = beamColor
  ctx.lineWidth = baseW * 1.2
  ctx.globalAlpha = 0.9
  ctx.stroke()

  // Layer 4: Superheated White-Hot Core Laser Needle
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(renderX, renderY)
  ctx.strokeStyle = coreColor
  ctx.lineWidth = Math.max(1.8, baseW * 0.5)
  ctx.globalAlpha = 1.0
  ctx.stroke()

  // Dynamic Energy Pulses
  const dist = Math.hypot(renderX - startX, renderY - startY)
  if (dist > 20) {
    const pulseFrac = (t * 4.0) % 1.0
    const px = startX + (renderX - startX) * pulseFrac
    const py = startY + (renderY - startY) * pulseFrac
    ctx.beginPath()
    ctx.arc(px, py, baseW * 1.1, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.85
    ctx.fill()
  }

  // Muzzle Flare
  const mPulse = 1.0 + Math.sin(t * 25) * 0.15
  ctx.beginPath()
  ctx.arc(startX, startY, baseW * 2.2 * mPulse, 0, Math.PI * 2)
  ctx.fillStyle = glowColor
  ctx.globalAlpha = 0.5
  ctx.fill()

  ctx.beginPath()
  ctx.arc(startX, startY, baseW * 1.2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.95
  ctx.fill()

  // Target Impact
  const impPulse = 1.0 + Math.cos(t * 28) * 0.12
  ctx.beginPath()
  ctx.arc(renderX, renderY, baseW * 2.8 * impPulse, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444'
  ctx.globalAlpha = 0.35
  ctx.fill()

  ctx.beginPath()
  ctx.arc(renderX, renderY, baseW * 1.8, 0, Math.PI * 2)
  ctx.fillStyle = glowColor
  ctx.globalAlpha = 0.85
  ctx.fill()

  ctx.beginPath()
  ctx.arc(renderX, renderY, baseW * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 1.0
  ctx.fill()
  ctx.restore()
}

/**
 * Unified HTML5 Canvas2D Trail Renderer for all projectiles and canvases (Arena, Preview, Studio)
 */
export function renderCanvasProjectileTrail(
  ctx: CanvasRenderingContext2D,
  trail: { x: number; y: number; alpha?: number }[],
  def: ProjectileDef | ProjectileConfig | any,
  nowTime: number = performance.now()
): void {
  if (!trail || trail.length < 2) return
  if (def.isLaser || def.formation === 'laser_beam') return

  const style = def.trailStyle || (def.shape === 'arrow' || def.shape === 'feather' ? 'particles' : 'solid_line')
  if (style === 'none') return

  const trailColor = def.trailColorCss || '#fbbf24'
  const trailAlpha = def.trailAlpha ?? 0.8
  const trailWidth = def.trailWidth ?? 4
  const isFireProj = def.category === 'fire' || def.id?.includes('flame') || def.id?.includes('fire')

  if (style === 'particles') {
    ctx.save()
    for (let t = 0; t < trail.length; t++) {
      const pt = trail[t]
      const frac = (t + 1) / trail.length
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, Math.max(0.8, frac * trailWidth * 0.75), 0, Math.PI * 2)
      ctx.fillStyle = trailColor
      ctx.globalAlpha = frac * trailAlpha
      ctx.fill()
    }
    ctx.restore()
    return
  }

  if (style === 'glow_streak') {
    ctx.save()
    // Outer glow
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let t = 1; t < trail.length; t++) {
      ctx.lineTo(trail[t].x, trail[t].y)
    }
    ctx.strokeStyle = trailColor
    ctx.lineWidth = Math.max(1.5, trailWidth * 2.2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = trailAlpha * 0.35
    ctx.stroke()

    // Inner core
    ctx.beginPath()
    ctx.moveTo(trail[0].x, trail[0].y)
    for (let t = 1; t < trail.length; t++) {
      ctx.lineTo(trail[t].x, trail[t].y)
    }
    ctx.strokeStyle = trailColor
    ctx.lineWidth = trailWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = trailAlpha * 0.9
    ctx.stroke()
    ctx.restore()
    return
  }

  if (style === 'solid_line') {
    if (isFireProj) {
      // 1. Outer Crimson Combustion Heat Shimmer
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) {
        ctx.lineTo(trail[t].x, trail[t].y)
      }
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = Math.max(2.0, trailWidth * 2.8)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = trailAlpha * 0.35
      ctx.stroke()

      // 2. Mid Roaring Orange Flame Body
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) {
        ctx.lineTo(trail[t].x, trail[t].y)
      }
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = Math.max(1.5, trailWidth * 1.6)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = trailAlpha * 0.75
      ctx.stroke()

      // 3. Blazing Golden-Yellow Incandescent Core
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) {
        ctx.lineTo(trail[t].x, trail[t].y)
      }
      ctx.strokeStyle = trailColor
      ctx.lineWidth = Math.max(1.0, trailWidth * 0.8)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = trailAlpha * 0.95
      ctx.stroke()

      // 4. Floating Micro-Embers along trail path
      for (let t = 0; t < trail.length - 1; t += 2) {
        const pt = trail[t]
        const eJitterX = Math.sin(nowTime * 0.01 + t * 4) * 2.0
        const eJitterY = Math.cos(nowTime * 0.01 + t * 4) * 2.0
        const eFrac = (t + 1) / trail.length
        ctx.beginPath()
        ctx.arc(pt.x + eJitterX, pt.y + eJitterY, Math.max(1.0, 2.0 * eFrac), 0, Math.PI * 2)
        ctx.fillStyle = t % 4 === 0 ? '#ffffff' : '#fef08a'
        ctx.globalAlpha = eFrac * 0.9
        ctx.fill()
      }
      ctx.restore()
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let t = 1; t < trail.length; t++) {
        ctx.lineTo(trail[t].x, trail[t].y)
      }
      ctx.strokeStyle = trailColor
      ctx.lineWidth = trailWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = trailAlpha
      ctx.stroke()
      ctx.restore()
    }
  }
}

/**
 * HTML5 Canvas2D Rendering for all Projectile Types with Dynamic Scale & Handcrafted Shapes
 */
export function renderCanvasProjectileHead(
  ctx: CanvasRenderingContext2D,
  type: string,
  renderX: number,
  renderY: number,
  angle: number,
  startX: number,
  startY: number,
  progress: number,
  time: number,
  customConfig?: Partial<ProjectileConfig>
): void {
  const baseDef = getProjectileDef(type)
  const def = customConfig ? { ...baseDef, ...customConfig } : baseDef
  const size = def.size ?? 10
  const scale = Math.max(0.3, size / 10)
  const shape = def.shape || 'circle'

  // 1. LASERS / BEAMS (AAA Multi-Layer Plasma Laser Cannon Beam)
  if (def.isLaser || type.includes('laser') || def.formation === 'laser_beam' || type === 'holy_ray' || type === 'fire_flamethrower' || type === 'poison_acid_spray') {
    drawCanvasProceduralLaser(ctx, startX, startY, renderX, renderY, scale, time, def)
    return
  }

  ctx.save()
  ctx.translate(renderX, renderY)
  ctx.rotate(angle)
  ctx.scale(scale, scale)

  // 2. ARROW (Sharpened Broadhead Hunting Arrow)
  if (shape === 'arrow') {
    const arrowLen = def.length ?? 24
    const shaft = '#92400e'
    const tip = def.colorCss || '#f8fafc'
    const stroke = '#334155'
    drawSingleCanvasArrow(ctx, arrowLen, shaft, tip, stroke)
  }
  // 3. DIAMOND SHARD (Faceted Crystal Lance)
  else if (shape === 'diamond_shard') {
    // Top reflective facet
    ctx.beginPath()
    ctx.moveTo(20, 0)
    ctx.lineTo(-2, -8)
    ctx.lineTo(-16, 0)
    ctx.closePath()
    ctx.fillStyle = def.colorCss
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Bottom shaded facet
    ctx.beginPath()
    ctx.moveTo(20, 0)
    ctx.lineTo(-2, 8)
    ctx.lineTo(-16, 0)
    ctx.closePath()
    ctx.fillStyle = def.sparkColorCss
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // White crystal ridge
    ctx.beginPath()
    ctx.moveTo(-16, 0)
    ctx.lineTo(20, 0)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.0
    ctx.stroke()
  }
  // 4. STAR (Dynamic Elemental Starburst / Nova)
  else if (shape === 'star') {
    const rot = time * 0.012
    const pts = def.points ?? 4
    // Outer star
    drawCanvasStar(ctx, 0, 0, pts, 16.0, 5.5, rot, def.colorCss)
    // Inner counter-star
    drawCanvasStar(ctx, 0, 0, pts, 10.0, 3.5, rot + Math.PI / pts, def.sparkColorCss)
    // Center glowing core
    ctx.beginPath()
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 5. SAWBLADE (Razor Chakram with Cutting Teeth)
  else if (shape === 'sawblade') {
    const rot = time * 0.03
    ctx.beginPath()
    ctx.arc(0, 0, 14.0, 0, Math.PI * 2)
    ctx.fillStyle = '#475569'
    ctx.fill()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.0
    ctx.stroke()

    // Sharp angled saw teeth
    drawCanvasStar(ctx, 0, 0, 10, 16.5, 10.5, rot, def.colorCss)

    // Center mechanical hub
    ctx.beginPath()
    ctx.arc(0, 0, 6.0, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 6. SKULL (Demonic Flame Skull with Burning Eyes)
  else if (shape === 'skull') {
    // Cranium
    ctx.beginPath()
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2)
    ctx.fillStyle = def.colorCss
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Jaw
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(4, -4, 10, 8, 2)
    ctx.fill()
    ctx.stroke()

    // Burning eye sockets
    ctx.beginPath()
    ctx.arc(2, -4, 2.5, 0, Math.PI * 2)
    ctx.arc(2, 4, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = def.sparkColorCss
    ctx.fill()

    ctx.beginPath()
    ctx.arc(2, -4, 1.0, 0, Math.PI * 2)
    ctx.arc(2, 4, 1.0, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 7. GREATSWORD (Heavy Zweihander Blade)
  else if (shape === 'greatsword') {
    const swordLen = def.length ?? 28
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(swordLen, 0)
    ctx.lineTo(0, -8)
    ctx.lineTo(-14, 0)
    ctx.lineTo(0, 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Radiant fuller groove
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 3.0
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(swordLen, 0)
    ctx.stroke()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(swordLen - 4, 0)
    ctx.stroke()
  }
  // 8. HAMMER (Warhammer with Solid Impact Head)
  else if (shape === 'hammer') {
    // Haft
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 4.0
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(10, 0)
    ctx.stroke()

    // Head block
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.roundRect(3, -7, 14, 14, 3)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(10, 0, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = def.sparkColorCss
    ctx.fill()
  }
  // 9. BOULDER (Craggy Stone Meteor)
  else if (shape === 'boulder') {
    const r = 11.0
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = def.colorCss || '#78716c'
    ctx.fill()
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Shading facets
    ctx.beginPath()
    ctx.arc(-3, -3, r * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = def.sparkColorCss || '#d6d3d1'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(3, 3, r * 0.25, 0, Math.PI * 2)
    ctx.fillStyle = '#1c1917'
    ctx.fill()
  }
  // 10. FEATHER (Aerodynamic Quill Dart)
  else if (shape === 'feather') {
    const fLen = def.length ?? 24
    ctx.strokeStyle = def.colorCss
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-fLen * 0.6, 0)
    ctx.lineTo(fLen * 0.4, 0)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(fLen * 0.4, 0, 3.0, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 11. SPEAR / LANCE (Energy-Tipped Heavy Javelin)
  else if (shape === 'spear_lance') {
    const lanceLen = def.length ?? 28
    // Shaft
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-lanceLen * 0.5, 0)
    ctx.lineTo(lanceLen - 8, 0)
    ctx.stroke()

    // Guard
    ctx.strokeStyle = def.trailColorCss
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(lanceLen - 10, -5)
    ctx.lineTo(lanceLen - 10, 5)
    ctx.stroke()

    // Spearhead
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.0
    ctx.beginPath()
    ctx.moveTo(lanceLen, 0)
    ctx.lineTo(lanceLen - 10, -3.5)
    ctx.lineTo(lanceLen - 12, 0)
    ctx.lineTo(lanceLen - 10, 3.5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Glowing Tip
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(lanceLen, 0, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // 12. FLAME WISP / FLAME ROCKET (Fiery Aerodynamic Missile)
  else if (shape === 'flame_wisp' || (shape as string) === 'rocket' || (shape as string) === 'missile' || type === 'flame_rocket') {
    const fLen = def.length ?? 28
    const wingW = Math.max(5, (def.size ?? 8) * 1.1)
    drawCanvasProceduralRocket(ctx, time, fLen, wingW, def.colorCss || '#f97316', def.trailColorCss || '#fbbf24', def.sparkColorCss || '#fef08a')
  }
  // 13. LIGHTNING BOLT
  else if (shape === 'lightning_bolt') {
    const len = def.length ?? 24
    ctx.strokeStyle = def.trailColorCss
    ctx.lineWidth = 3.0
    ctx.beginPath()
    ctx.moveTo(len, 0)
    ctx.lineTo(4, 6)
    ctx.lineTo(6, 0)
    ctx.lineTo(-8, 7)
    ctx.lineTo(-len * 0.6, 0)
    ctx.stroke()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(len, 0, 2.0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 14. SHURIKEN
  else if (shape === 'shuriken') {
    const rot = time * 0.025
    drawCanvasStar(ctx, 0, 0, 4, 14.0, 3.5, rot, def.colorCss)

    ctx.beginPath()
    ctx.arc(0, 0, 4.0, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 15. ENERGY ORB (Clean, no satellite circles)
  else if (shape === 'energy_orb') {
    const r = 8.0
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2)
    ctx.fillStyle = def.trailColorCss
    ctx.globalAlpha = 0.35
    ctx.fill()
    ctx.globalAlpha = 1.0

    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = def.colorCss
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = def.sparkColorCss || '#ffffff'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
  // 16. ENERGY WAVE / CRESCENT BLADE
  else if (shape === 'energy_wave') {
    const wLen = (def.size ?? 12) * 1.2
    ctx.beginPath()
    ctx.moveTo(4, -wLen)
    ctx.quadraticCurveTo(8, 0, 4, wLen)
    ctx.quadraticCurveTo(-4, 0, 4, -wLen)
    ctx.closePath()
    ctx.fillStyle = def.colorCss
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -wLen * 0.7)
    ctx.quadraticCurveTo(3, 0, 0, wLen * 0.7)
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 2.0
    ctx.stroke()
  }
  // 17. ORGANIC FIREBALL / DEFAULT (Real procedural burning flame)
  else {
    const outerCss = def.shockwaveColorCss || '#dc2626'
    const midCss = def.colorCss || '#f97316'
    const coreCss = def.trailColorCss || '#fbbf24'
    const sparkCss = def.sparkColorCss || '#fef08a'

    let tier: 'simple' | 'middle' | 'strong' = 'simple'
    if (type === 'strong_flame' || size >= 18) {
      tier = 'strong'
    } else if (type === 'middle_flame' || size >= 12) {
      tier = 'middle'
    }

    drawCanvasProceduralFlame(ctx, time, tier, outerCss, midCss, coreCss, sparkCss)
  }

  // SATELLITES / ORBITING MINI-FLAMES & SPARKS (Only if satelliteCount > 0)
  const satCount = def.satelliteCount ?? (def.formation === 'satellites' ? 3 : 0)
  if (satCount > 0) {
    const orbitR = 14.0 + (def.size || 10) * 0.8
    const satPulse = Math.sin(time * 0.035) * 1.5
    for (let s = 0; s < satCount; s++) {
      const sAng = time * 0.035 + (s * Math.PI * 2) / satCount
      const sx = Math.cos(sAng) * (orbitR + satPulse)
      const sy = Math.sin(sAng) * (orbitR + satPulse) * 0.65

      ctx.beginPath()
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = def.trailColorCss
      ctx.globalAlpha = 0.5
      ctx.fill()

      ctx.beginPath()
      ctx.arc(sx, sy, 2.8, 0, Math.PI * 2)
      ctx.fillStyle = def.sparkColorCss
      ctx.globalAlpha = 0.95
      ctx.fill()

      ctx.beginPath()
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 1.0
      ctx.fill()
    }
  }

  ctx.restore()
}

/**
 * Generates ready-to-copy, clean PixiJS 8 Rendering Code for the given Projectile configuration
 */
export function generatePixiCodeSnippet(def: Partial<ProjectileConfig>): string {
  const shape = def.shape || 'circle'
  const colHex = '0x' + (def.colorHex || 0xf97316).toString(16).padStart(6, '0')
  const trailHex = '0x' + (def.trailColorHex || 0xfbbf24).toString(16).padStart(6, '0')
  const sparkHex = '0x' + (def.sparkColorHex || 0xfef08a).toString(16).padStart(6, '0')
  const size = def.size ?? 12
  const length = def.length ?? 28
  const satCount = def.satelliteCount ?? 0
  const scaleVal = Math.max(0.3, size / 10).toFixed(2)

  let shapeCode = ''
  if (def.isLaser) {
    shapeCode = `  // AAA Multi-Layer Plasma Laser Beam
  const baseW = Math.max(3.5, ${(def.trailWidth ?? 5)} * scale)
  // Layer 1: Wide Outer Atmospheric Energy Bloom (Glow)
  g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: baseW * 3.8, color: 0xef4444, alpha: 0.22, cap: 'round' })
  // Layer 2: Radiant Searing Plasma Flame Stream
  g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: baseW * 2.0, color: ${trailHex}, alpha: 0.75, cap: 'round' })
  // Layer 3: Focused Orange Plasma Beam
  g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: baseW * 1.2, color: ${colHex}, alpha: 0.9, cap: 'round' })
  // Layer 4: Blazing White-Hot Core Laser Needle
  g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: Math.max(1.8, baseW * 0.5), color: ${sparkHex}, alpha: 1.0, cap: 'round' })
  // Muzzle Pulse Flare
  g.circle(startX, startY, baseW * 2.2).fill({ color: ${trailHex}, alpha: 0.5 })
  g.circle(startX, startY, baseW * 1.2).fill({ color: 0xffffff, alpha: 0.95 })
  // Target Impact Plasma Orb & Radiant Spark Ring
  g.circle(renderX, renderY, baseW * 2.8).fill({ color: 0xef4444, alpha: 0.35 })
  g.circle(renderX, renderY, baseW * 1.8).fill({ color: ${trailHex}, alpha: 0.85 })
  g.circle(renderX, renderY, baseW * 0.9).fill({ color: 0xffffff, alpha: 1.0 })`
  } else if (shape === 'flame_wisp' || (shape as string) === 'rocket' || (shape as string) === 'missile') {
    shapeCode = `  // Aerodynamic Missile Hull & Thruster Jet Flame
  const fLen = ${(length || 28)} * scale
  const wingW = Math.max(5, ${size} * 1.1) * scale
  const tipX = renderX + cosA * (fLen * 0.75)
  const tipY = renderY + sinA * (fLen * 0.75)
  const tailX = renderX - cosA * (fLen * 0.45)
  const tailY = renderY - sinA * (fLen * 0.45)
  const midX = renderX - cosA * (fLen * 0.05)
  const midY = renderY - sinA * (fLen * 0.05)

  // 1. Afterburner Jet Thruster Exhaust
  const jetLen = fLen * 0.75 * (Math.sin(time * 0.035) * 0.15 + 1.0)
  g.poly([
    { x: tailX + perpX * (wingW * 0.55), y: tailY + perpY * (wingW * 0.55) },
    { x: tailX - cosA * jetLen, y: tailY - sinA * jetLen },
    { x: tailX - perpX * (wingW * 0.55), y: tailY - perpY * (wingW * 0.55) },
  ]).fill({ color: ${trailHex}, alpha: 0.9 })
  g.poly([
    { x: tailX + perpX * (wingW * 0.28), y: tailY + perpY * (wingW * 0.28) },
    { x: tailX - cosA * (jetLen * 0.55), y: tailY - sinA * (jetLen * 0.55) },
    { x: tailX - perpX * (wingW * 0.28), y: tailY - perpY * (wingW * 0.28) },
  ]).fill({ color: 0xffffff, alpha: 1.0 })

  // 2. Outer Aerodynamic Missile Hull
  g.poly([
    { x: tipX, y: tipY },
    { x: midX + perpX * wingW, y: midY + perpY * wingW },
    { x: tailX + perpX * (wingW * 0.6), y: tailY + perpY * (wingW * 0.6) },
    { x: tailX, y: tailY },
    { x: tailX - perpX * (wingW * 0.6), y: tailY - perpY * (wingW * 0.6) },
    { x: midX - perpX * wingW, y: midY - perpY * wingW },
  ]).fill({ color: ${colHex}, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: ${trailHex}, alpha: 0.9 })

  // 3. Inner Molten Hot Core
  g.poly([
    { x: tipX - cosA * 4 * scale, y: tipY - sinA * 4 * scale },
    { x: midX + perpX * (wingW * 0.45), y: midY + perpY * (wingW * 0.45) },
    { x: tailX + cosA * 3 * scale, y: tailY + sinA * 3 * scale },
    { x: midX - perpX * (wingW * 0.45), y: midY - perpY * (wingW * 0.45) },
  ]).fill({ color: ${sparkHex}, alpha: 1.0 })

  // 4. Blazing White Tip & Core Spark
  g.circle(tipX, tipY, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  g.circle(midX, midY, 2.5 * scale).fill({ color: 0xffffff, alpha: 0.95 })`
  } else if (shape === 'spear_lance') {
    shapeCode = `  // 1. Spear / Energy Lance Shaft & Guard
  const tipX = renderX + cosA * ${length} * scale
  const tipY = renderY + sinA * ${length} * scale
  const tailX = renderX - cosA * ${Math.round(length * 0.5)} * scale
  const tailY = renderY - sinA * ${Math.round(length * 0.5)} * scale
  g.moveTo(tailX, tailY).lineTo(tipX - cosA * 8 * scale, tipY - sinA * 8 * scale).stroke({ width: 2.2 * scale, color: 0x94a3b8, alpha: 1.0 })
  const guardX = tipX - cosA * 10 * scale
  const guardY = tipY - sinA * 10 * scale
  g.moveTo(guardX - perpX * 5 * scale, guardY - perpY * 5 * scale).lineTo(guardX + perpX * 5 * scale, guardY + perpY * 5 * scale).stroke({ width: 2.0 * scale, color: ${trailHex}, alpha: 1.0 })
  // 2. Spearhead Blade
  g.poly([
    { x: tipX, y: tipY },
    { x: guardX + perpX * 3.5 * scale, y: guardY + perpY * 3.5 * scale },
    { x: guardX - cosA * 2 * scale, y: guardY - sinA * 2 * scale },
    { x: guardX - perpX * 3.5 * scale, y: guardY - perpY * 3.5 * scale },
  ]).fill({ color: ${colHex}, alpha: 1.0 }).stroke({ width: 1.0 * scale, color: 0xffffff, alpha: 1.0 })
  g.circle(tipX, tipY, 1.8 * scale).fill({ color: 0xffffff, alpha: 1.0 })`
  } else if (shape === 'energy_orb') {
    shapeCode = `  // Clean Glowing Energy Orb
  const r = 8.0 * scale
  g.circle(renderX, renderY, r * 1.35).fill({ color: ${trailHex}, alpha: 0.35 })
  g.circle(renderX, renderY, r).fill({ color: ${colHex}, alpha: 0.95 }).stroke({ width: 1.5 * scale, color: 0xffffff, alpha: 0.9 })
  g.circle(renderX, renderY, r * 0.45).fill({ color: ${sparkHex}, alpha: 1.0 })
  g.circle(renderX, renderY, r * 0.2).fill({ color: 0xffffff, alpha: 1.0 })`
  } else if (shape === 'arrow') {
    shapeCode = `  // Hunting Broadhead Arrow
  const arrowLen = ${length}
  const tipX = renderX + cosA * 4 * scale
  const tipY = renderY + sinA * 4 * scale
  const tailX = tipX - cosA * arrowLen * scale
  const tailY = tipY - sinA * arrowLen * scale
  g.moveTo(tailX, tailY).lineTo(tipX - cosA * 3 * scale, tipY - sinA * 3 * scale).stroke({ width: 1.8 * scale, color: 0x92400e, alpha: 1.0 })
  const headBaseX = tipX - cosA * 6 * scale
  const headBaseY = tipY - sinA * 6 * scale
  g.poly([
    { x: tipX, y: tipY },
    { x: headBaseX - perpX * 2.8 * scale, y: headBaseY - perpY * 2.8 * scale },
    { x: headBaseX - cosA * 1.5 * scale, y: headBaseY - sinA * 1.5 * scale },
    { x: headBaseX + perpX * 2.8 * scale, y: headBaseY + perpY * 2.8 * scale },
  ]).fill({ color: ${colHex}, alpha: 1.0 }).stroke({ width: 0.8 * scale, color: 0x475569, alpha: 1.0 })`
  } else if (shape === 'diamond_shard') {
    shapeCode = `  // Faceted Crystal Lance
  const polyTop = [
    { x: renderX + cosA * 20 * scale, y: renderY + sinA * 20 * scale },
    { x: renderX - cosA * 2 * scale - perpX * 8 * scale, y: renderY - sinA * 2 * scale - perpY * 8 * scale },
    { x: renderX - cosA * 16 * scale, y: renderY - sinA * 16 * scale },
  ]
  const polyBot = [
    { x: renderX + cosA * 20 * scale, y: renderY + sinA * 20 * scale },
    { x: renderX - cosA * 2 * scale + perpX * 8 * scale, y: renderY - sinA * 2 * scale + perpY * 8 * scale },
    { x: renderX - cosA * 16 * scale, y: renderY - sinA * 16 * scale },
  ]
  g.poly(polyTop).fill({ color: ${colHex}, alpha: 0.95 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
  g.poly(polyBot).fill({ color: ${sparkHex}, alpha: 0.85 }).stroke({ width: 1.2 * scale, color: 0xffffff, alpha: 1.0 })
  g.moveTo(renderX - cosA * 16 * scale, renderY - sinA * 16 * scale).lineTo(renderX + cosA * 20 * scale, renderY + sinA * 20 * scale).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })`
  } else if (shape === 'lightning_bolt') {
    shapeCode = `  // Zigzag Lightning Arc Spear
  const len = ${length} * scale
  const p1 = { x: renderX + cosA * len, y: renderY + sinA * len }
  const p2 = { x: renderX + cosA * 4 * scale + perpX * 6 * scale, y: renderY + sinA * 4 * scale + perpY * 6 * scale }
  const p3 = { x: renderX + cosA * 6 * scale, y: renderY + sinA * 6 * scale }
  const p4 = { x: renderX - cosA * 8 * scale + perpX * 7 * scale, y: renderY - sinA * 8 * scale + perpY * 7 * scale }
  const p5 = { x: renderX - cosA * (len * 0.6), y: renderY - sinA * (len * 0.6) }
  g.poly([p1, p2, p3, p4, p5]).stroke({ width: 3.0 * scale, color: ${trailHex}, alpha: 0.7 })
  g.poly([p1, p2, p3, p4, p5]).stroke({ width: 1.8 * scale, color: ${colHex}, alpha: 1.0 })
  g.circle(p1.x, p1.y, 2.0 * scale).fill({ color: 0xffffff, alpha: 1.0 })`
  } else {
    shapeCode = `  // Procedural Burning Comet Fireball with Flickering Flame Tongues
  const headR = 8.0 * scale
  const tailLen = 18.0 * scale
  // Outer Heat Corona
  g.circle(renderX - cosA * 2 * scale, renderY - sinA * 2 * scale, headR * 1.55).fill({ color: 0xdc2626, alpha: 0.28 })
  // Dancing Flame Tongues
  for (let i = 0; i < 4; i++) {
    const frac = (i / 3) - 0.5
    const phase = i * 2.1 + (time * 0.001) * (15 + i * 3)
    const tLen = tailLen * (0.65 + Math.sin(phase) * 0.35)
    const tSpread = (headR * 0.85 * frac) + Math.cos(phase * 0.8) * 2.5 * scale
    g.poly([
      { x: renderX + perpX * (tSpread + headR * 0.5), y: renderY + perpY * (tSpread + headR * 0.5) },
      { x: renderX - cosA * tLen + perpX * tSpread, y: renderY - sinA * tLen + perpY * tSpread },
      { x: renderX + perpX * (tSpread - headR * 0.5), y: renderY + perpY * (tSpread - headR * 0.5) },
      { x: renderX + cosA * (headR * 0.4), y: renderY + sinA * (headR * 0.4) }
    ]).fill({ color: ${colHex}, alpha: 0.85 })
  }
  // Fireball Body & Core
  g.circle(renderX, renderY, headR).fill({ color: ${colHex}, alpha: 0.95 })
  g.circle(renderX + cosA * (headR * 0.15), renderY + sinA * (headR * 0.15), headR * 0.65).fill({ color: ${trailHex}, alpha: 1.0 })
  g.circle(renderX + cosA * (headR * 0.3), renderY + sinA * (headR * 0.3), headR * 0.32).fill({ color: 0xffffff, alpha: 1.0 })`
  }

  const satCode = satCount > 0
    ? `  // Orbiting Satellites (${satCount} items)
  const satCount = ${satCount}
  const orbitR = ${(13.0 + size * 0.9).toFixed(1)} * scale
  const satPulse = Math.sin(time * 0.035) * 1.5 * scale
  for (let s = 0; s < satCount; s++) {
    const sAng = time * 0.035 + (s * Math.PI * 2) / satCount
    const sx = renderX + Math.cos(sAng) * (orbitR + satPulse)
    const sy = renderY + Math.sin(sAng) * (orbitR + satPulse) * 0.65
    g.circle(sx, sy, 4.5 * scale).fill({ color: ${trailHex}, alpha: 0.5 })
    g.circle(sx, sy, 2.8 * scale).fill({ color: ${sparkHex}, alpha: 0.95 })
    g.circle(sx, sy, 1.2 * scale).fill({ color: 0xffffff, alpha: 1.0 })
  }`
    : `  // (Orbiting satellites disabled for clean visuals)`

  return `/**
 * PixiJS 8 Projectile Head Renderer
 * File: src/utils/projectileEffectRenderer.ts -> renderPixiProjectileHead()
 * ID: "${def.id || 'custom_projectile'}" (${def.name || 'Custom Bolt'})
 */
import { Graphics } from 'pixi.js'

export function drawProjectilePixi(
  g: Graphics,
  renderX: number,
  renderY: number,
  angle: number,
  time: number
): void {
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const perpX = -sinA
  const perpY = cosA
  const scale = ${scaleVal}

  // --- 1. Projectile Head ---
${shapeCode}

  // --- 2. Satellites / Orbiters ---
${satCode}
}`
}
