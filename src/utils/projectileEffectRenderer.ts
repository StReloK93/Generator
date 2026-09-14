import { Graphics } from 'pixi.js'
import { ProjectileType } from '../stores/towerStore'

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
}

export const PROJECTILE_THEMES: Record<ProjectileType, ProjectileVisualTheme> = {
  arrow: {
    type: 'arrow',
    trailColorHex: 0xf8fafc,
    trailColorCss: 'rgba(248, 250, 252, 0.25)',
    trailAlpha: 0.25,
    sparkColorHex: 0xe2e8f0,
    sparkColorCss: '#e2e8f0',
    shockwaveColorHex: 0xcbd5e1,
    shockwaveColorCss: '#cbd5e1',
    hasArc: true,
  },
  fireball: {
    type: 'fireball',
    trailColorHex: 0xf97316,
    trailColorCss: 'rgba(249, 115, 22, 0.7)',
    trailAlpha: 0.7,
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: true,
  },
  frost_bolt: {
    type: 'frost_bolt',
    trailColorHex: 0x06b6d4,
    trailColorCss: 'rgba(6, 182, 212, 0.7)',
    trailAlpha: 0.7,
    sparkColorHex: 0x67e8f9,
    sparkColorCss: '#67e8f9',
    shockwaveColorHex: 0x06b6d4,
    shockwaveColorCss: '#06b6d4',
    hasArc: true,
  },
  laser: {
    type: 'laser',
    trailColorHex: 0xf43f5e,
    trailColorCss: 'rgba(244, 63, 94, 0.8)',
    trailAlpha: 0.8,
    sparkColorHex: 0xf43f5e,
    sparkColorCss: '#f43f5e',
    shockwaveColorHex: 0xf43f5e,
    shockwaveColorCss: '#f43f5e',
    hasArc: false,
  },
  missile: {
    type: 'missile',
    trailColorHex: 0xf97316,
    trailColorCss: 'rgba(249, 115, 22, 0.65)',
    trailAlpha: 0.65,
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xf97316,
    shockwaveColorCss: '#f97316',
    hasArc: true,
  },
  cannonball: {
    type: 'cannonball',
    trailColorHex: 0x94a3b8,
    trailColorCss: 'rgba(148, 163, 184, 0.5)',
    trailAlpha: 0.5,
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xf97316,
    shockwaveColorCss: '#f97316',
    hasArc: true,
  },
  magic_bolt: {
    type: 'magic_bolt',
    trailColorHex: 0x38bdf8,
    trailColorCss: 'rgba(56, 189, 248, 0.7)',
    trailAlpha: 0.7,
    sparkColorHex: 0xa855f7,
    sparkColorCss: '#a855f7',
    shockwaveColorHex: 0x38bdf8,
    shockwaveColorCss: '#38bdf8',
    hasArc: false,
  },
}

