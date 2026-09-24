import { Graphics } from 'pixi.js'
import { ProjectileRenderer } from '../rendering/pixi/ProjectileRenderer'
import { getProjectileDefinition } from './projectileCatalog'
import { ProjectileDefinition } from '../types/projectile'

export interface ProjectileVisualTheme {
  type: string
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

export function getProjectileTheme(type: string, customColor?: number): ProjectileVisualTheme {
  const def = getProjectileDefinition(type)
  const trailColorHex = customColor ?? def.trail.colorHex ?? def.visual.colorHex
  const hexStr = '#' + trailColorHex.toString(16).padStart(6, '0')

  return {
    type: def.identity.id,
    trailColorHex,
    trailColorCss: def.trail.colorCss || hexStr,
    trailAlpha: def.trail.alpha ?? 0.7,
    sparkColorHex: def.impact.sparkColorHex ?? trailColorHex,
    sparkColorCss: def.impact.sparkColorCss || hexStr,
    shockwaveColorHex: def.impact.shockwaveColorHex ?? trailColorHex,
    shockwaveColorCss: def.impact.shockwaveColorCss || hexStr,
    hasArc: def.movement.hasArc,
    isLaser: def.movement.isLaser,
  }
}

export function renderPixiProjectileHead(
  g: Graphics,
  type: string,
  renderX: number,
  renderY: number,
  angle: number,
  startX: number,
  startY: number,
  timeMs: number,
  customDef?: Partial<ProjectileDefinition>
): void {
  const baseDef = getProjectileDefinition(type)
  const def: ProjectileDefinition = customDef ? { ...baseDef, ...customDef } as ProjectileDefinition : baseDef
  ProjectileRenderer.renderHead(g, def, renderX, renderY, angle, startX, startY, timeMs)
}
