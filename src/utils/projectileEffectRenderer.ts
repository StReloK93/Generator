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
  const base = PROJECTILE_THEMES[type] || PROJECTILE_THEMES.fireball || {
    type: type as ProjectileType,
    trailColorHex: 0x38bdf8,
    trailColorCss: 'rgba(56, 189, 248, 0.7)',
    trailAlpha: 0.7,
    sparkColorHex: 0xa855f7,
    sparkColorCss: '#a855f7',
    shockwaveColorHex: 0x38bdf8,
    shockwaveColorCss: '#38bdf8',
    hasArc: true,
    isLaser: false,
  }

  if (!customColor) return base

  const hexStr = '#' + customColor.toString(16).padStart(6, '0')
  const r = (customColor >> 16) & 0xff
  const g = (customColor >> 8) & 0xff
  const b = customColor & 0xff

  return {
    ...base,
    trailColorHex: customColor,
    trailColorCss: `rgba(${r}, ${g}, ${b}, ${base.trailAlpha})`,
    sparkColorHex: customColor,
    sparkColorCss: hexStr,
    shockwaveColorHex: customColor,
    shockwaveColorCss: hexStr,
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

  // 1. LASERS / BEAMS
  if (def.isLaser || type.includes('laser') || type === 'holy_ray' || type === 'fire_flamethrower' || type === 'poison_acid_spray') {
    const pulse = Math.sin(time * 0.03) * 1.5
    const widthMain = ((type === 'fire_flamethrower' || type === 'holy_ray' || type === 'poison_acid_spray' || type === 'void_laser') ? 8.5 : 5.5) * scale
    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: widthMain + 4 + pulse, color: def.trailColorHex, alpha: 0.35 })
    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: widthMain + pulse * 0.5, color: def.colorHex, alpha: 0.85 })
    g.moveTo(startX, startY).lineTo(renderX, renderY).stroke({ width: 2.0 * scale, color: 0xffffff, alpha: 1.0 })
    g.circle(renderX, renderY, (6.0 + pulse) * scale).fill({ color: def.colorHex, alpha: 0.7 })
    g.circle(renderX, renderY, 3.5 * scale).fill({ color: 0xffffff, alpha: 1.0 })
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
  // 11. DEFAULT / CIRCLE (Original 3 Concentric Glowing Fire Rings)
  else {
    const outerCol = def.trailColorHex || 0xef4444
    const midCol = def.colorHex || 0xf97316
    const coreCol = def.sparkColorHex || 0xfef08a
    g.circle(renderX, renderY, 7.5).fill({ color: outerCol, alpha: 0.5 })
    g.circle(renderX, renderY, 5.0).fill({ color: midCol, alpha: 0.95 })
    g.circle(renderX, renderY, 2.5).fill({ color: coreCol, alpha: 1.0 })
  }

  // 12. SATELLITES / ORBITING MINI-FLAMES & SPARKS (Mayda aylanuvchi olovchalar)
  const satCount = def.satelliteCount || (def.formation === 'satellites' ? 3 : 0)
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

  // 1. LASERS / BEAMS
  if (def.isLaser || type.includes('laser') || type === 'holy_ray' || type === 'fire_flamethrower' || type === 'poison_acid_spray') {
    const widthMain = ((type === 'fire_flamethrower' || type === 'holy_ray' || type === 'poison_acid_spray' || type === 'void_laser') ? 9 : 6) * scale
    const pulse = Math.sin(time * 0.03) * 1.5

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(renderX, renderY)
    ctx.strokeStyle = def.trailColorCss
    ctx.lineWidth = widthMain + 4 + pulse
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(renderX, renderY)
    ctx.strokeStyle = def.colorCss
    ctx.lineWidth = widthMain + pulse * 0.5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(renderX, renderY)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 * scale
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(renderX, renderY, 6.5 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
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
    ctx.roundRect(4, -5, 10, 10, 2)
    ctx.fill()
    ctx.stroke()

    // Eye Sockets
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(2, -4, 3.2, 0, Math.PI * 2)
    ctx.arc(2, 4, 3.2, 0, Math.PI * 2)
    ctx.fill()

    // Burning Pupils
    ctx.fillStyle = def.sparkColorCss
    ctx.beginPath()
    ctx.arc(2, -4, 1.8, 0, Math.PI * 2)
    ctx.arc(2, 4, 1.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(2.5, -4, 0.8, 0, Math.PI * 2)
    ctx.arc(2.5, 4, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // 7. GREATSWORD (Runic Broadsword Blade)
  else if (shape === 'greatsword') {
    const swordLen = def.length ?? 28
    // Outer glow aura
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 3.0
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(0, -9)
    ctx.lineTo(swordLen, 0)
    ctx.lineTo(0, 9)
    ctx.closePath()
    ctx.stroke()
    ctx.globalAlpha = 1.0

    // Blade Body
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(0, -7.5)
    ctx.lineTo(swordLen, 0)
    ctx.lineTo(0, 7.5)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Center fuller ridge
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(swordLen - 4, 0)
    ctx.stroke()

    // Crossguard
    ctx.fillStyle = '#1e293b'
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 1.2
    ctx.fillRect(-16, -9, 4, 18)
    ctx.strokeRect(-16, -9, 4, 18)
  }
  // 8. HAMMER (Forged Warhammer / Mjolnir)
  else if (shape === 'hammer') {
    // Handle
    ctx.fillStyle = '#78350f'
    ctx.fillRect(-16, -2.5, 20, 5)
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 1.0
    ctx.strokeRect(-16, -2.5, 20, 5)

    // Hammer Head Block
    ctx.fillStyle = def.colorCss
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.roundRect(4, -8, 14, 16, 2)
    ctx.fill()
    ctx.stroke()

    // Energy core in hammer
    ctx.fillStyle = def.sparkColorCss
    ctx.beginPath()
    ctx.arc(11, 0, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(11, 0, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // 9. BOULDER (Molten Cratered Meteor Rock)
  else if (shape === 'boulder') {
    const r = 11.5
    // Rocky outline
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = def.colorCss || '#78716c'
    ctx.fill()
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 2.0
    ctx.stroke()

    // Craters & Shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.arc(3, 3, r * 0.35, 0, Math.PI * 2)
    ctx.arc(-4, 2, r * 0.25, 0, Math.PI * 2)
    ctx.fill()

    // Glowing Magma Cracks
    ctx.strokeStyle = def.sparkColorCss || '#fef08a'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(-r * 0.7, -r * 0.3)
    ctx.lineTo(-2, 0)
    ctx.lineTo(r * 0.6, -r * 0.2)
    ctx.moveTo(-2, 0)
    ctx.lineTo(1, r * 0.6)
    ctx.stroke()

    // Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.beginPath()
    ctx.arc(-4, -4, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // 10. FEATHER (Phoenix Plume)
  else if (shape === 'feather') {
    const fLen = def.length ?? 24
    // Feather Vanes
    ctx.fillStyle = def.colorCss
    ctx.beginPath()
    ctx.moveTo(-fLen * 0.6, 0)
    ctx.quadraticCurveTo(-fLen * 0.2, -7, fLen * 0.4, 0)
    ctx.quadraticCurveTo(-fLen * 0.2, 7, -fLen * 0.6, 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = def.sparkColorCss
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Central Quill Spine
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.0
    ctx.beginPath()
    ctx.moveTo(-fLen * 0.7, 0)
    ctx.lineTo(fLen * 0.4, 0)
    ctx.stroke()

    // Glowing Tip
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(fLen * 0.4, 0, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // 11. DEFAULT / CIRCLE (Original 3 Concentric Glowing Fire Rings)
  else {
    ctx.beginPath()
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2)
    ctx.fillStyle = def.trailColorCss ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, 5, 0, Math.PI * 2)
    ctx.fillStyle = def.colorCss || '#f97316'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = def.sparkColorCss || '#fef08a'
    ctx.fill()
  }

  // 12. SATELLITES / ORBITING MINI-FLAMES & SPARKS (Mayda aylanuvchi olovchalar)
  const satCount = def.satelliteCount || (def.formation === 'satellites' ? 3 : 0)
  if (satCount > 0) {
    const orbitR = 14.0 + (def.size || 10) * 0.8
    const satPulse = Math.sin(time * 0.035) * 1.5
    for (let s = 0; s < satCount; s++) {
      const sAng = time * 0.035 + (s * Math.PI * 2) / satCount
      const sx = Math.cos(sAng) * (orbitR + satPulse)
      const sy = Math.sin(sAng) * (orbitR + satPulse) * 0.65 // Isometric ellipse orbit

      // Satellite glow
      ctx.beginPath()
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = def.trailColorCss || def.colorCss
      ctx.globalAlpha = 0.5
      ctx.fill()

      // Satellite core
      ctx.beginPath()
      ctx.arc(sx, sy, 2.8, 0, Math.PI * 2)
      ctx.fillStyle = def.sparkColorCss || '#fbbf24'
      ctx.globalAlpha = 0.95
      ctx.fill()

      // Satellite hot center
      ctx.beginPath()
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 1.0
      ctx.fill()
    }
  }

  ctx.restore()
}
