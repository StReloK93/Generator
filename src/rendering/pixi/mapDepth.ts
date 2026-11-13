import type { Layer } from '../../types/map'

/** The layers whose tiles lie flat on the ground (drawn under every wall, prop and unit). */
export function isGroundLayer(layer: Layer, index: number): boolean {
  const name = layer.name.toLowerCase()
  return layer.id === 'layer-ground' || index === 0 || name.includes('ground') || name.includes('yer')
}

/**
 * Draw order of a map sprite: ground on its own plane (0 .. 50,000), walls, props and units above it (100,000+);
 * within a plane, back to front by grid depth (col + row), then layer, then the item's own z-index.
 */
export function depthScore(isGround: boolean, gridDepth: number, crossAxis: number, layerIdx: number, zIndex: number): number {
  return isGround
    ? Math.round(gridDepth * 10 + layerIdx * 2 + zIndex * 2 + crossAxis * 0.01)
    : 100000 + Math.round(gridDepth * 1000 + layerIdx * 20 + zIndex * 5 + crossAxis * 0.01)
}