export function getProjectileTheme(type: string, customColor?: number): ProjectileVisualTheme {
  const key = type as ProjectileType
  const base = PROJECTILE_THEMES[key] || PROJECTILE_THEMES.magic_bolt
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

/**
 * Renders projectile head on PixiJS 8 (used in main game CombatRenderer).
 */
export function renderPixiProjectileHead(
  g: Graphics,
  type: string,
  renderX: number,
  renderY: number,
  angle: number,
  startX: number,
  startY: number,
  time: number
): void {
  if (type === 'arrow') {
    const arrowLength = 26
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    // Tip of the arrow
    const tipX = renderX + cosA * 5
    const tipY = renderY + sinA * 5

    // Nock / Tail of the arrow
    const tailX = tipX - cosA * arrowLength
    const tailY = tipY - sinA * arrowLength

    // 1. Slender Cedar Wood Shaft
    g.moveTo(tailX, tailY)
      .lineTo(tipX - cosA * 5, tipY - sinA * 5)
      .stroke({ width: 1.4, color: 0x92400e, alpha: 1.0 })

    // 2. Sharp Steel Broadhead Tip (Needle-sharp metallic arrowhead)
    const headBaseX = tipX - cosA * 6
    const headBaseY = tipY - sinA * 6
    const perpX = -sinA * 2.2
    const perpY = cosA * 2.2

    g.poly([
      tipX, tipY,
      headBaseX + perpX, headBaseY + perpY,
      headBaseX - cosA * 1.5, headBaseY - sinA * 1.5,
      headBaseX - perpX, headBaseY - perpY,
    ])
      .fill({ color: 0xf8fafc, alpha: 1.0 })
      .stroke({ width: 0.8, color: 0x475569, alpha: 1.0 })

    // 3. Fletchings (White/Silver Goose Feathers angled along the shaft)
    const fletchStartDist = 2
    const fletchLength = 7
    const fletchSpread = 2.4

    const fletchStartX = tailX + cosA * fletchStartDist
    const fletchStartY = tailY + sinA * fletchStartDist
    const fletchEndX = fletchStartX + cosA * fletchLength
    const fletchEndY = fletchStartY + sinA * fletchLength

    const fletchPerpX = -sinA * fletchSpread
    const fletchPerpY = cosA * fletchSpread

    // Left feather
    g.poly([
      fletchStartX, fletchStartY,
      fletchStartX + fletchPerpX, fletchStartY + fletchPerpY,
      fletchEndX, fletchEndY,
    ])
      .fill({ color: 0xf1f5f9, alpha: 0.95 })
      .stroke({ width: 0.6, color: 0x94a3b8, alpha: 0.8 })

    // Right feather
    g.poly([
      fletchStartX, fletchStartY,
      fletchStartX - fletchPerpX, fletchStartY - fletchPerpY,
      fletchEndX, fletchEndY,
    ])
      .fill({ color: 0xf1f5f9, alpha: 0.95 })
      .stroke({ width: 0.6, color: 0x94a3b8, alpha: 0.8 })

    // Dark Nock Wrap
    g.moveTo(tailX, tailY)
      .lineTo(tailX + cosA * 2, tailY + sinA * 2)
      .stroke({ width: 1.6, color: 0x334155, alpha: 1.0 })
  } else if (type === 'fireball') {
    // 3 Concentric glowing circular fire rings
    g.circle(renderX, renderY, 7.5).fill({ color: 0xef4444, alpha: 0.5 })
    g.circle(renderX, renderY, 5.0).fill({ color: 0xf97316, alpha: 0.95 })
    g.circle(renderX, renderY, 2.5).fill({ color: 0xfef08a, alpha: 1.0 })
  } else if (type === 'frost_bolt') {
    // Icy mist aura + rotating crystalline diamond
    g.circle(renderX, renderY, 6.5).fill({ color: 0x06b6d4, alpha: 0.5 })
    const rotAngle = time * 0.008
    const cosR = Math.cos(rotAngle)
    const sinR = Math.sin(rotAngle)

    const pTop = { x: renderX + -sinR * -6, y: renderY + cosR * -6 }
    const pRight = { x: renderX + cosR * 4, y: renderY + sinR * 4 }
    const pBottom = { x: renderX + -sinR * 6, y: renderY + cosR * 6 }
    const pLeft = { x: renderX + cosR * -4, y: renderY + sinR * -4 }

    g.poly([pTop, pRight, pBottom, pLeft])
      .fill({ color: 0xffffff, alpha: 0.95 })
      .stroke({ width: 1.2, color: 0x0891b2, alpha: 1.0 })
  } else if (type === 'laser') {
    // Continuous energy beam ray
    g.moveTo(startX, startY)
      .lineTo(renderX, renderY)
      .stroke({ width: 5.0, color: 0xf43f5e, alpha: 0.45 })
    g.moveTo(startX, startY)
      .lineTo(renderX, renderY)
      .stroke({ width: 1.8, color: 0xffffff, alpha: 1.0 })
    g.circle(renderX, renderY, 4.0).fill({ color: 0xffffff, alpha: 1.0 })
  } else if (type === 'missile') {
    // Rocket missile with nose cone and exhaust thrust
    const mLen = 14
    const tailX = renderX - Math.cos(angle) * mLen
    const tailY = renderY - Math.sin(angle) * mLen

    g.moveTo(tailX, tailY)
      .lineTo(renderX, renderY)
      .stroke({ width: 4.5, color: 0x334155, alpha: 1.0 })

    const tipX = renderX + Math.cos(angle) * 3.5
    const tipY = renderY + Math.sin(angle) * 3.5
    g.circle(tipX, tipY, 2.8).fill({ color: 0xef4444, alpha: 1.0 })
    g.circle(tailX, tailY, 3.2).fill({ color: 0xfbbf24, alpha: 0.95 })
  } else if (type === 'cannonball') {
    // Heavy iron ball with metallic highlight reflection
    g.circle(renderX, renderY, 5.5)
      .fill({ color: 0x1e293b, alpha: 1.0 })
      .stroke({ width: 1.2, color: 0x475569, alpha: 1.0 })
    g.circle(renderX - 1.5, renderY - 1.5, 1.6).fill({ color: 0x94a3b8, alpha: 0.95 })
  } else {
    // Magic bolt: astral glow + white spark core + flare cross
    g.circle(renderX, renderY, 6.5).fill({ color: 0x38bdf8, alpha: 0.5 })
    g.circle(renderX, renderY, 3.0).fill({ color: 0xffffff, alpha: 1.0 })
    g.moveTo(renderX - 5, renderY)
      .lineTo(renderX + 5, renderY)
      .stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
    g.moveTo(renderX, renderY - 5)
      .lineTo(renderX, renderY + 5)
      .stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
  }
}

/**
 * Renders projectile head on HTML5 Canvas2D (used in TowerLivePreview).
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
  time: number
): void {
  if (type === 'arrow') {
    ctx.save()
    ctx.translate(renderX, renderY)
    const arcDy = -Math.cos(progress * Math.PI) * 0.4
    ctx.rotate(angle + arcDy)

    // 1. Sleek Wooden Shaft (24px long)
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-18, 0)
    ctx.lineTo(4, 0)
    ctx.stroke()

    // 2. Sharp Steel Broadhead Tip
    ctx.fillStyle = '#f8fafc'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(9, 0)
    ctx.lineTo(3, -2.4)
    ctx.lineTo(4.5, 0)
    ctx.lineTo(3, 2.4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 3. White/Silver Goose Feather Fletchings
    ctx.fillStyle = '#f1f5f9'
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 0.6

    // Upper feather
    ctx.beginPath()
    ctx.moveTo(-17, 0)
    ctx.lineTo(-17, -2.4)
    ctx.lineTo(-11, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Lower feather
    ctx.beginPath()
    ctx.moveTo(-17, 0)
    ctx.lineTo(-17, 2.4)
    ctx.lineTo(-11, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 4. Dark Nock Band
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-18, 0)
    ctx.lineTo(-16, 0)
    ctx.stroke()

    ctx.restore()
  } else if (type === 'fireball') {
    ctx.beginPath()
    ctx.arc(renderX, renderY, 7.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(renderX, renderY, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#f97316'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(renderX, renderY, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#fef08a'
    ctx.fill()
  } else if (type === 'frost_bolt') {
    ctx.save()
    ctx.translate(renderX, renderY)
    ctx.rotate(time * 0.01)

    ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'
    ctx.beginPath()
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#0891b2'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(4, 0)
    ctx.lineTo(0, 6)
    ctx.lineTo(-4, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  } else if (type === 'laser') {
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(renderX, renderY)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(renderX, renderY)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.8
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(renderX, renderY, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  } else if (type === 'missile') {
    ctx.save()
    ctx.translate(renderX, renderY)
    ctx.rotate(angle)

    ctx.fillStyle = '#334155'
    ctx.fillRect(-8, -2.5, 11, 5)

    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(3, -2.5)
    ctx.lineTo(7, 0)
    ctx.lineTo(3, 2.5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(-9, 0, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else if (type === 'cannonball') {
    ctx.beginPath()
    ctx.arc(renderX, renderY, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(renderX - 1.5, renderY - 1.5, 1.6, 0, Math.PI * 2)
    ctx.fillStyle = '#94a3b8'
    ctx.fill()
  } else {
    // Magic Bolt
    ctx.beginPath()
    ctx.arc(renderX, renderY, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(renderX, renderY, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(renderX - 5, renderY)
    ctx.lineTo(renderX + 5, renderY)
    ctx.moveTo(renderX, renderY - 5)
    ctx.lineTo(renderX, renderY + 5)
    ctx.stroke()
  }
}
