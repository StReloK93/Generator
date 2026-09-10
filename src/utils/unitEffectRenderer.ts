import { Graphics } from 'pixi.js'
import { UnitVariantType } from '../types/map'

export interface CanvasUnitEffectOptions {
  ctx: CanvasRenderingContext2D
  centerX: number
  centerY: number
  bodyHeadY: number
  bodyChestY: number
  bodyWaistY: number
  bodyFeetY: number
  customUnitScale: number
  animTime: number
  variant: UnitVariantType | string
}

export interface PixiUnitEffectOptions {
  marker: Graphics
  shadow: Graphics
  variant: UnitVariantType | string
  tileWidth: number
  tileHeight: number
  customUnitScale: number
  fadeAlpha: number
  unitIndex: number
  animTime: number
}

/**
 * Renders pure organic visual elemental effects on HTML5 Canvas2D (CharacterLivePreview).
 * Adheres to SOLID: pure presentation layer for elemental unit particles without artificial ground disks.
 */
export function renderCanvasUnitEffect(opts: CanvasUnitEffectOptions): void {
  const {
    ctx,
    centerX,
    bodyHeadY,
    bodyChestY,
    bodyWaistY,
    bodyFeetY,
    customUnitScale,
    animTime,
    variant
  } = opts

  if (!variant || variant === 'normal') return

  if (variant === 'fire') {
    ctx.save()
    // 1. Natural Rising Flame Puffs
    const flamePuffs = [
      { x: centerX, y: bodyChestY + 2 * customUnitScale, s: 1.0 },
      { x: centerX - 10 * customUnitScale, y: bodyChestY - 2 * customUnitScale, s: 1.2 },
      { x: centerX + 10 * customUnitScale, y: bodyChestY - 2 * customUnitScale, s: 1.1 }
    ]
    for (let i = 0; i < flamePuffs.length; i++) {
      const fp = flamePuffs[i]
      const puffProg = ((animTime * 1.8 * fp.s + i * 0.33) % 1.0)
      const py = fp.y - puffProg * (24 * customUnitScale)
      const px = fp.x + Math.sin(animTime * 6 + i * 2) * (3 * customUnitScale)
      const pr = (6 + puffProg * 4) * customUnitScale * (1 - puffProg * 0.6)

      const puffGrad = ctx.createRadialGradient(px, py, 1, px, py, pr)
      puffGrad.addColorStop(0, 'rgba(254, 240, 138, ' + (0.6 * (1 - puffProg)) + ')')
      puffGrad.addColorStop(0.5, 'rgba(249, 115, 22, ' + (0.4 * (1 - puffProg)) + ')')
      puffGrad.addColorStop(1, 'rgba(239, 68, 68, 0)')
      ctx.fillStyle = puffGrad
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Rising Embers & Sparks
    for (let p = 0; p < 7; p++) {
      const prog = ((animTime * 1.4 + p * 0.14) % 1.0)
      const spawnX = centerX + Math.sin(p * 2.5) * (12 * customUnitScale)
      const px = spawnX + Math.sin(animTime * 4 + p * 2) * (6 * customUnitScale)
      const py = bodyChestY + 8 * customUnitScale - prog * (48 * customUnitScale)
      const size = Math.max(0.8, (1 - prog) * 2.4 * customUnitScale)
      const pColor = prog < 0.35 ? '#fef08a' : (prog < 0.7 ? '#f97316' : '#ef4444')

      ctx.globalAlpha = (1 - prog) * 0.95
      ctx.fillStyle = pColor
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

  } else if (variant === 'frost') {
    ctx.save()
    // 1. Chilling Sub-Zero Frost Mist Puffs
    for (let m = 0; m < 5; m++) {
      const prog = ((animTime * 0.6 + m * 0.2) % 1.0)
      const mistX = centerX + Math.sin(animTime * 2 + m * 1.8) * (14 * customUnitScale)
      const mistY = bodyChestY - prog * (38 * customUnitScale)
      const mistRadius = (8 + prog * 12) * customUnitScale

      const mistGrad = ctx.createRadialGradient(mistX, mistY, 2, mistX, mistY, mistRadius)
      mistGrad.addColorStop(0, 'rgba(224, 242, 254, ' + (0.35 * (1 - prog)) + ')')
      mistGrad.addColorStop(0.6, 'rgba(56, 189, 248, ' + (0.18 * (1 - prog)) + ')')
      mistGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
      ctx.fillStyle = mistGrad
      ctx.beginPath()
      ctx.arc(mistX, mistY, mistRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Sparkling Diamond Dust / Ice Gleams
    const glintPoints = [
      { x: centerX - 12 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: centerX + 12 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: centerX, y: bodyChestY + 2 * customUnitScale },
      { x: centerX - 8 * customUnitScale, y: bodyWaistY },
      { x: centerX + 8 * customUnitScale, y: bodyWaistY }
    ]

    for (let g = 0; g < glintPoints.length; g++) {
      const pt = glintPoints[g]
      const twinkle = Math.max(0, Math.sin(animTime * 3.5 + g * 1.4))
      if (twinkle > 0.3) {
        const s = (1.5 + twinkle * 2) * customUnitScale
        ctx.globalAlpha = twinkle * 0.95
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y - s)
        ctx.lineTo(pt.x + s * 0.3, pt.y)
        ctx.lineTo(pt.x, pt.y + s)
        ctx.lineTo(pt.x - s * 0.3, pt.y)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(pt.x - s, pt.y)
        ctx.lineTo(pt.x, pt.y - s * 0.3)
        ctx.lineTo(pt.x + s, pt.y)
        ctx.lineTo(pt.x, pt.y + s * 0.3)
        ctx.closePath()
        ctx.fill()
      }
    }

    // 3. Drifting Gentle Frost Crystal Specks
    for (let p = 0; p < 4; p++) {
      const prog = ((animTime * 0.7 + p * 0.25) % 1.0)
      const fx = centerX + Math.sin(animTime * 2.5 + p * 2) * (16 * customUnitScale)
      const fy = bodyChestY + 6 * customUnitScale - prog * (40 * customUnitScale)
      ctx.globalAlpha = (1 - prog) * 0.85
      ctx.fillStyle = '#e0f2fe'
      ctx.beginPath()
      ctx.arc(fx, fy, 1.4 * customUnitScale, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

  } else if (variant === 'electric') {
    ctx.save()
    // 1. Crisp mini-lightning arcs at feet & ankles
    const arcTargets = [
      { start: { x: centerX - 9 * customUnitScale, y: bodyFeetY }, end: { x: centerX + 5 * customUnitScale, y: bodyFeetY - 12 * customUnitScale } },
      { start: { x: centerX + 8 * customUnitScale, y: bodyFeetY }, end: { x: centerX - 6 * customUnitScale, y: bodyFeetY - 10 * customUnitScale } },
      { start: { x: centerX - 4 * customUnitScale, y: bodyFeetY }, end: { x: centerX + 10 * customUnitScale, y: bodyFeetY - 5 * customUnitScale } }
    ]

    for (let t = 0; t < arcTargets.length; t++) {
      const cycle = Math.sin(animTime * 8 + t * 2.1)
      if (cycle > 0.2) {
        const arc = arcTargets[t]
        const segments = 3
        const pts = [arc.start]
        for (let s = 1; s < segments; s++) {
          const frac = s / segments
          const jitterX = Math.sin(animTime * 20 + t * 4 + s * 2) * (3.5 * customUnitScale)
          const jitterY = Math.cos(animTime * 20 + t * 3 + s * 3) * (2 * customUnitScale)
          pts.push({
            x: arc.start.x + (arc.end.x - arc.start.x) * frac + jitterX,
            y: arc.start.y + (arc.end.y - arc.start.y) * frac + jitterY
          })
        }
        pts.push(arc.end)

        // Outer Glow
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)'
        ctx.lineWidth = 2.0 * customUnitScale
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.stroke()

        // Inner White Core
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.9 * customUnitScale
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.stroke()
      }
    }

    // 2. Subtle electric sparks rising from feet
    for (let sp = 0; sp < 4; sp++) {
      const prog = ((animTime * 1.2 + sp * 0.25) % 1.0)
      const sx = centerX + Math.sin(animTime * 3 + sp * 2.2) * (10 * customUnitScale)
      const sy = bodyFeetY - prog * (18 * customUnitScale)
      const alpha = (1 - prog) * 0.9
      ctx.fillStyle = sp % 2 === 0 ? '#ffffff' : '#38bdf8'
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(sx, sy, 1.2 * customUnitScale, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

  } else if (variant === 'poison') {
    ctx.save()
    // 1. Billowing Toxic Green Miasma Clouds
    for (let g = 0; g < 7; g++) {
      const prog = ((animTime * 0.8 + g * 0.14) % 1.0)
      const cloudX = centerX + Math.sin(animTime * 3 + g * 2) * (18 * customUnitScale)
      const cloudY = bodyChestY - prog * (45 * customUnitScale)
      const cloudRadius = (10 + prog * 18) * customUnitScale

      const gasGrad = ctx.createRadialGradient(cloudX, cloudY, 2, cloudX, cloudY, cloudRadius)
      gasGrad.addColorStop(0, 'rgba(74, 222, 128, ' + (0.42 * (1 - prog)) + ')')
      gasGrad.addColorStop(0.5, 'rgba(34, 197, 94, ' + (0.28 * (1 - prog)) + ')')
      gasGrad.addColorStop(1, 'rgba(21, 128, 61, 0)')

      ctx.fillStyle = gasGrad
      ctx.beginPath()
      ctx.arc(cloudX, cloudY, cloudRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Corrosive Slime Bubbles
    for (let b = 0; b < 6; b++) {
      const prog = ((animTime * 1.1 + b * 0.17) % 1.0)
      const bx = centerX + Math.sin(b * 3.1 + animTime * 4) * (16 * customUnitScale)
      const by = bodyWaistY - prog * (48 * customUnitScale)
      const br = (2.5 + Math.sin(b + animTime * 3) * 1.5) * customUnitScale

      ctx.globalAlpha = (1 - prog) * 0.9
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)'
      ctx.strokeStyle = '#86efac'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(bx - br * 0.35, by - br * 0.35, br * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }

    // 3. Dripping Acid Drop
    const dripProgress = (animTime * 2.2) % 1.0
    const dropX = centerX + Math.sin(animTime * 2) * (14 * customUnitScale)
    const dropY = bodyWaistY + dripProgress * (bodyFeetY - bodyWaistY)
    ctx.globalAlpha = (1 - dripProgress * 0.3)
    ctx.fillStyle = '#84cc16'
    ctx.beginPath()
    ctx.arc(dropX, dropY, 2.2 * customUnitScale, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

  } else if (variant === 'void') {
    ctx.save()
    // 1. Shadow Vapor Wisps
    for (let v = 0; v < 4; v++) {
      const prog = ((animTime * 0.7 + v * 0.25) % 1.0)
      const vx = centerX + Math.sin(animTime * 2 + v * 2) * (12 * customUnitScale)
      const vy = bodyChestY - prog * (38 * customUnitScale)
      const vr = (6 + prog * 10) * customUnitScale

      const vGrad = ctx.createRadialGradient(vx, vy, 1, vx, vy, vr)
      vGrad.addColorStop(0, 'rgba(192, 132, 252, ' + (0.35 * (1 - prog)) + ')')
      vGrad.addColorStop(0.6, 'rgba(147, 51, 234, ' + (0.18 * (1 - prog)) + ')')
      vGrad.addColorStop(1, 'rgba(147, 51, 234, 0)')
      ctx.fillStyle = vGrad
      ctx.beginPath()
      ctx.arc(vx, vy, vr, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Astral Stardust
    for (let s = 0; s < 5; s++) {
      const prog = ((animTime * 0.9 + s * 0.2) % 1.0)
      const sx = centerX + Math.sin(animTime * 3 + s * 2.5) * (15 * customUnitScale)
      const sy = bodyChestY + 8 * customUnitScale - prog * (45 * customUnitScale)
      ctx.globalAlpha = (1 - prog) * 0.9
      ctx.fillStyle = s % 2 === 0 ? '#f3e8ff' : '#c084fc'
      ctx.beginPath()
      ctx.arc(sx, sy, 1.4 * customUnitScale, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

  } else if (variant === 'blood') {
    ctx.save()
    // 1. Rising Crimson Energy Spikes / Soul Wisps (No large chest circle)
    for (let p = 0; p < 6; p++) {
      const prog = ((animTime * 1.5 + p * 0.16) % 1.0)
      const px = centerX + Math.sin(animTime * 5 + p * 3) * (18 * customUnitScale)
      const py = bodyChestY + 10 * customUnitScale - prog * (55 * customUnitScale)
      const s = (4 * (1 - prog)) * customUnitScale

      ctx.globalAlpha = (1 - prog) * 0.95
      ctx.fillStyle = '#e11d48'
      ctx.beginPath()
      ctx.arc(px, py, s, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Dripping Blood Droplets
    const dripProg = (animTime * 2.8) % 1.0
    ctx.globalAlpha = (1 - dripProg * 0.4)
    ctx.fillStyle = '#991b1b'
    ctx.beginPath()
    ctx.arc(centerX + Math.sin(animTime * 2) * (12 * customUnitScale), bodyWaistY + dripProg * (bodyFeetY - bodyWaistY), 2.2 * customUnitScale, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

  } else if (variant === 'golden') {
    ctx.save()
    // 1. Shimmer Glints on Armor
    const goldGlints = [
      { x: centerX - 10 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: centerX + 10 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: centerX, y: bodyChestY + 2 * customUnitScale }
    ]
    for (let g = 0; g < goldGlints.length; g++) {
      const pt = goldGlints[g]
      const twinkle = Math.max(0, Math.sin(animTime * 3.5 + g * 2.1))
      if (twinkle > 0.25) {
        const s = (1.5 + twinkle * 2) * customUnitScale
        ctx.globalAlpha = twinkle * 0.95
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y - s)
        ctx.lineTo(pt.x + s * 0.3, pt.y)
        ctx.lineTo(pt.x, pt.y + s)
        ctx.lineTo(pt.x - s * 0.3, pt.y)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fde047'
        ctx.beginPath()
        ctx.moveTo(pt.x - s, pt.y)
        ctx.lineTo(pt.x, pt.y - s * 0.3)
        ctx.lineTo(pt.x + s, pt.y)
        ctx.lineTo(pt.x, pt.y + s * 0.3)
        ctx.closePath()
        ctx.fill()
      }
    }

    // 2. Ascending Holy Light Specks
    for (let h = 0; h < 5; h++) {
      const prog = ((animTime * 0.8 + h * 0.2) % 1.0)
      const hx = centerX + Math.sin(animTime * 2.5 + h * 2) * (14 * customUnitScale)
      const hy = bodyChestY + 8 * customUnitScale - prog * (48 * customUnitScale)
      ctx.globalAlpha = (1 - prog) * 0.9
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(hx, hy, 1.4 * customUnitScale, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

  } else if (variant === 'demon') {
    ctx.save()
    // 1. Billowing Ethereal White Smoke Clouds
    for (let s = 0; s < 7; s++) {
      const prog = ((animTime * 0.75 + s * 0.14) % 1.0)
      const smokeX = centerX + Math.sin(animTime * 2.2 + s * 1.8) * (14 * customUnitScale)
      const smokeY = bodyChestY + 2 * customUnitScale - prog * (52 * customUnitScale)
      const smokeRadius = (9 + prog * 16) * customUnitScale

      const smokeGrad = ctx.createRadialGradient(smokeX, smokeY, 2, smokeX, smokeY, smokeRadius)
      smokeGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (0.45 * (1 - prog)) + ')')
      smokeGrad.addColorStop(0.4, 'rgba(226, 232, 240, ' + (0.28 * (1 - prog)) + ')')
      smokeGrad.addColorStop(1, 'rgba(148, 163, 184, 0)')

      ctx.fillStyle = smokeGrad
      ctx.beginPath()
      ctx.arc(smokeX, smokeY, smokeRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // 2. Floating White Ash Specks
    for (let a = 0; a < 6; a++) {
      const prog = ((animTime * 1.1 + a * 0.16) % 1.0)
      const ax = centerX + Math.sin(animTime * 3.5 + a * 2.5) * (18 * customUnitScale)
      const ay = bodyWaistY - prog * (48 * customUnitScale)
      const ashSize = (1.8 * (1 - prog * 0.5)) * customUnitScale

      ctx.globalAlpha = (1 - prog) * 0.9
      ctx.fillStyle = a % 2 === 0 ? '#ffffff' : '#e2e8f0'
      ctx.beginPath()
      ctx.arc(ax, ay, ashSize, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

/**
 * Renders pure organic visual elemental effects on PixiJS 8 (IsoEngine).
 * Standard shadow is kept natural without artificial colored rings or ground disks.
 */
export function renderPixiUnitEffect(opts: PixiUnitEffectOptions): void {
  const {
    marker,
    shadow,
    variant,
    tileWidth,
    tileHeight,
    customUnitScale,
    fadeAlpha,
    unitIndex,
    animTime
  } = opts

  shadow.clear()
  marker.clear()

  // Standard Natural Unit Drop Shadow (No colored disks!)
  shadow.visible = true
  shadow.alpha = fadeAlpha
  const shadowRadiusX = tileWidth * 0.18 * customUnitScale
  const shadowRadiusY = tileHeight * 0.18 * customUnitScale
  shadow
    .ellipse(0, 0, shadowRadiusX, shadowRadiusY)
    .fill({ color: 0x000000, alpha: 0.45 * fadeAlpha })

  if (!variant || variant === 'normal') {
    marker.visible = false
    return
  }

  marker.visible = true
  marker.alpha = fadeAlpha

  const seed = unitIndex * 1.37
  const bodyChestY = -36 * customUnitScale
  const bodyWaistY = -20 * customUnitScale
  const bodyFeetY = -2 * customUnitScale

  if (variant === 'fire') {
    // 1. Natural Flame Puffs
    const flamePuffs = [
      { x: 0, y: bodyChestY + 2 * customUnitScale, s: 1.0 },
      { x: -10 * customUnitScale, y: bodyChestY - 2 * customUnitScale, s: 1.2 },
      { x: 10 * customUnitScale, y: bodyChestY - 2 * customUnitScale, s: 1.1 }
    ]
    for (let i = 0; i < flamePuffs.length; i++) {
      const fp = flamePuffs[i]
      const puffProg = ((animTime * 1.8 * fp.s + i * 0.33 + seed) % 1.0)
      const py = fp.y - puffProg * (24 * customUnitScale)
      const px = fp.x + Math.sin(animTime * 6 + i * 2 + seed) * (3 * customUnitScale)
      const pr = (6 + puffProg * 4) * customUnitScale * (1 - puffProg * 0.6)
      marker
        .circle(px, py, pr)
        .fill({ color: 0xf97316, alpha: 0.4 * (1 - puffProg) * fadeAlpha })
      marker
        .circle(px, py, pr * 0.5)
        .fill({ color: 0xfef08a, alpha: 0.6 * (1 - puffProg) * fadeAlpha })
    }

    // 2. Rising Embers & Sparks
    for (let p = 0; p < 7; p++) {
      const prog = ((animTime * 1.4 + p * 0.14 + seed) % 1.0)
      const spawnX = Math.sin(p * 2.5 + seed) * (12 * customUnitScale)
      const px = spawnX + Math.sin(animTime * 4 + p * 2 + seed) * (6 * customUnitScale)
      const py = bodyChestY + 8 * customUnitScale - prog * (48 * customUnitScale)
      const size = Math.max(0.8, (1 - prog) * 2.4 * customUnitScale)
      const pColor = prog < 0.35 ? 0xfef08a : (prog < 0.7 ? 0xf97316 : 0xef4444)

      marker
        .circle(px, py, size)
        .fill({ color: pColor, alpha: (1 - prog) * 0.95 * fadeAlpha })
    }

  } else if (variant === 'frost') {
    // 1. Chilling Sub-Zero Frost Mist Puffs
    for (let m = 0; m < 5; m++) {
      const prog = ((animTime * 0.6 + m * 0.2 + seed) % 1.0)
      const mistX = Math.sin(animTime * 2 + m * 1.8 + seed) * (14 * customUnitScale)
      const mistY = bodyChestY - prog * (38 * customUnitScale)
      const mistRadius = (8 + prog * 12) * customUnitScale

      marker
        .circle(mistX, mistY, mistRadius)
        .fill({ color: 0x38bdf8, alpha: 0.18 * (1 - prog) * fadeAlpha })
      marker
        .circle(mistX, mistY, mistRadius * 0.5)
        .fill({ color: 0xe0f2fe, alpha: 0.35 * (1 - prog) * fadeAlpha })
    }

    // 2. Sparkling Diamond Dust / Ice Gleams
    const glintPoints = [
      { x: -12 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: 12 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: 0, y: bodyChestY + 2 * customUnitScale },
      { x: -8 * customUnitScale, y: bodyWaistY },
      { x: 8 * customUnitScale, y: bodyWaistY }
    ]

    for (let g = 0; g < glintPoints.length; g++) {
      const pt = glintPoints[g]
      const twinkle = Math.max(0, Math.sin(animTime * 3.5 + g * 1.4 + seed))
      if (twinkle > 0.3) {
        const s = (1.5 + twinkle * 2) * customUnitScale
        marker
          .poly([
            { x: pt.x, y: pt.y - s },
            { x: pt.x + s * 0.3, y: pt.y },
            { x: pt.x, y: pt.y + s },
            { x: pt.x - s * 0.3, y: pt.y }
          ])
          .fill({ color: 0xffffff, alpha: twinkle * 0.95 * fadeAlpha })
        marker
          .poly([
            { x: pt.x - s, y: pt.y },
            { x: pt.x, y: pt.y - s * 0.3 },
            { x: pt.x + s, y: pt.y },
            { x: pt.x, y: pt.y + s * 0.3 }
          ])
          .fill({ color: 0xffffff, alpha: twinkle * 0.95 * fadeAlpha })
      }
    }

    // 3. Drifting Gentle Frost Crystal Specks
    for (let p = 0; p < 4; p++) {
      const prog = ((animTime * 0.7 + p * 0.25 + seed) % 1.0)
      const fx = Math.sin(animTime * 2.5 + p * 2 + seed) * (16 * customUnitScale)
      const fy = bodyChestY + 6 * customUnitScale - prog * (40 * customUnitScale)

      marker
        .circle(fx, fy, 1.4 * customUnitScale)
        .fill({ color: 0xe0f2fe, alpha: (1 - prog) * 0.85 * fadeAlpha })
    }

  } else if (variant === 'electric') {
    // 1. Crisp mini-lightning arcs around the feet & ankles
    const arcTargets = [
      { start: { x: -9 * customUnitScale, y: bodyFeetY }, end: { x: 5 * customUnitScale, y: bodyFeetY - 12 * customUnitScale } },
      { start: { x: 8 * customUnitScale, y: bodyFeetY }, end: { x: -6 * customUnitScale, y: bodyFeetY - 10 * customUnitScale } },
      { start: { x: -4 * customUnitScale, y: bodyFeetY }, end: { x: 10 * customUnitScale, y: bodyFeetY - 5 * customUnitScale } }
    ]

    for (let t = 0; t < arcTargets.length; t++) {
      const cycle = Math.sin(animTime * 8 + t * 2.1 + seed)
      if (cycle > 0.2) {
        const arc = arcTargets[t]
        const segments = 3
        const pts = [arc.start]
        for (let s = 1; s < segments; s++) {
          const frac = s / segments
          const jitterX = Math.sin(animTime * 20 + t * 4 + s * 2 + seed) * (3.5 * customUnitScale)
          const jitterY = Math.cos(animTime * 20 + t * 3 + s * 3 + seed) * (2 * customUnitScale)
          pts.push({
            x: arc.start.x + (arc.end.x - arc.start.x) * frac + jitterX,
            y: arc.start.y + (arc.end.y - arc.start.y) * frac + jitterY
          })
        }
        pts.push(arc.end)

        // Outer Glow
        marker.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) marker.lineTo(pts[i].x, pts[i].y)
        marker.stroke({ width: 2.0 * customUnitScale, color: 0x38bdf8, alpha: 0.9 * fadeAlpha })

        // Inner White Core
        marker.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) marker.lineTo(pts[i].x, pts[i].y)
        marker.stroke({ width: 0.9 * customUnitScale, color: 0xffffff, alpha: 0.95 * fadeAlpha })
      }
    }

    // 2. Subtle electric sparks rising from feet
    for (let sp = 0; sp < 4; sp++) {
      const prog = ((animTime * 1.2 + sp * 0.25 + seed) % 1.0)
      const sx = Math.sin(animTime * 3 + sp * 2.2 + seed) * (10 * customUnitScale)
      const sy = bodyFeetY - prog * (18 * customUnitScale)
      const alpha = (1 - prog) * 0.9 * fadeAlpha
      const color = sp % 2 === 0 ? 0xffffff : 0x38bdf8

      marker
        .circle(sx, sy, 1.2 * customUnitScale)
        .fill({ color, alpha })
    }

  } else if (variant === 'poison') {
    // 1. Billowing Toxic Green Miasma Clouds
    for (let g = 0; g < 6; g++) {
      const prog = ((animTime * 0.8 + g * 0.16 + seed) % 1.0)
      const cloudX = Math.sin(animTime * 3 + g * 2 + seed) * (18 * customUnitScale)
      const cloudY = bodyChestY - prog * (45 * customUnitScale)
      const cloudRadius = (10 + prog * 16) * customUnitScale

      marker
        .circle(cloudX, cloudY, cloudRadius)
        .fill({ color: 0x22c55e, alpha: 0.28 * (1 - prog) * fadeAlpha })
      marker
        .circle(cloudX, cloudY, cloudRadius * 0.5)
        .fill({ color: 0x4ade80, alpha: 0.42 * (1 - prog) * fadeAlpha })
    }

    // 2. Corrosive Toxic Slime Bubbles
    for (let b = 0; b < 5; b++) {
      const prog = ((animTime * 1.1 + b * 0.2 + seed) % 1.0)
      const bx = Math.sin(b * 3.1 + animTime * 4 + seed) * (16 * customUnitScale)
      const by = bodyWaistY - prog * (48 * customUnitScale)
      const br = (2.5 + Math.sin(b + animTime * 3 + seed) * 1.5) * customUnitScale

      marker
        .circle(bx, by, br)
        .fill({ color: 0x22c55e, alpha: 0.85 * (1 - prog) * fadeAlpha })
        .stroke({ width: 1.2, color: 0x86efac, alpha: 0.9 * (1 - prog) * fadeAlpha })
    }

    // 3. Dripping Acid Venom Drop
    const dripProgress = (animTime * 2.2 + seed) % 1.0
    const dropX = Math.sin(animTime * 2 + seed) * (14 * customUnitScale)
    const dropY = bodyWaistY + dripProgress * (bodyFeetY - bodyWaistY)
    marker
      .circle(dropX, dropY, 2.2 * customUnitScale)
      .fill({ color: 0x84cc16, alpha: (1 - dripProgress * 0.3) * fadeAlpha })

  } else if (variant === 'void') {
    // 1. Shadow Vapor Wisps
    for (let v = 0; v < 4; v++) {
      const prog = ((animTime * 0.7 + v * 0.25 + seed) % 1.0)
      const vx = Math.sin(animTime * 2 + v * 2 + seed) * (12 * customUnitScale)
      const vy = bodyChestY - prog * (38 * customUnitScale)
      const vr = (6 + prog * 10) * customUnitScale

      marker
        .circle(vx, vy, vr)
        .fill({ color: 0x9333ea, alpha: 0.2 * (1 - prog) * fadeAlpha })
      marker
        .circle(vx, vy, vr * 0.5)
        .fill({ color: 0xc084fc, alpha: 0.38 * (1 - prog) * fadeAlpha })
    }

    // 2. Astral Stardust
    for (let s = 0; s < 5; s++) {
      const prog = ((animTime * 0.9 + s * 0.2 + seed) % 1.0)
      const sx = Math.sin(animTime * 3 + s * 2.5 + seed) * (15 * customUnitScale)
      const sy = bodyChestY + 8 * customUnitScale - prog * (45 * customUnitScale)
      const scolor = s % 2 === 0 ? 0xf3e8ff : 0xc084fc

      marker
        .circle(sx, sy, 1.4 * customUnitScale)
        .fill({ color: scolor, alpha: (1 - prog) * 0.9 * fadeAlpha })
    }

  } else if (variant === 'blood') {
    // 1. Rising Blood Fury Energy Spikes / Soul Wisps (No large chest circle)
    for (let p = 0; p < 6; p++) {
      const prog = ((animTime * 1.5 + p * 0.16 + seed) % 1.0)
      const px = Math.sin(animTime * 5 + p * 3 + seed) * (18 * customUnitScale)
      const py = bodyChestY + 10 * customUnitScale - prog * (55 * customUnitScale)
      const s = (4 * (1 - prog)) * customUnitScale

      marker
        .circle(px, py, s)
        .fill({ color: 0xe11d48, alpha: (1 - prog) * 0.95 * fadeAlpha })
    }

    // 2. Dripping Blood Droplet
    const dripProg = (animTime * 2.8 + seed) % 1.0
    marker
      .circle(Math.sin(animTime * 2 + seed) * (12 * customUnitScale), bodyWaistY + dripProg * (bodyFeetY - bodyWaistY), 2.2 * customUnitScale)
      .fill({ color: 0x991b1b, alpha: (1 - dripProg * 0.4) * fadeAlpha })

  } else if (variant === 'golden') {
    // 1. Shimmer Glints on Armor
    const goldGlints = [
      { x: -10 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: 10 * customUnitScale, y: bodyChestY - 4 * customUnitScale },
      { x: 0, y: bodyChestY + 2 * customUnitScale }
    ]

    for (let g = 0; g < goldGlints.length; g++) {
      const pt = goldGlints[g]
      const twinkle = Math.max(0, Math.sin(animTime * 3.5 + g * 2.1 + seed))
      if (twinkle > 0.25) {
        const s = (1.5 + twinkle * 2) * customUnitScale
        marker
          .poly([
            { x: pt.x, y: pt.y - s },
            { x: pt.x + s * 0.3, y: pt.y },
            { x: pt.x, y: pt.y + s },
            { x: pt.x - s * 0.3, y: pt.y }
          ])
          .fill({ color: 0xffffff, alpha: twinkle * 0.95 * fadeAlpha })
        marker
          .poly([
            { x: pt.x - s, y: pt.y },
            { x: pt.x, y: pt.y - s * 0.3 },
            { x: pt.x + s, y: pt.y },
            { x: pt.x, y: pt.y + s * 0.3 }
          ])
          .fill({ color: 0xfde047, alpha: twinkle * 0.95 * fadeAlpha })
      }
    }

    // 2. Ascending Holy Light Specks
    for (let h = 0; h < 5; h++) {
      const prog = ((animTime * 0.8 + h * 0.2 + seed) % 1.0)
      const hx = Math.sin(animTime * 2.5 + h * 2 + seed) * (14 * customUnitScale)
      const hy = bodyChestY + 8 * customUnitScale - prog * (48 * customUnitScale)

      marker
        .circle(hx, hy, 1.4 * customUnitScale)
        .fill({ color: 0xfde047, alpha: (1 - prog) * 0.9 * fadeAlpha })
    }

  } else if (variant === 'demon') {
    // 1. Billowing Ethereal White Smoke Clouds
    for (let s = 0; s < 7; s++) {
      const prog = ((animTime * 0.75 + s * 0.14 + seed) % 1.0)
      const smokeX = Math.sin(animTime * 2.2 + s * 1.8 + seed) * (14 * customUnitScale)
      const smokeY = bodyChestY + 2 * customUnitScale - prog * (52 * customUnitScale)
      const smokeRadius = (9 + prog * 16) * customUnitScale

      marker
        .circle(smokeX, smokeY, smokeRadius)
        .fill({ color: 0xe2e8f0, alpha: 0.28 * (1 - prog) * fadeAlpha })
      marker
        .circle(smokeX, smokeY, smokeRadius * 0.5)
        .fill({ color: 0xffffff, alpha: 0.45 * (1 - prog) * fadeAlpha })
    }

    // 2. Floating White Ash Specks
    for (let a = 0; a < 6; a++) {
      const prog = ((animTime * 1.1 + a * 0.16 + seed) % 1.0)
      const ax = Math.sin(animTime * 3.5 + a * 2.5 + seed) * (18 * customUnitScale)
      const ay = bodyWaistY - prog * (48 * customUnitScale)
      const ashSize = (1.8 * (1 - prog * 0.5)) * customUnitScale
      const ashColor = a % 2 === 0 ? 0xffffff : 0xe2e8f0

      marker
        .circle(ax, ay, ashSize)
        .fill({ color: ashColor, alpha: (1 - prog) * 0.9 * fadeAlpha })
    }
  }
}
